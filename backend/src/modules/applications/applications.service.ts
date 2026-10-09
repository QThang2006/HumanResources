import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { OnboardingTask, TaskCategory } from '../../entities/onboarding-task.entity';
import {
  BadRequestException,
  ConflictException,
  Logger,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Application,
  ApplicationStatus,
  AiRecommendation,
} from '../../entities/application.entity';
import { Job, JobStatus } from '../../entities/job.entity';
import { Interview, InterviewResult } from '../../entities/interview.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { RecruitmentAiService } from '../jobs/recruitment-ai.service';
import {
  Actor,
  assertOperator,
  assertScope,
  assertStatusTransition,
  assertFresh,
  nextRevision,
} from '../jobs/recruitment.policy';
import {
  ApplicationQuery,
  SubmitInput,
  StateInput,
  ScheduleInput,
  ResultInput,
} from '../jobs/recruitment.dto';
import { N8nService } from '../core/automation/n8n.service';
import { CvStorageService } from './cv-storage.service';
import { deliveryView, InterviewDeliveryService } from './interview-delivery.service';
import { ConfigService } from '@nestjs/config';

function interviewView(row: Interview) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    interviewerId: row.interviewerId,
    interviewerName: row.interviewer?.fullName || '',
    round: row.round,
    scheduledAt: row.scheduledAt,
    meetingLink: row.meetingLink || null,
    questions: row.aiSuggestedQuestions || [],
    score: row.score,
    feedback: row.interviewerFeedback,
    result: row.result,
    updatedAt: row.updatedAt,
  };
}
export function applicationView(row: Application) {
  return {
    id: row.id,
    jobId: row.jobId,
    jobTitle: row.job?.title || '',
    candidateName: row.candidateName,
    candidateEmail: row.candidateEmail,
    candidatePhone: row.candidatePhone,
    status: row.status,
    matchScore: row.matchScore === null ? null : Number(row.matchScore),
    aiSummary: row.aiSummary,
    aiRecommendation: row.aiRecommendation,
    skillsDetected: row.skillsDetected || [],
    hiredUserId: row.hiredUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hasCv: /^[a-f0-9-]{36}\.(pdf|png|jpe?g|webp)$/.test(row.cvFileUrl || ''),
    hasCvText: Boolean(row.rawCvText?.trim()),
    interviews: (row.interviews || []).sort((a, b) => b.round - a.round).map(interviewView),
  };
}
@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  private readonly activeAi = new Set<string>();

  constructor(
    @InjectRepository(Application) private readonly applications: Repository<Application>,
    private readonly db: DataSource,
    private readonly files: CvStorageService,
    private readonly ai: RecruitmentAiService,
    private readonly n8n: N8nService,
    private readonly delivery: InterviewDeliveryService,
    private readonly config: ConfigService,
  ) {}

  private async scopedJob(id: number, actor: Actor) {
    const job = await this.db.getRepository(Job).findOneBy({ id });
    if (!job) throw new NotFoundException('Không tìm thấy vị trí tuyển dụng.');
    assertScope(actor, job.departmentId);
    return job;
  }

  private async row(id: number, actor: Actor, allowAssignedInterviewer = false) {
    const app = await this.applications.findOne({
      where: { id },
      relations: ['job', 'interviews', 'interviews.interviewer'],
    });
    if (!app) throw new NotFoundException('Không tìm thấy hồ sơ.');
    if (
      !allowAssignedInterviewer ||
      !app.interviews?.some((interview) => interview.interviewerId === actor.id)
    ) {
      assertScope(actor, app.job.departmentId);
    }
    return app;
  }

  private async locked(
    manager: EntityManager,
    id: number,
    actor: Actor,
    allowAssignedInterviewer = false,
  ) {
    const app = await manager
      .getRepository(Application)
      .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!app) throw new NotFoundException('Không tìm thấy hồ sơ.');
    const job = await manager.getRepository(Job).findOneBy({ id: app.jobId });
    if (!allowAssignedInterviewer) assertScope(actor, job.departmentId);
    return app;
  }

  async list(query: ApplicationQuery, actor: Actor) {
    await this.scopedJob(query.jobId, actor);
    const qb = this.applications
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.job', 'job')
      .where('app.jobId = :jobId', { jobId: query.jobId });
    if (query.status) qb.andWhere('app.status = :status', { status: query.status });
    else qb.andWhere('app.status != :rejected', { rejected: ApplicationStatus.REJECTED });
    if (query.minScore !== undefined)
      qb.andWhere('app.matchScore >= :minScore', { minScore: query.minScore });
    if (query.q)
      qb.andWhere('(app.candidateName LIKE :q OR app.candidateEmail LIKE :q)', {
        q: '%' + query.q + '%',
      });
    const counts = await qb
      .clone()
      .select('app.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('app.status')
      .getRawMany();
    const [rows, total] = await qb
      // Scored candidates first, highest score first, unscored NULL values last.
      // MySQL places NULL after numeric scores in descending order, including a score of zero.
      .orderBy('app.matchScore', 'DESC')
      .addOrderBy('app.createdAt', 'DESC')
      .addOrderBy('app.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return {
      items: rows.map(applicationView),
      total,
      page: query.page,
      pageSize: query.pageSize,
      counts: Object.fromEntries(counts.map((row) => [row.status, Number(row.count)])),
    };
  }

  async detail(id: number, actor: Actor, allowAssignedInterviewer = false) {
    const view = applicationView(await this.row(id, actor, allowAssignedInterviewer));
    const deliveries = await this.delivery.views(view.interviews.map((i) => i.id));
    return {
      ...view,
      interviews: view.interviews.map((i) => ({
        ...i,
        automation: deliveries.get(i.id) || deliveryView(),
      })),
    };
  }

  async download(id: number, actor: Actor) {
    const app = await this.row(id, actor);
    return this.files.read(app.cvFileUrl);
  }

  async cvMimeType(id: number, actor: Actor) {
    const app = await this.row(id, actor);
    return this.files.mimeType(app.cvFileUrl) || 'application/pdf';
  }

  async apply(input: SubmitInput, file: Express.Multer.File) {
    const job = await this.db
      .getRepository(Job)
      .findOneBy({ id: input.jobId, status: JobStatus.OPEN });
    if (!job) throw new NotFoundException('Vị trí đã đóng hoặc không tồn tại.');
    const rawCvText = await this.files.parse(file);
    const key = await this.files.save(file);
    try {
      const app = await this.db.transaction(async (manager) => {
        const lockedJob = await manager
          .getRepository(Job)
          .findOne({ where: { id: input.jobId }, lock: { mode: 'pessimistic_write' } });
        if (!lockedJob || lockedJob.status !== JobStatus.OPEN)
          throw new ConflictException('Vị trí vừa đóng tuyển dụng.');
        return manager.getRepository(Application).save(
          manager.getRepository(Application).create({
            ...input,
            candidateEmail: input.candidateEmail.trim().toLowerCase(),
            cvFileUrl: key,
            rawCvText,
            status: ApplicationStatus.APPLIED,
          }),
        );
      });
      return {
        applicationId: app.id,
        submittedAt: app.createdAt,
        message: 'Hồ sơ đã được lưu. HR sẽ xem xét CV của bạn.',
        warning: rawCvText
          ? null
          : 'CV không có lớp văn bản trích xuất. AI Vision có thể đọc trực tiếp ảnh hoặc PDF scan khi HR chấm điểm.',
      };
    } catch (error: any) {
      await this.files.remove(key);
      if (error?.driverError?.code === 'ER_DUP_ENTRY' || error?.code === 'ER_DUP_ENTRY')
        throw new ConflictException('Email này đã ứng tuyển vị trí này.');
      throw error;
    }
  }

  async status(id: number, input: StateInput, actor: Actor) {
    assertOperator(actor);
    await this.db.transaction(async (manager) => {
      const app = await this.locked(manager, id, actor);
      if (app.status !== input.expectedStatus)
        throw new ConflictException('Hồ sơ đã đổi trạng thái. Hãy tải lại.');
      assertStatusTransition(app.status, input.status);
      if (input.status === ApplicationStatus.OFFERED) {
        const latest = await manager
          .getRepository(Interview)
          .findOne({ where: { applicationId: id }, order: { round: 'DESC' } });
        if (latest?.result !== InterviewResult.PASSED)
          throw new ConflictException('Vòng phỏng vấn mới nhất chưa đạt.');
      }
      app.status = input.status;
      app.updatedAt = nextRevision(app.updatedAt);
      await manager.getRepository(Application).save(app);
    });
    return this.detail(id, actor);
  }

  async score(id: number, actor: Actor) {
    assertOperator(actor);
    const key = 'score:' + id;
    if (this.activeAi.has(key)) throw new ConflictException('Hồ sơ đang được chấm.');
    this.activeAi.add(key);
    try {
      const app = await this.row(id, actor);
      if ([ApplicationStatus.HIRED, ApplicationStatus.REJECTED].includes(app.status))
        throw new ConflictException('Hồ sơ đã kết thúc quy trình.');
      const jd = app.job.description + '\n' + app.job.requirements;
      const result = app.rawCvText?.trim()
        ? await this.ai.score(app.rawCvText, jd)
        : await this.ai.scoreFile(
            await this.files.read(app.cvFileUrl),
            this.files.mimeType(app.cvFileUrl) || 'application/pdf',
            jd,
          );
      // Shared schema has no provider-mode field: mock output is preview-only.
      if (result.mode === 'MOCK') return { ...result, saved: false };
      await this.db.transaction(async (manager) => {
        const current = await this.locked(manager, id, actor);
        assertFresh(current.updatedAt, app.updatedAt.toISOString());
        const job = await manager
          .getRepository(Job)
          .findOne({ where: { id: app.jobId }, lock: { mode: 'pessimistic_read' } });
        if (job.description + '\n' + job.requirements !== jd)
          throw new ConflictException('JD đã đổi trong lúc chấm. Hãy thử lại.');
        if ('extractedText' in result.data && typeof result.data.extractedText === 'string')
          current.rawCvText = result.data.extractedText;
        current.matchScore = result.data.matchScore;
        current.aiSummary = result.data.summary;
        current.skillsDetected = result.data.skillsDetected;
        current.aiRecommendation =
          result.data.matchScore >= 85
            ? AiRecommendation.STRONG_HIRE
            : result.data.matchScore >= 70
              ? AiRecommendation.HIRE
              : result.data.matchScore >= 50
                ? AiRecommendation.CONSIDER
                : AiRecommendation.REJECT;
        current.updatedAt = nextRevision(current.updatedAt);
        await manager.getRepository(Application).save(current);
      });
      return { ...result, saved: true };
    } finally {
      this.activeAi.delete(key);
    }
  }

  async interviewers(jobId: number, actor: Actor) {
    assertOperator(actor);
    const job = await this.scopedJob(jobId, actor);
    const department = await this.db.getRepository(Department).findOneBy({ id: job.departmentId });
    const managers = await this.db.getRepository(User).find({
      where: { departmentId: job.departmentId, role: UserRole.MANAGER, isActive: true },
      select: { id: true, fullName: true, email: true, jobTitle: true, role: true },
      order: { fullName: 'ASC', id: 'ASC' },
    });
    if (!department) throw new NotFoundException('Không tìm thấy phòng ban.');
    if (department.managerId) {
      // The designated manager can be an HR user as well, so resolve the
      // department's explicit manager instead of filtering only by role.
      const designated = await this.db.getRepository(User).findOne({
        where: { id: department.managerId, isActive: true },
        select: { id: true, fullName: true, email: true, jobTitle: true, role: true },
      });
      return designated ? [designated] : [];
    }
    const fallback = await this.db.getRepository(User).find({
      where: [
        { role: UserRole.HR, isActive: true },
        { role: UserRole.SUPERADMIN, isActive: true },
      ],
      select: { id: true, fullName: true, email: true, jobTitle: true, role: true },
      order: { fullName: 'ASC', id: 'ASC' },
    });
    return [...managers, ...fallback];
  }

  async schedule(id: number, input: ScheduleInput, actor: Actor) {
    assertOperator(actor);
    if (new Date(input.scheduledAt).getMilliseconds() !== 0)
      throw new BadRequestException('Thời gian xếp lịch chỉ nhận độ chính xác đến giây.');
    if (
      !/(Z|[+-]\d{2}:\d{2})$/i.test(input.scheduledAt) ||
      new Date(input.scheduledAt).getTime() <= Date.now()
    ) {
      throw new BadRequestException('Chọn thời gian tương lai có múi giờ.');
    }
    const result = await this.db.transaction(async (manager) => {
      const app = await this.locked(manager, id, actor);
      if (![ApplicationStatus.APPLIED, ApplicationStatus.INTERVIEWING].includes(app.status))
        throw new ConflictException('Hồ sơ không còn được xếp lịch.');
      const job = await manager.getRepository(Job).findOne({
        where: { id: app.jobId },
        relations: ['department'],
      });
      if (!job?.department) throw new NotFoundException('Không tìm thấy phòng ban tuyển dụng.');
      const interviewer = await manager.getRepository(User).findOneBy({
        id: input.interviewerId,
        isActive: true,
      });
      const fallbackAllowed =
        !job.department.managerId &&
        interviewer && [UserRole.HR, UserRole.SUPERADMIN].includes(interviewer.role);
      const designatedManager =
        job.department.managerId && interviewer?.id === job.department.managerId;
      const sameDepartmentManager =
        !job.department.managerId &&
        interviewer?.role === UserRole.MANAGER &&
        interviewer.departmentId === job.departmentId;
      if (!interviewer || (!designatedManager && !sameDepartmentManager && !fallbackAllowed))
        throw new BadRequestException(
          'Người phỏng vấn phải là Manager của phòng ban hoặc HR/SuperAdmin khi phòng ban chưa có Manager.',
        );
      const existing = await manager
        .getRepository(Interview)
        .findOneBy({ applicationId: id, round: input.round });
      if (existing) {
        if (
          existing.interviewerId !== input.interviewerId ||
          existing.scheduledAt.getTime() !== new Date(input.scheduledAt).getTime()
        )
          throw new ConflictException('Vòng phỏng vấn này đã có lịch khác.');
        return { interview: existing, app, interviewer, created: false };
      }
      const last = await manager
        .getRepository(Interview)
        .findOne({ where: { applicationId: id }, order: { round: 'DESC' } });
      if (input.round !== (last?.round || 0) + 1)
        throw new ConflictException('Số vòng phải nối tiếp vòng gần nhất.');
      const interview = await manager.getRepository(Interview).save(
        manager.getRepository(Interview).create({
          applicationId: id,
          interviewerId: input.interviewerId,
          round: input.round,
          scheduledAt: new Date(input.scheduledAt),
          result: InterviewResult.PENDING,
        }),
      );
      app.status = ApplicationStatus.INTERVIEWING;
      app.updatedAt = nextRevision(app.updatedAt);
      await manager.getRepository(Application).save(app);
      const sender = this.config.get<string>('MAIL_FROM') || this.config.get<string>('GMAIL_USER');
      const payload = {
        interviewId: interview.id,
        applicationId: id,
        candidateName: app.candidateName,
        candidateEmail: app.candidateEmail,
        interviewerName: interviewer.fullName,
        interviewerEmail: interviewer.email,
        scheduledAt: interview.scheduledAt.toISOString(),
        round: interview.round,
        ...(sender ? { fromEmail: sender } : {}),
      };
      const delivery = await this.delivery.prepare(manager, payload);
      return { interview, app, interviewer, created: true, payload: { ...payload, delivery } };
    });
    let dispatch = 'NOT_RETRIED';
    if (result.created) {
      try {
        const accepted = await this.n8n.triggerInterviewScheduled(result.payload);
        dispatch = accepted ? 'UNVERIFIED' : 'FAILED';
      } catch {
        dispatch = 'FAILED';
      }
      if (dispatch === 'FAILED') await this.delivery.dispatchFailed(result.interview.id);
    }
    const interview = (await this.detail(id, actor)).interviews.find(
      (i) => i.id === result.interview.id,
    );
    return {
      interview,
      dispatch,
      message:
        dispatch === 'FAILED'
          ? 'Đã lưu lịch nhưng chưa gửi được yêu cầu tạo Meet và thư mời. Hãy kiểm tra workflow.'
          : result.created && result.payload.delivery
            ? 'Đã lưu lịch. Đang chờ kết quả tạo Google Meet và gửi thư mời.'
            : 'Đã lưu lịch. Chưa xác nhận email/Google Meet; hãy kiểm tra workflow.',
    };
  }

  async result(interviewId: number, input: ResultInput, actor: Actor) {
    if (input.result === InterviewResult.PENDING)
      throw new BadRequestException('Chọn Đạt hoặc Chưa đạt.');
    const record = await this.db.getRepository(Interview).findOneBy({ id: interviewId });
    if (!record) throw new NotFoundException('Không tìm thấy lịch.');
    await this.db.transaction(async (manager) => {
      const app = await this.locked(manager, record.applicationId, actor, true);
      const interview = await manager
        .getRepository(Interview)
        .findOne({ where: { id: interviewId }, lock: { mode: 'pessimistic_write' } });
      if (interview.interviewerId !== actor.id)
        throw new ForbiddenException('Bạn không được phân công vòng này.');
      if (app.status !== ApplicationStatus.INTERVIEWING)
        throw new ConflictException('Chỉ chấm khi hồ sơ đang phỏng vấn.');
      if (interview.result !== input.expectedResult)
        throw new ConflictException('Kết quả đã đổi. Hãy tải lại.');
      assertFresh(interview.updatedAt, input.expectedUpdatedAt);
      interview.score = input.score;
      interview.interviewerFeedback = input.feedback;
      interview.result = input.result;
      interview.updatedAt = nextRevision(interview.updatedAt);
      await manager.getRepository(Interview).save(interview);
    });
    return this.detail(record.applicationId, actor, true);
  }

  async questions(interviewId: number, actor: Actor) {
    const key = 'questions:' + interviewId;
    if (this.activeAi.has(key))
      throw new ConflictException('Vòng phỏng vấn đang được tạo câu hỏi.');
    this.activeAi.add(key);
    try {
      return await this.generateQuestions(interviewId, actor);
    } finally {
      this.activeAi.delete(key);
    }
  }

  private async generateQuestions(interviewId: number, actor: Actor) {
    const interview = await this.db.getRepository(Interview).findOneBy({ id: interviewId });
    if (!interview) throw new NotFoundException('Không tìm thấy lịch.');
    if (interview.interviewerId !== actor.id)
      throw new ForbiddenException('Chỉ người được phân công vòng này mới được gợi ý câu hỏi.');
    const app = await this.row(interview.applicationId, actor, true);
    if (
      app.status !== ApplicationStatus.INTERVIEWING ||
      interview.result !== InterviewResult.PENDING
    )
      throw new ConflictException('Chỉ tạo câu hỏi cho vòng phỏng vấn đang chờ.');
    if (!app.rawCvText) throw new BadRequestException('CV không có văn bản.');
    const result = await this.ai.questions(app.rawCvText, app.job.requirements);
    if (result.mode === 'LIVE')
      await this.db.transaction(async (manager) => {
        const currentApp = await this.locked(manager, app.id, actor, true);
        const current = await manager
          .getRepository(Interview)
          .findOne({ where: { id: interviewId }, lock: { mode: 'pessimistic_write' } });
        if (current.interviewerId !== actor.id)
          throw new ForbiddenException('Bạn không còn được phân công vòng này.');
        assertFresh(currentApp.updatedAt, app.updatedAt.toISOString());
        assertFresh(current.updatedAt, interview.updatedAt.toISOString());
        if (
          currentApp.status !== ApplicationStatus.INTERVIEWING ||
          current.result !== InterviewResult.PENDING
        )
          throw new ConflictException('Vòng phỏng vấn đã thay đổi.');
        const job = await manager
          .getRepository(Job)
          .findOne({ where: { id: app.jobId }, lock: { mode: 'pessimistic_read' } });
        if (job.requirements !== app.job.requirements)
          throw new ConflictException('Yêu cầu tuyển dụng đã thay đổi.');
        current.aiSuggestedQuestions = result.data;
        current.updatedAt = nextRevision(current.updatedAt);
        await manager.getRepository(Interview).save(current);
      });
    return { ...result, saved: result.mode === 'LIVE' };
  }

  async hire(id: number, actor: Actor) {
    return this.hireCandidate(id, actor);
  }

  // Lead main 764bf37 supplies the hireCandidate provisioning flow and five tasks.
  // Keep the ATS authorization/preconditions and make its DB writes atomic.
  async hireCandidate(applicationId: number, actor: Actor) {
    assertOperator(actor);
    let provisioned: {
      receipt: {
        success: boolean;
        alreadyHired: boolean;
        hiredUserId: number;
        email: string;
        fullName: string;
        onboardingTasksCount: number;
      };
      notification?: {
        userId: number;
        fullName: string;
        email: string;
        jobTitle: string;
        departmentName: string;
        tempPassword: string;
      };
    };
    try {
      provisioned = await this.db.transaction(async (manager) => {
        const app = await this.locked(manager, applicationId, actor);
        if (app.status === ApplicationStatus.HIRED && app.hiredUserId) {
          const user = await manager.getRepository(User).findOneBy({ id: app.hiredUserId });
          if (!user)
            throw new ConflictException(
              'Hồ sơ đã nhận việc nhưng thiếu tài khoản nhân viên. Cần HR kiểm tra.',
            );
          const count = await manager.getRepository(OnboardingTask).countBy({ userId: user.id });
          return {
            receipt: {
              success: true,
              alreadyHired: true,
              hiredUserId: user.id,
              email: user.email,
              fullName: user.fullName,
              onboardingTasksCount: count,
            },
          };
        }
        if (![ApplicationStatus.INTERVIEWING, ApplicationStatus.OFFERED].includes(app.status))
          throw new ConflictException('Hồ sơ chưa ở bước nhận việc.');
        const latest = await manager.getRepository(Interview).findOne({
          where: { applicationId },
          order: { round: 'DESC', id: 'DESC' },
          lock: { mode: 'pessimistic_read' },
        });
        if (latest?.result !== InterviewResult.PASSED)
          throw new ConflictException('Vòng phỏng vấn mới nhất chưa đạt.');
        const job = await manager
          .getRepository(Job)
          .findOne({ where: { id: app.jobId }, relations: ['department'] });
        const email = app.candidateEmail.trim().toLowerCase();
        if (await manager.getRepository(User).findOneBy({ email }))
          throw new ConflictException(
            'Email ứng viên đã có tài khoản. HR cần đối soát tài khoản trước khi tuyển.',
          );
        const tempPassword = randomBytes(24).toString('base64url');
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        const user = await manager.getRepository(User).save(
          manager.getRepository(User).create({
            fullName: app.candidateName,
            email,
            phone: app.candidatePhone,
            passwordHash,
            role: UserRole.EMPLOYEE,
            departmentId: job.departmentId,
            jobTitle: job.title.slice(0, 100),
            isActive: true,
          }),
        );
        const defaultOnboardingTasks = [
          {
            userId: user.id,
            title: 'Nộp hồ sơ nhân sự & Ký hợp đồng lao động',
            description:
              'Nộp bản sao CCCD, bằng cấp chuyên môn và hoàn tất ký hợp đồng thử việc tại phòng HR.',
            category: TaskCategory.PAPERWORK,
            dueDay: 1,
          },
          {
            userId: user.id,
            title: 'Nhận máy tính làm việc & Cài đặt môi trường dự án',
            description:
              'Gặp bộ phận IT Helpdesk nhận laptop công ty, cài đặt môi trường phát triển và kết nối mạng nội bộ.',
            category: TaskCategory.EQUIPMENT,
            dueDay: 2,
          },
          {
            userId: user.id,
            title: 'Gặp gỡ Quản lý trực tiếp & Phân công Buddy hướng dẫn',
            description:
              'Buổi họp chào mừng định hướng mục tiêu công việc thử việc và nhận phân công người kèm cặp (Buddy).',
            category: TaskCategory.MEETING,
            dueDay: 3,
          },
          {
            userId: user.id,
            title: 'Hoàn thành khóa học hội nhập văn hóa & An toàn thông tin',
            description:
              'Đọc kỹ sổ tay nhân viên 2026, hoàn thành bài kiểm tra quy chế bảo mật thông tin nội bộ.',
            category: TaskCategory.TRAINING,
            dueDay: 7,
          },
          {
            userId: user.id,
            title: 'Đánh giá tổng kết thử việc 30 ngày cùng Manager',
            description:
              'Họp 1-on-1 cùng Trưởng phòng để tổng kết đánh giá kết quả hòa nhập và kế hoạch mục tiêu quý.',
            category: TaskCategory.MEETING,
            dueDay: 30,
          },
        ];
        await manager
          .getRepository(OnboardingTask)
          .save(
            defaultOnboardingTasks.map((task) =>
              manager.getRepository(OnboardingTask).create(task),
            ),
          );
        app.status = ApplicationStatus.HIRED;
        app.hiredUserId = user.id;
        app.updatedAt = nextRevision(app.updatedAt);
        await manager.getRepository(Application).save(app);
        return {
          receipt: {
            success: true,
            alreadyHired: false,
            hiredUserId: user.id,
            email: user.email,
            fullName: user.fullName,
            onboardingTasksCount: defaultOnboardingTasks.length,
          },
          notification: {
            userId: user.id,
            fullName: user.fullName,
            email: user.email,
            jobTitle: user.jobTitle,
            departmentName: job.department.name,
            tempPassword,
          },
        };
      });
    } catch (error: any) {
      if (error?.driverError?.code === 'ER_DUP_ENTRY' || error?.code === 'ER_DUP_ENTRY')
        throw new ConflictException(
          'Email này vừa được dùng cho tài khoản khác. Hồ sơ chưa đổi trạng thái; hãy tải lại để kiểm tra.',
        );
      throw error;
    }
    let welcomeEmailStatus: 'DISPATCHED_UNVERIFIED' | 'FAILED' | 'NOT_RETRIED' = 'NOT_RETRIED';
    if (provisioned.notification) {
      try {
        welcomeEmailStatus = (await this.n8n.triggerEmployeeHired(provisioned.notification))
          ? 'DISPATCHED_UNVERIFIED'
          : 'FAILED';
      } catch {
        welcomeEmailStatus = 'FAILED';
        this.logger.warn('Không khởi chạy được thư chào mừng sau khi tuyển dụng.');
      }
    }
    // A true from the lead dispatcher is asynchronous, not proof of email delivery.
    // Passwords stay in the dispatcher payload and never appear in an ATS response.
    return { ...provisioned.receipt, welcomeEmailStatus };
  }
}
