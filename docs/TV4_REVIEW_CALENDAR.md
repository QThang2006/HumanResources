# TV4 — Lịch và tiến độ đánh giá định kỳ

Trong **Đào tạo & Phát triển**, tab **Đánh giá định kỳ** đặt ngang hàng với Gán khóa, Danh mục và Theo dõi tiến độ.

- Super Admin và HR xem lịch theo tháng, nhân viên đang hoạt động, tình trạng có/chưa có bản đánh giá và kết quả thông báo mở kỳ/nhắc lần hai.
- Chỉ Super Admin được sửa lịch. Backend bảo vệ GET cho HR/Super Admin và PUT riêng Super Admin; Manager/Employee không được truy cập API lịch mới.
- Không có chức năng chấm KPI mới và không thay đổi quyền truy cập các màn hình của thành viên khác.
- Chọn tháng, tìm kiếm, lọc, Làm mới hoặc lưu lịch không gửi email/Telegram.

## Lịch lưu và điều kiện chạy

Bảng riêng `performance_review_schedules` lưu một dòng cho mỗi tháng, gồm ngày mở kỳ, ngày nhắc lần hai, hạn hoàn thành, phiên bản và người cập nhật. Tháng chưa có cấu hình dùng ngày 25, ngày 28 và ngày cuối tháng; GET không tự tạo dữ liệu.

Ba ngày phải là ngày hợp lệ trong cùng kỳ, với **mở kỳ < nhắc lần hai <= hạn hoàn thành**. Việc ghi dùng phiên bản để từ chối lưu đè từ một phiên cũ (HTTP 409). Thay đổi lịch không xóa kết quả thông báo đã có.

Workflow KPI local có **19 node**, một Schedule Trigger **Daily Review Schedule** chạy lúc 08:00 mỗi ngày, múi giờ Việt Nam. API backend xác định đợt theo lịch đã lưu và ngày hiện tại; workflow kiểm tra `phase` từ response. Ngoài ngày phù hợp thì dừng trước các bước gửi. Không còn dùng `testPhase`/`testAsOf` trong cấu hình workflow. Các query mô phỏng cũ của automation API vẫn được giữ để tương thích kiểm thử có xác thực.

Đối tượng nhắc vẫn lấy từ dữ liệu thật: nhân viên đang hoạt động chưa có đánh giá trong kỳ, gom theo quản lý trực tiếp/phòng ban/HR dự phòng. Cơ chế chống gửi lặp theo kỳ, đợt và người nhận giữ nguyên. Ngày đã qua không tự gửi bù; lịch chỉ chạy khi đúng ngày. Hai lần Execute sau khi ghi SENT cho cùng kỳ/đợt/người nhận sẽ không gửi lại chỉ vì đã sửa ngày.

Lịch chỉ cấu hình ngày, không thay đổi giờ 08:00 hoặc quyền truy cập. Chọn một tháng trên giao diện không làm workflow chạy theo tháng ấy: n8n luôn dùng tháng hiện tại theo giờ Việt Nam.

## API và dữ liệu

- `GET /api/performance-reviews/calendar/:period` — HR/Super Admin; lịch, roster, thống kê và kết quả từng đợt cho nhân viên.
- `PUT /api/performance-reviews/calendar/:period` — Super Admin; `openingDate`, `reminderDate`, `deadline`, `version`.
- API automation hiện có `GET /api/training/automation/review-reminders` tiếp tục dùng khóa tự động hóa, trả lịch và phase của ngày chạy. Không đưa khóa này ra frontend.

Entity TV4 được đăng ký thêm vào AppModule (chỉ import và danh sách entity). Cấu hình `synchronize: true` hiện tại tạo bảng khi backend khởi động; môi trường tắt synchronize phải chạy migration bổ sung `backend/migrations/20261106_tv4_review_calendar.sql` trước khi triển khai. Không thay đổi schema của thành viên khác.

## Kiểm thử và trạng thái

- Backend biên dịch vào thư mục tạm riêng để không xóa `dist` của phiên dev đang watch.
- Unit: ngày không tồn tại, năm nhuận, thứ tự ngày, múi giờ Việt Nam, mặc định không ghi DB, phiên bản cũ và lọc theo lịch đã lưu.
- MySQL/HTTP xác thực thật trong database tạm tự dọn: quyền các vai trò, lưu/đọc lại, ngày sai không ghi một phần, lưu đồng thời, nộp đánh giá cập nhật danh sách, biên nhận hiện trên bảng và đổi ngày không làm mất dedupe.
- Graph n8n kiểm thử bằng database riêng với toàn bộ HTTP/email/Telegram được thay bằng fixture: nhiều quản lý, danh sách rỗng và ngoài lịch.
- Giao diện xem trước dùng dữ liệu giả, không gọi API hoặc gửi thông báo; kiểm tra desktop/mobile và quyền xem HR.

Bản source và WF-03 local đã cập nhật, giữ credential/mail routing hiện có và chưa Publish. WF-01, WF-02, WF-04 local và host không được cập nhật trong đợt lịch KPI này. Không đổi lịch hiện tại của người dùng, không gửi thư thật. Link trong thư vẫn dùng reviewFormUrl đã cấu hình; nếu là workspace thì chưa có nghĩa tồn tại biểu mẫu KPI cho Manager.

## Cách thử bằng dữ liệu local

1. Vào Đào tạo & Phát triển → Đánh giá định kỳ, chọn tháng hiện tại.
2. Đăng nhập Super Admin, đặt ngày mở kỳ là hôm nay, ngày nhắc lần hai sau hôm nay, hạn không trước ngày nhắc và cùng tháng. Kiểm tra rồi xác nhận lưu.
3. Xác nhận Gmail chuyển hướng, Telegram và backend URL trong WF-03 trước khi gửi thật.
4. Mở WF-03 local, Execute. Backend lọc danh sách rồi workflow gửi theo cấu hình; nếu không có người đủ điều kiện thì không gửi thư cá nhân.
5. Quay lại website, chọn Làm mới để xem kết quả callback. HR cũng xem được nhưng không có ô sửa ngày.

Đây là lịch thật trong dữ liệu local, không phải ngày giả lập. Nếu không muốn lịch dùng cho lần chạy tự động tiếp theo, hãy khôi phục các ngày phù hợp sau thử nghiệm. Ngày 31 không thể chọn ngày nhắc sau ngày mở trong cùng tháng; chọn kỳ phù hợp hoặc đợi kỳ kế tiếp.
