import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RatingRank, UserRole } from '../../entities';
import { PerformanceReviewService } from './performance-review.service';
import { ReviewCalendarService, UpdateReviewCalendar } from './review-calendar.service';

@Controller('performance-reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.HR, UserRole.SUPERADMIN)
export class PerformanceReviewController {
  constructor(private readonly performanceReviewService: PerformanceReviewService, private readonly calendarService: ReviewCalendarService) {}

  @Get('calendar/:period')
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  getCalendar(@CurrentUser('id') viewerId: number, @Param('period') period: string) {
    return this.performanceReviewService.getCalendarBoard(viewerId, period);
  }

  @Put('calendar/:period')
  @Roles(UserRole.SUPERADMIN)
  updateCalendar(@CurrentUser('id') actorId: number, @Param('period') period: string, @Body() body: UpdateReviewCalendar) {
    return this.calendarService.update(period, body, actorId);
  }

  @Get('pending')
  getPending(
    @CurrentUser('id') reviewerId: number,
    @Query('reviewPeriod') reviewPeriod?: string,
  ) {
    return this.performanceReviewService.getPendingReviewsForReviewer(
      reviewerId,
      reviewPeriod,
    );
  }

  @Post()
  submit(
    @CurrentUser('id') reviewerId: number,
    @Body()
    body: {
      userId: number;
      reviewPeriod?: string;
      kpiScore: number;
      managerComment?: string;
      ratingRank: RatingRank;
    },
  ) {
    return this.performanceReviewService.submitReview(reviewerId, body);
  }
}
