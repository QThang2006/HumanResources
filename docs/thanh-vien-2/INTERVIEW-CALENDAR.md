# TV2 — Lịch và danh sách phỏng vấn

Cập nhật 07/10/2026. Tính năng xem lịch/link của từng vòng phỏng vấn. Evidence E022 trong PROGRESS.md. Đây là phần xem lịch/link, thuộc phân hệ tuyển dụng TV2.

## Sử dụng

1. Đăng nhập HR/Superadmin/Manager, vào `/admin/recruitment` → **Lịch phỏng vấn**.
2. Chọn **Tuần** hoặc **Tháng**, rồi **Lịch** hoặc **Danh sách**. Danh sách nhóm theo ngày, sắp giờ tăng dần; lịch tháng hiển thị tối đa 3 buổi/ngày, bấm **Xem thêm** để mở các buổi còn lại.
3. Dùng **Hôm nay**, mũi tên trước/sau, hoặc **Đi đến ngày**. Tất cả ngày giờ hiển thị theo Việt Nam (UTC+7), tuần bắt đầu thứ Hai. Lịch tháng có 42 ô, gồm ngày đầu/cuối từ tháng lân cận.
4. Tìm tên/email ứng viên hoặc tên vị trí; kết hợp lọc vị trí, người phỏng vấn, kết quả. Có cả vòng cũ và tin đã đóng để xem lịch sử.
5. Bấm một buổi để thấy tên, ngày giờ, vòng, người phỏng vấn, phòng ban và hồ sơ. Khi DB đã có link Meet hợp lệ, cửa sổ hiện link và nút **Vào phòng phỏng vấn** mở tab mới. **Xem hồ sơ ứng viên** mở chi tiết ATS hiện có.
6. Chưa có link thì hiển thị rõ trạng thái; **Cập nhật link** tải lại chi tiết. Trang tự tải lại lịch mỗi 30 giây, chi tiết mỗi 15 giây khi tab đang hiện; có thêm làm mới khi quay lại cửa sổ và nút **Làm mới**.

Màn hình nhỏ có thể vuốt ngang lịch để xem đủ 7 ngày; danh sách tự xuống dòng. Không suy ra độ dài buổi họp hoặc báo trùng lịch vì dữ liệu hiện chỉ có thời điểm bắt đầu.

## API và phân quyền

| Endpoint GET | Mục đích |
| --- | --- |
| `/api/applications/interviews/schedule` | Danh sách phân trang trong khoảng ngày |
| `/api/applications/interviews/schedule/filters` | Vị trí/người phỏng vấn có lịch trong phạm vi quyền |
| `/api/applications/interviews/schedule/:id` | Chi tiết mới nhất của một vòng phỏng vấn |

- Bắt buộc JWT và role HR/SUPERADMIN/MANAGER. HR/Superadmin xem toàn bộ; Manager chỉ xem phòng ban của mình, kể cả bộ lọc và chi tiết. Không có phòng ban thì Manager không nhận lịch nào.
- Query `from`, `to` là ISO8601 có múi giờ, bắt đầu được bao gồm, kết thúc không bao gồm, tối đa 62 ngày. Có `page`, `pageSize` (tối đa 100), `q` (tối đa 150 ký tự), `jobId`, `interviewerId`, `result` (`PENDING`/`PASSED`/`FAILED`).
- Response là page envelope với `items`, `total`, `page`, `pageSize`; chỉ chọn trường dùng trên UI. Không trả CV text, mật khẩu hay token callback.
- UI tải các trang 100 dòng, tối đa 1.000 buổi/khoảng; vượt mức thì yêu cầu thu hẹp khoảng hoặc bộ lọc, không âm thầm cắt danh sách. Request cũ được hủy khi đổi bộ lọc/ngày.
- Chỉ link đúng mẫu `https://meet.google.com/abc-defg-hij` được làm liên kết; cả BE/FE kiểm tra. Tab mới có `noopener noreferrer`. Link đến từ `interviews.meetingLink`, không tạo phòng chỉ vì mở lịch.

## File triển khai

- BE: `interview-schedule.controller.ts`, `interview-schedule.dto.ts`, đăng ký trong ApplicationsModule.
- FE: `InterviewSchedule.tsx`, `calendar-date.ts`, types/API, tích hợp RecruitmentAdminPage.
- Test: `backend/test/interview-schedule.test.cjs`, `frontend/test/calendar-date.test.cjs`.

## Kiểm thử và chạy demo

- Backend build, frontend TypeScript/Vite build đạt. Lint feature/API/types không có lỗi/warning mới; 2 warning ở trang RecruitmentAdminPage có từ trước.
- Backend calendar 7/7 (gồm test cha), seed regression 8/8, tổng 15/15 đạt với MySQL/JWT thật. Kiểm role/scope, boundary ngày, pagination/ties, filter/validation, safe detail/link và thay đổi link trong DB.
- Chạy test ngày trong `frontend`: `npm run test:calendar-date`. Test dùng TypeScript có sẵn để đọc source, không yêu cầu Node hỗ trợ import `.ts` trực tiếp; kiểm mốc 00:00 VN, tuần/tháng/năm nhuận và link.
- Browser đã kiểm lịch tuần/tháng, danh sách theo giờ, tổ hợp bộ lọc, mở hồ sơ, thêm/bỏ fixture link và trạng thái tháng không có lịch. Viewport thực tế 662px; chưa khẳng định đã kiểm thiết bị 375px.
- Frontend cấu hình bằng `VITE_API_BASE_URL`; xem DEMO-DATA.md để chạy demo seed hoặc thêm dữ liệu vào DB nhóm.
- Bản công bố được build và test riêng từ HEAD seed `27fbd3f` cộng đúng thay đổi lịch, không cần code readback local để khởi động.
- AI/n8n dùng stub trong test; link fixture đã gỡ. Không tạo phòng Meet/gửi thư trong lượt kiểm lịch. Link thật hiện khi một tích hợp lưu `interviews.meetingLink` thành công.
