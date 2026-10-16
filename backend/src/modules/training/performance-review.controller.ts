import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RatingRank, UserRole } from '../../entities';
import { PerformanceReviewService } from './performance-review.service';

@Controller('performance-reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.HR, UserRole.SUPERADMIN)
export class PerformanceReviewController {
  constructor(private readonly performanceReviewService: PerformanceReviewService) {}

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
