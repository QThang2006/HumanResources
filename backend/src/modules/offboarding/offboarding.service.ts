import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AutomationDeliveryStatus,
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.lastWorkingDate || '')) {
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

    const [employee, approver] = await Promise.all([
      this.userRepository.findOne({
        where: { id: data.userId, role: UserRole.EMPLOYEE, isActive: true },
      }),
      this.userRepository.findOne({ where: { id: approvedById } }),
    ]);
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên đang hoạt động.');
    if (!approver) throw new NotFoundException('Không tìm thấy người duyệt thôi việc.');

    const existing = await this.offboardingRepository.findOne({
      where: {
        userId: employee.id,
        status: In([
          OffboardingStatus.APPROVED,
          OffboardingStatus.IN_PROGRESS,
          OffboardingStatus.PARTIAL,
          OffboardingStatus.FAILED,
        ]),
      },
      order: { id: 'DESC' },
    });
    if (existing) {
      throw new ConflictException(
        `Nhân viên đã có hồ sơ thôi việc #${existing.id} đang được xử lý.`,
      );
    }

    const record = this.offboardingRepository.create({
      userId: employee.id,
      approvedById: approver.id,
      lastWorkingDate: data.lastWorkingDate,
      personalEmail,
      reason: data.reason?.trim() || null,
      assetNotes: data.assetNotes?.trim() || null,
      exitSurveyUrl,
      status: OffboardingStatus.APPROVED,
    });
    const saved = await this.offboardingRepository.save(record);
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
    return records.map((record) => this.toView(record));
  }

  async retry(id: number) {
    const record = await this.offboardingRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Không tìm thấy hồ sơ thôi việc.');
    if ([OffboardingStatus.COMPLETED, OffboardingStatus.CANCELLED].includes(record.status)) {
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
    const record = await this.offboardingRepository.findOne({
      where: { id },
      relations: {
        user: { department: true, manager: true },
        approvedBy: true,
      },
    });
    if (!record) throw new NotFoundException('Không tìm thấy hồ sơ thôi việc.');
    if ([OffboardingStatus.COMPLETED, OffboardingStatus.CANCELLED].includes(record.status)) {
      throw new BadRequestException('Hồ sơ này không còn chờ điều phối.');
    }

    if (record.status === OffboardingStatus.APPROVED) {
      record.status = OffboardingStatus.IN_PROGRESS;
      await this.offboardingRepository.save(record);
    }

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
    const record = await this.offboardingRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Không tìm thấy hồ sơ thôi việc.');
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
    record.status = data.status === AutomationDeliveryStatus.SENT
      ? OffboardingStatus.COMPLETED
      : data.status === AutomationDeliveryStatus.PARTIAL
        ? OffboardingStatus.PARTIAL
        : OffboardingStatus.FAILED;
    await this.offboardingRepository.save(record);

    return {
      recorded: true,
      duplicate: false,
      id: record.id,
      status: record.status,
      channels: {
        it: Boolean(record.itNotifiedAt),
        finance: Boolean(record.financeNotifiedAt),
        employee: Boolean(record.employeeNotifiedAt),
        telegram: Boolean(record.telegramNotifiedAt),
      },
    };
  }

  private async findOneView(id: number) {
    const record = await this.offboardingRepository.findOne({
      where: { id },
      relations: { user: true, approvedBy: true },
    });
    if (!record) throw new NotFoundException('Không tìm thấy hồ sơ thôi việc.');
    return this.toView(record);
  }

  private toView(record: OffboardingCase) {
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
      status: record.status,
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
