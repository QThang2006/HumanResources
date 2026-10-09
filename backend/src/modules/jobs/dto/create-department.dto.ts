import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateDepartmentDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Tên phòng ban không được để trống.' })
  @MaxLength(100)
  name: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Mã phòng ban không được để trống.' })
  @MaxLength(20)
  code: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Manager phải là số nguyên.' })
  @Min(1)
  managerId?: number | null;
}
