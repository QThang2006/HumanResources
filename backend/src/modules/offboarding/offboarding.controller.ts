import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities';
import { OffboardingService } from './offboarding.service';

@Controller('offboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.SUPERADMIN)
export class OffboardingController {
  constructor(private readonly offboardingService: OffboardingService) {}

  @Get()
  findAll() {
    return this.offboardingService.findAll();
  }

  @Post()
  approve(
    @CurrentUser('id') approvedById: number,
    @Body()
    body: {
      userId: number;
      lastWorkingDate: string;
      personalEmail?: string;
      reason?: string;
      assetNotes?: string;
      exitSurveyUrl?: string;
    },
  ) {
    return this.offboardingService.approve(approvedById, body);
  }

  @Post(':id/retry')
  retry(@Param('id', ParseIntPipe) id: number) {
    return this.offboardingService.retry(id);
  }
}
