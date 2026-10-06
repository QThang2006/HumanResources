import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { ApplicationStatus } from '../../entities/application.entity';
import { ApplyJobDto } from './dto/apply-job.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';

const cvUploadFolder = './uploads/cvs';
if (!fs.existsSync(cvUploadFolder)) {
  fs.mkdirSync(cvUploadFolder, { recursive: true });
}

const cvStorage = diskStorage({
  destination: cvUploadFolder,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    cb(null, `cv-${uniqueSuffix}${ext}`);
  },
});

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly appService: ApplicationsService) {}

  // 1. Ứng viên nộp hồ sơ công khai (Chấp nhận cả JSON hoặc Multipart File PDF / Ảnh)
  @Post('apply')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: cvStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // Tối đa 10MB
    }),
  )
  async submitApplication(
    @Body() dto: ApplyJobDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.appService.applyJob(dto, file);
  }

  // 2. Lấy danh sách hồ sơ cho Kanban ATS (HR, MANAGER, SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.MANAGER, UserRole.SUPERADMIN)
  @Get()
  async getApplications(
    @Query('jobId') jobId?: string,
    @Query('status') status?: ApplicationStatus,
  ) {
    return this.appService.findAll(jobId ? parseInt(jobId, 10) : undefined, status);
  }

  // 3. Xem chi tiết hồ sơ và đánh giá AI
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.MANAGER, UserRole.SUPERADMIN)
  @Get(':id')
  async getApplicationDetail(@Param('id', ParseIntPipe) id: number) {
    return this.appService.findById(id);
  }

  // 4. Kéo thả Kanban cập nhật trạng thái
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.MANAGER, UserRole.SUPERADMIN)
  @Patch(':id/status')
  async updateApplicationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ApplicationStatus,
  ) {
    return this.appService.updateStatus(id, status);
  }

  // 5. Xếp lịch phỏng vấn với AI gợi ý câu hỏi và n8n webhook
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @Post(':id/interview')
  async scheduleInterview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.appService.scheduleInterview(
      id,
      dto.interviewerId,
      new Date(dto.scheduledAt),
      dto.round || 1,
    );
  }

  // 6. Tuyển dụng 1-Click (1-Click Hired)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @Post(':id/hire')
  async hireCandidate(@Param('id', ParseIntPipe) id: number) {
    return this.appService.hireCandidate(id);
  }

  // 7. [AI Core] Chấm điểm CV & tính Match Score tự động (Dành cho HR, MANAGER, SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.MANAGER, UserRole.SUPERADMIN)
  @Post(':id/ai-score')
  async scoreApplication(@Param('id', ParseIntPipe) id: number) {
    return this.appService.scoreApplication(id);
  }

  // 8. [AI Core] Gợi ý bộ câu hỏi phỏng vấn kỹ thuật cho Tech Lead
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.MANAGER, UserRole.SUPERADMIN)
  @Get(':id/interview-questions')
  async getInterviewQuestions(@Param('id', ParseIntPipe) id: number) {
    return this.appService.getInterviewQuestions(id);
  }
}

