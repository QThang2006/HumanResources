// Stable display names. Workflow IDs, webhook paths and business data stay unchanged.
const workflowNames = {
  hrTv2JobSyncV2: '01 | TV2 2.0 – Đồng bộ vị trí tuyển dụng vào Google Form',
  hrTv2IntakeV2: '02 | TV2 2.1 – Tiếp nhận CV đa kênh và gửi thư xác nhận',
  hrTv2InterviewV2: '03 | TV2 2.2 – Xếp lịch phỏng vấn, Google Meet và thư mời',
  hrTv2OfferV2: '04 | TV2 2.3 – Phát hành thư mời nhận việc và nhắc hạn 24–48 giờ',
  hrTv2Interview01: '90.01 | Bản cũ – Xếp lịch phỏng vấn và tạo Google Meet',
  hrMasterEcosystem01: '90.02 | Bản cũ – Tự động hóa nhân sự tổng hợp',
  hrTv2UserTrial01: '91.01 | Bản thử – Phỏng vấn qua Gmail và Google Meet',
  hrTv2Readback01: '91.02 | Bản thử – Lưu kết quả tạo lịch và gửi thư vào ATS',
  hrTv2WebLive01: '91.03 | Bản thử – Xếp lịch và gửi thư từ giao diện tuyển dụng',
  hrTv2LiveSelf01: '91.04 | Bản thử – Google Calendar và Gmail gửi cho chính mình',
  hrTv2LocalTest01: '91.05 | Bản thử – Phỏng vấn cục bộ không gửi ra ngoài',
};
const nodeNames = {
  '01 Gmail HR - CV moi': '01. Theo dõi CV mới trong Gmail tuyển dụng',
  '02 Chuan hoa Gmail': '02. Chuẩn hóa hồ sơ nhận qua Gmail',
  '03 Google Form - dong Sheet moi': '03. Phát hiện câu trả lời Google Form mới',
  '04 Chuan hoa Google Form': '04. Chuẩn hóa hồ sơ và mã vị trí từ Form',
  '05 Tai PDF tu Google Drive': '05. Tải CV từ Google Drive',
  '06 Kiem tra ho so va PDF': '06. Kiểm tra thông tin ứng viên và tệp CV',
  '07 Luu CV vao Backend ATS': '07. Lưu hồ sơ và CV vào ATS',
  '08 Ho so moi can xac nhan': '08. Kiểm tra hồ sơ cần gửi xác nhận',
  '09 Soan thu cam on': '09. Soạn thư xác nhận đã nhận hồ sơ',
  '10 Gui thu xac nhan ung vien': '10. Gửi thư xác nhận cho ứng viên',
  '11 Luu xac nhan SMTP': '11. Lưu kết quả gửi thư xác nhận',
  '12 Nguon la Gmail': '12. Kiểm tra hồ sơ đến từ Gmail',
  '13 Danh dau Gmail da xu ly': '13. Đánh dấu email tuyển dụng đã xử lý',
  '01 Webhook - Job thay doi': '01. Nhận thông báo thay đổi vị trí tuyển dụng',
  '02 Chuan hoa su kien job': '02. Chuẩn hóa sự kiện tuyển dụng',
  '03 Lay danh sach job dang mo': '03. Lấy danh sách vị trí đang mở từ Backend',
  '04 Loc job dang mo': '04. Kiểm tra và lọc vị trí đang mở',
  '05 Tao lua chon dropdown': '05. Tạo lựa chọn mã vị trí – tên công việc',
  '06 Tao payload dong bo Form': '06. Chuẩn bị dữ liệu đồng bộ Google Form',
  '07 Cap nhat dropdown Google Form': '07. Cập nhật danh sách chọn trên Google Form',
  '08 Kiem tra ket qua dong bo': '08. Kiểm tra kết quả cập nhật Google Form',
  '09 Dong bo thanh cong': '09. Xác định đồng bộ thành công',
  '10 Tao phan hoi thanh cong': '10. Tổng hợp kết quả đồng bộ thành công',
  '11 Tra HTTP 200': '11. Phản hồi đồng bộ thành công',
  '12 Tao phan hoi loi': '12. Tổng hợp lỗi đồng bộ',
  '13 Tra HTTP loi': '13. Phản hồi đồng bộ thất bại',
  '14 Dong bo du phong moi 5 phut': '14. Đồng bộ dự phòng mỗi 5 phút',
  '01 HR phat hanh Offer': '01. Nhận yêu cầu phát hành thư mời nhận việc',
  '02 Kiem tra quyen giao Offer': '02. Kiểm tra quyền phát hành thư mời nhận việc',
  '03 Nhan Offer tu Backend': '03. Nhận nội dung thư mời từ Backend',
  '04 Gui Offer Letter': '04. Gửi thư mời nhận việc cho ứng viên',
  '05 Xac nhan gui va bat dau 48h': '05. Lưu kết quả gửi và bắt đầu hạn 48 giờ',
  '06 Cho den moc 24 gio': '06. Chờ đến mốc 24 giờ',
  '07 Kiem tra phan hoi sau 24h': '07. Kiểm tra phản hồi ứng viên sau 24 giờ',
  '08 Can gui nhac nho': '08. Kiểm tra có cần gửi thư nhắc',
  '09 Nhac ung vien va bao HR': '09. Gửi thư nhắc ứng viên và thông báo HR',
  '10 Luu ket qua nhac nho': '10. Lưu kết quả gửi thư nhắc',
  '11 Cho den moc 48 gio': '11. Chờ đến hạn 48 giờ',
  '12 Kiem tra va dong Offer het han': '12. Kiểm tra và đóng thư mời đã hết hạn',
  '13 Offer het han can bao HR': '13. Kiểm tra thư mời hết hạn cần báo HR',
  '14 Bao HR Offer het han': '14. Thông báo HR về thư mời hết hạn',
  '15 Luu ket qua bao HR': '15. Lưu kết quả thông báo hết hạn',
  'Webhook: Xếp lịch phỏng vấn': '01. Nhận yêu cầu xếp lịch phỏng vấn',
  'Validate delivery envelope': '02. Kiểm tra quyền xử lý yêu cầu phỏng vấn',
  'Claim interview delivery': '03. Nhận quyền xử lý lịch phỏng vấn',
  'Load interview payload': '04. Nạp thông tin buổi phỏng vấn',
  'Tự Động Tạo Lịch & Sinh Google Meet': '05. Tạo lịch phỏng vấn và Google Meet',
  'Cho Google tao phong Meet': '06. Chờ Google khởi tạo phòng Meet',
  'Read back Calendar event': '07. Đọc lại sự kiện trên Google Calendar',
  'Verify Calendar readback': '08. Xác minh lịch và liên kết Google Meet',
  'Save Meet to ATS': '09. Lưu lịch và liên kết Meet vào ATS',
  'Tạo Link Meet & Template Email': '10. Soạn thư mời và tệp lịch ICS',
  'Gửi Email Mời Ứng Viên': '11. Gửi thư mời phỏng vấn',
  'Verify SMTP acceptance': '12. Xác minh kết quả gửi thư mời',
  'Save email status to ATS': '13. Lưu trạng thái gửi thư vào ATS',
  'Calendar failure result': '14. Tổng hợp lỗi tạo lịch phỏng vấn',
  'Save Calendar failure to ATS': '15. Lưu lỗi tạo lịch vào ATS',
  'Email failure result': '16. Tổng hợp lỗi gửi thư mời',
  'Save email failure to ATS': '17. Lưu lỗi gửi thư vào ATS',
  'Respond HTTP 200': '18. Hoàn tất xử lý yêu cầu',
  'Gửi Email Lịch cho Interviewer': '19. Gửi lịch cho người phỏng vấn',
  'Sticky Note - Overview': 'Ghi chú – Tổng quan quy trình',
  'Sticky Note - Burnout Info': 'Ghi chú – Cảnh báo nguy cơ kiệt sức',
  'Sticky Note - Hired': 'Ghi chú – Tiếp nhận nhân sự mới',
  'Respond HTTP 200 - Interview': '19. Phản hồi yêu cầu phỏng vấn',
  'Respond HTTP 200 - Burnout': '29. Phản hồi yêu cầu cảnh báo kiệt sức',
  'Respond HTTP 200 - Hired': '39. Phản hồi yêu cầu tiếp nhận nhân sự',
  'Webhook: Cảnh báo kiệt sức': '20. Nhận cảnh báo nguy cơ kiệt sức',
  'Đánh Giá Cấp Độ & Soạn Thảo Cảnh Báo': '21. Đánh giá mức độ và soạn cảnh báo',
  'Gửi Email Khẩn Cấp Tới HR Lead': '22. Gửi cảnh báo khẩn cấp cho trưởng nhóm HR',
  'Bắn Telegram Bot Khẩn Cấp': '23. Gửi cảnh báo khẩn cấp qua Telegram',
  'Bắn Tin Nhắn Telegram HR': '24. Thông báo HR qua Telegram',
  'Webhook: 1-Click Hired': '30. Nhận sự kiện tuyển dụng nhân sự mới',
  'Soạn Thảo Welcome Package & HTML': '31. Soạn nội dung chào mừng nhân sự mới',
  'Gửi Welcome Package Email': '32. Gửi thư chào mừng nhân sự mới',
  'Bắn Telegram IT & HR Ops': '33. Thông báo bộ phận IT và nhân sự qua Telegram',
  'Validate TV2 self-test': '02. Kiểm tra dữ liệu thử nghiệm cá nhân',
  'Read back Google event': '07. Đọc lại sự kiện Google Calendar thử nghiệm',
  'Verify real Calendar and Meet': '08. Xác minh lịch và phòng Meet thử nghiệm',
  'Validate self-addressed invitation': '10a. Kiểm tra thư thử chỉ gửi cho chính mình',
  'TV2 live test result': '17. Tổng hợp kết quả thử nghiệm Google và Gmail',
  'TV2 readback test result': '17a. Tổng hợp kết quả kiểm tra lưu vào ATS',
};
const entries = Object.entries(nodeNames).sort((a,b)=>b[0].length-a[0].length);
function replaceNames(text) {
  for (const [before,after] of entries) text=text.split(before).join(after);
  return text;
}
function renameWorkflow(workflow) {
  const result=JSON.parse(replaceNames(JSON.stringify(workflow)));
  if (workflowNames[result.id]) result.name=workflowNames[result.id];
  const names=new Set(result.nodes.map(n=>n.name));
  if(names.size!==result.nodes.length) throw Error('Duplicate node names: '+result.id);
  for(const [name,connection] of Object.entries(result.connections||{})) {
    if(!names.has(name)) throw Error('Missing connection source: '+name);
    for(const group of connection.main||[]) for(const edge of group) if(!names.has(edge.node)) throw Error('Missing connection target: '+edge.node);
  }
  for(const node of result.nodes) if(node.type.endsWith('.code')) new Function(node.parameters.jsCode);
  return result;
}
module.exports={workflowNames,nodeNames,replaceNames,renameWorkflow};
