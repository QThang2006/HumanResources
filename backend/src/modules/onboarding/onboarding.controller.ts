import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { CheckInMoodDto } from './dto/check-in-mood.dto';
import { ResolveMoodDto } from './dto/resolve-mood.dto';
import { ChatCopilotDto } from './dto/chat-copilot.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // Lấy checklist nhiệm vụ onboarding
  @UseGuards(JwtAuthGuard)
  @Get('tasks')
  async getTasks(@CurrentUser('id') userId: number) {
    return this.onboardingService.getTasks(userId);
  }

  // Tích / bỏ tích nhiệm vụ
  @UseGuards(JwtAuthGuard)
  @Patch('tasks/:id/toggle')
  async toggleTask(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.onboardingService.toggleTask(id, userId);
  }

  // Kiểm tra đã check-in cảm xúc hôm nay chưa (Frontend dùng để hiện trạng thái)
  @UseGuards(JwtAuthGuard)
  @Get('mood/today')
  async getTodayMood(@CurrentUser('id') userId: number) {
    return this.onboardingService.getTodayMood(userId);
  }

  // Lịch sử cảm xúc 7 ngày gần nhất (Frontend hiển thị mood dots)
  @UseGuards(JwtAuthGuard)
  @Get('mood/history')
  async getMoodHistory(@CurrentUser('id') userId: number) {
    return this.onboardingService.getMoodHistory(userId);
  }

  // Check-in cảm xúc nhân viên hàng ngày (Engagement Agent)
  @UseGuards(JwtAuthGuard)
  @Post('mood')
  async checkInMood(
    @CurrentUser('id') userId: number,
    @Body() dto: CheckInMoodDto,
  ) {
    return this.onboardingService.recordMood(userId, dto.mood, dto.feedbackText);
  }

  // Dashboard Team Mood (Manager, HR, SuperAdmin giám sát mood theo từng phòng ban)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.HR, UserRole.SUPERADMIN)
  @Get('team-mood')
  async getTeamMood(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') userRole: UserRole,
    @Query('departmentId') departmentId?: string,
  ) {
    const parsedDeptId = departmentId ? parseInt(departmentId, 10) : undefined;
    return this.onboardingService.getTeamMood(
      userId,
      userRole,
      isNaN(parsedDeptId as any) ? undefined : parsedDeptId,
    );
  }

  // Danh sách cảnh báo kiệt sức Burnout (HR & SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @Get('burnout-alerts')
  async getBurnoutAlerts() {
    return this.onboardingService.getBurnoutAlerts();
  }

  // Trưởng phòng can thiệp xử lý cảnh báo kiệt sức (1-1 Review)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.HR)
  @Patch('mood/:id/resolve')
  async resolveMoodAlert(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: ResolveMoodDto,
  ) {
    return this.onboardingService.resolveBurnout(id, userId, dto.note);
  }

  // Lấy danh sách khóa học đào tạo (L&D) được gán cho nhân viên
  @UseGuards(JwtAuthGuard)
  @Get('trainings')
  async getTrainings(@CurrentUser('id') userId: number) {
    return this.onboardingService.getTrainings(userId);
  }

  // Cập nhật tiến độ học tập khóa đào tạo
  @UseGuards(JwtAuthGuard)
  @Patch('trainings/:id/progress')
  async updateTrainingProgress(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Body('progressPercent', ParseIntPipe) progressPercent: number,
  ) {
    return this.onboardingService.updateTrainingProgress(id, userId, progressPercent);
  }

  // Trợ lý Sổ tay Onboarding 24/7 (RAG Chatbot + Function Calling tự tích checklist)
  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async chatWithCopilot(
    @CurrentUser('id') userId: number,
    @Body() dto: ChatCopilotDto,
  ) {
    return this.onboardingService.chatWithCopilot(userId, dto.message);
  }

  // Seed dữ liệu mẫu onboarding tasks cho user đang đăng nhập (dùng cho demo)
  @UseGuards(JwtAuthGuard)
  @Post('seed-tasks')
  async seedTasks(@CurrentUser('id') userId: number) {
    return this.onboardingService.seedOnboardingTasks(userId);
  }
}
