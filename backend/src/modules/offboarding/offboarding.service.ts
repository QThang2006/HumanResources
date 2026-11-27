import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, LessThan, Repository } from 'typeorm';
import {
  AutomationDeliveryStatus,
  Department,
  OffboardingCase,
  OffboardingStatus,
  User,
  UserRole,
} from '../../entities';
import { N8nService } from '../core/automation/n8n.service';

@Injectable()
export class OffboardingService {
  constructor(
    @InjectRepository(OffboardingCase)
    private readonly offboardingRepository: Repository<OffboardingCase>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly n8nService: N8nService,
  ) {}

  async approve(
    approvedById: number,
    data: {
      userId: number;
      lastWorkingDate: string;
      personalEmail?: string;
      reason?: string;
      assetNotes?: string;
      exitSurveyUrl?: string;
    },
  ) {
    if (!Number.isInteger(data.userId) || data.userId <= 0) throw new BadRequestException('Nhân sự không hợp lệ.');
    const parsedDate = new Date(`${data.lastWorkingDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.lastWorkingDate || '') ||
      !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== data.lastWorkingDate) {
      throw new BadRequestException('Ngày làm việc cuối phải có định dạng YYYY-MM-DD.');
    }
    const today = this.vietnamDateKey(new Date());
    if (data.lastWorkingDate < today) {
      throw new BadRequestException('Ngày làm việc cuối không được nằm trong quá khứ.');
    }
    const personalEmail = data.personalEmail?.trim().toLowerCase() || null;
    if (personalEmail && !/^\S+@\S+\.\S+$/.test(personalEmail)) {
      throw new BadRequestException('Email cá nhân không hợp lệ.');
    }
    const exitSurveyUrl = data.exitSurveyUrl?.trim() || null;
    if (exitSurveyUrl) {
      try {
        const url = new URL(exitSurveyUrl);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        throw new BadRequestException('Đường dẫn khảo sát thôi việc không hợp lệ.');
      }
    }

    const saved = await this.offboardingRepository.manager.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const cases = manager.getRepository(OffboardingCase);
      const employee = await users.findOne({
        where: { id: data.userId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) throw new NotFoundException('Không tìm thấy nhân sự đang hoạt động.');
      this.assertEligible(employee);
      const approver = await users.findOne({ where: { id: approvedById } });
      if (!approver) throw new NotFoundException('Không tìm thấy người duyệt thôi việc.');
      const existing = await cases.findOne({
        where: { userId: employee.id, finalizedAt: IsNull(), status: In([
          OffboardingStatus.APPROVED, OffboardingStatus.IN_PROGRESS,
          OffboardingStatus.PARTIAL, OffboardingStatus.FAILED, OffboardingStatus.COMPLETED,
        ]) },
        order: { id: 'DESC' },
      });
      if (existing) throw new ConflictException(`Nhân sự đã có hồ sơ thôi việc #${existing.id} đang được xử lý.`);
      return cases.save(cases.create({
        userId: employee.id, approvedById: approver.id,
        lastWorkingDate: data.lastWorkingDate, personalEmail,
        reason: data.reason?.trim() || null, assetNotes: data.assetNotes?.trim() || null,
        exitSurveyUrl, status: OffboardingStatus.APPROVED,
      }));
    });
    const automationQueued = await this.n8nService.triggerOffboardingApproved({
      caseId: saved.id,
    });

    return {
      message: automationQueued
        ? 'Đã duyệt thôi việc và chuyển hồ sơ sang n8n để điều phối liên phòng ban.'
        : 'Đã lưu hồ sơ nhưng chưa thể chuyển sang n8n.',
      automationQueued,
      offboarding: await this.findOneView(saved.id),
    };
  }

  async findAll() {
    const records = await this.offboardingRepository.find({
      relations: { user: true, approvedBy: true },
      order: { approvedAt: 'DESC' },
    });
    const departments = records.length ? await this.offboardingRepository.manager.getRepository(Department).find({
      where: { managerId: In(records.map(record => record.userId)) },
    }) : [];
    return records.map((record) => this.toView(record, departments));
  }

  async retry(id: number) {
    const record = await this.offboardingRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Không tìm thấy hồ sơ thôi việc.');
    if (record.finalizedAt || record.status === OffboardingStatus.CANCELLED) {
      throw new BadRequestException('Hồ sơ đã kết thúc nên không thể gửi lại.');
    }
    const automationQueued = await this.n8nService.triggerOffboardingApproved({ caseId: id });
    return {
      message: automationQueued
        ? 'Đã yêu cầu n8n xử lý lại hồ sơ.'
        : 'Chưa thể kết nối n8n để xử lý lại.',
      automationQueued,
    };
  }

  async getAutomationCase(id: number) {
    const record = await this.offboardingRepository.manager.transaction(async (manager) => {
      const cases = manager.getRepository(OffboardingCase);
      const record = await cases.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) throw new NotFoundException('Không tìm thấy hồ sơ thôi việc.');
      if (record.finalizedAt || record.status === OffboardingStatus.CANCELLED) {
        throw new BadRequestException('Hồ sơ này không còn chờ điều phối.');
      }
      if ([OffboardingStatus.APPROVED, OffboardingStatus.COMPLETED].includes(record.status)) {
        record.status = OffboardingStatus.IN_PROGRESS;
        await cases.save(record);
      }
      return cases.findOne({ where: { id }, relations: { user: { department: true, manager: true }, approvedBy: true } });
    });

    return {
      caseId: record.id,
      status: record.status,
      employee: {
        id: record.user.id,
        fullName: record.user.fullName,
        workEmail: record.user.email,
        personalEmail: record.personalEmail,
        phone: record.user.phone,
        jobTitle: record.user.jobTitle,
        departmentName: record.user.department?.name ?? 'Chưa có phòng ban',
        managerName: record.user.manager?.fullName ?? null,
        managerEmail: record.user.manager?.email ?? null,
      },
      approvedBy: {
        id: record.approvedBy.id,
        fullName: record.approvedBy.fullName,
        email: record.approvedBy.email,
      },
      lastWorkingDate: record.lastWorkingDate,
      reason: record.reason,
      assetNotes: record.assetNotes,
      exitSurveyUrl: record.exitSurveyUrl,
      alreadyNotified: {
        it: Boolean(record.itNotifiedAt),
        finance: Boolean(record.financeNotifiedAt),
        employee: Boolean(record.employeeNotifiedAt),
        telegram: Boolean(record.telegramNotifiedAt),
      },
    };
  }

  async recordAutomationResult(
    id: number,
    data: {
      runId: string;
      itNotified: boolean;
      financeNotified: boolean;
      employeeNotified: boolean;
      telegramNotified: boolean;
      status: AutomationDeliveryStatus;
      detail?: string;
    },
  ) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(data.runId || '')) {
      throw new BadRequestException('Mã lần chạy không hợp lệ.');
    }
    if (!Object.values(AutomationDeliveryStatus).includes(data.status)) {
      throw new BadRequestException('Trạng thái điều phối không hợp lệ.');
    }
    return this.offboardingRepository.manager.transaction(async (manager) => {
      const cases = manager.getRepository(OffboardingCase);
      const record = await cases.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!record) throw new NotFoundException('Không tìm thấy hồ sơ thôi việc.');
      if (record.finalizedAt || record.status === OffboardingStatus.CANCELLED) {
        return { recorded: false, ignored: true, id: record.id, status: record.status };
      }
      if (record.lastWorkflowRunId === data.runId) {
        return { recorded: true, duplicate: true, id: record.id, status: record.status };
      }
      const recordedAt = new Date();
      if (data.itNotified && !record.itNotifiedAt) record.itNotifiedAt = recordedAt;
      if (data.financeNotified && !record.financeNotifiedAt) record.financeNotifiedAt = recordedAt;
      if (data.employeeNotified && !record.employeeNotifiedAt) record.employeeNotifiedAt = recordedAt;
      if (data.telegramNotified && !record.telegramNotifiedAt) record.telegramNotifiedAt = recordedAt;
      record.lastWorkflowRunId = data.runId;
      record.automationDetail = data.detail?.slice(0, 4000) || null;
      // Delivery success does not close employment or lock the account.
      record.status = data.status === AutomationDeliveryStatus.SENT
        ? OffboardingStatus.IN_PROGRESS
        : data.status === AutomationDeliveryStatus.PARTIAL ? OffboardingStatus.PARTIAL : OffboardingStatus.FAILED;
      await cases.save(record);
      return {
        recorded: true, duplicate: false, id: record.id, status: record.status,
        channels: { it: Boolean(record.itNotifiedAt), finance: Boolean(record.financeNotifiedAt),
          employee: Boolean(record.employeeNotifiedAt), telegram: Boolean(record.telegramNotifiedAt) },
      };
    });
  }

  async cancel(id: number) {
    await this.withLockedCase(id, async (record, _user, manager) => {
      if (record.finalizedAt) throw new BadRequestException('Hồ sơ đã đóng nên không thể hủy.');
      if (record.status === OffboardingStatus.CANCELLED) return;
      record.status = OffboardingStatus.CANCELLED;
      await manager.getRepository(OffboardingCase).save(record);
    });
    return { message: 'Đã hủy hồ sơ. Trạng thái tài khoản được giữ nguyên.', offboarding: await this.findOneView(id) };
  }

  async finalize(id: number, now = new Date()) {
    await this.withLockedCase(id, async (record, user, manager) => {
      if (record.status === OffboardingStatus.CANCELLED) throw new BadRequestException('Hồ sơ đã hủy nên không thể đóng.');
      if (record.finalizedAt) return;
      this.assertEligible(user);
      if (record.lastWorkingDate > this.vietnamDateKey(now)) {
        throw new BadRequestException('Chỉ được đóng hồ sơ từ ngày làm việc cuối.');
      }
      await manager.getRepository(User).update(user.id, { isActive: false });
      // Clear every department led by this person, including cross-department appointments.
      await manager.getRepository(Department).update({ managerId: user.id }, { managerId: null });
      record.status = OffboardingStatus.COMPLETED;
      record.finalizedAt = now;
      await manager.getRepository(OffboardingCase).save(record);
    });
    return { message: 'Đã đóng hồ sơ và khóa tài khoản.', offboarding: await this.findOneView(id) };
  }

  async finalizeOverdue(now = new Date()) {
    const records = await this.offboardingRepository.find({
      select: { id: true },
      where: { finalizedAt: IsNull(), lastWorkingDate: LessThan(this.vietnamDateKey(now)), status: In([
        OffboardingStatus.APPROVED, OffboardingStatus.IN_PROGRESS, OffboardingStatus.PARTIAL,
        OffboardingStatus.FAILED, OffboardingStatus.COMPLETED,
      ]) },
    });
    let completed = 0;
    for (const record of records) {
      try { await this.finalize(record.id, now); completed++; }
      catch (error) {
        // A cancelled/protected case must not stop processing other due cases.
        if (!(error instanceof BadRequestException) && !(error instanceof NotFoundException)) throw error;
      }
    }
    return { completed };
  }

  private assertEligible(user: User) {
    if (user.id === 1 || ![UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR].includes(user.role)) {
      throw new BadRequestException('Không được tạo hoặc đóng hồ sơ thôi việc cho tài khoản quản trị gốc.');
    }
  }

  private async withLockedCase(id: number, action: (record: OffboardingCase, user: User, manager: EntityManager) => Promise<void>) {
    const snapshot = await this.offboardingRepository.findOne({ where: { id } });
    if (!snapshot) throw new NotFoundException('Không tìm thấy hồ sơ thôi việc.');
    await this.offboardingRepository.manager.transaction(async (manager) => {
      // All lifecycle mutations take the user lock before the case lock.
      const user = await manager.getRepository(User).findOne({ where: { id: snapshot.userId }, lock: { mode: 'pessimistic_write' } });
      const record = await manager.getRepository(OffboardingCase).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!user || !record) throw new NotFoundException('Không tìm thấy hồ sơ hoặc nhân sự.');
      await action(record, user, manager);
    });
  }

  private async findOneView(id: number) {
    const record = await this.offboardingRepository.findOne({
      where: { id },
      relations: { user: true, approvedBy: true },
    });
    if (!record) throw new NotFoundException('Không tìm thấy hồ sơ thôi việc.');
    const departments = await this.offboardingRepository.manager.getRepository(Department).find({ where: { managerId: record.userId } });
    return this.toView(record, departments);
  }

  private toView(record: OffboardingCase, departments: Department[] = []) {
    return {
      id: record.id,
      employee: record.user
        ? { id: record.user.id, fullName: record.user.fullName, email: record.user.email }
        : { id: record.userId },
      approvedBy: record.approvedBy
        ? { id: record.approvedBy.id, fullName: record.approvedBy.fullName }
        : { id: record.approvedById },
      lastWorkingDate: record.lastWorkingDate,
      personalEmail: record.personalEmail,
      reason: record.reason,
      assetNotes: record.assetNotes,
      exitSurveyUrl: record.exitSurveyUrl,
      // Older COMPLETED rows meant "all notices delivered"; only finalizedAt proves closure.
      status: record.status === OffboardingStatus.COMPLETED && !record.finalizedAt ? OffboardingStatus.IN_PROGRESS : record.status,
      finalizedAt: record.finalizedAt ?? null,
      managesDepartments: departments.filter(department => department.managerId === record.userId).map(({ id, name }) => ({ id, name })),
      delivery: {
        itNotified: Boolean(record.itNotifiedAt),
        financeNotified: Boolean(record.financeNotifiedAt),
        employeeNotified: Boolean(record.employeeNotifiedAt),
        telegramNotified: Boolean(record.telegramNotifiedAt),
      },
      approvedAt: record.approvedAt,
      updatedAt: record.updatedAt,
    };
  }

  private vietnamDateKey(value: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const get = (type: string) => parts.find((part) => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
}
