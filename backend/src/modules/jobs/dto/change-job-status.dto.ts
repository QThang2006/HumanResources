import { IsEnum, IsISO8601 } from 'class-validator';
import { JobStatus } from '../../../entities/job.entity';

export class ChangeJobStatusDto {
  @IsEnum(JobStatus)
  status: JobStatus;

  @IsISO8601()
  expectedUpdatedAt: string;
}
