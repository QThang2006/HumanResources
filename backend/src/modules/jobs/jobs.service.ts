import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from '../../entities/job.entity';
import { GeminiService } from '../core/ai/gemini.service';

/**
 * 📌 PHÂN HỆ JOBS (TUYỂN DỤNG)
 * Phân công: Thành viên 2 sẽ hoàn thiện logic CRUD Jobs & AI JD Generator tại đây (Sprint 2)
 */
@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    private readonly geminiService: GeminiService,
  ) {}

  async findAll(onlyOpen: boolean = true) {
    const where = onlyOpen ? { status: JobStatus.OPEN } : {};
    return this.jobRepository.find({
      where,
      relations: ['department'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number) {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['department'],
    });
    if (!job) {
      throw new NotFoundException(`Không tìm thấy công việc ID #${id}`);
    }
    return job;
  }

  // TODO: Thành viên 2 sẽ hoàn thiện tính năng tạo tin tuyển dụng và gọi Gemini AI sinh JD
  async create(data: Partial<Job>) {
    const job = this.jobRepository.create(data);
    return this.jobRepository.save(job);
  }

  // Gọi dịch vụ AI của Trưởng nhóm để sinh JD chuẩn JSON
  async generateJDWithAI(title: string, departmentName: string, level: string) {
    return this.geminiService.generateJobDescription(title, departmentName, level);
  }
}
