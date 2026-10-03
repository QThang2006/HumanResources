import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { GenerateJdDto } from './dto/generate-jd.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ChangeJobStatusDto } from './dto/change-job-status.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@Query() query: ListJobsQueryDto) {
    return this.jobs.findAll(undefined, query.q, query.departmentId, query.location);
  }

  @Get('filters')
  filters() {
    return this.jobs.filters();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.MANAGER)
  internalList(@CurrentUser() user: User, @Query() query: ListJobsQueryDto) {
    return this.jobs.findAll(user, query.q, query.departmentId, query.location);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN, UserRole.MANAGER)
  internalDetail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.jobs.findById(id, user);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  create(@CurrentUser('id') userId: number, @Body() input: CreateJobDto) {
    return this.jobs.create(input, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() input: UpdateJobDto) {
    return this.jobs.update(id, input);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  changeStatus(@Param('id', ParseIntPipe) id: number, @Body() input: ChangeJobStatusDto) {
    return this.jobs.changeStatus(id, input);
  }

  @Post('ai-generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  generate(@Body() input: GenerateJdDto) {
    return this.jobs.generateJDWithAI(
      input.title,
      input.departmentName || 'Kỹ Thuật',
      input.level || 'Middle - Senior',
    );
  }
}
