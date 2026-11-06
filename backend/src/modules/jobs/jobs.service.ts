import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindManyOptions, Raw, Repository } from 'typeorm';
import { Job, JobStatus } from '../../entities/job.entity';
import { Department } from '../../entities/department.entity';
import { Application } from '../../entities/application.entity';
import { User, UserRole } from '../../entities/user.entity';
import { RecruitmentAiService } from './recruitment-ai.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ChangeJobStatusDto } from './dto/change-job-status.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';

type JobsActor = Pick<User, 'id' | 'role' | 'departmentId'>;

function jobView(job: Job & { applicationCount?: number }) {
  return {
    id: job.id,
    title: job.title,
    departmentId: job.departmentId,
    departmentName: job.department?.name || '',
    location: job.location,
    salaryRange: job.salaryRange,
    description: job.description,
    requirements: job.requirements,
    level: job.level || 'Middle',
    employmentType: job.employmentType || 'Toàn thời gian',
    experienceYears: job.experienceYears || '1 - 3 năm',
    headcount: job.headcount ?? 1,
    deadline: job.deadline ? (job.deadline instanceof Date ? job.deadline.toISOString().split('T')[0] : String(job.deadline)) : null,
    benefits: job.benefits || null,
    skills: job.skills || null,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    applicationCount: job.applicationCount ?? 0,
  };
}

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    private readonly ai: RecruitmentAiService,
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

  async findAll(
    actor?: JobsActor,
    q = '',
    departmentId?: number,
    location = '',
    page?: number,
    pageSize?: number,
    status?: JobStatus,
  ) {
    const where = !actor
      ? { status: JobStatus.OPEN }
      : actor.role === UserRole.MANAGER
        ? { departmentId: actor.departmentId || -1 }
        : {};
    if (actor && actor.role !== UserRole.MANAGER) this.assertScope(actor, 0);
    // A requested department can narrow a Manager's scope, never replace it.
    if (
      actor?.role === UserRole.MANAGER &&
      departmentId !== undefined &&
      departmentId !== actor.departmentId
    ) {
      return page !== undefined && pageSize !== undefined
        ? { items: [], total: 0, page, pageSize }
        : [];
    }
    const departmentFilter = departmentId === undefined ? {} : { departmentId };
    const locationFilter = location ? { location } : {};
    // Bind the keyword and treat LIKE wildcards as literal search characters.
    const titleFilter = q
      ? {
          title: Raw((alias) => `${alias} LIKE :searchTerm ESCAPE '!'`, {
            searchTerm: '%' + q.replace(/[!%_]/g, '!$&') + '%',
          }),
        }
      : {};
    const options: FindManyOptions<Job> = {
      where: {
        ...where,
        ...(actor && status ? { status } : {}),
        ...titleFilter,
        ...departmentFilter,
        ...locationFilter,
      },
      relations: ['department'],
      order: { createdAt: 'DESC', id: 'DESC' },
    };
    if (page !== undefined && pageSize !== undefined) {
      const [jobs, total] = await this.jobs.findAndCount({
        ...options,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return { items: await this.views(jobs, actor), total, page, pageSize };
    }
    const jobs = await this.jobs.find(options);
    return this.views(jobs, actor);
  }

  private async views(rows: Job[], actor?: JobsActor) {
    if (!actor || !rows.length) return rows.map(jobView);
    const counts = await this.db
      .getRepository(Application)
      .createQueryBuilder('application')
      .select('application.jobId', 'jobId')
      .addSelect('COUNT(*)', 'count')
      .where('application.jobId IN (:...ids)', { ids: rows.map((row) => row.id) })
      .groupBy('application.jobId')
      .getRawMany<{ jobId: number; count: string }>();
    const byJob = new Map(counts.map((row) => [Number(row.jobId), Number(row.count)]));
    return rows.map((row) =>
      jobView(Object.assign(row, { applicationCount: byJob.get(row.id) || 0 })),
    );
  }

  private async applyDepartmentManager(
    manager: EntityManager,
    department: Department,
    managerId: number | null,
  ) {
    if (managerId === null) {
      department.managerId = null;
      return;
    }
    const user = await manager.getRepository(User).findOne({
      where: { id: managerId, isActive: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user || ![UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR].includes(user.role))
      throw new BadRequestException(
        'Chỉ có nhân sự EMPLOYEE, MANAGER hoặc HR đang hoạt động được bổ nhiệm.',
      );

    // A person can own one department at a time. Clear the old reverse link first.
    await manager
      .getRepository(Department)
      .createQueryBuilder()
      .update(Department)
      .set({ managerId: null })
      .where('manager_id = :managerId', { managerId })
      .andWhere('id != :departmentId', { departmentId: department.id })
      .execute();
    user.departmentId = department.id;
    if (user.role === UserRole.EMPLOYEE) {
      user.role = UserRole.MANAGER;
      user.jobTitle = 'Manager';
    }
    await manager.getRepository(User).save(user);
    department.managerId = user.id;
  }

  private departmentView(department: Department) {
    return {
      id: department.id,
      name: department.name,
      code: department.code,
      managerId: department.managerId || null,
    };
  }

  async createDepartment(input: CreateDepartmentDto) {
    const name = input.name.trim();
    const code = input.code.trim().toUpperCase();
    const existing = await this.departments.findOne({
      where: [{ name }, { code }],
    });
    if (existing) {
      throw new ConflictException('Tên hoặc mã phòng ban đã tồn tại.');
    }
    const department = await this.db.transaction(async (manager) => {
      const created = await manager.getRepository(Department).save(
        manager.getRepository(Department).create({
          name,
          code,
          description: input.description?.trim() || '',
          managerId: null,
        }),
      );
      await this.applyDepartmentManager(manager, created, input.managerId ?? null);
      return manager.getRepository(Department).save(created);
    });
    return this.departmentView(department);
  }

  async assignDepartmentManager(departmentId: number, managerId: number | null) {
    const department = await this.db.transaction(async (manager) => {
      const current = await manager.getRepository(Department).findOne({
        where: { id: departmentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) throw new NotFoundException('Không tìm thấy phòng ban.');
      await this.applyDepartmentManager(manager, current, managerId);
      return manager.getRepository(Department).save(current);
    });
    return this.departmentView(department);
  }

  async departmentManagers() {
    const users = await this.db.getRepository(User).find({
      where: [
        { isActive: true, role: UserRole.EMPLOYEE },
        { isActive: true, role: UserRole.MANAGER },
        { isActive: true, role: UserRole.HR },
      ],
      relations: ['department'],
      select: {
        id: true,
        fullName: true,
        email: true,
        jobTitle: true,
        role: true,
        departmentId: true,
      },
      order: { fullName: 'ASC', id: 'ASC' },
    });
    return users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      jobTitle: user.jobTitle || '',
      role: user.role,
      departmentId: user.departmentId || null,
      departmentName: user.department?.name || '',
    }));
  }

  async departmentLookup() {
    return this.departments.find({
      select: { id: true, name: true, code: true, managerId: true },
      order: { name: 'ASC' },
    });
  }

  async filters() {
    const departments = await this.departments
      .createQueryBuilder('department')
      .innerJoin('department.jobs', 'job', 'job.status = :status', { status: JobStatus.OPEN })
      .select('department.id', 'id')
      .addSelect('department.name', 'name')
      .distinct(true)
      .orderBy('department.name', 'ASC')
      .addOrderBy('department.id', 'ASC')
      .getRawMany<{ id: number; name: string }>();
    const locations = await this.jobs
      .createQueryBuilder('job')
      .select('job.location', 'location')
      .where('job.status = :status', { status: JobStatus.OPEN })
      .andWhere("TRIM(job.location) <> ''")
      .distinct(true)
      .orderBy('job.location', 'ASC')
      .getRawMany<{ location: string }>();
    return { departments, locations: locations.map((row) => row.location) };
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
    if (!(await this.departments.existsBy({ id: input.departmentId }))) {
      throw new BadRequestException('Phòng ban không tồn tại.');
    }
    const job = await this.jobs.save(
      this.jobs.create({
        title: input.title,
        departmentId: input.departmentId,
        location: input.location,
        salaryRange: input.salaryRange,
        description: input.description,
        requirements: input.requirements,
        level: input.level || 'Middle',
        employmentType: input.employmentType || 'Toàn thời gian',
        experienceYears: input.experienceYears || '1 - 3 năm',
        headcount: input.headcount ?? 1,
        deadline: input.deadline ? new Date(input.deadline) : null,
        benefits: input.benefits || null,
        skills: input.skills || null,
        createdBy: userId,
        status: JobStatus.OPEN,
      }),
    );
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
    if (!(await this.departments.existsBy({ id: input.departmentId }))) {
      throw new BadRequestException('Phòng ban không tồn tại.');
    }
    await this.db.transaction(async (manager) => {
      const repository = manager.getRepository(Job);
      const job = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!job) throw new NotFoundException('Không tìm thấy vị trí tuyển dụng.');
      this.checkRevision(job, input.expectedUpdatedAt);
      if (
        job.departmentId !== input.departmentId &&
        (await manager.getRepository(Application).existsBy({ jobId: id }))
      ) {
        throw new BadRequestException('Không chuyển phòng ban khi tin đã có hồ sơ.');
      }
      job.title = input.title;
      job.departmentId = input.departmentId;
      job.description = input.description;
      job.requirements = input.requirements;
      if (input.location !== undefined) job.location = input.location;
      if (input.salaryRange !== undefined) job.salaryRange = input.salaryRange;
      if (input.level !== undefined) job.level = input.level;
      if (input.employmentType !== undefined) job.employmentType = input.employmentType;
      if (input.experienceYears !== undefined) job.experienceYears = input.experienceYears;
      if (input.headcount !== undefined) job.headcount = input.headcount;
      if (input.deadline !== undefined) job.deadline = input.deadline ? new Date(input.deadline) : null;
      if (input.benefits !== undefined) job.benefits = input.benefits;
      if (input.skills !== undefined) job.skills = input.skills;
      job.updatedAt = this.nextRevision(job.updatedAt);
      await repository.save(job);
    });
    return this.savedJob(id);
  }

  async changeStatus(id: number, input: ChangeJobStatusDto) {
    await this.db.transaction(async (manager) => {
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

  async generateJDWithAI(
    title: string,
    departmentName: string,
    level: string,
    context?: {
      skills?: string;
      experienceYears?: string;
      employmentType?: string;
      location?: string;
      salaryRange?: string;
      specialNotes?: string;
    },
  ) {
    return this.ai.jd(title, departmentName, level, context);
  }
}
