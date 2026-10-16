import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AutomationSecretGuard } from '../../common/guards/automation-secret.guard';
import { AutomationDeliveryStatus } from '../../entities';
import { OffboardingService } from './offboarding.service';

@Controller('offboarding/automation')
@UseGuards(AutomationSecretGuard)
export class OffboardingAutomationController {
  constructor(private readonly offboardingService: OffboardingService) {}

  @Get(':id')
  getCase(@Param('id', ParseIntPipe) id: number) {
    return this.offboardingService.getAutomationCase(id);
  }

  @Post(':id/results')
  recordResult(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      runId: string;
      itNotified: boolean;
      financeNotified: boolean;
      employeeNotified: boolean;
      telegramNotified: boolean;
      status: AutomationDeliveryStatus;
      detail?: string;
    },
  ) {
    return this.offboardingService.recordAutomationResult(id, body);
  }
}
