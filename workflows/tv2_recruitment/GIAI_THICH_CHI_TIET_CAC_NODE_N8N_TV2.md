# 📑 TÀI LIỆU GIẢI THÍCH CHI TIẾT CÁC NODE n8n - THÀNH VIÊN 2
## PHÂN HỆ: TUYỂN DỤNG ATS, LÊN LỊCH PHỎNG VẤN & PHÁT HÀNH OFFER
*Dành cho: Thành viên 2 (Recruitment Lead & ATS Automation Specialist)*

---

## 📌 DANH MỤC CÁC QUY TRÌNH TỰ ĐỘNG HÓA n8n (TV2)

| Thứ tự | Tên Quy trình | Tệp Workflow | Trigger | Số Node |
| :---: | :--- | :--- | :--- | :---: |
| **WF-01** | **Đồng bộ vị trí tuyển dụng vào Google Form (TV2 2.0)** | `01_job_form_sync.json` | Webhook (`POST /job-form-sync`) + Cron 5m | **14** |
| **WF-02** | **Tiếp nhận CV đa kênh & Gửi thư xác nhận (TV2 2.1)** | `02_candidate_intake_omnichannel.json` | Gmail Polling + Google Form Webhook | **13** |
| **WF-03** | **Xếp lịch phỏng vấn, Google Meet & Thư mời (TV2 2.2)** | `03_interview_schedule_readback.json` | Webhook (`POST /interview-schedule`) | **18** |
| **WF-04** | **Phát hành Offer Letter & Nhắc hạn 24–48h (TV2 2.3)** | `04_offer_letter_48h.json` | Webhook (`POST /offer-issued`) + Wait 24h/48h | **15** |
| **WF-05** | **Đón nhân sự trúng tuyển & Handoff Onboarding (TV2 2.4)** | `05_employee_hired.json` | Webhook (`POST /employee-hired`) | **6** |

> 💡 **File gộp toàn bộ:** `all_tv2_workflows.json` chứa đầy đủ cả 5 quy trình để import 1 lần vào n8n canvas.

---

# 1. CHI TIẾT QUY TRÌNH WF-01: ĐỒNG BỘ VỊ TRÍ VÀO GOOGLE FORM (14 NODES)
- **Tệp nguồn:** `01_job_form_sync.json`
- **Mục tiêu:** Khi HR mở/đóng vị trí tuyển dụng trên Dashboard, n8n tự động cập nhật danh sách vị trí trên câu hỏi dạng Dropdown của Google Form ứng tuyển.

### Bảng phân tích chi tiết từng Node:
| STT | Tên Node | Loại Node | Chức năng & Xử lý kỹ thuật |
| :---: | :--- | :--- | :--- |
| 1 | `01. Nhận thông báo thay đổi vị trí tuyển dụng` | `n8n-nodes-base.webhook` | Nhận Webhook sự kiện thay đổi công việc từ Backend. |
| 2 | `02. Chuẩn hóa sự kiện tuyển dụng` | `n8n-nodes-base.code` | Chuẩn hóa payload sự kiện tuyển dụng. |
| 3 | `03. Lấy danh sách vị trí đang mở từ Backend` | `n8n-nodes-base.httpRequest` | Gọi API Backend lấy danh sách các Job đang mở (`OPEN`). |
| 4 | `04. Kiểm tra và lọc vị trí đang mở` | `n8n-nodes-base.code` | Lọc danh sách job đang hoạt động. |
| 5 | `05. Tạo lựa chọn mã vị trí – tên công việc` | `n8n-nodes-base.code` | Định dạng chuỗi `[Mã Job] Tên vị trí tuyển dụng` cho Form dropdown. |
| 6 | `06. Chuẩn bị dữ liệu đồng bộ Google Form` | `n8n-nodes-base.code` | Chuẩn bị mảng options đẩy lên Google Form API. |
| 7 | `07. Cập nhật danh sách chọn trên Google Form` | `n8n-nodes-base.httpRequest` | Đồng bộ danh sách lựa chọn vào Google Form. |
| 8 | `08. Kiểm tra kết quả cập nhật Google Form` | `n8n-nodes-base.if` | Rẽ nhánh: Thành công hay Thất bại. |
| 9 | `09. Xác định đồng bộ thành công` | `n8n-nodes-base.code` | Đánh dấu trạng thái sync OK. |
| 10 | `10. Tổng hợp kết quả đồng bộ thành công` | `n8n-nodes-base.code` | Tổng hợp thông tin các vị trí đã cập nhật. |
| 11 | `11. Phản hồi đồng bộ thành công` | `n8n-nodes-base.respondToWebhook` | Trả về HTTP 200 cho Backend. |
| 12 | `12. Tổng hợp lỗi đồng bộ` | `n8n-nodes-base.code` | Bắt lỗi nếu Google Form API từ chối. |
| 13 | `13. Phản hồi đồng bộ thất bại` | `n8n-nodes-base.respondToWebhook` | Trả về HTTP 500 kèm chi tiết lỗi. |
| 14 | `14. Đồng bộ dự phòng mỗi 5 phút` | `n8n-nodes-base.scheduleTrigger` | Lịch Cron chạy định kỳ 5 phút một lần để chống mất đồng bộ. |

---

# 2. CHI TIẾT QUY TRÌNH WF-02: TIẾP NHẬN CV ĐA KÊNH & XÁC NHẬN (13 NODES)
- **Tệp nguồn:** `02_candidate_intake_omnichannel.json`
- **Mục tiêu:** Thu thập CV từ 2 nguồn: Email gửi vào hòm thư tuyển dụng và Form ứng tuyển trực tuyến. Tự động lưu hồ sơ vào ATS và gửi email xác nhận đã nhận hồ sơ cho ứng viên trong vòng 3 phút.

### Bảng phân tích chi tiết từng Node:
| STT | Tên Node | Loại Node | Chức năng & Xử lý kỹ thuật |
| :---: | :--- | :--- | :--- |
| 1 | `01. Theo dõi CV mới trong Gmail tuyển dụng` | `n8n-nodes-base.gmailTrigger` | Lắng nghe thư mới có đính kèm tệp PDF trong inbox tuyển dụng. |
| 2 | `02. Chuẩn hóa hồ sơ nhận qua Gmail` | `n8n-nodes-base.code` | Bóc tách thông tin ứng viên từ tiêu đề, nội dung email. |
| 3 | `03. Phát hiện câu trả lời Google Form mới` | `n8n-nodes-base.webhook` | Nhận webhook khi có ứng viên nộp form ứng tuyển. |
| 4 | `04. Chuẩn hóa hồ sơ và mã vị trí từ Form` | `n8n-nodes-base.code` | Ghép mã job và thông tin cá nhân từ form. |
| 5 | `05. Tải CV từ Google Drive` | `n8n-nodes-base.googleDrive` | Tải file CV đính kèm từ link Drive được nộp. |
| 6 | `06. Kiểm tra thông tin ứng viên và tệp CV` | `n8n-nodes-base.code` | Validate file CV (định dạng PDF/DOCX, dung lượng hợp lệ). |
| 7 | `07. Lưu hồ sơ và CV vào ATS` | `n8n-nodes-base.httpRequest` | Gọi API `POST /api/applications/intake` lưu hồ sơ vào CSDL ATS. |
| 8 | `08. Kiểm tra hồ sơ cần gửi xác nhận` | `n8n-nodes-base.if` | Kiểm tra email ứng viên có hợp lệ để gửi thư cảm ơn hay không. |
| 9 | `09. Soạn thư xác nhận đã nhận hồ sơ` | `n8n-nodes-base.code` | Biên tập mẫu email xác nhận chuyên nghiệp có tên ứng viên & vị trí. |
| 10 | `10. Gửi thư xác nhận cho ứng viên` | `n8n-nodes-base.emailSend` | Bắn thư xác nhận qua SMTP Gmail. |
| 11 | `11. Lưu kết quả gửi thư xác nhận` | `n8n-nodes-base.mySql` | Ghi vết ngày giờ gửi email xác nhận vào CSDL. |
| 12 | `12. Kiểm tra hồ sơ đến từ Gmail` | `n8n-nodes-base.if` | Kiểm tra nguồn đến có phải email trực tiếp hay không. |
| 13 | `13. Đánh dấu email tuyển dụng đã xử lý` | `n8n-nodes-base.gmail` | Gắn nhãn `PROCESSED_ATS` và lưu trữ email để tránh xử lý lặp. |

---

# 3. CHI TIẾT QUY TRÌNH WF-03: XẾP LỊCH PHỎNG VẤN & GOOGLE MEET (18 NODES)
- **Tệp nguồn:** `03_interview_schedule_readback.json`
- **Mục tiêu:** Tự động tạo sự kiện lịch trên Google Calendar, sinh link Google Meet bảo mật, gửi thư mời kèm link phỏng vấn cho ứng viên và người phỏng vấn, và đọc lại kết quả xác minh phòng họp.

### Bảng phân tích chi tiết từng Node:
| STT | Tên Node | Loại Node | Chức năng & Xử lý kỹ thuật |
| :---: | :--- | :--- | :--- |
| 1 | `01. Nhận yêu cầu xếp lịch phỏng vấn` | `n8n-nodes-base.webhook` | Webhook tiếp nhận yêu cầu từ ATS (`POST /interview-schedule`). |
| 2 | `02. Kiểm tra quyền xử lý yêu cầu phỏng vấn` | `n8n-nodes-base.if` | Xác thực token bảo mật của webhook. |
| 3 | `03. Nhận quyền xử lý lịch phỏng vấn` | `n8n-nodes-base.code` | Giải mã payload lịch phỏng vấn. |
| 4 | `04. Nạp thông tin buổi phỏng vấn` | `n8n-nodes-base.code` | Trích xuất thời gian, người phỏng vấn, ứng viên, phòng họp. |
| 5 | `05. Tạo lịch phỏng vấn và Google Meet` | `n8n-nodes-base.googleCalendar` | Tạo event trên Google Calendar kèm yêu cầu sinh link Google Meet. |
| 6 | `06. Chờ Google khởi tạo phòng Meet` | `n8n-nodes-base.wait` | Chờ 3 giây để Google sinh link Meet hoàn chỉnh. |
| 7 | `07. Đọc lại sự kiện trên Google Calendar` | `n8n-nodes-base.googleCalendar` | Đọc lại Event từ Google để lấy link Meet chính thức (`hangoutLink`). |
| 8 | `08. Xác minh lịch và liên kết Google Meet` | `n8n-nodes-base.code` | Kiểm tra tính hợp lệ của link Meet. |
| 9 | `09. Soạn thư mời phỏng vấn cho ứng viên` | `n8n-nodes-base.code` | Soạn thảo email thư mời phỏng vấn chuẩn HTML kèm lịch và link Meet. |
| 10 | `10. Gửi thư mời cho ứng viên` | `n8n-nodes-base.emailSend` | Gửi email thư mời phỏng vấn cho ứng viên qua SMTP. |
| 11 | `11. Gửi lịch phỏng vấn cho người phỏng vấn` | `n8n-nodes-base.emailSend` | Gửi email thông báo cho Interviewer / Hiring Manager. |
| 12 | `12. Bắn thông báo Telegram cho Hội đồng` | `n8n-nodes-base.telegram` | Gửi thông báo tóm tắt lịch phỏng vấn vào Telegram HR/Lead. |
| 13 | `13. Cập nhật kết quả lịch vào ATS` | `n8n-nodes-base.httpRequest` | Gọi API cập nhật link Meet và trạng thái lịch vào Backend. |
| 14 | `14. Ghi nhận giao việc phỏng vấn vào MySQL` | `n8n-nodes-base.mySql` | Lưu lịch sử vào bảng `interview_deliveries`. |
| 15 | `15. Báo cáo hoàn tất xếp lịch phỏng vấn` | `n8n-nodes-base.code` | Tổng hợp kết quả xử lý. |
| 16 | `16. Phản hồi xếp lịch thành công` | `n8n-nodes-base.respondToWebhook` | Trả về HTTP 200 kèm link Meet cho Backend. |
| 17 | `17. Tổng hợp lỗi xếp lịch phỏng vấn` | `n8n-nodes-base.code` | Bắt lỗi nếu Calendar/Meet không tạo được. |
| 18 | `18. Phản hồi xếp lịch thất bại` | `n8n-nodes-base.respondToWebhook` | Trả về HTTP 500 cho Backend. |

---

# 4. CHI TIẾT QUY TRÌNH WF-04: PHÁT HÀNH OFFER & NHẮC HẠN 24–48H (15 NODES)
- **Tệp nguồn:** `04_offer_letter_48h.json`
- **Mục tiêu:** Phát hành Thư mời nhận việc (Offer Letter) kèm link xác nhận trực tuyến; thiết lập đồng hồ đếm ngược tự động nhắc hạn sau 24 giờ và kết thúc sau 48 giờ.

### Bảng phân tích chi tiết từng Node:
| STT | Tên Node | Loại Node | Chức năng & Xử lý kỹ thuật |
| :---: | :--- | :--- | :--- |
| 1 | `01. Nhận yêu cầu phát hành thư mời nhận việc` | `n8n-nodes-base.webhook` | Nhận webhook khi HR bấm Phát hành Offer (`POST /offer-issued`). |
| 2 | `02. Chuẩn hóa thông tin thư mời nhận việc` | `n8n-nodes-base.code` | Format mức lương, ngày bắt đầu, thời hạn phản hồi 48h. |
| 3 | `03. Soạn thư mời nhận việc và liên kết xác nhận` | `n8n-nodes-base.code` | Soạn thảo HTML Offer Letter trang trọng, kèm nút "Chấp nhận Offer" & "Từ chối". |
| 4 | `04. Gửi thư mời nhận việc cho ứng viên` | `n8n-nodes-base.emailSend` | Gửi Offer Letter qua SMTP. |
| 5 | `05. Thông báo phát hành thư mời qua Telegram` | `n8n-nodes-base.telegram` | Bắn tin nhắn vào Telegram HR thông báo đã gửi Offer. |
| 6 | `06. Ghi nhận thời điểm phát hành thư mời` | `n8n-nodes-base.httpRequest` | Báo Backend cập nhật trạng thái `OFFER_SENT`. |
| 7 | `07. Chờ 24 giờ nhắc hạn lần một` | `n8n-nodes-base.wait` | Đóng băng tiến trình, đợi 24 giờ. |
| 8 | `08. Đọc lại trạng thái thư mời sau 24 giờ` | `n8n-nodes-base.httpRequest` | Kiểm tra xem ứng viên đã phản hồi chưa. |
| 9 | `09. Kiểm tra thư mời cần nhắc hạn 24 giờ` | `n8n-nodes-base.if` | Nếu trạng thái vẫn là `PENDING`, kích hoạt nhắc nhở. |
| 10 | `10. Soạn thư nhắc hạn phản hồi 24 giờ` | `n8n-nodes-base.code` | Soạn email nhắc nhở thân thiện: *"Còn 24 giờ để phản hồi Offer"*. |
| 11 | `11. Gửi thư nhắc hạn 24 giờ cho ứng viên` | `n8n-nodes-base.emailSend` | Gửi email nhắc nhở qua SMTP. |
| 12 | `12. Chờ tiếp đến mốc 48 giờ đóng thư mời` | `n8n-nodes-base.wait` | Chờ tiếp 24 giờ (đủ 48 giờ kể từ lúc phát hành). |
| 13 | `13. Đọc lại trạng thái thư mời sau 48 giờ` | `n8n-nodes-base.httpRequest` | Kiểm tra lần cuối tình trạng Offer. |
| 14 | `14. Kiểm tra thư mời quá hạn 48 giờ` | `n8n-nodes-base.if` | Nếu vẫn chưa phản hồi, chuyển sang trạng thái quá hạn (`EXPIRED`). |
| 15 | `15. Thông báo thư mời quá hạn qua Telegram` | `n8n-nodes-base.telegram` | Báo động cho HR Lead biết ứng viên không phản hồi sau 48h. |

---

# 5. CHI TIẾT QUY TRÌNH WF-05: ĐÓN NHÂN SỰ MỚI & ONBOARDING HANDOFF (6 NODES)
- **Tệp nguồn:** `05_employee_hired.json`
- **Mục tiêu:** Khi ứng viên xác nhận đồng ý Offer, hệ thống tự động kích hoạt tạo tài khoản, gửi email chào mừng và chuyển giao dữ liệu sang Phân hệ Thử việc (TV3).

### Bảng phân tích chi tiết từng Node:
| STT | Tên Node | Loại Node | Chức năng & Xử lý kỹ thuật |
| :---: | :--- | :--- | :--- |
| 1 | `Webhook: Tuyển dụng nhân sự mới` | `n8n-nodes-base.webhook` | Nhận webhook kích hoạt khi trạng thái hồ sơ đổi thành `HIRED`. |
| 2 | `Respond HTTP 200` | `n8n-nodes-base.respondToWebhook` | Phản hồi ngay HTTP 200 cho Backend. |
| 3 | `Chuẩn Hóa Thông Tin & Tạo Email Onboarding` | `n8n-nodes-base.code` | Chuẩn bị email Welcome, tạo danh sách các việc cần chuẩn bị (Laptop, tài khoản,...). |
| 4 | `Gửi Email Chào Mừng Tới Nhân Viên Mới` | `n8n-nodes-base.emailSend` | Gửi email Welcome kèm hướng dẫn ngày đầu tiên đi làm. |
| 5 | `Bắn Telegram IT & HR Ops` | `n8n-nodes-base.telegram` | Thông báo cho bộ phận IT và HR chuẩn bị bàn làm việc, thiết bị và thẻ nhân viên. |
| 6 | `Kích Hoạt Onboarding Tasks (MySQL)` | `n8n-nodes-base.mySql` | Tạo sẵn danh sách 5 nhiệm vụ thử việc ban đầu cho nhân viên trong bảng `onboarding_tasks`. |
