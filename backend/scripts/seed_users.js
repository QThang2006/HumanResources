const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seedUsers() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
  const dbUser = process.env.DB_USERNAME || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbDatabase = process.env.DB_DATABASE || 'hr_enterprise_db';

  console.log(`🔌 Kết nối tới MySQL [${dbDatabase}] tại ${dbHost}:${dbPort}...`);
  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbDatabase,
  });

  try {
    const [[{ userCount }]] = await conn.query('SELECT COUNT(*) as userCount FROM users');
    if (userCount > 0) {
      console.log(`ℹ️ Đã có ${userCount} người dùng trong CSDL. Bỏ qua bước seed users.`);
      return;
    }

    console.log('🏢 Đang khởi tạo các phòng ban mẫu...');
    let techDeptId;
    const [techRows] = await conn.query('SELECT id FROM departments WHERE name = ?', ['Kỹ Thuật & AI']);
    if (techRows.length > 0) {
      techDeptId = techRows[0].id;
    } else {
      const [res] = await conn.query(
        'INSERT INTO departments (name, code, description) VALUES (?, ?, ?)',
        ['Kỹ Thuật & AI', 'TECH', 'Phát triển sản phẩm và ứng dụng AI']
      );
      techDeptId = res.insertId;
      console.log(`  ✅ Đã tạo phòng ban: Kỹ Thuật & AI (ID: ${techDeptId})`);
    }

    let hrDeptId;
    const [hrRows] = await conn.query('SELECT id FROM departments WHERE name = ?', ['Nhân Sự & Đào Tạo']);
    if (hrRows.length > 0) {
      hrDeptId = hrRows[0].id;
    } else {
      const [res] = await conn.query(
        'INSERT INTO departments (name, code, description) VALUES (?, ?, ?)',
        ['Nhân Sự & Đào Tạo', 'HR', 'Quản trị nhân tài và văn hóa']
      );
      hrDeptId = res.insertId;
      console.log(`  ✅ Đã tạo phòng ban: Nhân Sự & Đào Tạo (ID: ${hrDeptId})`);
    }

    console.log('🔑 Mã hóa mật khẩu chuẩn admin123...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    console.log('👤 Đang tạo 4 tài khoản theo 4 vai trò...');

    const [saRes] = await conn.query(
      `INSERT INTO users (full_name, email, password_hash, role, job_title, department_id, phone, is_active)
       VALUES (?, ?, ?, 'SUPERADMIN', ?, ?, ?, 1)`,
      ['Nguyễn Văn Quản Trị', 'superadmin@company.com', passwordHash, 'Hệ Thống Trưởng', techDeptId, '0901111222']
    );
    console.log(`  ✅ [SUPERADMIN] superadmin@company.com (ID: ${saRes.insertId})`);

    const [hrRes] = await conn.query(
      `INSERT INTO users (full_name, email, password_hash, role, job_title, department_id, phone, is_active)
       VALUES (?, ?, ?, 'HR', ?, ?, ?, 1)`,
      ['Lê Thị Thu Thảo', 'hr@company.com', passwordHash, 'Trưởng Nhóm Tuyển Dụng', hrDeptId, '0903333444']
    );
    console.log(`  ✅ [HR] hr@company.com (ID: ${hrRes.insertId})`);

    const [mgrRes] = await conn.query(
      `INSERT INTO users (full_name, email, password_hash, role, job_title, department_id, phone, is_active)
       VALUES (?, ?, ?, 'MANAGER', ?, ?, ?, 1)`,
      ['Trần Văn Minh', 'manager@company.com', passwordHash, 'Trưởng Phòng Kỹ Thuật', techDeptId, '0905555666']
    );
    const managerId = mgrRes.insertId;
    console.log(`  ✅ [MANAGER] manager@company.com (ID: ${managerId})`);

    const [empRes] = await conn.query(
      `INSERT INTO users (full_name, email, password_hash, role, job_title, department_id, manager_id, phone, is_active)
       VALUES (?, ?, ?, 'EMPLOYEE', ?, ?, ?, ?, 1)`,
      ['Phạm Hồng Quân', 'employee@company.com', passwordHash, 'Kỹ Sư Phần Mềm Mới', techDeptId, managerId, '0907777888']
    );
    console.log(`  ✅ [EMPLOYEE] employee@company.com (ID: ${empRes.insertId})`);

    console.log('\n🎉 KHỞI TẠO DỮ LIỆU TÀI KHOẢN MẪU THÀNH CÔNG!');
    console.log('Mật khẩu đăng nhập cho tất cả tài khoản: admin123');
  } catch (error) {
    console.error('❌ Lỗi khi seed users:', error.message);
  } finally {
    await conn.end();
  }
}

seedUsers();
