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

  // TODO: Thành viên 2 sẽ sử dụng this.geminiService để sinh JD tự động theo prompt
  async generateJDWithAI(title: string, departmentName: string, level: string) {
    // Ví dụ mẫu: const aiResult = await this.geminiService.generateJson(...)
    return {
      title,
      departmentName,
      level,
      aiAvailable: this.geminiService.isAvailable(),
      message: 'Khung sườn đã sẵn sàng. Thành viên 2 sẽ gọi this.geminiService để sinh JD tại đây.',
    };
  }
}
