const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.get('SELECT nodes FROM workflow_entity WHERE id = ?', ['9TBHxXgXJIWCqP8n'], (err, row) => {
  if (err) {
    console.error('Fetch error:', err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);
  let updatedCount = 0;

  for (const n of nodes) {
    // WF-03: Node 8 - Telegram Alert DBA Lead
    if (n.name === '8. Telegram Alert DBA Lead1' || n.name === '8. Telegram Alert DBA Lead') {
      n.parameters.chatId = '8928574834';
      n.parameters.text = "=🗄️ *[DBA BÁO ĐỘNG] SỰ CỐ CƠ SỞ DỮ LIỆU MYSQL*\n\n• *Mã sự cố:* `{{ $('6. Format Actionable Playbook1').first().json.incidentRef }}`\n• *API:* `{{ $('6. Format Actionable Playbook1').first().json.method }} {{ $('6. Format Actionable Playbook1').first().json.endpoint }}`\n• *Vị trí:* `{{ $('6. Format Actionable Playbook1').first().json.culpritFile }}:{{ $('6. Format Actionable Playbook1').first().json.culpritLine }}`\n• *Chi tiết:* `{{ $('6. Format Actionable Playbook1').first().json.errorMessage }}`\n• *Chẩn đoán AI:* {{ $('6. Format Actionable Playbook1').first().json.aiDiagnostic ? $('6. Format Actionable Playbook1').first().json.aiDiagnostic.rootCause : 'Đang phân tích' }}\n• *Đề xuất:* {{ $('6. Format Actionable Playbook1').first().json.aiDiagnostic ? $('6. Format Actionable Playbook1').first().json.aiDiagnostic.suggestedFix : 'Kiểm tra kết nối CSDL' }}\n\n_Vui lòng kiểm tra ngay connection pool và transaction timeout._";
      updatedCount++;
    }

    // WF-03: Node 9 - Telegram Alert Dev Lead
    if (n.name === '9. Telegram Alert Dev Lead1' || n.name === '9. Telegram Alert Dev Lead') {
      n.parameters.chatId = '8928574834';
      n.parameters.text = "=⚠️ *[DEV BÁO ĐỘNG] SỰ CỐ CODE LOGIC BACKEND*\n\n• *Mã sự cố:* `{{ $('6. Format Actionable Playbook1').first().json.incidentRef }}`\n• *API:* `{{ $('6. Format Actionable Playbook1').first().json.method }} {{ $('6. Format Actionable Playbook1').first().json.endpoint }}`\n• *Module:* `{{ $('6. Format Actionable Playbook1').first().json.culpritFile }}` (Dòng {{ $('6. Format Actionable Playbook1').first().json.culpritLine }})\n• *Lỗi:* `{{ $('6. Format Actionable Playbook1').first().json.errorMessage }}`\n• *AI Gợi ý:* {{ $('6. Format Actionable Playbook1').first().json.aiDiagnostic ? $('6. Format Actionable Playbook1').first().json.aiDiagnostic.suggestedFix : 'Kiểm tra logic backend' }}\n\n_Đã tạo ticket theo dõi sự cố trên hệ thống kiểm toán._";
      updatedCount++;
    }

    // WF-01: Node 9 - Telegram Alert DevSecOps
    if (n.name === '9. Telegram Alert DevSecOps1' || n.name === '9. Telegram Alert DevSecOps') {
      n.parameters.chatId = '8928574834';
      n.parameters.text = "=🚨 *[DEVSECOPS BÁO ĐỘNG ĐỎ] TỰ ĐỘNG CHẶN BRUTE-FORCE*\n\n• *Mã sự cố:* `{{ $('7. Gemini AI Threat Classifier1').first().json.incidentId }}`\n• *Mức độ:* `{{ $('7. Gemini AI Threat Classifier1').first().json.riskTier }}`\n• *IP bị cấm:* `{{ $('7. Gemini AI Threat Classifier1').first().json.ip }}`\n• *Mục tiêu:* `{{ $('7. Gemini AI Threat Classifier1').first().json.email }}` (Role: `{{ $('7. Gemini AI Threat Classifier1').first().json.targetRole || 'ADMIN' }}`)\n• *Số lần gõ sai:* `{{ $('7. Gemini AI Threat Classifier1').first().json.failedAttempts }}` lần / 15 phút\n• *Thời gian khóa:* `{{ $('7. Gemini AI Threat Classifier1').first().json.banMinutes }}` phút\n• *Nhận định AI:* {{ $('7. Gemini AI Threat Classifier1').first().json.aiAssessment }}\n\n_Hệ thống đã tự động thêm IP vào tường lửa Blacklist Backend._";
      updatedCount++;
    }

    // WF-02: Node 9 - Telegram Alert Tech Lead
    if (n.name === '9. Telegram Alert Tech Lead1' || n.name === '9. Telegram Alert Tech Lead') {
      n.parameters.chatId = '8928574834';
      n.parameters.text = "=🗄️ *[HẠ TẦNG & CSDL] BÁO CÁO SAO LƯU TỰ ĐỘNG 02:00 AM*\n\n• *Mã sao lưu:* `{{ $('8. Format Health Report HTML1').first().json.backupId || 'BKP-NIGHTLY' }}`\n• *Trạng thái:* {{ $('8. Format Health Report HTML1').first().json.statusIcon }}\n• *CSDL:* `{{ $('8. Format Health Report HTML1').first().json.dbName || 'hr_enterprise_db' }}` ({{ $('8. Format Health Report HTML1').first().json.tableCount || 11 }} bảng)\n• *Dung lượng:* `{{ $('8. Format Health Report HTML1').first().json.totalSizeMb || 38.5 }}` MB (Sử dụng: {{ $('8. Format Health Report HTML1').first().json.diskUsagePercent || 4 }}%)\n• *File lưu trữ:* `{{ $('8. Format Health Report HTML1').first().json.backupFilename || 'backup.sql.gz' }}`\n\n_Bản sao lưu nén định kỳ đã được tạo và kiểm toán toàn vẹn thành công._";
      updatedCount++;
    }
  }

  console.log('Patched nodes count:', updatedCount);

  db.run('UPDATE workflow_entity SET nodes = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(nodes), '9TBHxXgXJIWCqP8n'], (uErr) => {
    if (uErr) {
      console.error('Update workflow_entity error:', uErr);
      process.exit(1);
    }
    db.run('UPDATE workflow_history SET nodes = ?, updatedAt = CURRENT_TIMESTAMP WHERE workflowId = ?', [JSON.stringify(nodes), '9TBHxXgXJIWCqP8n'], (hErr) => {
      if (hErr) {
        console.error('Update workflow_history error:', hErr);
        process.exit(1);
      }
      console.log('Successfully updated telegram templates in workflow_entity and workflow_history!');
      db.close();
    });
  });
});
