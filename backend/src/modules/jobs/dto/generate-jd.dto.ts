import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateJdDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên chức danh công việc không được để trống.' })
  title: string;

  @IsString()
  @IsOptional()
  departmentName?: string;

  @IsString()
  @IsOptional()
  level?: string;
}
