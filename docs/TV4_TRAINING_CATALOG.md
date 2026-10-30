# TV4 — Quản lý danh mục và người học

## Cách sử dụng

Trong **Đào tạo → Danh mục khóa học**, mỗi khóa có nút **Xem người học** và **Xóa**.

- **Xem người học** hiển thị tên, email, phòng ban, ngày gán, hạn hoàn thành, tiến độ và trạng thái. Có tìm kiếm, lọc trạng thái và phân trang 20 người. Nút **Quản lý tiến độ** mở bảng tiến độ đã lọc theo khóa.
- **Xóa** mở hộp xác nhận, sau đó chuyển khóa sang mục **Đã gỡ**. Các lượt gán, hạn học, tiến độ, số lần nhắc và lịch sử hoàn thành được giữ nguyên. Nhân viên đã được gán vẫn học và cập nhật tiến độ bình thường.
- Khóa đã gỡ không xuất hiện trong danh sách gán mới và không được AI đề xuất. Trong mục **Đã gỡ**, HR vẫn xem được người học và dùng **Khôi phục** để đưa khóa trở lại danh mục. Khôi phục không tự gán lại khóa hoặc tạo lượt gán trùng.

## API và dữ liệu

Các API bên dưới yêu cầu JWT với vai trò `HR` hoặc `SUPERADMIN`:

| Thao tác | API |
| --- | --- |
| Danh mục đang sử dụng | `GET /api/training/courses` |
| Bao gồm khóa đã gỡ | `GET /api/training/courses?includeArchived=true` |
| Người học của một khóa | `GET /api/training/courses/:id/assignments` |
| Gỡ khỏi danh mục | `DELETE /api/training/courses/:id` |
| Khôi phục | `PATCH /api/training/courses/:id/restore` |

Khóa được đánh dấu bằng cột `training_courses.is_archived`, mặc định `false` cho cả khóa cũ. Không xóa bản ghi khóa hoặc `employee_trainings`. Gỡ/khôi phục và gán thủ công dùng transaction với khóa bản ghi để xử lý yêu cầu đồng thời.

Ứng dụng hiện cấu hình TypeORM `synchronize: true`, nên backend thêm cột khi khởi động với phiên bản mới. Nếu môi trường triển khai tắt đồng bộ schema, cần áp dụng thay đổi schema trước khi chạy backend mới. Kiểm tra cột bằng `SHOW COLUMNS FROM training_courses LIKE 'is_archived';`; chỉ khi chưa có mới thêm:

```sql
ALTER TABLE training_courses
  ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0;
```

## Kiểm thử

- Backend: build rồi chạy `npm run test:training-catalog` trong thư mục backend. Cần biến môi trường `TV4_TEST_DB_PASSWORD` của tài khoản root MySQL phát triển tại `127.0.0.1:3307` (có thể đổi cổng bằng `TV4_TEST_DB_PORT`). Bài kiểm thử tạo database ngẫu nhiên riêng với tiền tố `hr_tv4_courses_test_`, tự dọn sau khi chạy; không dùng database nghiệp vụ. Không gọi AI thật, gửi email hoặc Telegram.
- Frontend: `npm run test:training-catalog` kiểm tra nội dung React render, trạng thái tải/lỗi/rỗng, phân trang và hộp xác nhận. Bài này không thay thế kiểm tra tương tác, focus hay bố cục trong trình duyệt.
- Hồi quy: backend `npm run test:documents`, `npm run test:tv4-automation`; frontend `npm run build`, `npm run lint`; thư mục gốc `docker compose config --quiet`.

## Phân tích năng lực bằng AI

Chức năng này gọi Gemini từ backend, không đi qua credential Gemini của n8n. Giá trị mẫu `your_gemini_api_key_here` trong `backend/.env` chưa phải cấu hình kết nối thật.

SuperAdmin vào **Cài đặt hệ thống → Tích hợp**, nhập khóa Gemini trong giao diện, chọn **Lưu cấu hình**, sau đó **Kiểm tra Gemini**. Khóa mới được áp dụng ngay sau khi lưu. Kiểm tra chỉ báo thành công khi Gemini trả về phản hồi hợp lệ; thiếu khóa hoặc gọi AI thất bại không được coi là kết nối thành công.

Sau đó vào **Đào tạo & Phát triển → Thiết lập**, chọn nhân viên và bấm **Phân tích năng lực bằng AI**. Trạng thái chờ hoặc lỗi hiện ngay dưới nút. Khi có kết quả, giao diện chuyển focus tới vùng kết quả. Đổi nhân viên sẽ hủy yêu cầu cũ để kết quả không bị gán nhầm. Mỗi bước gọi AI có ngân sách 20 giây dùng chung cho các model dự phòng, để hai bước phân tích và đề xuất không chiếm hết thời gian chờ 60 giây của giao diện. Phân tích không tự gán khóa; HR vẫn cần duyệt và bấm gán riêng.

Kiểm thử các trường hợp thiếu khóa, phản hồi sai định dạng, lỗi nhà cung cấp, lưu/nạp lại khóa và phản hồi hợp lệ bằng `npm run test:training-ai` trong cả backend và frontend. Các bài này dùng dữ liệu giả và không gọi Gemini thật.
