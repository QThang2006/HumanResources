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
  UploadedFile,
  UseInterceptors,
  Res,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { Actor } from '../jobs/recruitment.policy';
import {
  ApplicationQuery,
  SubmitInput,
  StateInput,
  ScheduleInput,
  ResultInput,
  JobIdQuery,
} from '../jobs/recruitment.dto';
import { SubmitRateGuard } from './submit-rate.guard';
import { MAX_CV_BYTES } from './cv-storage.service';
import { InterviewDeliveryService } from './interview-delivery.service';
import { DeliveryCallbackInput, DeliveryClaimInput } from './interview-delivery.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly service: ApplicationsService,
    private readonly delivery: InterviewDeliveryService,
  ) {}

  // Machine endpoints: a per-interview capability replaces browser JWT here.
  @Post('interviews/:id/delivery/claim')
  claimDelivery(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: DeliveryClaimInput,
    @Headers('x-interview-callback-token') token: string,
  ) {
    return this.delivery.claim(id, input.requestId, token);
  }

  @Post('interviews/:id/delivery')
  recordDelivery(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: DeliveryCallbackInput,
    @Headers('x-interview-callback-token') token: string,
  ) {
    return this.delivery.callback(id, input, token);
  }

  @Post('apply')
  @UseGuards(SubmitRateGuard)
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_CV_BYTES, files: 1, fields: 4, fieldSize: 1000, parts: 6 },
    }),
  )
  apply(@Body() input: SubmitInput, @UploadedFile() file: Express.Multer.File) {
    return this.service.apply(input, file);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.MANAGER)
  list(@Query() query: ApplicationQuery, @CurrentUser() actor: Actor) {
    return this.service.list(query, actor);
  }

  @Get('interviewers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  interviewers(@Query() query: JobIdQuery, @CurrentUser() actor: Actor) {
    return this.service.interviewers(query.jobId, actor);
  }

  @Patch('interviews/:id/result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER)
  result(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: ResultInput,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.result(id, input, actor);
  }

  @Post('interviews/:id/questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  questions(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: Actor) {
    return this.service.questions(id, actor);
  }

  @Get(':id/cv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.MANAGER)
  async cv(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: Actor,
    @Res() response: Response,
  ) {
    const buffer = await this.service.download(id, actor);
    const contentType = await this.service.cvMimeType(id, actor);
    const extension = contentType === 'application/pdf' ? 'pdf' : contentType.split('/')[1];
    response.set({
      'Content-Type': contentType,
      'Content-Disposition': 'attachment; filename="cv-' + id + '.' + extension + '"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.send(buffer);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.MANAGER)
  detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: Actor) {
    return this.service.detail(id, actor);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  status(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: StateInput,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.status(id, input, actor);
  }

  @Post(':id/score')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  score(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: Actor) {
    return this.service.score(id, actor);
  }

  @Post(':id/interview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  schedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: ScheduleInput,
    @CurrentUser() actor: Actor,
  ) {
    return this.service.schedule(id, input, actor);
  }

  @Post(':id/hire')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  hire(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: Actor) {
    return this.service.hire(id, actor);
  }
}
