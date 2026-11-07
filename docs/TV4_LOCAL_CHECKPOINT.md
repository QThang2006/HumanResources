# TV4 — Chốt cấu hình local trước triển khai

## Trạng thái

- WF-02: Mandatory Training Reminder & Escalation — 18 node, ID tv4MandatoryTrainingReminderV1, chưa Publish, dùng Execute để thử.
- WF-03: Monthly KPI Review Cycle & Follow-up — 19 node, ID tv4PerformanceReviewReminderV1, chưa Publish, dùng Execute để thử.
- WF-04: Offboarding Coordination & Delivery Recovery — 18 node, ID tv4OffboardingV1, đã Publish riêng localhost để website gọi webhook khi duyệt hồ sơ. Publish không tự gửi thông báo.
- Giữ credential, người nhận và cấu hình backend của local, không lấy cấu hình host. Không ghim dữ liệu. WF-01 Kho tri thức giữ nguyên trong đợt này.
- Host chưa được sửa, Publish hoặc Execute. Khi triển khai phải cập nhật backend và workflow tương ứng cùng một đợt.

## Kiểm tra

Đọc lại cả ba workflow sau import và so sánh toàn bộ nodes/connections với gói đã chuẩn bị: đúng ID và số node. Backend local đang chạy nhận repeat=true/false, từ chối giá trị sai và trả lịch KPI theo ngày chọn. Các yêu cầu xác minh chỉ GET, không gửi thông báo.

Tham số repeat dùng unknown cùng ParseBoolPipe để tránh ValidationPipe chung ép chuỗi bất kỳ thành false trước bước kiểm tra. Không sửa ValidationPipe chung. Backend: npm run test:tv4-workflows. Frontend: npm run test:offboarding và npm run build. Chưa xác minh vòng gửi thật của phiên bản cuối qua SMTP/Telegram.

## Cách thử trước khi chốt

1. Kiểm tra địa chỉ nhận và Telegram tại n8n local; không đưa bí mật vào ảnh chụp/Git.
2. WF-02/WF-03: đặt manualRunDate ở Load Workflow Configuration rồi Execute. KPI phải chọn đúng ngày mở kỳ/nhắc lần hai của kỳ đó; nhân viên đã được đánh giá vẫn không được nhắc. Execute mới cho phép lặp; lịch tự động vẫn chống trùng.
3. Thôi việc: duyệt hồ sơ trên website hoặc yêu cầu xử lý lại hồ sơ đang chờ/lỗi sau khi lần trước đã kết thúc. Chỉ kênh chưa được ghi nhận thành công được gửi lại.
4. Đối chiếu execution, callback, hộp thư và Telegram. Đã gửi thông báo không đồng nghĩa hoàn tất bàn giao hay khóa tài khoản.

## Điểm tích hợp còn cần lưu ý

Log local có một lần gọi thôi việc trả webhook 404 trước khi WF-04 được Publish. Cơ chế outbox dùng chung cũng báo thiếu bảng pending_webhooks trong database local. Không sửa bảng hoặc cơ chế của thành viên khác. Nếu nhóm cần phục hồi gửi khi n8n mất kết nối, cần đối chiếu migration của phân hệ phụ trách trước triển khai. Không tự gửi lại hồ sơ để che lỗi.

Bản sao local ở /tmp/tv4-local-update, bản sao host ở /tmp/tv4-host-update. Đây là thư mục tạm chứa cấu hình riêng, không đưa vào Git và không coi là sao lưu lâu dài.
