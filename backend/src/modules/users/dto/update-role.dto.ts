import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class UpdateRoleDto {
  @IsEnum(UserRole, {
    message: 'Vai trò mới phải thuộc một trong các quyền: SUPERADMIN, HR, MANAGER, EMPLOYEE.',
  })
  @IsNotEmpty({ message: 'Vai trò mới không được để trống.' })
  role: UserRole;
}
