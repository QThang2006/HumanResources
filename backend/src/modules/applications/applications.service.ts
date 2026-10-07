import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { Application, ApplicationStatus, AiRecommendation } from '../../entities/application.entity';
import { Job } from '../../entities/job.entity';
import { User, UserRole } from '../../entities/user.entity';
import { OnboardingTask, TaskCategory } from '../../entities/onboarding-task.entity';
import { Interview, InterviewResult } from '../../entities/interview.entity';
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
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly appRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OnboardingTask)
    private readonly taskRepository: Repository<OnboardingTask>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
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

  // 1. Chấm điểm hồ sơ CV tự động bằng Gemini AI Matcher của Trưởng nhóm
  async scoreApplication(id: number) {
    const app = await this.findById(id);
    const jobInfo = app.job
      ? `Vị trí: ${app.job.title}\nPhòng ban: ${app.job.department?.name || ''}\nMô tả: ${app.job.description || ''}\nYêu cầu: ${app.job.requirements || ''}`
      : 'Vị trí phần mềm công nghệ thông tin';

    let scoreResult: any;
    let extractedTextFromDisk = '';

    // Kiểm tra nếu hồ sơ có tệp tin trên đĩa thì ưu tiên đọc lại file để bóc tách tối ưu
    if (app.cvFileUrl && app.cvFileUrl.startsWith('/uploads/cvs/')) {
      const diskPath = path.join(process.cwd(), app.cvFileUrl.replace(/^\//, ''));
      if (fs.existsSync(diskPath)) {
        try {
          const buffer = await fs.promises.readFile(diskPath);
          const ext = path.extname(diskPath).toLowerCase();
          const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/pdf';
          const fileResult = await this.geminiService.scoreResumeFile(buffer, mimeType, jobInfo);
          extractedTextFromDisk = fileResult.extractedText;
          scoreResult = fileResult;
        } catch (err: any) {
          this.logger.warn(`Không đọc được file từ đĩa: ${err.message}`);
        }
      }
    }

    if (!scoreResult) {
      const resumeContent = app.rawCvText && app.rawCvText.trim().length > 10
        ? app.rawCvText
        : `Ứng viên: ${app.candidateName}\nEmail: ${app.candidateEmail}\nĐiện thoại: ${app.candidatePhone || ''}\nFile CV: ${app.cvFileUrl}`;
      scoreResult = await this.geminiService.scoreResume(resumeContent, jobInfo);
    }

    // Tự động lưu văn bản bóc tách vào cột rawCvText nếu trước đó chưa có
    if (extractedTextFromDisk && (!app.rawCvText || app.rawCvText.trim().length < 10)) {
      app.rawCvText = extractedTextFromDisk;
    }

    // Cập nhật lại vào cơ sở dữ liệu
    app.matchScore = scoreResult.matchScore;
    app.skillsDetected = scoreResult.matchedSkills;
    app.aiSummary = `${scoreResult.summary}\nKhuyến nghị: ${scoreResult.recommendationNote}`;
    
    if (scoreResult.recommendation === 'STRONG_MATCH') {
      app.aiRecommendation = AiRecommendation.STRONG_HIRE;
    } else if (scoreResult.recommendation === 'GOOD_MATCH') {
      app.aiRecommendation = AiRecommendation.HIRE;
    } else if (scoreResult.recommendation === 'POTENTIAL') {
      app.aiRecommendation = AiRecommendation.CONSIDER;
    } else {
      app.aiRecommendation = AiRecommendation.REJECT;
    }

    await this.appRepository.save(app);
    return scoreResult;
  }

  // 2. Gợi ý bộ câu hỏi phỏng vấn kỹ thuật chuyên sâu cho Tech Lead
  async getInterviewQuestions(id: number) {
    const app = await this.findById(id);
    const jobReqs = app.job
      ? `Vị trí: ${app.job.title}\nYêu cầu: ${app.job.requirements || ''}`
      : 'Yêu cầu kỹ thuật lập trình phần mềm';

    const resumeContent = app.rawCvText && app.rawCvText.trim().length > 10
      ? app.rawCvText
      : `Ứng viên: ${app.candidateName}\nKinh nghiệm: Lập trình viên`;

    return this.geminiService.generateInterviewQuestions(resumeContent, jobReqs);
  }

  // Ứng viên nộp hồ sơ (Chấp nhận File PDF / Ảnh hoặc Text thô)
  async applyJob(
    data: {
      jobId: number;
      candidateName: string;
      candidateEmail: string;
      candidatePhone?: string;
      cvFileUrl?: string;
      rawCvText?: string;
    },
    file?: Express.Multer.File,
  ) {
    let jobInfo = 'Vị trí phần mềm công nghệ thông tin';
    try {
      const job = await this.jobRepository.findOne({
        where: { id: data.jobId },
        relations: ['department'],
      });
      if (job) {
        jobInfo = `Vị trí: ${job.title}\nPhòng ban: ${job.department?.name || ''}\nMô tả: ${job.description || ''}\nYêu cầu: ${job.requirements || ''}`;
      }
    } catch (e) {
      // Bỏ qua nếu chưa có job
    }

    let cvFileUrl = data.cvFileUrl || '/uploads/sample_cv.pdf';
    let rawCvText = data.rawCvText || '';
    let matchScore: number | undefined;
    let skillsDetected: string[] | undefined;
    let aiSummary: string | undefined;
    let aiRecommendation: AiRecommendation | undefined;

    // 1. Trường hợp nộp File (PDF hoặc Ảnh)
    if (file) {
      cvFileUrl = `/uploads/cvs/${file.filename}`;
      const buffer = file.buffer || (file.path ? await fs.promises.readFile(file.path) : null);
      if (buffer) {
        const aiFileResult = await this.geminiService.scoreResumeFile(
          buffer,
          file.mimetype,
          jobInfo,
        );

        // Lưu toàn bộ text bóc tách từ PDF/Ảnh vào cột rawCvText để search & phục vụ phỏng vấn sau này!
        rawCvText = aiFileResult.extractedText || rawCvText;
        matchScore = aiFileResult.matchScore;
        skillsDetected = aiFileResult.matchedSkills;
        aiSummary = `${aiFileResult.summary}\nKhuyến nghị: ${aiFileResult.recommendationNote}`;

        if (aiFileResult.recommendation === 'STRONG_MATCH') {
          aiRecommendation = AiRecommendation.STRONG_HIRE;
        } else if (aiFileResult.recommendation === 'GOOD_MATCH') {
          aiRecommendation = AiRecommendation.HIRE;
        } else if (aiFileResult.recommendation === 'POTENTIAL') {
          aiRecommendation = AiRecommendation.CONSIDER;
        } else {
          aiRecommendation = AiRecommendation.REJECT;
        }

        // Tự động bổ sung thông tin ứng viên nếu chưa điền đầy đủ
        if (!data.candidateName && aiFileResult.candidateName) {
          data.candidateName = aiFileResult.candidateName;
        }
        if (!data.candidateEmail && aiFileResult.candidateEmail) {
          data.candidateEmail = aiFileResult.candidateEmail;
        }
        if (!data.candidatePhone && aiFileResult.candidatePhone) {
          data.candidatePhone = aiFileResult.candidatePhone;
        }
      }
    } else if (rawCvText && rawCvText.trim().length > 10) {
      // 2. Trường hợp nộp text thuần
      const scoreResult = await this.geminiService.scoreResume(rawCvText, jobInfo);
      matchScore = scoreResult.matchScore;
      skillsDetected = scoreResult.matchedSkills;
      aiSummary = `${scoreResult.summary}\nKhuyến nghị: ${scoreResult.recommendationNote}`;

      if (scoreResult.recommendation === 'STRONG_MATCH') {
        aiRecommendation = AiRecommendation.STRONG_HIRE;
      } else if (scoreResult.recommendation === 'GOOD_MATCH') {
        aiRecommendation = AiRecommendation.HIRE;
      } else if (scoreResult.recommendation === 'POTENTIAL') {
        aiRecommendation = AiRecommendation.CONSIDER;
      } else {
        aiRecommendation = AiRecommendation.REJECT;
      }
    }

    const newApp = this.appRepository.create({
      jobId: data.jobId,
      candidateName: data.candidateName || 'Ứng viên Tuyển Dụng',
      candidateEmail: data.candidateEmail || 'candidate@example.com',
      candidatePhone: data.candidatePhone,
      cvFileUrl,
      rawCvText,
      matchScore,
      skillsDetected,
      aiSummary,
      aiRecommendation,
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

  /**
   * ⚡ 1-Click Tuyển dụng (1-Click Hired & Provisioning Engine)
   * Tự động: Tạo User mới -> Băm mật khẩu -> Gán 5 Onboarding Tasks -> Kích hoạt Webhook n8n
   * Tương thích hoàn toàn Idempotency (chống bấm lặp / tạo trùng)
   */
  async hireCandidate(applicationId: number) {
    const app = await this.appRepository.findOne({
      where: { id: applicationId },
      relations: ['job', 'job.department'],
    });

    if (!app) {
      throw new NotFoundException(`Không tìm thấy hồ sơ ứng viên mang ID #${applicationId}`);
    }

    // 1. Kiểm tra tính Idempotent (Chống bấm lặp / Đã tuyển dụng trước đó)
    if (app.status === ApplicationStatus.HIRED && app.hiredUserId) {
      const existingUser = await this.userRepository.findOne({
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
    let user = await this.userRepository.findOne({
      where: { email: app.candidateEmail },
    });

    if (!user) {
      user = this.userRepository.create({
        fullName: app.candidateName,
        email: app.candidateEmail,
        phone: app.candidatePhone || '0901234567',
        passwordHash,
        role: UserRole.EMPLOYEE,
        jobTitle: app.job?.title || 'Chuyên viên Công nghệ',
        departmentId: app.job?.departmentId,
        isActive: true,
      });
      user = await this.userRepository.save(user);
      this.logger.log(`✅ Đã tạo tài khoản nhân sự mới [ID #${user.id}] cho ứng viên ${user.fullName}`);
    }

    // 4. Cập nhật trạng thái hồ sơ thành HIRED
    app.status = ApplicationStatus.HIRED;
    app.hiredUserId = user.id;
    await this.appRepository.save(app);

    // 5. Tự động khởi tạo 5 nhiệm vụ hội nhập đầu vào (Standard 30-Day Onboarding Checklist)
    const existingTasks = await this.taskRepository.count({ where: { userId: user.id } });
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
        await this.taskRepository.save(this.taskRepository.create(t));
      }
      this.logger.log(`✅ Đã tự động tạo 5 nhiệm vụ Onboarding Checklist cho nhân viên ID #${user.id}`);
    }

    // 6. Kích hoạt Webhook n8n gửi email chào mừng & thông tin tài khoản
    const departmentName = app.job?.department?.name || 'Phòng Phát Triển Công Nghệ Số';
    await this.n8nService.triggerEmployeeHired({
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
