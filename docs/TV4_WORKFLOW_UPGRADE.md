# Nâng cấp ba workflow chính TV4 — 06/11/2026

Phạm vi: chỉ workflow 02, 03, 04, công cụ chuẩn bị import và kiểm thử TV4. Workflow 01 giữ nguyên 8 node. Không đổi API, schema hay quy tắc nghiệp vụ backend trong đợt nâng cấp workflow này; các thay đổi TV4 có sẵn trong working tree thuộc công việc trước đó.

| Workflow | Trước | Sau | Phần bổ sung |
|---|---:|---:|---|
| Mandatory Training Reminder & Escalation | 12 | 18 | Kiểm tra cấu hình, phân loại cảnh báo, xử lý tuần tự, kiểm tra email/Telegram và biên nhận callback |
| Monthly KPI Review Cycle & Follow-up | 12 | 19 | Chặn ngoài lịch, xử lý tuần tự theo quản lý, kiểm tra kênh, biên nhận và tổng kết đợt chạy |
| Offboarding Coordination & Delivery Recovery | 12 | 18 | Kiểm tra hồ sơ, trả lỗi rõ ràng, bốn nhánh chỉ gửi kênh chưa thành công |

Tên workflow/node bằng tiếng Anh; nội dung email/Telegram tiếng Việt. Node mới phục vụ kiểm tra, rẽ nhánh hoặc tổng hợp cụ thể. Loop Over Items có batch size 1 và reset=false, hoàn tất callback của một người nhận trước khi xử lý người tiếp theo. Đầu ra done gom các biên nhận để tổng kết, theo [tài liệu n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/).

## Kết quả xác minh

- 35 bài kiểm thử trong `npm run test:tv4-workflows`: điều kiện backend, callback chống ghi trùng, cấu trúc graph, từng kênh và các nhánh bổ sung.
- 8 kịch bản chạy graph bằng CLI n8n trong database SQLite tạm tách khỏi instance đang dùng: đào tạo nhiều người/rỗng; KPI nhiều quản lý/rỗng/ngoài lịch; thôi việc gửi đủ/thử lại riêng Telegram/hồ sơ không hợp lệ.
- Các fixture giữ Code/IF/Loop của graph gốc, thay tất cả HTTP, SMTP, Telegram và phản hồi webhook bằng node giả lập. Không dùng credential thật, không gọi API nghiệp vụ, không gửi mail hay Telegram.
- Kiểm tra gửi lại thôi việc xác nhận IT, Kế toán, nhân viên đã thành công không chạy lại; chỉ Telegram chạy. Kiểm tra nhiều người nhận xác nhận biên nhận và trạng thái không lẫn giữa các vòng lặp.
- Test bảo mật TV4 riêng xác nhận nguồn workflow tiếp tục lấy khóa từ môi trường n8n.

Kết quả này xác minh logic graph, không chứng minh Gmail/Telegram trên host đã giao tin thật. Việc nhận thư trong inbox, giới hạn nhà cung cấp và đường mạng host cần một lượt kiểm thử gửi thật có người nhận đã xác nhận.

## Trạng thái cập nhật

Ba workflow local được cập nhật đúng ID cũ từ bản export local, giữ cấu hình Set và tham chiếu SMTP/Telegram. Bản nhập chưa Publish để người dùng rà soát trước khi chạy. Không ghim dữ liệu. Workflow 01 không được import lại. Host chưa được chỉnh sửa hoặc Publish trong đợt này.

Export trước/sau, bản import có cấu hình instance và log kiểm thử nằm ngoài repository tại `/tmp/tv4-workflow-upgrade`. Thư mục `/tmp` là nơi tạm, không phải bản sao lưu lâu dài; nếu cần lưu, chuyển sang thư mục riêng an toàn ngoài Git. Không đưa raw export có bí mật vào repository.

## Cách cập nhật tiếp

1. Export riêng từng workflow 02/03/04 từ đúng instance cần nâng cấp, đặt tên file như thư mục nguồn. Giữ bản gốc để khôi phục.
2. Chạy builder với `--source-dir` và `--output-dir` ngoài repository. Builder giữ ID, cấu hình và credential reference của instance; không dùng ID local để thay host.
3. Kiểm tra từng file và import vào đúng workflow. Xác nhận tên, số node, credential, URL backend, sender và Chat ID.
4. Rà soát email chuyển hướng trước khi Execute. KPI: lịch hiện được cấu hình ở tab Đánh giá định kỳ; xem `TV4_REVIEW_CALENDAR.md`. Không đặt dữ liệu ghim để thay hồ sơ thôi việc thật.
5. Publish riêng từng workflow TV4 khi sẵn sàng. Không khởi động lại instance dùng chung hoặc sửa workflow của thành viên khác.

`reviewFormUrl` hiện có thể là đường dẫn workspace; workflow không triển khai biểu mẫu KPI. Thôi việc SENT/COMPLETED xác nhận việc thông báo theo logic backend hiện tại, không xác nhận các phòng ban đã hoàn thành bàn giao.

SMTP xác nhận server chấp nhận thư không bảo đảm thư vào inbox. Thử lại khi mất kết nối có thể giao thư trùng; alreadyNotified ngăn gửi lại kênh backend đã lưu thành công, không bảo đảm giao đúng một lần trong mọi sự cố hoặc khi hai lần chạy đồng thời.

Cập nhật lịch KPI ngày 06/11/2026: WF-03 có 19 node, chạy kiểm tra hằng ngày và dùng lịch backend do Super Admin cấu hình; bỏ hai trường mô phỏng trong node Set. Chi tiết ở [TV4_REVIEW_CALENDAR.md](TV4_REVIEW_CALENDAR.md).
