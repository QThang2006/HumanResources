import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  // Đây chính là hàm SuperAdmin thay đổi Role của nhân sự
  async updateRole(userId: number, newRole: UserRole) {
    const user = await this.findById(userId);

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
        this.deptRepository.create({ name: 'Kỹ Thuật & AI', code: 'TECH', description: 'Phát triển sản phẩm và ứng dụng AI' }),
      );
    }

    let hrDept = await this.deptRepository.findOne({ where: { name: 'Nhân Sự & Đào Tạo' } });
    if (!hrDept) {
      hrDept = await this.deptRepository.save(
        this.deptRepository.create({ name: 'Nhân Sự & Đào Tạo', code: 'HR', description: 'Quản trị nhân tài và văn hóa' }),
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
