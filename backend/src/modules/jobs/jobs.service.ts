import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from '../../entities/job.entity';
import { Department } from '../../entities/department.entity';
import { User, UserRole } from '../../entities/user.entity';
import { GeminiService } from '../core/ai/gemini.service';
import { CreateJobDto } from './dto/create-job.dto';

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

  async findAll(actor?: JobsActor) {
    const where = !actor
      ? { status: JobStatus.OPEN }
      : actor.role === UserRole.MANAGER
        ? { departmentId: actor.departmentId || -1 }
        : {};
    if (actor && actor.role !== UserRole.MANAGER) this.assertScope(actor, 0);
    const jobs = await this.jobs.find({
      where,
      relations: ['department'],
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return jobs.map(jobView);
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
    const saved = await this.jobs.findOne({ where: { id: job.id }, relations: ['department'] });
    return jobView(saved);
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
