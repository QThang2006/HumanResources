import { Body, Controller, Get, Post, Query, UseGuards, ParseBoolPipe } from '@nestjs/common';
import { AutomationSecretGuard } from '../../common/guards/automation-secret.guard';
import { TrainingService } from './training.service';
import { AutomationDeliveryStatus, ReviewReminderPhase } from '../../entities';
import { PerformanceReviewService } from './performance-review.service';

@Controller('training/automation')
@UseGuards(AutomationSecretGuard)
export class TrainingAutomationController {
  constructor(
    private readonly trainingService: TrainingService,
    private readonly performanceReviewService: PerformanceReviewService,
  ) {}

  @Get('pending-reminders')
  getPendingReminders(@Query('asOf') asOf?: string, @Query('repeat', new ParseBoolPipe({ optional: true })) repeat?: unknown) {
    return this.trainingService.getPendingTrainingReminders(asOf, repeat === true);
  }

  @Post('reminder-results')
  recordReminderResult(
    @Body()
    body: {
      assignmentId: number;
      runId: string;
      employeeNotified: boolean;
      managerNotified: boolean;
      telegramNotified: boolean;
      status: 'SENT' | 'PARTIAL' | 'FAILED';
      detail?: string;
    },
  ) {
    return this.trainingService.recordTrainingReminderResult(body);
  }

  @Get('review-reminders')
  getReviewReminders(
    @Query('asOf') asOf?: string,
    @Query('phase') phase?: ReviewReminderPhase,
    @Query('repeat', new ParseBoolPipe({ optional: true })) repeat?: unknown,
  ) {
    return this.performanceReviewService.getPendingReviewReminders(asOf, phase, repeat === true);
  }

  @Post('review-reminder-results')
  recordReviewReminderResult(
    @Body()
    body: {
      reviewPeriod: string;
      recipientId: number;
      phase: ReviewReminderPhase;
      runId: string;
      pendingEmployeeIds: number[];
      emailNotified: boolean;
      telegramNotified: boolean;
      status: AutomationDeliveryStatus;
      detail?: string;
    },
  ) {
    return this.performanceReviewService.recordReviewReminderResult(body);
  }
}
