import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Raw, Repository } from 'typeorm';
import { Job, JobStatus } from '../../entities/job.entity';
import { Department } from '../../entities/department.entity';
import { Application } from '../../entities/application.entity';
import { User, UserRole } from '../../entities/user.entity';
import { GeminiService } from '../core/ai/gemini.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ChangeJobStatusDto } from './dto/change-job-status.dto';

type JobsActor = Pick<User, 'id' | 'role' | 'departmentId'>;

function jobView(job: Job) {
  return {
    id: job.id,
    title: job.title,
    departmentId: job.departmentId,
    departmentName: job.department?.name || '',
    location: job.location,
    salaryRange: job.salaryRange,
    description: job.description,
    requirements: job.requirements,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    private readonly geminiService: GeminiService,
    private readonly db: DataSource,
  ) {}

  private assertScope(actor: JobsActor, departmentId: number) {
    if (actor.role === UserRole.MANAGER) {
      if (!actor.departmentId || actor.departmentId !== departmentId) {
        throw new NotFoundException('Không tìm thấy tin trong phạm vi của bạn.');
      }
    } else if (![UserRole.HR, UserRole.SUPERADMIN].includes(actor.role)) {
      throw new ForbiddenException('Bạn không có quyền xem tin tuyển dụng nội bộ.');
    }
  }

  async findAll(actor?: JobsActor, q = '', departmentId?: number) {
    const where = !actor
      ? { status: JobStatus.OPEN }
      : actor.role === UserRole.MANAGER
        ? { departmentId: actor.departmentId || -1 }
        : {};
    if (actor && actor.role !== UserRole.MANAGER) this.assertScope(actor, 0);
    // A requested department can narrow a Manager's scope, never replace it.
    if (actor?.role === UserRole.MANAGER && departmentId !== undefined && departmentId !== actor.departmentId) return [];
    const departmentFilter = departmentId === undefined ? {} : { departmentId };
    // Bind the keyword and treat LIKE wildcards as literal search characters.
    const titleFilter = q ? {
      title: Raw(alias => `${alias} LIKE :searchTerm ESCAPE '!'`, {
        searchTerm: '%' + q.replace(/[!%_]/g, '!$&') + '%',
      }),
    } : {};
    const jobs = await this.jobs.find({
      where: { ...where, ...titleFilter, ...departmentFilter },
      relations: ['department'],
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return jobs.map(jobView);
  }

  async filters() {
    const departments = await this.departments.createQueryBuilder('department')
      .innerJoin('department.jobs', 'job', 'job.status = :status', { status: JobStatus.OPEN })
      .select('department.id', 'id')
      .addSelect('department.name', 'name')
      .distinct(true)
      .orderBy('department.name', 'ASC')
      .addOrderBy('department.id', 'ASC')
      .getRawMany<{ id: number; name: string }>();
    return { departments };
  }

  async findById(id: number, actor?: JobsActor) {
    const job = await this.jobs.findOne({ where: { id }, relations: ['department'] });
    if (!job || (!actor && job.status !== JobStatus.OPEN)) {
      throw new NotFoundException('Không tìm thấy vị trí tuyển dụng.');
    }
    if (actor) this.assertScope(actor, job.departmentId);
    return jobView(job);
  }

  async create(input: CreateJobDto, userId: number) {
    if (!await this.departments.existsBy({ id: input.departmentId })) {
      throw new BadRequestException('Phòng ban không tồn tại.');
    }
    const job = await this.jobs.save(this.jobs.create({
      title: input.title,
      departmentId: input.departmentId,
      location: input.location,
      salaryRange: input.salaryRange,
      description: input.description,
      requirements: input.requirements,
      createdBy: userId,
      status: JobStatus.OPEN,
    }));
    return this.savedJob(job.id);
  }

  private async savedJob(id: number) {
    const job = await this.jobs.findOne({ where: { id }, relations: ['department'] });
    if (!job) throw new NotFoundException('Không tìm thấy vị trí tuyển dụng.');
    return jobView(job);
  }

  private checkRevision(job: Job, expected: string) {
    if (job.updatedAt.getTime() !== new Date(expected).getTime()) {
      throw new ConflictException('Tin đã thay đổi. Hãy tải lại trước khi lưu.');
    }
  }

  private nextRevision(previous: Date) {
    return new Date(Math.max(Math.floor(Date.now() / 1000) * 1000, previous.getTime() + 1000));
  }

  async update(id: number, input: UpdateJobDto) {
    if (!await this.departments.existsBy({ id: input.departmentId })) {
      throw new BadRequestException('Phòng ban không tồn tại.');
    }
    await this.db.transaction(async manager => {
      const repository = manager.getRepository(Job);
      const job = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!job) throw new NotFoundException('Không tìm thấy vị trí tuyển dụng.');
      this.checkRevision(job, input.expectedUpdatedAt);
      if (job.departmentId !== input.departmentId &&
          await manager.getRepository(Application).existsBy({ jobId: id })) {
        throw new BadRequestException('Không chuyển phòng ban khi tin đã có hồ sơ.');
      }
      job.title = input.title;
      job.departmentId = input.departmentId;
      job.description = input.description;
      job.requirements = input.requirements;
      if (input.location !== undefined) job.location = input.location;
      if (input.salaryRange !== undefined) job.salaryRange = input.salaryRange;
      job.updatedAt = this.nextRevision(job.updatedAt);
      await repository.save(job);
    });
    return this.savedJob(id);
  }

  async changeStatus(id: number, input: ChangeJobStatusDto) {
    await this.db.transaction(async manager => {
      const repository = manager.getRepository(Job);
      const job = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!job) throw new NotFoundException('Không tìm thấy vị trí tuyển dụng.');
      this.checkRevision(job, input.expectedUpdatedAt);
      job.status = input.status;
      job.updatedAt = this.nextRevision(job.updatedAt);
      await repository.save(job);
    });
    return this.savedJob(id);
  }

  // Existing AI skeleton remains a separate feature for a later increment.
  async generateJDWithAI(title: string, departmentName: string, level: string) {
    return {
      title,
      departmentName,
      level,
      aiAvailable: this.geminiService.isAvailable(),
      message: 'Khung sườn đã sẵn sàng. Tính năng sinh JD chưa được triển khai.',
    };
  }
}
