import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from '../../entities/application.entity';
import { GeminiService } from '../core/ai/gemini.service';
import { N8nService } from '../core/automation/n8n.service';

/**
 * 📌 PHÂN HỆ APPLICATIONS & INTERVIEWS (ATS & PHỎNG VẤN)
 * Phân công: 
 * - Thành viên 2: Nộp đơn ứng tuyển, bóc tách CV bằng AI, xếp lịch & 1-Click Tuyển dụng (Sprint 2 & 3)
 * - Thành viên 3: Phỏng vấn kỹ thuật & Manager chấm điểm Pass/Fail (Sprint 3)
 */
@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepository: Repository<Application>,
    private readonly geminiService: GeminiService,
    private readonly n8nService: N8nService,
  ) {}

  async findAll(jobId?: number, status?: ApplicationStatus) {
    const query = this.appRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.job', 'job')
      .leftJoinAndSelect('job.department', 'department')
      .orderBy('app.createdAt', 'DESC');

    if (jobId) {
      query.andWhere('app.jobId = :jobId', { jobId });
    }
    if (status) {
      query.andWhere('app.status = :status', { status });
    }

    return query.getMany();
  }

  async findById(id: number) {
    const app = await this.appRepository.findOne({
      where: { id },
      relations: ['job', 'job.department', 'interviews'],
    });
    if (!app) {
      throw new NotFoundException(`Không tìm thấy hồ sơ ứng viên ID #${id}`);
    }
    return app;
  }

  // Cập nhật trạng thái Kanban
  async updateStatus(id: number, status: ApplicationStatus) {
    const app = await this.findById(id);
    app.status = status;
    return this.appRepository.save(app);
  }

  // TODO: Thành viên 2 sẽ sử dụng this.geminiService để bóc tách CV PDF & tính Match Score
  async applyJob(data: {
    jobId: number;
    candidateName: string;
    candidateEmail: string;
    candidatePhone?: string;
    cvFileUrl?: string;
    rawCvText?: string;
  }) {
    const newApp = this.appRepository.create({
      ...data,
      cvFileUrl: data.cvFileUrl || '/uploads/sample_cv.pdf',
      status: ApplicationStatus.APPLIED,
    });
    return this.appRepository.save(newApp);
  }

  // TODO: Thành viên 2 & 4 sẽ gọi this.n8nService.triggerInterviewScheduled để tự động tạo Google Meet
  async scheduleInterview(
    applicationId: number,
    interviewerId: number,
    scheduledAt: Date,
    round: number = 1,
  ) {
    return {
      applicationId,
      interviewerId,
      scheduledAt,
      round,
      message: 'Khung sườn đã sẵn sàng. Gọi this.n8nService để kích hoạt webhook Google Meet.',
    };
  }

  // TODO: Thành viên 3 sẽ hoàn thiện chấm điểm kỹ thuật cho Manager (Pass/Fail)
  async recordInterviewResult(
    interviewId: number,
    score: number,
    feedback: string,
    passed: boolean,
  ) {
    return {
      interviewId,
      score,
      feedback,
      passed,
      message: 'Khung sườn đã sẵn sàng. Thành viên 3 sẽ lưu kết quả phỏng vấn tại đây.',
    };
  }

  // TODO: Thành viên 2 sẽ hoàn thiện 1-Click Tuyển Dụng & gọi this.n8nService.triggerEmployeeHired
  async hireCandidate(applicationId: number) {
    return {
      applicationId,
      message: 'Khung sườn đã sẵn sàng. Thành viên 2 sẽ hoàn thiện logic 1-Click Tuyển Dụng tại đây.',
    };
  }
}
