/**
 * SCRIPT RESET TRẠNG THÁI DEMO PHÂN HỆ ONBOARDING & TEAM MOOD (TV3)
 * Tác dụng:
 * 1. Đặt lại tài khoản Trần Viết Đạt (dattrandn@gmail.com) về trạng thái CHƯA CHECK-IN HÔM NAY.
 * 2. Đặt sẵn 2 ngày STRESSED trước đó -> khi bấm check-in STRESSED sẽ là ngày thứ 3 (kích hoạt Burnout Webhook).
 * 3. Làm sạch hàng đợi Attention Queue trên tài khoản Quản lý Vũ Trần để sẵn sàng nhận cờ mới.
 */
const mysql = require('mysql2/promise');

async function resetDemo() {
  console.log('🔄 Đang khôi phục trạng thái Demo cho Thành viên 3...');
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'hr_enterprise_db'
  });

  try {
    // 1. Tìm userId của dattrandn@gmail.com
    const [users] = await conn.execute('SELECT id FROM users WHERE email = ?', ['dattrandn@gmail.com']);
    if (users.length === 0) {
      console.error('❌ Không tìm thấy user dattrandn@gmail.com');
      return;
    }
    const userId = users[0].id;

    // 2. Xóa toàn bộ check-in cảm xúc cũ của user này
    await conn.execute('DELETE FROM employee_moods WHERE user_id = ?', [userId]);

    // 3. Nạp sẵn 2 ngày STRESSED trước đó (Cách 2 ngày và cách 1 ngày)
    await conn.execute(
      'INSERT INTO employee_moods (user_id, mood, feedback_text, is_burnout_risk, is_resolved, created_at) VALUES (?, ?, ?, 0, 0, DATE_SUB(NOW(), INTERVAL 2 DAY))',
      [userId, 'STRESSED', 'Khởi đầu làm quen với kiến trúc microservices và tài liệu dự án còn thiếu.']
    );
    await conn.execute(
      'INSERT INTO employee_moods (user_id, mood, feedback_text, is_burnout_risk, is_resolved, created_at) VALUES (?, ?, ?, 0, 0, DATE_SUB(NOW(), INTERVAL 1 DAY))',
      [userId, 'STRESSED', 'Nhiều task deadline sát nhau, cần thêm sự hỗ trợ từ Mentor.']
    );

    // 4. Đặt lại 10 nhiệm vụ Onboarding 30 ngày (5 task hoàn thành, 5 task đang chờ)
    await conn.execute('DELETE FROM onboarding_tasks WHERE user_id = ?', [userId]);
    const [templateTasks] = await conn.execute(
      'SELECT title, description, category, due_day, is_completed FROM onboarding_tasks WHERE user_id = 4'
    );
    for (const t of templateTasks) {
      await conn.execute(
        'INSERT INTO onboarding_tasks (user_id, title, description, category, due_day, is_completed, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [userId, t.title, t.description, t.category, t.due_day, t.is_completed, t.is_completed === 1 ? new Date() : null]
      );
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ KHÔI PHỤC TRẠNG THÁI DEMO THÀNH CÔNG 100%!');
    console.log('👉 Tài khoản: dattrandn@gmail.com (Trần Viết Đạt)');
    console.log('👉 Trạng thái hôm nay: CHƯA CHECK-IN (Sẵn sàng bấm nút)');
    console.log('👉 Lịch sử: Đã có sẵn 2 ngày STRESSED trước đó');
    console.log('⚡ BẤM NÚT 🌧️ CĂNG THẲNG TRÊN WEB SẼ LẬP TỨC KÍCH HOẠT N8N!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } finally {
    await conn.end();
  }
}

resetDemo().catch(console.error);
