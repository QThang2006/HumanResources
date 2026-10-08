import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { Job } from '../../entities/job.entity';
import { Department } from '../../entities/department.entity';
import { RecruitmentAiService } from './recruitment-ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job, Department])],
  controllers: [JobsController],
  providers: [JobsService, RecruitmentAiService],
  exports: [JobsService, RecruitmentAiService],
})
export class JobsModule {}
