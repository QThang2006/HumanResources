# TV4 — Hồ sơ thôi việc

Trong Đào tạo & Phát triển, chọn **Hồ sơ thôi việc** bên cạnh Đánh giá định kỳ. Đây là vị trí ngắn hạn trong workspace TV4 đã thống nhất; không thay đổi menu chung của hệ thống. HR và Super Admin được thao tác; Manager/Employee không có tab và backend tiếp tục áp dụng quyền hiện có.

## Tạo và duyệt

1. Bước Chọn nhân viên: chọn Tạo hồ sơ, tìm và chọn một hoặc nhiều Employee đang hoạt động.
2. Bước Thông tin thôi việc: mỗi người có ngày làm việc cuối, email nhận thông báo, lý do, ghi chú tài sản và đường dẫn khảo sát riêng. Email nhận thông báo được điền từ email tài khoản, có thể đổi địa chỉ; trường này bắt buộc trên giao diện để thư có địa chỉ nhận; ngày được kiểm tra theo Việt Nam và không nằm trong quá khứ.
3. Bước Rà soát và duyệt: xem lại đầy đủ thông tin từng người rồi **Duyệt và gửi thông báo**. Đây là thao tác gửi thật khi workflow được cấu hình hoạt động.
4. Giao diện gọi POST /api/offboarding từng người theo thứ tự, không tạo một hồ sơ chung. Backend lưu và gửi caseId đến webhook tv4-offboarding. Không dùng dữ liệu ghim hay Execute thủ công để thay cho sự kiện duyệt.
5. Xem kết quả từng yêu cầu. Nếu đã lưu nhưng chưa chuyển được n8n, hồ sơ vẫn được giữ. Nếu mất kết nối, không tự lặp POST: kiểm tra danh sách trước khi tạo lại vì backend có thể đã lưu.

Nhân viên có hồ sơ chưa hủy, kể cả đã gửi đủ thông báo, bị loại khỏi danh sách tạo mới trên UI để tránh tạo lại một đợt thông báo cho cùng người. Giao diện không cung cấp chức năng hủy hồ sơ trong đợt này. Không sửa API hoặc schema backend.

## Theo dõi và xử lý lại

- Tìm theo mã hồ sơ, tên/email; lọc nhanh trạng thái; Xem hồ sơ mở bảng bên phải, gồm thông tin đã lưu và kết quả IT/Kế toán/nhân viên/Telegram.
- Khi có hồ sơ APPROVED/IN_PROGRESS và tab đang mở, giao diện đọc lại kết quả mỗi 5 giây trong tối đa 2 phút. Dừng khi hết hồ sơ chờ, đóng tab, rời màn hình hoặc hết thời gian theo dõi; không tự gửi lại. Tab trình duyệt ẩn không phát sinh request đọc định kỳ. Chọn Làm mới để bắt đầu một đợt theo dõi mới. Không kết luận gửi thất bại chỉ vì chờ lâu hoặc mất kết nối.
- APPROVED: đã duyệt, chờ điều phối; IN_PROGRESS: đang điều phối; PARTIAL/FAILED: thiếu kênh hoặc gửi lỗi; COMPLETED: **đã gửi đủ thông báo**.
- Với APPROVED/PARTIAL/FAILED, nút Yêu cầu xử lý lại yêu cầu xác nhận và gọi POST /api/offboarding/:id/retry. Kiểm tra execution cũ đã kết thúc trước khi dùng. IN_PROGRESS/COMPLETED/CANCELLED không có nút này.
- Workflow hiện có bỏ qua kênh đã được backend ghi nhận thành công. Đây không phải bảo đảm gửi đúng một lần trong mọi sự cố mạng hoặc khi nhiều phiên chạy đồng thời.
- Không coi COMPLETED là đã bàn giao tài sản, khóa tài khoản hay quyết toán. Giao diện không tự vô hiệu hóa hoặc xóa nhân viên.

## Điều kiện để gửi thật

Publish đúng WF-04 TV4 trên instance đang dùng, bỏ dữ liệu ghim, kiểm tra khóa tự động hóa trùng backend, webhook backend trỏ đúng instance, apiBaseUrl truy cập đúng backend và credential SMTP/Telegram. Rà soát email IT/Kế toán, sender, địa chỉ nhận thử nghiệm và Chat ID trước khi tạo hồ sơ. Workflow phải dùng cấu trúc retry theo từng kênh của bản nâng cấp. Git push không tự cập nhật workflow trong n8n.

API trả automationQueued chỉ xác nhận yêu cầu được chuyển theo cơ chế backend; không chứng minh thông báo đã tới hộp thư. Dùng execution, callback và hộp thư/Telegram để đối chiếu. Không đặt token hoặc mật khẩu vào tài liệu hoặc Git.

## Kiểm tra

`cd frontend && npm run test:offboarding` kiểm tra ngày, múi giờ, input, quyền hiển thị, xác nhận, kết quả theo kênh, batch có lỗi một phần, khóa chống gửi lặp, retry và API payload bằng mock. `npm run build` xác minh TypeScript và bundle. Các bài này không gửi email/Telegram hoặc tạo hồ sơ trong database thật. Kiểm tra gửi thật trên instance triển khai là bước riêng sau khi người dùng rà soát cấu hình.
