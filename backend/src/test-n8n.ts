import { ConfigService } from '@nestjs/config';
import { N8nService } from './modules/core/automation/n8n.service';

/**
 * ⚡ Kịch bản kiểm thử tự động toàn diện n8n Webhook
 * Dữ liệu được cấu hình đầy đủ thông tin thực tế để gửi email thật vào hộp thư của bạn.
 */
async function testN8n() {
  console.log('====================================================');
  console.log('⚡ KIỂM THỬ TRỌN GÓI N8N AUTOMATION ENGINE (FULL DATA)');
  console.log('====================================================\n');

  const configService = new ConfigService();
  const n8nService = new N8nService(configService);

  // Email của bạn để nhận trực tiếp email thật từ cả 3 luồng
  const testEmail = 'quocthangngo2006@gmail.com';
  // Nếu bạn có Chat ID Telegram từ @userinfobot thì điền vào đây, nếu chưa có thì để trống
  const testTelegramChatId = '8928574834'; 

  console.log('1. Bắn Webhook xếp lịch phỏng vấn (interview-schedule)...');
  await n8nService.triggerInterviewScheduled({
    interviewId: 101,
    applicationId: 202,
    candidateName: 'Ngô Quốc Thắng (Ứng viên)',
    candidateEmail: testEmail,
    interviewerName: 'Trần Văn Thịnh (Tech Lead)',
    interviewerEmail: testEmail,
    scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
    round: 1,
    fromEmail: testEmail,
    telegramChatId: testTelegramChatId || undefined,
  });

  console.log('\n2. Bắn Webhook 1-Click Tuyển dụng (employee-hired)...');
  await n8nService.triggerEmployeeHired({
    userId: 55,
    fullName: 'Ngô Quốc Thắng (Nhân viên mới)',
    email: testEmail,
    jobTitle: 'Kỹ sư Trí tuệ Nhân tạo & Tự Động Hóa (AI & Automation Lead)',
    departmentName: 'Phòng Phát Triển Công Nghệ Số',
    tempPassword: 'ThangEnterprise@2026#',
    fromEmail: testEmail,
    telegramChatId: testTelegramChatId || undefined,
  });

  console.log('\n3. Bắn Webhook cảnh báo kiệt sức (burnout-alert)...');
  await n8nService.triggerBurnoutAlert({
    userId: 55,
    employeeName: 'Ngô Quốc Thắng',
    departmentName: 'Phòng Phát Triển Công Nghệ Số',
    stressDays: 4,
    latestFeedback: 'Áp lực hoàn thành đồ án tốt nghiệp và sprint liên tục, làm việc ngoài giờ nhiều ngày...',
    hrEmail: testEmail,
    fromEmail: testEmail,
    telegramChatId: testTelegramChatId || undefined,
  });

  console.log('\n====================================================');
  console.log('✅ Đã phát 3 sự kiện Webhook sang n8n thành công!');
  console.log(`📧 Hãy kiểm tra hộp thư đến của: ${testEmail}`);
  console.log('👉 Xem lịch sử trực quan tại: http://localhost:5678');
  console.log('====================================================');
}

testN8n();
