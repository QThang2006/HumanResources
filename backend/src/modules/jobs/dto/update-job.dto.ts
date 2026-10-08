import { IsISO8601 } from 'class-validator';
import { CreateJobDto } from './create-job.dto';

export class UpdateJobDto extends CreateJobDto {
  @IsISO8601()
  expectedUpdatedAt: string;
}
