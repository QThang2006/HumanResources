import { IsDateString, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class ScheduleInterviewDto {
  @IsInt({ message: 'Mã người phỏng vấn (interviewerId) phải là số nguyên.' })
  @IsNotEmpty({ message: 'Người phỏng vấn không được để trống.' })
  interviewerId: number;

  @IsDateString({}, { message: 'Thời gian phỏng vấn phải là chuỗi định dạng ngày giờ ISO 8601 hợp lệ.' })
  @IsNotEmpty({ message: 'Thời gian phỏng vấn không được để trống.' })
  scheduledAt: string;

  @IsInt()
  @IsOptional()
  round?: number;
}
