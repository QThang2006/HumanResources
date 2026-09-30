import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class LoginDto {
  @IsEmail({}, { message: 'Định dạng email công vụ không hợp lệ.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsOptional()
  password?: string;

  @IsEnum(UserRole, { message: 'Vai trò demo không hợp lệ.' })
  @IsOptional()
  role?: UserRole;
}
