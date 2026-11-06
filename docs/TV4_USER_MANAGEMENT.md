# TV4 — Người dùng và phân quyền

## Phạm vi

Hoàn thiện quản lý tài khoản trên màn Cài đặt hệ thống: danh sách gọn, khung chỉnh sửa, lọc và bảo vệ dữ liệu khi xóa. Giữ bốn vai trò hiện có, quyền truy cập các phân hệ và cơ chế xác thực chung. Không sửa workflow, n8n, entity, migration hoặc component dùng chung.

Tách `RbacTable` từ `AdminSettingsPage.tsx` thành `UserManagementPanel.tsx`; giữ chức năng tạo tài khoản và thêm phòng ban hiện có. Các phần tích hợp, kho tri thức và đào tạo trong trang vẫn sử dụng component tương ứng.

## Hành vi

- Bảng chỉ hiển thị một cột vai trò; không cập nhật trực tiếp khi chọn dropdown trong bảng.
- Bấm tên hoặc Chi tiết để mở khung bên phải; trên màn nhỏ khung sử dụng toàn chiều rộng.
- Chỉnh phòng ban/chức danh và vai trò/trạng thái trong cùng bản nháp. Lưu gửi một PATCH chỉ gồm các trường đã thay đổi.
- Đổi vai trò hoặc trạng thái cần xác nhận tóm tắt các thay đổi. Hủy khi có bản nháp cần xác nhận bỏ thay đổi; lỗi lưu giữ nguyên bản nháp.
- Họ tên và email hiện chỉ để xem, phù hợp với API cập nhật hiện có.
- Quản trị gốc và tài khoản đang đăng nhập chỉ để xem. Backend vẫn chặn hạ quyền/vô hiệu hóa tài khoản gốc, tự đổi quyền/trạng thái và tự xóa.
- Vô hiệu hóa chặn đăng nhập và các yêu cầu có JWT ở lần kiểm tra tiếp theo; kích hoạt lại cho phép truy cập. Không phải thu hồi vĩnh viễn mọi token cũ: token chưa hết hạn có thể dùng lại sau khi kích hoạt lại, đúng cơ chế hiện có.
- Backend đọc vai trò từ cơ sở dữ liệu khi xác thực, nên JWT cũ không giữ quyền cao sau khi bị hạ quyền. Giao diện ở phiên cũ có thể cần đăng nhập lại để cập nhật menu.
- Lọc theo từ khóa, vai trò, phòng ban và trạng thái; có số kết quả và nút xóa bộ lọc.
- Thông báo chung ở giữa phía trên, tự ẩn và đóng được; lỗi lưu của khung nằm ngay trong khung.

## Xóa tài khoản

Xóa vĩnh viễn nằm trong Thao tác nâng cao, chỉ mở sau khi đã lưu trạng thái vô hiệu hóa và không có bản nháp. Nhập đúng họ tên để xác nhận.

Backend không dựa vào việc khóa ngoại có báo lỗi hay không: trước khi xóa, kiểm tra mọi khóa ngoại đến User trong metadata TypeORM, kể cả CASCADE và SET NULL. Khi có liên kết, trả 409 và giữ tài khoản để bảo toàn lịch sử/quan hệ quản lý. Kiểm tra và xóa chạy trong transaction có khóa bản ghi User; không đổi cấu trúc dữ liệu của thành viên khác. Tài khoản đang hoạt động trả 400. Tài khoản không tồn tại trả 404.

## Kiểm thử

- Build backend và frontend: đạt.
- `backend/test/user-management.test.cjs`: 8 kiểm tra (bao gồm suite) đạt, dùng MySQL database tạm riêng, HTTP thật, JWT thật, tự dọn database. Xác nhận quyền sửa/xóa, validation và không lưu một phần, bảo vệ quản trị gốc, JWT cũ nhận vai trò mới, khóa/mở tài khoản, giữ lịch sử học tập, giữ liên kết quản lý/phòng ban và xóa tài khoản trống.
- `backend/test/users-role-boundary.test.cjs`: đạt.
- Frontend `training-catalog`, `training-ai`, `training-date`, `calendar-date`: đạt.
- Preview localhost:4318 dùng component thật và API giả: lưu gộp, xác nhận đổi quyền, lỗi giữ bản nháp, hủy bản nháp, lọc trạng thái, khóa sửa quản trị gốc, điều kiện mở xóa; desktop và màn 375px.
- Không gửi email/Telegram, không đổi tài khoản hoặc dữ liệu host thật.

Nhật ký thay đổi tài khoản và tab quản trị phòng ban đầy đủ là bước tiếp theo; chưa thêm dữ liệu hoặc chức năng giả cho hai phần này.
