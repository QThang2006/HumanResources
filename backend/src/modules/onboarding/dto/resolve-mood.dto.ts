import { IsOptional, IsString } from 'class-validator';

export class ResolveMoodDto {
  @IsString({ message: 'Ghi chú can thiệp phải là chuỗi ký tự.' })
  @IsOptional()
  note?: string;
}
