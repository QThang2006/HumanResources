import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề vị trí tuyển dụng không được để trống.' })
  title: string;

  @IsInt({ message: 'Mã phòng ban (departmentId) phải là số nguyên.' })
  @IsNotEmpty({ message: 'Phòng ban không được để trống.' })
  departmentId: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  salaryRange?: string;

  @IsString()
  @IsNotEmpty({ message: 'Bản mô tả công việc không được để trống.' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'Yêu cầu ứng viên không được để trống.' })
  requirements: string;
}
