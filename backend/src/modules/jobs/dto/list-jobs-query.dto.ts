import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListJobsQueryDto {
  @IsOptional()
  // Keep arrays/objects intact so implicit conversion cannot bypass validation.
  @Transform(({ obj, key }) => typeof obj[key] === 'string' ? obj[key].trim() : obj[key])
  @IsString()
  @MaxLength(150)
  q?: string;

  @IsOptional()
  @IsIn(['false'], { message: 'Tin nội bộ chỉ được xem qua /jobs/admin sau khi đăng nhập.' })
  all?: string;
}
