import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class AssignDepartmentManagerDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Manager phải là số nguyên.' })
  @Min(1)
  managerId?: number | null;
}
