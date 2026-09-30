import { Controller, Get, Post, Param, Body, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/user.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { GenerateJdDto } from './dto/generate-jd.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // Cổng thông tin việc làm công khai (Public Careers)
  @Get()
  async getJobs(@Query('all') all?: string) {
    const onlyOpen = all !== 'true';
    return this.jobsService.findAll(onlyOpen);
  }

  @Get(':id')
  async getJobDetail(@Param('id', ParseIntPipe) id: number) {
    return this.jobsService.findById(id);
  }

  // Đăng tin tuyển dụng mới (HR hoặc SUPERADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @Post()
  async createJob(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.create({
      ...dto,
      createdBy: userId,
    });
  }

  // AI Agent sinh mô tả công việc (JD Generator)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.SUPERADMIN)
  @Post('ai-generate')
  async generateJobDescription(@Body() dto: GenerateJdDto) {
    return this.jobsService.generateJDWithAI(
      dto.title,
      dto.departmentName || 'Kỹ Thuật',
      dto.level || 'Middle - Senior',
    );
  }
}
