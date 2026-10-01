import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

const Trim = () => Transform(({ value }) => typeof value === 'string' ? value.trim() : value);

export class CreateJobDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề vị trí tuyển dụng không được để trống.' })
  @MaxLength(200)
  title: string;

  @Type(() => Number)
  @IsInt({ message: 'Mã phòng ban phải là số nguyên.' })
  @Min(1)
  departmentId: number;

  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  location?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  salaryRange?: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Bản mô tả công việc không được để trống.' })
  @MaxLength(20000)
  description: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Yêu cầu ứng viên không được để trống.' })
  @MaxLength(20000)
  requirements: string;
}
