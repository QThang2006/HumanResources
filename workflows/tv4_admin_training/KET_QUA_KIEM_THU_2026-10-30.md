# Kết quả kiểm thử TV4 ngày 30/10/2026

## Phạm vi và kết quả

Kiểm thử trên môi trường cục bộ: backend cổng 3001, frontend cổng 5173,
n8n cổng 5678. Không kiểm thử hoặc triển khai lên VPS/host trong lượt này.

| Nhóm | Kết quả | Bằng chứng và giới hạn |
| --- | --- | --- |
| Kho tri thức | 13/13 test đạt | `npm run test:documents`; gồm nối dòng PDF, loại câu bị cắt dở, không trích mục sai chủ đề, không gắn nguồn khi thiếu căn cứ |
| Tự động hóa TV4 | 22/22 test đạt | `npm run test:tv4-automation`; có chạy trực tiếp JavaScript từ Code node trong JSON với dữ liệu và kết quả gửi mô phỏng |
| Backend/frontend | Build đạt | Frontend lint không có lỗi, còn cảnh báo ở các phân hệ có sẵn; Vite còn cảnh báo bundle lớn |
| RAG qua n8n thật | 3 tình huống đạt | API → webhook n8n → tìm kiếm → tạo/trích câu trả lời → phản hồi API |
| Email thật | SMTP chấp nhận 6 thư đúng vai trò + 1 thư kiểm tra hệ thống | Đào tạo 2, KPI 1, offboarding 3; bước IT phải thử lại riêng sau lỗi socket. `250 OK`, `rejected: []` chứng minh SMTP chấp nhận, chưa chứng minh đã vào Inbox hoặc giữ nguyên From |
| Telegram thật | 3/3 tin gửi thành công | Đào tạo, KPI và thôi việc gửi vào đúng nhóm người dùng xác nhận, đúng bot; Telegram trả message ID 13, 14, 15. Lượt này không gửi lại email |

## Kết quả RAG qua n8n

- `gán khóa học và thời hạn`: trả hai câu trọn vẹn về hạn mặc định 30 ngày
  và khóa hội nhập trong 15 ngày đầu; dùng một nguồn. Không còn mảnh từ
  đầu chunk hoặc nội dung tiêu chuẩn tham dự 80% không liên quan.
- `Nhân viên mới phải học hội nhập trong bao lâu?`: trả thời hạn 15 ngày đầu.
- Câu hỏi về khai thác khoáng sản trên sao Hỏa: thông báo chưa đủ thông tin,
  không gắn nguồn cho câu trả lời.

Gemini chưa được cấu hình trên backend cục bộ, nên ba kết quả trên có
`aiGenerated: false`. Đây là kiểm thử trích câu theo nguồn, chưa chứng minh
chất lượng tổng hợp của Gemini trực tiếp.

## Lỗi đã sửa

- Fallback RAG không còn lấy nguyên 1.500 ký tự đầu của một chunk bất kỳ.
  Các dòng PDF được nối trước khi chọn câu; câu cắt dở bị loại. Chọn câu theo
  từ khóa và tiêu đề mục; chỉ gắn nguồn thực sự dùng để trả lời.
- Chia PDF mới theo đoạn/câu/từ, giữ lại cả phần đuôi ngắn; tránh cắt giữa từ.
  Dữ liệu đã lập chỉ mục không bị tự động xóa hoặc ghi lại.
- Giao diện trình bày ý dưới dạng danh sách; phân biệt AI tổng hợp với trích
  đoạn, gom các chunk cùng tài liệu thành một nguồn hiển thị. Điểm tìm kiếm
  chỉ xuất hiện trong phần đối chiếu, không nằm cạnh câu trả lời như độ chính xác.
- Workflow đào tạo: node soạn nội dung và tổng hợp kết quả chạy theo từng item,
  giữ đủ nhân viên trong một lượt. Telegram dùng xuống dòng thật; dữ liệu tên
  và khóa học được escape trước khi đưa vào HTML. SMTP từ chối người nhận hoặc
  Telegram trả `ok: false` được tính là lỗi kênh gửi.

Bản sửa workflow đào tạo đã được import vào n8n cục bộ cùng cấu hình mail
do người dùng chốt. Ba workflow thông báo chính vẫn inactive.

## Kiểm tra cấu hình gửi thư

n8n cục bộ có một credential SMTP, một Telegram và một Header Auth. Lúc kiểm tra
ban đầu, các trường nhận thư trong workflow còn là giá trị mẫu. Sau đó người dùng
đã cung cấp và chốt bốn địa chỉ theo vai trò hệ thống, quản lý, nhân viên,
IT/Kế toán. Mapping được lưu trong `.temp/tv4-mail-routing.json` (Git bỏ qua)
và áp dụng vào ba workflow chính; giữ nguyên credential đang gắn.

Không giải mã hoặc thay đổi credential. Lượt gửi tới hộp thư hệ thống và sáu
thư theo vai trò đều được SMTP chấp nhận. Người nhận cần kiểm tra Inbox/Spam
và trường From thực tế vì relay có thể viết lại địa chỉ gửi.

Các bản test chạy một lần bằng CLI với cổng runner riêng; không publish webhook.
Dữ liệu hồ sơ là giả, tiêu đề có `TV4 TEST`; không gọi callback ghi nghiệp vụ.
Workflow RAG vẫn hoạt động. Toàn bộ workflow gửi thư chính và bản test vẫn inactive.

## Kiểm thử Telegram sau khi người dùng xác nhận nhóm

- Người dùng cung cấp username `@human_resources_training_bot` và đường dẫn
  nhóm Telegram Web. Đã dùng Telegram **Chat → Get** qua credential hiện có
  để xác minh ID, tên nhóm `TV4 - Cảnh báo đào tạo` và loại `group` trước khi gửi.
- Chat ID được lưu trong file cấu hình cục bộ bị Git bỏ qua, rồi import vào
  cả ba workflow chính; giữ nguyên các email và credential đã chốt.
- Chạy ba bản test chỉ Telegram. Email Send được thay bằng node bỏ qua rõ ràng,
  callback ghi nghiệp vụ được thay bằng node kiểm tra kết quả. Không gửi lại email
  hoặc cập nhật hồ sơ nhân sự/thôi việc thật.
- Tin đào tạo: Telegram trả message ID **13**. Tin KPI: **14**. Tin thôi việc: **15**.
  Cả ba đều xác minh lại ID nhóm và `from.username` của bot trong phản hồi API.
- Tin có nhãn `TV4 TEST`, dùng dữ liệu giả; phản hồi tin đào tạo xác nhận xuống
  dòng thật, không chứa chuỗi ký tự `\\n` thừa.
- Kết quả này chứng minh gửi Telegram thật cho ba nội dung. Email và Telegram
  được kiểm thử theo từng kênh; chưa chạy lịch tự động hoặc callback ghi nghiệp vụ
  bằng hồ sơ thật trong lượt nghiệm thu này.

## Sự cố trong lượt thử thật và cách xử lý

- Lượt đầu chạy nhầm bản test cũ: `docker cp` lồng thư mục vào đích đã tồn tại,
  còn lệnh import đọc các file cũ ở tầng ngoài. SMTP đã chấp nhận hai thư dữ liệu
  giả tới địa chỉ mẫu `your_email@gmail.com`. Đây là gửi sai địa chỉ nhận; hai thư
  không chứa dữ liệu nhân sự thật hoặc mật khẩu. Không có bằng chứng thu hồi thư.
- Đã sửa bằng cách copy/import từng file đích cụ thể. Trước mỗi lượt chạy sau,
  script đối chiếu SHA-256 của nodes/connections lưu trong n8n với đúng file
  đã chuẩn bị; nếu không khớp hoặc workflow đang active, không khởi chạy.
- Lượt offboarding đúng mapping gửi được Kế toán và nhân viên, nhưng IT báo
  `Unexpected socket close`. Không chạy lại toàn bộ workflow. Đã thử lại riêng
  bước IT, có nhãn `GỬI LẠI BƯỚC IT`, và SMTP chấp nhận. Vì kết quả của lần mất
  socket chưa rõ, người nhận có thể thấy hai thư IT.
- Email và Telegram được ghi nhận riêng. Các lượt test mail trước đó có trạng thái
  kênh tổng hợp `PARTIAL` khi bỏ qua Telegram. Các lượt Telegram-only sau đó cũng
  có `PARTIAL` trong node tổng hợp gốc vì cố ý bỏ qua email; callback kiểm thử riêng
  xác nhận thành công đúng kênh, không giả lập cả hai kênh đều gửi trong một lượt.

Vấn đề thiếu Chat ID đã được giải quyết bằng đường dẫn nhóm do người dùng cung cấp.

## Lệnh kiểm tra lại

Tại `backend`:

```bash
npm run build
npm run test:documents
npm run test:tv4-automation
```

Tại `frontend`:

```bash
npm run build
npm run lint
```

Thay đổi mã nguồn được giữ cục bộ, chưa stage/commit/push. Build không thay thế
việc kiểm tra trực quan trên trình duyệt. Kênh Telegram và việc đọc thư tại hộp
thư đích được phân biệt: Telegram API đã xác nhận ba tin gửi thật; việc thư vào
Inbox và From thực tế vẫn cần được người nhận đối chiếu.
