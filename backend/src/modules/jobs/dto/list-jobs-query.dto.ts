import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { JobStatus } from '../../../entities/job.entity';

export class ListJobsQueryDto {
  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsIn(['OPEN', 'CLOSED'])
  status?: JobStatus;
  @IsOptional()
  // Keep arrays/objects intact so implicit conversion cannot bypass validation.
  @Transform(({ obj, key }) => typeof obj[key] === 'string' ? obj[key].trim() : obj[key])
  @IsString()
  @MaxLength(150)
  q?: string;

  @IsOptional()
  @Transform(({ obj, key }) => typeof obj[key] === 'string' && /^\d+$/.test(obj[key]) ? Number(obj[key]) : obj[key])
  @IsInt()
  @Min(1)
  @Max(2147483647)
  departmentId?: number;

  @IsOptional()
  @Transform(({ obj, key }) => typeof obj[key] === 'string' ? obj[key].trim() : obj[key])
  @IsString()
  @MaxLength(150)
  location?: string;

  @IsOptional()
  @Transform(({ obj, key }) => typeof obj[key] === 'string' && /^\d+$/.test(obj[key]) ? Number(obj[key]) : obj[key])
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;

  @IsOptional()
  @Transform(({ obj, key }) => typeof obj[key] === 'string' && /^\d+$/.test(obj[key]) ? Number(obj[key]) : obj[key])
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsIn(['false'], { message: 'Tin nội bộ chỉ được xem qua /jobs/admin sau khi đăng nhập.' })
  all?: string;
}
