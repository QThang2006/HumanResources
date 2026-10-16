# Danh sách workflow tuyển dụng TV2

Có **11 workflow**: **4 đang dùng**, **7 bản cũ/bản thử đang tắt**. Tên workflow và 148 tên node đã được chuẩn hóa tiếng Việt có dấu.

## Các luồng đang dùng

| Thứ tự | Nghiệp vụ | Số node | Liên kết n8n |
|---|---|---:|---|
| 01 | Đồng bộ vị trí tuyển dụng vào Google Form | 14 | [Mở workflow](http://localhost:5678/workflow/hrTv2JobSyncV2) |
| 02 | Tiếp nhận CV đa kênh và gửi thư xác nhận | 13 | [Mở workflow](http://localhost:5678/workflow/hrTv2IntakeV2) |
| 03 | Xếp lịch phỏng vấn, Google Meet và thư mời | 18 | [Mở workflow](http://localhost:5678/workflow/hrTv2InterviewV2) |
| 04 | Phát hành thư mời nhận việc và nhắc hạn 24–48 giờ | 15 | [Mở workflow](http://localhost:5678/workflow/hrTv2OfferV2) |

Các bản đang dùng được Publish; các bản cũ/bản thử vẫn tắt. Các mã TV2 2.1–2.3 của yêu cầu nhóm được giữ lại. TV2 2.0 là luồng hỗ trợ đồng bộ vị trí trước bước nhận hồ sơ.

## Tên node theo từng luồng

### 01 | TV2 2.0 – Đồng bộ vị trí tuyển dụng vào Google Form

- 01. Nhận thông báo thay đổi vị trí tuyển dụng
- 02. Chuẩn hóa sự kiện tuyển dụng
- 03. Lấy danh sách vị trí đang mở từ Backend
- 04. Kiểm tra và lọc vị trí đang mở
- 05. Tạo lựa chọn mã vị trí – tên công việc
- 06. Chuẩn bị dữ liệu đồng bộ Google Form
- 07. Cập nhật danh sách chọn trên Google Form
- 08. Kiểm tra kết quả cập nhật Google Form
- 09. Xác định đồng bộ thành công
- 10. Tổng hợp kết quả đồng bộ thành công
- 11. Phản hồi đồng bộ thành công
- 12. Tổng hợp lỗi đồng bộ
- 13. Phản hồi đồng bộ thất bại
- 14. Đồng bộ dự phòng mỗi 5 phút

### 02 | TV2 2.1 – Tiếp nhận CV đa kênh và gửi thư xác nhận

- 01. Theo dõi CV mới trong Gmail tuyển dụng
- 02. Chuẩn hóa hồ sơ nhận qua Gmail
- 03. Phát hiện câu trả lời Google Form mới
- 04. Chuẩn hóa hồ sơ và mã vị trí từ Form
- 05. Tải CV từ Google Drive
- 06. Kiểm tra thông tin ứng viên và tệp CV
- 07. Lưu hồ sơ và CV vào ATS
- 08. Kiểm tra hồ sơ cần gửi xác nhận
- 09. Soạn thư xác nhận đã nhận hồ sơ
- 10. Gửi thư xác nhận cho ứng viên
- 11. Lưu kết quả gửi thư xác nhận
- 12. Kiểm tra hồ sơ đến từ Gmail
- 13. Đánh dấu email tuyển dụng đã xử lý

### 03 | TV2 2.2 – Xếp lịch phỏng vấn, Google Meet và thư mời

- 01. Nhận yêu cầu xếp lịch phỏng vấn
- 02. Kiểm tra quyền xử lý yêu cầu phỏng vấn
- 03. Nhận quyền xử lý lịch phỏng vấn
- 04. Nạp thông tin buổi phỏng vấn
- 05. Tạo lịch phỏng vấn và Google Meet
- 06. Chờ Google khởi tạo phòng Meet
- 07. Đọc lại sự kiện trên Google Calendar
- 08. Xác minh lịch và liên kết Google Meet
- 09. Lưu lịch và liên kết Meet vào ATS
- 10. Soạn thư mời và tệp lịch ICS
- 11. Gửi thư mời phỏng vấn
- 12. Xác minh kết quả gửi thư mời
- 13. Lưu trạng thái gửi thư vào ATS
- 14. Tổng hợp lỗi tạo lịch phỏng vấn
- 15. Lưu lỗi tạo lịch vào ATS
- 16. Tổng hợp lỗi gửi thư mời
- 17. Lưu lỗi gửi thư vào ATS
- 18. Hoàn tất xử lý yêu cầu

### 04 | TV2 2.3 – Phát hành thư mời nhận việc và nhắc hạn 24–48 giờ

- 01. Nhận yêu cầu phát hành thư mời nhận việc
- 02. Kiểm tra quyền phát hành thư mời nhận việc
- 03. Nhận nội dung thư mời từ Backend
- 04. Gửi thư mời nhận việc cho ứng viên
- 05. Lưu kết quả gửi và bắt đầu hạn 48 giờ
- 06. Chờ đến mốc 24 giờ
- 07. Kiểm tra phản hồi ứng viên sau 24 giờ
- 08. Kiểm tra có cần gửi thư nhắc
- 09. Gửi thư nhắc ứng viên và thông báo HR
- 10. Lưu kết quả gửi thư nhắc
- 11. Chờ đến hạn 48 giờ
- 12. Kiểm tra và đóng thư mời đã hết hạn
- 13. Kiểm tra thư mời hết hạn cần báo HR
- 14. Thông báo HR về thư mời hết hạn
- 15. Lưu kết quả thông báo hết hạn

## Các bản cũ/bản thử

- 90.01 | Bản cũ – Xếp lịch phỏng vấn và tạo Google Meet (7 node, đang tắt).
- 90.02 | Bản cũ – Tự động hóa nhân sự tổng hợp (19 node, đang tắt).
- 91.01 | Bản thử – Phỏng vấn qua Gmail và Google Meet (17 node, đang tắt).
- 91.02 | Bản thử – Lưu kết quả tạo lịch và gửi thư vào ATS (18 node, đang tắt).
- 91.03 | Bản thử – Xếp lịch và gửi thư từ giao diện tuyển dụng (10 node, đang tắt).
- 91.04 | Bản thử – Google Calendar và Gmail gửi cho chính mình (10 node, đang tắt).
- 91.05 | Bản thử – Phỏng vấn cục bộ không gửi ra ngoài (7 node, đang tắt).

## Kiểm tra sau đổi tên

- Cập nhật đồng thời tên node, đường nối và biểu thức tham chiếu trong Code/HTTP/Calendar/email.
- Giữ các đường dẫn webhook `jobs-changed`, `interview-schedule`, `offer-issued`.
- Bộ thử TV2 và hợp đồng phỏng vấn đạt 8 bài kiểm thử (bao gồm 12 tình huống kiểm tra Code của phỏng vấn).
- Webhook đồng bộ chạy thật trả HTTP 200 và cập nhật danh sách vị trí đang mở.
- Có bản sao trước khi đổi tên trong `.temp/tv2-local-import/before-vietnamese-names.json`.
