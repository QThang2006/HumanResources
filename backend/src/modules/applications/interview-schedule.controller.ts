import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview } from '../../entities/interview.entity';
import { UserRole } from '../../entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Actor, assertOperator } from '../jobs/recruitment.policy';
import { InterviewScheduleId, InterviewScheduleQuery } from './interview-schedule.dto';

// Only verified-format HTTPS Google Meet rooms become navigation targets.
function meetingLink(value: string | null) {
  return /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(value || '')
    ? value
    : null;
}
function view(row: Interview) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    candidateName: row.application.candidateName,
    candidateEmail: row.application.candidateEmail,
    applicationStatus: row.application.status,
    jobId: row.application.jobId,
    jobTitle: row.application.job.title,
    departmentId: row.application.job.departmentId,
    departmentName: row.application.job.department.name,
    interviewerId: row.interviewerId,
    interviewerName: row.interviewer.fullName,
    round: row.round,
    scheduledAt: row.scheduledAt,
    result: row.result,
    score: row.score,
    meetingLink: meetingLink(row.meetingLink),
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class InterviewScheduleService {
  constructor(@InjectRepository(Interview) private readonly interviews: Repository<Interview>) {}

  private scoped(actor: Actor) {
    const qb = this.interviews
      .createQueryBuilder('interview')
      .innerJoin('interview.application', 'application')
      .innerJoin('application.job', 'job')
      .innerJoin('job.department', 'department')
      .innerJoin('interview.interviewer', 'interviewer');
    if (actor.role === UserRole.MANAGER) {
      if (actor.departmentId) qb.where('job.departmentId = :scope', { scope: actor.departmentId });
      else qb.where('1 = 0');
    } else assertOperator(actor);
    return qb;
  }

  private load(actor: Actor) {
    // Select only fields displayed by this feature. Never fetch CVs, password hashes or callback tokens.
    return this.scoped(actor).select([
      'interview.id',
      'interview.applicationId',
      'interview.interviewerId',
      'interview.round',
      'interview.scheduledAt',
      'interview.result',
      'interview.score',
      'interview.meetingLink',
      'interview.updatedAt',
      'application.id',
      'application.jobId',
      'application.candidateName',
      'application.candidateEmail',
      'application.status',
      'job.id',
      'job.title',
      'job.departmentId',
      'department.id',
      'department.name',
      'interviewer.id',
      'interviewer.fullName',
    ]);
  }

  async list(input: InterviewScheduleQuery, actor: Actor) {
    const from = new Date(input.from),
      to = new Date(input.to);
    if (
      ![input.from, input.to].every((value) => /(Z|[+-]\d{2}:\d{2})$/i.test(value)) ||
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(to.getTime()) ||
      from >= to ||
      to.getTime() - from.getTime() > 62 * 86400000
    ) {
      throw new BadRequestException(
        'Chọn khoảng thời gian tối đa 62 ngày, có múi giờ và thời điểm kết thúc sau bắt đầu.',
      );
    }
    const qb = this.load(actor).andWhere(
      'interview.scheduledAt >= :from AND interview.scheduledAt < :to',
      { from, to },
    );
    if (input.jobId) qb.andWhere('job.id = :jobId', { jobId: input.jobId });
    if (input.interviewerId)
      qb.andWhere('interview.interviewerId = :interviewerId', {
        interviewerId: input.interviewerId,
      });
    if (input.result) qb.andWhere('interview.result = :result', { result: input.result });
    if (input.q)
      qb.andWhere(
        '(application.candidateName LIKE :q OR application.candidateEmail LIKE :q OR job.title LIKE :q)',
        { q: '%' + input.q + '%' },
      );
    const [rows, total] = await qb
      .orderBy('interview.scheduledAt', 'ASC')
      .addOrderBy('interview.id', 'ASC')
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();
    return { items: rows.map(view), total, page: input.page, pageSize: input.pageSize };
  }

  async detail(id: number, actor: Actor) {
    const row = await this.load(actor).andWhere('interview.id = :id', { id }).getOne();
    if (!row) throw new NotFoundException('Không tìm thấy buổi phỏng vấn trong phạm vi của bạn.');
    return view(row);
  }

  async filters(actor: Actor) {
    const qb = this.scoped(actor);
    const [jobs, interviewers] = await Promise.all([
      qb
        .clone()
        .select('job.id', 'id')
        .addSelect('job.title', 'name')
        .distinct(true)
        .orderBy('job.title', 'ASC')
        .addOrderBy('job.id', 'ASC')
        .getRawMany(),
      qb
        .clone()
        .select('interviewer.id', 'id')
        .addSelect('interviewer.fullName', 'name')
        .distinct(true)
        .orderBy('interviewer.fullName', 'ASC')
        .addOrderBy('interviewer.id', 'ASC')
        .getRawMany(),
    ]);
    return {
      jobs: jobs.map((row) => ({ id: Number(row.id), name: row.name })),
      interviewers: interviewers.map((row) => ({ id: Number(row.id), name: row.name })),
    };
  }
}

@Controller('applications/interviews/schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.MANAGER)
export class InterviewScheduleController {
  constructor(private readonly schedule: InterviewScheduleService) {}

  @Get() list(@Query() input: InterviewScheduleQuery, @CurrentUser() actor: Actor) {
    return this.schedule.list(input, actor);
  }

  @Get('filters') filters(@CurrentUser() actor: Actor) {
    return this.schedule.filters(actor);
  }

  @Get(':id') detail(@Param() input: InterviewScheduleId, @CurrentUser() actor: Actor) {
    return this.schedule.detail(input.id, actor);
  }
}
