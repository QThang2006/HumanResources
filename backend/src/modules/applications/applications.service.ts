import * as bcrypt from 'bcrypt';
import { OnboardingTask, TaskCategory } from '../../entities/onboarding-task.entity';
import { BadRequestException, ConflictException, Logger, Injectable, NotFoundException, ServiceUnavailableException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Application, ApplicationStatus, AiRecommendation } from '../../entities/application.entity';
import { Job, JobStatus } from '../../entities/job.entity';
import { Interview, InterviewResult } from '../../entities/interview.entity';
import { User, UserRole } from '../../entities/user.entity';
import { RecruitmentAiService } from '../jobs/recruitment-ai.service';
import { Actor, assertOperator, assertScope, assertStatusTransition, assertFresh, nextRevision } from '../jobs/recruitment.policy';
import { ApplicationQuery, SubmitInput, StateInput, ScheduleInput, ResultInput } from '../jobs/recruitment.dto';
import { N8nService } from '../core/automation/n8n.service';
import { CvStorageService } from './cv-storage.service';

function interviewView(row: Interview) {
  return { id: row.id, applicationId: row.applicationId, interviewerId: row.interviewerId,
    interviewerName: row.interviewer?.fullName || '', round: row.round, scheduledAt: row.scheduledAt,
    meetingLink: row.meetingLink || null, questions: row.aiSuggestedQuestions || [],
    score: row.score, feedback: row.interviewerFeedback, result: row.result, updatedAt: row.updatedAt };
}
export function applicationView(row: Application) {
  return { id: row.id, jobId: row.jobId, jobTitle: row.job?.title || '', candidateName: row.candidateName,
    candidateEmail: row.candidateEmail, candidatePhone: row.candidatePhone, status: row.status,
    matchScore: row.matchScore === null ? null : Number(row.matchScore), aiSummary: row.aiSummary,
    aiRecommendation: row.aiRecommendation, skillsDetected: row.skillsDetected || [], hiredUserId: row.hiredUserId,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
    hasCv: /^[a-f0-9-]{36}\.pdf$/.test(row.cvFileUrl || ''), hasCvText: Boolean(row.rawCvText?.trim()),
    interviews: (row.interviews || []).sort((a, b) => b.round - a.round).map(interviewView) };
}
@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  private readonly activeAi = new Set<string>();
  constructor(@InjectRepository(Application) private readonly applications: Repository<Application>,
    private readonly db: DataSource, private readonly files: CvStorageService,
    private readonly ai: RecruitmentAiService, private readonly n8n: N8nService) {}

  private async scopedJob(id: number, actor: Actor) {
    const job = await this.db.getRepository(Job).findOneBy({ id });
    if (!job) throw new NotFoundException('Không tìm thấy vị trí tuyển dụng.');
    assertScope(actor, job.departmentId); return job;
  }
  private async row(id: number, actor: Actor) {
    const app = await this.applications.findOne({ where: { id }, relations: ['job', 'interviews', 'interviews.interviewer'] });
    if (!app) throw new NotFoundException('Không tìm thấy hồ sơ.');
    assertScope(actor, app.job.departmentId); return app;
  }
  private async locked(manager: EntityManager, id: number, actor: Actor) {
    const app = await manager.getRepository(Application).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!app) throw new NotFoundException('Không tìm thấy hồ sơ.');
    const job = await manager.getRepository(Job).findOneBy({ id: app.jobId });
    assertScope(actor, job.departmentId); return app;
  }
  async list(query: ApplicationQuery, actor: Actor) {
    await this.scopedJob(query.jobId, actor);
    const qb = this.applications.createQueryBuilder('app').leftJoinAndSelect('app.job', 'job')
      .where('app.jobId = :jobId', { jobId: query.jobId });
    if (query.status) qb.andWhere('app.status = :status', { status: query.status });
    else qb.andWhere('app.status != :rejected', { rejected: ApplicationStatus.REJECTED });
    if (query.minScore !== undefined) qb.andWhere('app.matchScore >= :minScore', { minScore: query.minScore });
    if (query.q) qb.andWhere('(app.candidateName LIKE :q OR app.candidateEmail LIKE :q)', { q: '%' + query.q + '%' });
    const counts = await qb.clone().select('app.status', 'status').addSelect('COUNT(*)', 'count').groupBy('app.status').getRawMany();
    const [rows, total] = await qb.orderBy('app.createdAt', 'DESC').addOrderBy('app.id', 'DESC')
      .skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
    return { items: rows.map(applicationView), total, page: query.page, pageSize: query.pageSize,
      counts: Object.fromEntries(counts.map(row => [row.status, Number(row.count)])) };
  }
  async detail(id: number, actor: Actor) { return applicationView(await this.row(id, actor)); }
  async download(id: number, actor: Actor) { const app = await this.row(id, actor); return this.files.read(app.cvFileUrl); }

  async apply(input: SubmitInput, file: Express.Multer.File) {
    const job = await this.db.getRepository(Job).findOneBy({ id: input.jobId, status: JobStatus.OPEN });
    if (!job) throw new NotFoundException('Vị trí đã đóng hoặc không tồn tại.');
    const rawCvText = await this.files.parse(file);
    const key = await this.files.save(file);
    try {
      const app = await this.db.transaction(async manager => {
        const lockedJob = await manager.getRepository(Job).findOne({ where: { id: input.jobId }, lock: { mode: 'pessimistic_write' } });
        if (!lockedJob || lockedJob.status !== JobStatus.OPEN) throw new ConflictException('Vị trí vừa đóng tuyển dụng.');
        return manager.getRepository(Application).save(manager.getRepository(Application).create({
          ...input, candidateEmail: input.candidateEmail.trim().toLowerCase(),
          cvFileUrl: key, rawCvText, status: ApplicationStatus.APPLIED,
        }));
      });
      return { applicationId: app.id, submittedAt: app.createdAt, message: 'Hồ sơ đã được lưu. HR sẽ xem xét CV của bạn.',
        warning: rawCvText ? null : 'PDF không có văn bản trích xuất. HR có thể tải CV để xem trực tiếp.' };
    } catch (error) {
      await this.files.remove(key);
      if (error?.driverError?.code === 'ER_DUP_ENTRY' || error?.code === 'ER_DUP_ENTRY') throw new ConflictException('Email này đã ứng tuyển vị trí này.');
      throw error;
    }
  }
  async status(id: number, input: StateInput, actor: Actor) {
    assertOperator(actor);
    await this.db.transaction(async manager => {
      const app = await this.locked(manager, id, actor);
      if (app.status !== input.expectedStatus) throw new ConflictException('Hồ sơ đã đổi trạng thái. Hãy tải lại.');
      assertStatusTransition(app.status, input.status);
      if (input.status === ApplicationStatus.OFFERED) {
        const latest = await manager.getRepository(Interview).findOne({ where: { applicationId: id }, order: { round: 'DESC' } });
        if (latest?.result !== InterviewResult.PASSED) throw new ConflictException('Vòng phỏng vấn mới nhất chưa đạt.');
      }
      app.status = input.status; app.updatedAt = nextRevision(app.updatedAt);
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
      if ([ApplicationStatus.HIRED, ApplicationStatus.REJECTED].includes(app.status)) throw new ConflictException('Hồ sơ đã kết thúc quy trình.');
      if (!app.rawCvText) throw new BadRequestException('CV chưa có văn bản. Hãy tải file để xem trực tiếp.');
      const jd = app.job.description + '\n' + app.job.requirements;
      const result = await this.ai.score(app.rawCvText, jd);
      // Shared schema has no provider-mode field: mock output is preview-only.
      if (result.mode === 'MOCK') return { ...result, saved: false };
      await this.db.transaction(async manager => {
        const current = await this.locked(manager, id, actor);
        assertFresh(current.updatedAt, app.updatedAt.toISOString());
        const job = await manager.getRepository(Job).findOne({ where: { id: app.jobId }, lock: { mode: 'pessimistic_read' } });
        if (job.description + '\n' + job.requirements !== jd) throw new ConflictException('JD đã đổi trong lúc chấm. Hãy thử lại.');
        current.matchScore = result.data.matchScore;
        current.aiSummary = result.data.summary;
        current.skillsDetected = result.data.skillsDetected;
        current.aiRecommendation = result.data.matchScore >= 85 ? AiRecommendation.STRONG_HIRE : result.data.matchScore >= 70 ? AiRecommendation.HIRE : result.data.matchScore >= 50 ? AiRecommendation.CONSIDER : AiRecommendation.REJECT;
        current.updatedAt = nextRevision(current.updatedAt);
        await manager.getRepository(Application).save(current);
      });
      return { ...result, saved: true };
    } finally { this.activeAi.delete(key); }
  }
  async interviewers(jobId: number, actor: Actor) {
    assertOperator(actor);
    const job = await this.scopedJob(jobId, actor);
    return this.db.getRepository(User).find({ where: { departmentId: job.departmentId, role: UserRole.MANAGER, isActive: true },
      select: { id: true, fullName: true }, order: { fullName: 'ASC' } });
  }
  async schedule(id: number, input: ScheduleInput, actor: Actor) {
    assertOperator(actor);
    if (new Date(input.scheduledAt).getMilliseconds() !== 0) throw new BadRequestException('Thời gian xếp lịch chỉ nhận độ chính xác đến giây.');
    if (!/(Z|[+-]\d{2}:\d{2})$/i.test(input.scheduledAt) || new Date(input.scheduledAt).getTime() <= Date.now()) {
      throw new BadRequestException('Chọn thời gian tương lai có múi giờ.');
    }
    const result = await this.db.transaction(async manager => {
      const app = await this.locked(manager, id, actor);
      if (![ApplicationStatus.APPLIED, ApplicationStatus.INTERVIEWING].includes(app.status)) throw new ConflictException('Hồ sơ không còn được xếp lịch.');
      const job = await manager.getRepository(Job).findOneBy({ id: app.jobId });
      const interviewer = await manager.getRepository(User).findOneBy({ id: input.interviewerId, role: UserRole.MANAGER, isActive: true, departmentId: job.departmentId });
      if (!interviewer) throw new BadRequestException('Người phỏng vấn phải là Manager đang hoạt động của phòng ban này.');
      const existing = await manager.getRepository(Interview).findOneBy({ applicationId: id, round: input.round });
      if (existing) {
        if (existing.interviewerId !== input.interviewerId || existing.scheduledAt.getTime() !== new Date(input.scheduledAt).getTime()) throw new ConflictException('Vòng phỏng vấn này đã có lịch khác.');
        return { interview: existing, app, interviewer, created: false };
      }
      const last = await manager.getRepository(Interview).findOne({ where: { applicationId: id }, order: { round: 'DESC' } });
      if (input.round !== (last?.round || 0) + 1) throw new ConflictException('Số vòng phải nối tiếp vòng gần nhất.');
      const interview = await manager.getRepository(Interview).save(manager.getRepository(Interview).create({
        applicationId: id, interviewerId: input.interviewerId, round: input.round, scheduledAt: new Date(input.scheduledAt), result: InterviewResult.PENDING,
      }));
      app.status = ApplicationStatus.INTERVIEWING; app.updatedAt = nextRevision(app.updatedAt);
      await manager.getRepository(Application).save(app);
      return { interview, app, interviewer, created: true };
    });
    let dispatch = 'NOT_RETRIED';
    if (result.created) {
      try {
        const accepted = await this.n8n.triggerInterviewScheduled({
          interviewId: result.interview.id, applicationId: id, candidateName: result.app.candidateName,
          candidateEmail: result.app.candidateEmail, interviewerName: result.interviewer.fullName,
          interviewerEmail: result.interviewer.email, scheduledAt: result.interview.scheduledAt.toISOString(), round: result.interview.round,
        });
        dispatch = accepted ? 'UNVERIFIED' : 'FAILED';
      } catch { dispatch = 'FAILED'; }
    }
    return { interview: interviewView(result.interview), dispatch,
      message: 'Đã lưu lịch. SDK hiện chưa xác nhận email/Google Meet hoàn tất; hãy kiểm tra workflow với lead.' };
  }
  async result(interviewId: number, input: ResultInput, actor: Actor) {
    if (actor.role !== UserRole.MANAGER) throw new ForbiddenException('Chỉ Manager được phân công mới chấm phỏng vấn.');
    if (input.result === InterviewResult.PENDING) throw new BadRequestException('Chọn Đạt hoặc Chưa đạt.');
    const record = await this.db.getRepository(Interview).findOneBy({ id: interviewId });
    if (!record) throw new NotFoundException('Không tìm thấy lịch.');
    await this.db.transaction(async manager => {
      const app = await this.locked(manager, record.applicationId, actor);
      const interview = await manager.getRepository(Interview).findOne({ where: { id: interviewId }, lock: { mode: 'pessimistic_write' } });
      if (interview.interviewerId !== actor.id) throw new ForbiddenException('Bạn không được phân công vòng này.');
      if (app.status !== ApplicationStatus.INTERVIEWING) throw new ConflictException('Chỉ chấm khi hồ sơ đang phỏng vấn.');
      if (interview.result !== input.expectedResult) throw new ConflictException('Kết quả đã đổi. Hãy tải lại.');
      assertFresh(interview.updatedAt, input.expectedUpdatedAt);
      interview.score = input.score; interview.interviewerFeedback = input.feedback;
      interview.result = input.result; interview.updatedAt = nextRevision(interview.updatedAt);
      await manager.getRepository(Interview).save(interview);
    });
    return this.detail(record.applicationId, actor);
  }
  async questions(interviewId: number, actor: Actor) {
    assertOperator(actor);
    const key = 'questions:' + interviewId;
    if (this.activeAi.has(key)) throw new ConflictException('Vòng phỏng vấn đang được tạo câu hỏi.');
    this.activeAi.add(key);
    try { return await this.generateQuestions(interviewId, actor); }
    finally { this.activeAi.delete(key); }
  }
  private async generateQuestions(interviewId: number, actor: Actor) {
    const interview = await this.db.getRepository(Interview).findOneBy({ id: interviewId });
    if (!interview) throw new NotFoundException('Không tìm thấy lịch.');
    const app = await this.row(interview.applicationId, actor);
    if (app.status !== ApplicationStatus.INTERVIEWING || interview.result !== InterviewResult.PENDING) throw new ConflictException('Chỉ tạo câu hỏi cho vòng phỏng vấn đang chờ.');
    if (!app.rawCvText) throw new BadRequestException('CV không có văn bản.');
    const result = await this.ai.questions(app.rawCvText, app.job.requirements);
    if (result.mode === 'LIVE') await this.db.transaction(async manager => {
      const currentApp = await this.locked(manager, app.id, actor);
      const current = await manager.getRepository(Interview).findOne({ where: { id: interviewId }, lock: { mode: 'pessimistic_write' } });
      assertFresh(currentApp.updatedAt, app.updatedAt.toISOString());
      assertFresh(current.updatedAt, interview.updatedAt.toISOString());
      if (currentApp.status !== ApplicationStatus.INTERVIEWING || current.result !== InterviewResult.PENDING) throw new ConflictException('Vòng phỏng vấn đã thay đổi.');
      const job = await manager.getRepository(Job).findOne({ where: { id: app.jobId }, lock: { mode: 'pessimistic_read' } });
      if (job.requirements !== app.job.requirements) throw new ConflictException('Yêu cầu tuyển dụng đã thay đổi.');
      current.aiSuggestedQuestions = result.data; current.updatedAt = nextRevision(current.updatedAt);
      await manager.getRepository(Interview).save(current);
    });
    return { ...result, saved: result.mode === 'LIVE' };
  }
  async hire(id: number, actor: Actor) {
    assertOperator(actor);
    const app = await this.row(id, actor);
    if (app.status === ApplicationStatus.HIRED && app.hiredUserId) return { hiredUserId: app.hiredUserId, alreadyHired: true };
    if (![ApplicationStatus.INTERVIEWING, ApplicationStatus.OFFERED].includes(app.status)) throw new ConflictException('Hồ sơ chưa ở bước nhận việc.');
    if ([...app.interviews].sort((a, b) => b.round - a.round)[0]?.result !== InterviewResult.PASSED) throw new ConflictException('Vòng phỏng vấn mới nhất chưa đạt.');
    throw new ServiceUnavailableException('Chưa thể nhận việc: lead cần bàn giao nguồn userId và hợp đồng provisioning. Chưa tạo tài khoản, task hoặc thay đổi hồ sơ.');
  }

  // Provisioning method supplied by lead main 764bf37; ATS guards call this engine.
  async hireCandidate(applicationId: number) {
    const app = await this.applications.findOne({
      where: { id: applicationId },
      relations: ['job', 'job.department'],
    });

    if (!app) {
      throw new NotFoundException(`Không tìm thấy hồ sơ ứng viên mang ID #${applicationId}`);
    }

    // 1. Kiểm tra tính Idempotent (Chống bấm lặp / Đã tuyển dụng trước đó)
    if (app.status === ApplicationStatus.HIRED && app.hiredUserId) {
      const existingUser = await this.db.getRepository(User).findOne({
        where: { id: app.hiredUserId },
        relations: ['department'],
      });
      return {
        success: true,
        alreadyHired: true,
        hiredUserId: app.hiredUserId,
        email: existingUser?.email || app.candidateEmail,
        fullName: existingUser?.fullName || app.candidateName,
        message: 'Ứng viên này đã hoàn tất quy trình tuyển dụng trước đó.',
      };
    }

    // 2. Tạo mật khẩu tạm thời an toàn
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `Enterprise@2026#${randomSuffix}`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // 3. Kiểm tra xem User với email này đã tồn tại chưa
    let user = await this.db.getRepository(User).findOne({
      where: { email: app.candidateEmail },
    });

    if (!user) {
      user = this.db.getRepository(User).create({
        fullName: app.candidateName,
        email: app.candidateEmail,
        phone: app.candidatePhone || '0901234567',
        passwordHash,
        role: UserRole.EMPLOYEE,
        jobTitle: app.job?.title || 'Chuyên viên Công nghệ',
        departmentId: app.job?.departmentId,
        isActive: true,
      });
      user = await this.db.getRepository(User).save(user);
      this.logger.log(`✅ Đã tạo tài khoản nhân sự mới [ID #${user.id}] cho ứng viên ${user.fullName}`);
    }

    // 4. Cập nhật trạng thái hồ sơ thành HIRED
    app.status = ApplicationStatus.HIRED;
    app.hiredUserId = user.id;
    await this.applications.save(app);

    // 5. Tự động khởi tạo 5 nhiệm vụ hội nhập đầu vào (Standard 30-Day Onboarding Checklist)
    const existingTasks = await this.db.getRepository(OnboardingTask).count({ where: { userId: user.id } });
    if (existingTasks === 0) {
      const defaultOnboardingTasks = [
        {
          userId: user.id,
          title: 'Nộp hồ sơ nhân sự & Ký hợp đồng lao động',
          description: 'Nộp bản sao CCCD, bằng cấp chuyên môn và hoàn tất ký hợp đồng thử việc tại phòng HR.',
          category: TaskCategory.PAPERWORK,
          dueDay: 1,
        },
        {
          userId: user.id,
          title: 'Nhận máy tính làm việc & Cài đặt môi trường dự án',
          description: 'Gặp bộ phận IT Helpdesk nhận laptop công ty, cài đặt môi trường phát triển và kết nối mạng nội bộ.',
          category: TaskCategory.EQUIPMENT,
          dueDay: 2,
        },
        {
          userId: user.id,
          title: 'Gặp gỡ Quản lý trực tiếp & Phân công Buddy hướng dẫn',
          description: 'Buổi họp chào mừng định hướng mục tiêu công việc thử việc và nhận phân công người kèm cặp (Buddy).',
          category: TaskCategory.MEETING,
          dueDay: 3,
        },
        {
          userId: user.id,
          title: 'Hoàn thành khóa học hội nhập văn hóa & An toàn thông tin',
          description: 'Đọc kỹ sổ tay nhân viên 2026, hoàn thành bài kiểm tra quy chế bảo mật thông tin nội bộ.',
          category: TaskCategory.TRAINING,
          dueDay: 7,
        },
        {
          userId: user.id,
          title: 'Đánh giá tổng kết thử việc 30 ngày cùng Manager',
          description: 'Họp 1-on-1 cùng Trưởng phòng để tổng kết đánh giá kết quả hòa nhập và kế hoạch mục tiêu quý.',
          category: TaskCategory.MEETING,
          dueDay: 30,
        },
      ];

      for (const t of defaultOnboardingTasks) {
        await this.db.getRepository(OnboardingTask).save(this.db.getRepository(OnboardingTask).create(t));
      }
      this.logger.log(`✅ Đã tự động tạo 5 nhiệm vụ Onboarding Checklist cho nhân viên ID #${user.id}`);
    }

    // 6. Kích hoạt Webhook n8n gửi email chào mừng & thông tin tài khoản
    const departmentName = app.job?.department?.name || 'Phòng Phát Triển Công Nghệ Số';
    await this.n8n.triggerEmployeeHired({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      jobTitle: user.jobTitle || 'Chuyên viên',
      departmentName,
      tempPassword,
    });

    return {
      success: true,
      hiredUserId: user.id,
      email: user.email,
      fullName: user.fullName,
      tempPassword,
      onboardingTasksCount: 5,
      message: 'Tuyển dụng nhân sự mới & bàn giao quy trình Onboarding thành công.',
    };
  }
}
