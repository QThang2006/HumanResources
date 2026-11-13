# TV4 — Người nhận email khi triển khai

Các workflow nguồn WF-02/03/04 để rỗng `testEmployeeEmail`, `testManagerEmail`, `testInternalEmail` nếu có. Chỉ điền tạm các trường này khi kiểm thử có kiểm soát, sau đó xóa và Publish lại đúng workflow TV4. Chạy Execute không tự xóa cấu hình thử.

- WF-02: email nhân viên và quản lý lấy từ lượt đào tạo do backend trả về.
- WF-03: email người phụ trách lấy từ backend; `reviewFormUrl` trỏ tới `https://soma-registrar-dependent-baltimore.trycloudflare.com/admin/settings`. Người nhận vẫn phải đăng nhập đúng vai trò; liên kết không cấp thêm quyền.
- WF-04: email cá nhân của nhân viên được ưu tiên, không có thì dùng email công việc. `itEmail` và `accountingEmail` là hộp thư tiếp nhận đã được đơn vị xác nhận; các địa chỉ trong template chỉ là ví dụ, phải đối chiếu cấu hình instance trước Publish.

Script `scripts/prepare-tv4-n8n-import.cjs` cho phép bỏ qua hoặc để rỗng ba địa chỉ test trong tệp cấu hình riêng; nếu điền thì phải là email hợp lệ. Email người gửi, IT và Kế toán vẫn bắt buộc hợp lệ. Tệp cấu hình riêng và export có bí mật phải nằm ngoài Git. Không đổi credential SMTP/Telegram dùng chung khi sửa người nhận.

Kiểm thử mã nguồn, không gửi thư:

```bash
node --test backend/test/tv4-mail-routing.test.cjs backend/test/tv4-workflow-upgrade.test.cjs
```

Kiểm thử gửi thật: giữ email thử đã xác nhận, lấy danh sách trước để biết số người sẽ xử lý, chạy một lượt và đối chiếu SMTP/Telegram/callback. Sau đó xóa email test và ngày mô phỏng, Publish, mở lại cấu hình để kiểm tra. Không chạy tiếp sau khi xóa chuyển hướng vì có thể gửi cho người thật.

Node `Respond to Offboarding Request` của WF-04 dùng `First Incoming Item` để trả nguyên JSON xác nhận từ backend, tránh biểu thức JSON lồng nhau. Callback đã ghi nhận trả HTTP 200; callback lỗi hoặc chưa ghi nhận trả HTTP 502. Nếu chỉ node phản hồi bị lỗi sau khi các thư đã gửi, thử lại từ node lỗi với workflow đã lưu thay vì chạy lại toàn bộ luồng.

Ngày 13/11/2026, khảo sát thôi việc được mở trong trình duyệt chưa đăng nhập Google: thấy câu hỏi và nút Gửi, đăng nhập chỉ là tùy chọn lưu tiến trình. Không nộp câu trả lời thử, không thay quyền chia sẻ. Cần kiểm tra lại nếu chủ form đổi cài đặt.

Địa chỉ trycloudflare có thể thay đổi; khi đổi tên miền phải cập nhật link trên instance n8n và template TV4 tương ứng.
