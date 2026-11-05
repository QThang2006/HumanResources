# Ba workflow tuyển dụng của Thành viên 2

Ba quy trình độc lập, mỗi quy trình có ít nhất 12 node thực thi. n8n không chấm CV và không sinh JD; hai chức năng đó vẫn thuộc Backend.

| Luồng | Số node | Mở trong n8n local |
|---|---:|---|
| 2.1 Nhận CV Gmail / Google Form và xác nhận | 13 | http://localhost:5678/workflow/hrTv2IntakeV2 |
| 2.2 Phỏng vấn, Google Meet, lịch ICS hai bên | 18 | http://localhost:5678/workflow/hrTv2InterviewV2 |
| 2.3 Offer Letter, nhắc 24h và hết hạn 48h | 15 | http://localhost:5678/workflow/hrTv2OfferV2 |

Các bản import ban đầu ở trạng thái **chưa Publish**. Calendar và SMTP được gắn lại nếu tìm thấy đúng một credential cùng loại trong profile hiện tại. Gmail, Sheets, Drive cần bạn đăng nhập đúng tài khoản Google; chưa có tài khoản kết nối thì không thể chạy đầu cuối với Google thật.

## Chuẩn bị một lần

Từ thư mục `HumanResources`, điền đúng địa chỉ gửi được cấp quyền trong credential SMTP và email HR nhận báo cáo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\configure-tv2-local.ps1 -FromEmail "EMAIL_GUI_THAT" -HrEmail "EMAIL_HR_THAT"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\import-tv2-local.ps1
```

Script cấu hình chỉ cập nhật MAIL_FROM, HR_EMAIL, PUBLIC_WEB_BASE_URL và RECRUITMENT_CALLBACK_BASE_URL. Script import tạo N8N_INTAKE_KEY ngẫu nhiên nếu chưa có, gắn Header Auth `x-intake-key`, không in khóa ra màn hình. Không chạy import lại trên workflow đang có execution chờ nếu chưa đánh giá ảnh hưởng của việc cập nhật.

Khởi động lại Backend sau khi cập nhật code/cấu hình:

```powershell
cd .\backend
node .\node_modules\@nestjs\cli\bin\nest.js build
node .\dist\main.js
```

Dừng tiến trình Backend cũ trong terminal của nó trước để tránh trùng cổng 3001. Frontend chạy ở terminal khác:

```powershell
cd .\frontend
node .\node_modules\vite\bin\vite.js --host 127.0.0.1
```

MySQL và n8n:

```powershell
docker compose up -d mysql
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-n8n-local.ps1
```

URL localhost dùng để demo trên máy này. Khi gửi cho ứng viên bên ngoài, PUBLIC_WEB_BASE_URL phải là URL HTTPS họ truy cập được; Frontend cần trỏ đến Backend công khai phù hợp. Địa chỉ API trong workflow phải khớp RECRUITMENT_CALLBACK_BASE_URL, không lấy địa chỉ callback tùy ý từ nội dung email/webhook.

## 2.1 — Thu CV đa kênh (13 node)

1. Gmail Trigger: quét thư chưa đọc, có PDF và tiêu đề chứa `JOB-`.
2. Đọc email người gửi, tên, mã việc; yêu cầu đúng một PDF.
3. Google Sheets Trigger: nhận dòng mới từ bảng phản hồi Google Form.
4. Chuẩn hóa các cột Form và ID file Drive.
5. Tải CV từ Drive bằng quyền của tài khoản HR.
6. Kiểm tra thông tin ứng viên và PDF.
7. Gửi multipart `cv` tới Backend với Header Auth.
8. Chỉ gửi xác nhận nếu Backend vừa tạo hồ sơ mới.
9. Soạn thư cảm ơn, escape nội dung người dùng.
10. Gửi thư xác nhận bằng SMTP.
11. Lưu messageId và xác nhận đúng người nhận vào ATS.
12. Kiểm tra nguồn là Gmail hay Form.
13. Đánh dấu Gmail đã đọc sau khi xử lý; Form kết thúc ở nhánh còn lại.

Node 1–2 và 3–5 là hai đầu vào thay thế nhau; không cần cả hai cùng kích hoạt. Gmail dùng ví dụ tiêu đề `Ứng tuyển JOB-12`, trong đó 12 là ID job đang mở. Số điện thoại có thể để trong nội dung `Phone: 0900000000`.

Tạo Google Form với tiêu đề các câu hỏi đúng như các cột sau, rồi liên kết với Google Sheet:

| Cột | Nội dung |
|---|---|
| jobId | ID vị trí đang mở trong ATS |
| candidateName | Họ tên |
| candidateEmail | Email ứng viên |
| candidatePhone | Số điện thoại, có thể bỏ trống |
| cvFileId | Câu hỏi tải lên một PDF; Sheet chứa URL Drive của file |
| Timestamp / Dấu thời gian | Google Form tự thêm; dùng cùng ID file để chống trùng |

Cũng có thể dùng cột `sourceId` duy nhất thay cho timestamp. Không nhập nhiều file vào một phản hồi. Trong node 3 chọn đúng Spreadsheet và Sheet thay cho giá trị cấu hình mẫu; kết nối Google Sheets Trigger OAuth2. Node 5 dùng Google Drive OAuth2 có quyền đọc các file Form. Node 1 và 13 dùng cùng Gmail OAuth2. SMTP là kết nối riêng, không thay thế được Gmail OAuth2.

Backend chống trùng cả theo nguồn và cặp job/email, lưu CV riêng tư qua service hiện có. Nếu gửi email lỗi sau khi tạo hồ sơ, execution n8n báo lỗi và trạng thái xác nhận vẫn `CLAIMED` (chưa xác minh). Không tự gửi lại toàn bộ execution gây thư trùng; xem node lỗi và đối chiếu SMTP trước khi gửi thủ công.

## 2.2 — Phỏng vấn và Google Meet (18 node)

1. Nhận webhook khi HR xếp lịch trên UI.
2. Kiểm tra capability và địa chỉ callback cố định.
3. Claim lịch ở Backend; chặn thực thi trùng.
4. Tải payload gốc đã lưu trong DB.
5. Tạo Google Calendar event với ID xác định và hai người tham dự.
6. Chờ Google tạo conference (5 giây).
7. Đọc lại Calendar event.
8. Xác minh thời gian, ID, trạng thái và link Meet thật.
9. Lưu Meet về ATS qua callback có token.
10. Tạo thư và file `.ics` dùng iCalUID của chính event Google.
11. Gửi cùng thư mời và ICS cho ứng viên lẫn người phỏng vấn.
12. Kiểm tra SMTP đã chấp nhận đủ hai người nhận.
13. Lưu trạng thái gửi vào ATS.
14. Chuẩn hóa lỗi Calendar nếu có.
15. Lưu lỗi Calendar vào ATS.
16. Chuẩn hóa lỗi email nếu có.
17. Lưu lỗi email vào ATS.
18. Kết thúc execution.

File ICS có METHOD:REQUEST, organizer, hai attendee, UID/SEQUENCE, giờ UTC, escape ký tự và xuống dòng theo giới hạn 75 byte. Hai bên có thể nhập lịch và phản hồi bằng ứng dụng lịch; đây không phải workflow đồng bộ RSVP về ATS.

Endpoint cũ `/applications/interviews/:id/meeting-link` nay yêu cầu JWT HR/SUPERADMIN để không cho người ngoài bỏ qua callback được xác thực. Workflow mới sử dụng endpoint `/delivery` với capability riêng, không sử dụng endpoint cũ.

**Trước khi Publish bản 2.2 mới, unpublish workflow cũ đang dùng cùng `/interview-schedule`**, ví dụ `TV2 - Tu test Gmail va Google Meet` hoặc nhánh trong master. Chỉ một workflow được nhận đường dẫn này. Bản mới yêu cầu `RECRUITMENT_CALLBACK_BASE_URL` và `MAIL_FROM`; không gửi webhook thử bằng payload cũ thiếu token.

Nếu Google vẫn chưa tạo conference sau thời gian chờ, workflow lưu lỗi Calendar và không gửi link giả. HR kiểm tra execution và event Google trước khi xử lý tiếp; claim không tự giải phóng để tránh tạo lịch/thư trùng.

## 2.3 — Offer Letter (15 node)

1. Nhận webhook khi HR phát hành Offer.
2. Kiểm tra ID và token giao việc.
3. Claim Offer, lấy nội dung và người nhận từ Backend.
4. Gửi Offer Letter dạng HTML với nút mở trang phản hồi.
5. Xác nhận SMTP và bắt đầu thời hạn 48 giờ.
6. Wait đến thời điểm 24 giờ đã lưu.
7. Đọc trạng thái và claim nhắc nhở từ Backend.
8. Kiểm tra có cần nhắc hay không.
9. Nhắc ứng viên, CC HR.
10. Lưu xác nhận gửi nhắc nhở cho đủ hai bên.
11. Wait đến thời điểm 48 giờ đã lưu.
12. Đọc trạng thái, đóng Offer nếu quá hạn mà chưa phản hồi.
13. Kiểm tra có cần báo hết hạn hay không.
14. Báo HR Offer hết hạn.
15. Lưu xác nhận báo HR.

Trong UI HR, mở ứng viên có vòng phỏng vấn mới nhất Đạt → nhập vị trí, lương, ngày bắt đầu → **Phát hành và gửi Offer**. Nếu webhook không nhận được, UI hiển thị lỗi dispatch và có nút thử lại khi chưa claim. Offer đã claim nhưng chưa xác nhận gửi phải được kiểm tra execution, không phát hành bản trùng.

Ứng viên mở `/offers/<token>` không cần đăng nhập, xem nội dung rồi xác nhận Đồng ý/Từ chối. GET không tự chấp nhận Offer. Backend khóa giao dịch khi phản hồi, chống chấp nhận/từ chối đồng thời; token lưu DB dưới dạng hash. Nếu đã phát hành Offer thì nút tuyển dụng chỉ hoàn tất được sau khi ứng viên chấp nhận. Hồ sơ cũ chưa có Offer vẫn giữ quy trình tuyển dụng hiện có.

Thời hạn tính từ callback SMTP được lưu, không phải thời điểm HR bấm nút. Khi đã phản hồi hoặc hồ sơ kết thúc, workflow bỏ qua nhắc. Wait dùng trạng thái execution n8n lưu DB; phải giữ nguyên profile n8n và để dịch vụ hoạt động để tiếp tục đúng giờ. Việc ứng viên phản hồi ngay sau bước kiểm tra có thể trùng thời điểm SMTP đang gửi; email nhắc không phải bằng chứng trạng thái mới nhất, trang Offer luôn kiểm tra lại Backend.

## Kiểm thử và giới hạn đã biết

- `backend/test/tv2-workflows.test.cjs`: cấu trúc 3 graph, code node, ICS, HTTP/MySQL cho intake/Offer, token sai, trùng, race, mốc 24/48 và retry.
- `backend/test/interview-delivery.test.cjs`: callback lịch/email, chống trùng, quyền truy cập, lỗi và phục hồi.
- `backend/test/interview-workflow.test.cjs`: 12 kiểm tra code node Calendar/SMTP và nội dung thư.
- `backend/test/recruitment.test.cjs`: hồi quy tuyển dụng. Hai kỳ vọng cũ đã cập nhật theo main: lookup Department có managerId; manager không được phân công nhận 403.
- `backend/test/tv2-n8n-engine.cjs`: bộ chạy n8n thật, HTTP/MySQL thật trong DB tạm, SMTP chỉ nghe localhost. Các node Google dùng dữ liệu kiểm thử; Wait được rút ngắn và thời gian DB được điều chỉnh chỉ trong harness. Không gửi email ra ngoài.

Lệnh chạy ở `backend` (cấu hình DB thử nghiệm theo MySQL local của bạn):

```powershell
$env:ATS_TEST_DB_PORT='3307'
$env:ATS_TEST_DB_PASSWORD='rootpassword'
node .\test\tv2-workflows.test.cjs
node .\test\interview-delivery.test.cjs
node .\test\interview-workflow.test.cjs
node .\test\recruitment.test.cjs
node .\test\tv2-n8n-engine.cjs
```

Harness tạo database tên ngẫu nhiên `hr_ats_test_*` rồi xóa đúng database đó, không ghi hồ sơ thử vào DB nghiệp vụ. Kết quả engine ở `.temp/tv2-engine/summary.json`. File JSON nguồn không chứa credential bí mật. Google OAuth thật, tải PDF thật và việc email đến inbox vẫn cần kiểm tra sau khi bạn kết nối đúng các tài khoản.

Nếu runtime cũ thiếu module `.cjs`, `scripts/repair-local-n8n-mail.cjs` chỉ khôi phục file còn thiếu của đúng phiên bản từ npm và kiểm tra integrity. Không cần Python runner vì cả ba workflow đều dùng JavaScript.
