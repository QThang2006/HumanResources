import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Department)
    private deptRepository: Repository<Department>,
  ) {}

  async findAll() {
    return this.userRepository.find({
      relations: ['department'],
      order: { id: 'ASC' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        jobTitle: true,
        role: true,
        isActive: true,
        joinedDate: true,
        createdAt: true,
      },
    });
  }

  async findById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['department'],
    });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân sự có ID #${id}`);
    }
    return user;
  }
    async getDepartments() {
        const departments = await this.deptRepository.find({
            order: {
                name: 'ASC',
            },
        });

        return departments.map(department => ({
            id: department.id,
            name: department.name,
            code: department.code,
            description: department.description,
        }));
    }
    async createDepartment(data: {
        name: string;
        code: string;
        description?: string;
    }) {
        const name = data.name.trim();
        const code = data.code.trim().toUpperCase();

        if (!name || !code) {
            throw new BadRequestException(
                'Tên phòng ban và mã phòng ban không được để trống.',
            );
        }

        const existing = await this.deptRepository.findOne({
            where: [
                { name },
                { code },
            ],
        });

        if (existing) {
            throw new ConflictException(
                'Tên hoặc mã phòng ban đã tồn tại.',
            );
        }

        const department = this.deptRepository.create({
            name,
            code,
            description: data.description?.trim() || undefined,
        });

        const saved = await this.deptRepository.save(department);

        return {
            success: true,
            message: `Đã tạo phòng ban "${saved.name}".`,
            department: saved,
        };
    }
    async createUser(data: {
        fullName: string;
        email: string;
        password: string;
        phone?: string;
        jobTitle?: string;
        departmentId?: number;
        role: UserRole;
    }) {
        if (data.role === UserRole.SUPERADMIN) {
            throw new BadRequestException('Hệ thống chỉ có một Super Admin. Không thể tạo thêm tài khoản có vai trò này.');
        }
        const fullName = data.fullName.trim();
        const email = data.email.trim().toLowerCase();
        const password = data.password;

        if (!fullName || !email || !password.trim()) {
            throw new BadRequestException(
                'Họ tên, email và mật khẩu không được để trống.',
            );
        }

        if (!email.includes('@')) {
            throw new BadRequestException(
                'Email không hợp lệ.',
            );
        }

        if (password.length < 6) {
            throw new BadRequestException(
                'Mật khẩu phải có ít nhất 6 ký tự.',
            );
        }

        const validRoles = Object.values(UserRole);

        if (!validRoles.includes(data.role)) {
            throw new BadRequestException(
                'Vai trò người dùng không hợp lệ.',
            );
        }

        if (
            data.role === UserRole.EMPLOYEE &&
            (!data.departmentId || !data.jobTitle?.trim())
        ) {
            throw new BadRequestException(
                'Nhân viên cần có đầy đủ phòng ban và chức danh để phục vụ phân tích năng lực.',
            );
        }

        const existingUser = await this.userRepository.findOne({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException(
                'Email này đã được sử dụng.',
            );
        }

        if (data.departmentId !== undefined) {
            const department = await this.deptRepository.findOne({
                where: { id: data.departmentId },
            });

            if (!department) {
                throw new NotFoundException(
                    'Không tìm thấy phòng ban.',
                );
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = this.userRepository.create({
            fullName,
            email,
            passwordHash,
            phone: data.phone?.trim() || undefined,
            jobTitle: data.jobTitle?.trim() || undefined,
            departmentId: data.departmentId,
            role: data.role,
            isActive: true,
        });

        const savedUser = await this.userRepository.save(user);

        const createdUser = await this.userRepository.findOne({
            where: { id: savedUser.id },
            relations: ['department'],
        });

        return {
            success: true,
            message: `Đã tạo người dùng "${savedUser.fullName}" thành công.`,
            user: {
                id: createdUser!.id,
                fullName: createdUser!.fullName,
                email: createdUser!.email,
                phone: createdUser!.phone,
                jobTitle: createdUser!.jobTitle,
                departmentId: createdUser!.departmentId,
                department: createdUser!.department
                    ? {
                        id: createdUser!.department.id,
                        name: createdUser!.department.name,
                        description: createdUser!.department.description,
                    }
                    : undefined,
                role: createdUser!.role,
                isActive: createdUser!.isActive,
            },
        };
    }
    async updateUser(
        userId: number,
        data: {
            departmentId?: number;
            jobTitle?: string;
            role?: UserRole;
            isActive?: boolean;
        },
    ) {
        const user = await this.findById(userId);

        if (data.departmentId !== undefined) {
            const department = await this.deptRepository.findOne({
                where: { id: data.departmentId },
            });

            if (!department) {
                throw new NotFoundException('Không tìm thấy phòng ban.');
            }

            // findById() nạp sẵn quan hệ department. Nếu chỉ đổi khóa ngoại,
            // TypeORM có thể dùng lại quan hệ cũ khi save() và ghi đè thay đổi.
            // Cập nhật đồng thời cả khóa ngoại lẫn quan hệ để phòng ban được lưu
            // nhất quán và vẫn đúng sau khi tải lại danh sách người dùng.
            user.departmentId = department.id;
            user.department = department;
        }

        if (data.jobTitle !== undefined) {
            user.jobTitle = data.jobTitle.trim();
        }

        if (data.role !== undefined) {
            if (data.role === UserRole.SUPERADMIN && user.id !== 1) {
                throw new BadRequestException('Hệ thống chỉ có một Super Admin. Không thể cấp vai trò này cho tài khoản khác.');
            }
            if (user.id === 1 && data.role !== UserRole.SUPERADMIN) {
                throw new BadRequestException(
                    'Không thể thay đổi vai trò của tài khoản Quản trị viên gốc.',
                );
            }

            user.role = data.role;
        }

        if (data.isActive !== undefined) {
            if (user.id === 1 && data.isActive === false) {
                throw new BadRequestException(
                    'Không thể khóa tài khoản Quản trị viên gốc.',
                );
            }

            user.isActive = data.isActive;
        }

        await this.userRepository.save(user);

        const updatedUser = await this.userRepository.findOne({
            where: { id: user.id },
            relations: ['department'],
        });

        return {
            success: true,
            message: `Đã cập nhật nhân sự "${user.fullName}" thành công.`,
            user: {
                id: updatedUser!.id,
                fullName: updatedUser!.fullName,
                email: updatedUser!.email,
                departmentId: updatedUser!.departmentId,
                department: updatedUser!.department?.name ?? null,
                jobTitle: updatedUser!.jobTitle,
                role: updatedUser!.role,
                isActive: updatedUser!.isActive,
            },
        };
    }
    async deleteUser(userId: number, currentUserId: number) {
        if (userId === currentUserId) {
            throw new BadRequestException(
                'Bạn không thể tự xóa tài khoản đang đăng nhập.',
            );
        }

        const user = await this.findById(userId);

        if (user.id === 1) {
            throw new BadRequestException(
                'Không thể xóa tài khoản Quản trị viên gốc.',
            );
        }

        try {
            await this.userRepository.remove(user);

            return {
                success: true,
                message: `Đã xóa vĩnh viễn người dùng "${user.fullName}".`,
            };
        } catch (error) {
            throw new BadRequestException(
                'Không thể xóa người dùng này vì vẫn còn dữ liệu liên quan trong hệ thống.',
            );
        }
    }
  // Đây chính là hàm SuperAdmin thay đổi Role của nhân sự
  async updateRole(userId: number, newRole: UserRole) {
    const user = await this.findById(userId);

    if (newRole === UserRole.SUPERADMIN && user.id !== 1) {
      throw new BadRequestException('Hệ thống chỉ có một Super Admin. Không thể cấp vai trò này cho tài khoản khác.');
    }

    // Không cho phép hạ quyền tài khoản SuperAdmin gốc nếu là ID 1
    if (user.id === 1 && newRole !== UserRole.SUPERADMIN) {
      throw new BadRequestException('Không thể thay đổi quyền của tài khoản Quản trị viên gốc (ID #1).');
    }

    user.role = newRole;
    await this.userRepository.save(user);

    return {
      success: true,
      message: `Đã cập nhật vai trò của nhân viên "${user.fullName}" thành [${newRole}] thành công.`,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department?.name,
      },
    };
  }

  // Seed mẫu dữ liệu demo ban đầu
  async seedInitialData() {
    const count = await this.userRepository.count();
    if (count > 0) {
      return { message: 'Dữ liệu người dùng đã tồn tại, không cần seed lại.' };
    }

    // 1. Tạo phòng ban
    let techDept = await this.deptRepository.findOne({ where: { name: 'Kỹ Thuật & AI' } });
    if (!techDept) {
      techDept = await this.deptRepository.save(
          this.deptRepository.create({
              code: 'TECH',
              name: 'Kỹ Thuật & AI',
              description: 'Phát triển sản phẩm và ứng dụng AI',
          })
      );
    }

    let hrDept = await this.deptRepository.findOne({ where: { name: 'Nhân Sự & Đào Tạo' } });
    if (!hrDept) {
      hrDept = await this.deptRepository.save(
          this.deptRepository.create({
              code: 'HR',
              name: 'Nhân Sự & Đào Tạo',
              description: 'Quản trị nhân tài và văn hóa',
          })      
      );
    }

    // 2. Hash mật khẩu mặc định "admin123"
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    // Tạo SuperAdmin & HR
    await this.userRepository.save(
      this.userRepository.create({
        fullName: 'Nguyễn Văn Quản Trị',
        email: 'superadmin@company.com',
        passwordHash,
        role: UserRole.SUPERADMIN,
        jobTitle: 'Hệ Thống Trưởng',
        departmentId: techDept.id,
        phone: '0901111222',
      }),
    );

    await this.userRepository.save(
      this.userRepository.create({
        fullName: 'Lê Thị Thu Thảo',
        email: 'hr@company.com',
        passwordHash,
        role: UserRole.HR,
        jobTitle: 'Trưởng Nhóm Tuyển Dụng',
        departmentId: hrDept.id,
        phone: '0903333444',
      }),
    );

    // Tạo Trưởng phòng Kỹ thuật
    const savedManager = await this.userRepository.save(
      this.userRepository.create({
        fullName: 'Trần Văn Minh',
        email: 'manager@company.com',
        passwordHash,
        role: UserRole.MANAGER,
        jobTitle: 'Trưởng Phòng Kỹ Thuật',
        departmentId: techDept.id,
        phone: '0905555666',
      }),
    );

    // Lỗ hổng 5 (Cách B): Nhân viên mới có managerId trỏ thẳng tới Trưởng phòng Kỹ thuật
    await this.userRepository.save(
      this.userRepository.create({
        fullName: 'Phạm Hồng Quân',
        email: 'employee@company.com',
        passwordHash,
        role: UserRole.EMPLOYEE,
        jobTitle: 'Kỹ Sư Phần Mềm Mới',
        departmentId: techDept.id,
        managerId: savedManager.id,
        phone: '0907777888',
      }),
    );

    return { success: true, message: 'Đã khởi tạo thành công 4 tài khoản Demo chuẩn 4 Roles có phân cấp Quản lý trực tiếp.' };
  }
}
