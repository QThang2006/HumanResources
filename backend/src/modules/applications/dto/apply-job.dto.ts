import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApplyJobDto {
  @IsInt({ message: 'Mã công việc (jobId) phải là số nguyên.' })
  @IsNotEmpty({ message: 'Mã công việc không được để trống.' })
  jobId: number;

  @IsString()
  @IsNotEmpty({ message: 'Họ và tên ứng viên không được để trống.' })
  candidateName: string;

  @IsEmail({}, { message: 'Định dạng email ứng viên không hợp lệ.' })
  @IsNotEmpty({ message: 'Email ứng viên không được để trống.' })
  candidateEmail: string;

  @IsString()
  @IsOptional()
  candidatePhone?: string;

  @IsString()
  @IsOptional()
  cvFileUrl?: string;

  @IsString()
  @IsOptional()
  rawCvText?: string;
}
