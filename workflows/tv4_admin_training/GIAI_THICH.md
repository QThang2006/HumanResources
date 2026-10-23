# GIẢI THÍCH PHÂN HỆ VÀ WORKFLOW N8N — THÀNH VIÊN 4

> Phân hệ: Kho tri thức, Đào tạo nội bộ, Đánh giá định kỳ và Thôi việc liên phòng ban
---

## 1. Phạm vi thực tế của Thành viên 4

Thành viên 4 sở hữu ba luồng tự động hóa đúng theo phân công và một workflow bổ trợ cho Kho tri thức:

| Nhóm | Workflow trên n8n | File nguồn | Số node | Vai trò |
|---|---|---|---:|---|
| Bổ trợ giao diện TV4 | `TV4 - 01 Trả lời Kho tri thức có dẫn nguồn` | `01_tv4_knowledge_rag.json` | 8 | Nhận câu hỏi từ giao diện, tìm nội dung liên quan và trả lời kèm nguồn |
| Luồng 4.1 | `TV4 - 02 Nhắc hoàn thành khóa học bắt buộc` | `02_mandatory_training_reminder.json` | 12 | Quét khóa bắt buộc sắp đến hạn, nhắc nhân viên, quản lý và kênh đào tạo |
| Luồng 4.2 | `TV4 - 03 Kỳ Đánh Giá KPI Tháng & Đôn Đốc Hạn Chót` | `03_monthly_performance_review_reminder.json` | 12 | Mở kỳ đánh giá ngày 25 và nhắc lần hai ngày 28 hằng tháng |
| Luồng 4.3 | `TV4 - 04 Quy Trình Thôi Việc Tự Động (Offboarding)` | `04_offboarding_workflow.json` | 12 | Điều phối IT, Kế toán, nhân viên và kênh liên phòng ban khi HR duyệt thôi việc |

Điểm cần nói rõ khi báo cáo:

- Ba workflow 4.1–4.3 là ba luồng n8n chính theo yêu cầu phân công.
- Workflow Kho tri thức là luồng tích hợp bổ trợ cho chức năng quản trị tài liệu của TV4, không thay thế và không tính nhầm thành một trong ba luồng 4.1–4.3.
- Backend xử lý dữ liệu nghiệp vụ và bảo vệ API. n8n xử lý lịch chạy, điều phối nhiều kênh, thử lại khi lỗi và ghi kết quả về backend.

---

## 2. Kiến trúc tổng thể

```text
┌──────────────────────────────── GIAO DIỆN REACT ────────────────────────────────┐
│ SuperAdmin/HR: Kho tri thức, Đào tạo & Phát triển                              │
│ Employee: Khóa học & Phát triển, cập nhật tiến độ                              │
└───────────────────────────────┬─────────────────────────────────────────────────┘
                                │ JWT Bearer Token
                                ▼
┌──────────────────────────── BACKEND NESTJS :3001 ───────────────────────────────┐
│ DocumentsModule  │ TrainingModule │ PerformanceReviewService │ OffboardingModule│
│ PDF + tìm kiếm   │ khóa học + AI  │ KPI tháng                │ hồ sơ thôi việc   │
└──────────┬───────────────────┬──────────────────────────┬───────────────────────┘
           │                   │ API bảo vệ bằng          │ Webhook có khóa bí mật
           │                   │ X-Automation-Secret      │
           ▼                   ▼                          ▼
┌────────────────────────────── N8N :5678 ────────────────────────────────────────┐
│ Kho tri thức │ Nhắc đào tạo │ Nhắc đánh giá KPI │ Điều phối thôi việc         │
└──────────────┴───────┬──────┴──────────┬────────┴───────────┬───────────────────┘
                       │                 │                    │
                       ▼                 ▼                    ▼
                  SMTP Email       Telegram Bot         Callback về Backend
                                                           │
                                                           ▼
                                                     MySQL lưu trạng thái
```

### 2.1. Phân định trách nhiệm giữa ba tầng

| Tầng | Việc thực hiện | Việc không nên thực hiện |
|---|---|---|
| Frontend React | Nhập liệu, hiển thị trạng thái, gọi API bằng JWT, trình bày kết quả AI và nguồn | Không tự quyết định ai cần được nhắc, không chứa token SMTP/Telegram |
| Backend NestJS | Xác thực, phân quyền, truy vấn dữ liệu, tính điều kiện nghiệp vụ, AI/Gemini, lưu lịch sử | Không tự chạy lịch lúc 08:00 và không trực tiếp điều phối nhiều kênh bên ngoài |
| n8n | Lịch chạy, webhook, rẽ nhánh, gửi email/Telegram, thử lại, tổng hợp và callback | Không tự sửa dữ liệu nghiệp vụ trong MySQL và không chấm KPI thay backend |

### 2.2. Các giao diện thuộc phạm vi TV4

| Vai trò | Vị trí trên giao diện | Chức năng |
|---|---|---|
| SuperAdmin | `Cài đặt hệ thống` → `Kho tri thức` | Tải/xóa PDF, xem trạng thái lập chỉ mục, đặt câu hỏi và xem nguồn |
| SuperAdmin | `Cài đặt hệ thống` → `Đào tạo & Phát triển` | Tạo khóa, phân tích năng lực bằng AI, gán khóa, lọc danh mục và theo dõi tiến độ |
| HR | `Kho Tri Thức & Sổ Tay RAG` | Chuyển giữa `Đào tạo & Phát triển` và `Kho tri thức` |
| Employee | `Không gian của tôi` → `Khóa học & Phát triển` | Xem khóa được giao, bắt đầu học, cập nhật tiến độ và mở đường dẫn khóa học |

### 2.3. Các bảng dữ liệu chính

| Bảng | Mục đích |
|---|---|
| `documents` | Lưu tên PDF, người tải, đường dẫn và trạng thái `PROCESSING/READY/FAILED` |
| `document_chunks` | Lưu từng nội dung đã lập chỉ mục và vector embedding |
| `training_courses` | Danh mục khóa học, loại khóa, kỹ năng cung cấp và thời lượng |
| `employee_trainings` | Khóa được gán, tiến độ, hạn hoàn thành, số lần nhắc và kết quả leo thang |
| `performance_reviews` | KPI, nhận xét quản lý, xếp loại và kỳ đánh giá |
| `performance_review_reminders` | Lịch sử gửi nhắc theo kỳ, người nhận và giai đoạn nhắc |
| `offboarding_cases` | Hồ sơ thôi việc, ngày cuối, trạng thái và kết quả bốn kênh điều phối |

---

## 3. Cấu hình chung trước khi chạy

### 3.1. Các dịch vụ cần hoạt động

1. MySQL đang chạy và backend kết nối được cơ sở dữ liệu.
2. Backend NestJS chạy tại `http://localhost:3001/api`.
3. Frontend React chạy tại `http://localhost:5173`.
4. n8n chạy tại `http://localhost:5678`.
5. Có Internet khi cần gọi Gemini, Gmail SMTP và Telegram.

### 3.2. Biến môi trường backend

Không ghi giá trị bí mật thật vào tài liệu hoặc commit lên Git. Cấu hình theo mẫu:

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_AUTOMATION_SECRET=THAY_BẰNG_CHUỖI_BÍ_MẬT_DÀI_VÀ_NGẪU_NHIÊN
GEMINI_API_KEY=THAY_BẰNG_API_KEY_GEMINI
```

`N8N_WEBHOOK_URL` phải là URL gốc kết thúc ở `/webhook`. Backend sẽ tự nối thêm đường dẫn `tv4-knowledge-rag` hoặc `tv4-offboarding`.

### 3.3. Trường cấu hình trong các node Set

| Trường | Ý nghĩa | Khi n8n chạy bằng Docker | Khi n8n chạy trực tiếp bằng npx |
|---|---|---|---|
| `apiBaseUrl` | Địa chỉ backend mà n8n gọi | `http://host.docker.internal:3001/api` | `http://localhost:3001/api` |
| `automationSecret` | Phải giống `N8N_AUTOMATION_SECRET` của backend | Giá trị thật trong n8n | Giá trị thật trong n8n |
| `senderEmail` | Địa chỉ người gửi SMTP | Email đã cấu hình credential | Email đã cấu hình credential |
| `telegramChatId` | Mã nhóm Telegram nhận thông báo | Mã nhóm thử nghiệm | Mã nhóm thử nghiệm |
| Các trường `test...Email` | Ghi đè riêng email của từng nhóm người nhận trong lúc thử nghiệm | Nên dùng khi demo | Nên dùng khi demo |

### 3.4. Credential bắt buộc trên n8n

**SMTP:**

- Host Gmail: `smtp.gmail.com`.
- Port thường dùng: `465` với SSL hoặc `587` với TLS.
- User là email gửi thư.
- Password là App Password, không phải mật khẩu đăng nhập Gmail thông thường.
- `From Email` nên trùng với tài khoản SMTP.

**Telegram:**

- Tạo bot bằng BotFather và lưu token trong Telegram credential của n8n.
- Thêm bot vào nhóm nhận thông báo.
- Gửi ít nhất một tin nhắn trong nhóm để Telegram tạo cập nhật.
- Lấy đúng `chat_id` của nhóm rồi điền vào `telegramChatId`.

Không ghi App Password, bot token hoặc khóa tự động hóa trực tiếp vào file Markdown.

---

## 4. Workflow bổ trợ — Kho tri thức có dẫn nguồn

### 4.1. Thông tin chung

- File: `01_tv4_knowledge_rag.json`
- Trigger: Webhook `POST /webhook/tv4-knowledge-rag`
- Số node: 8
- Người gọi: Backend qua `POST /api/documents/workflow-search`
- Mục tiêu: chỉ trả lời dựa trên nội dung PDF đã lập chỉ mục và cung cấp nguồn để người dùng đối chiếu.

Điểm quan trọng: nút `Kiểm thử` trên giao diện mới là hành động kích hoạt workflow. Chỉ bấm `Execute workflow` trên n8n mà không gửi câu hỏi vào webhook thì các node phía sau chưa có dữ liệu để chạy.

### 4.2. Luồng xử lý

```text
[1. Tiếp nhận câu hỏi]
          │
          ▼
[2. Kiểm tra dữ liệu] ── thiếu câu hỏi/JWT ──> báo lỗi
          │
          ▼
[3. Tìm nội dung liên quan trong Backend]
          │
          ▼
[4. Có nội dung phù hợp?]
       ├── Có ──> [5. AI tạo câu trả lời] ──> [6. Chuẩn hóa]
       └── Không -> [7. Thông báo chưa đủ dữ liệu]
                                      │
                                      ▼
                            [8. Phản hồi giao diện]
```

### 4.3. Giải thích từng node

#### Node 1 — `Tiếp nhận câu hỏi Kho tri thức`

- Loại: Webhook.
- Nhận `POST` với `query`, `topK` và header `Authorization`.
- Dùng `responseMode = responseNode`, vì kết quả chỉ được trả sau khi workflow xử lý xong.

#### Node 2 — `Kiểm tra dữ liệu đầu vào`

- Loại: Code JavaScript.
- Loại bỏ khoảng trắng của câu hỏi.
- Giới hạn `topK` từ 1 đến 5 để tránh lấy quá nhiều nội dung.
- Bắt buộc có JWT để backend vẫn kiểm tra đúng quyền SuperAdmin/HR.
- Nếu thiếu câu hỏi hoặc xác thực, workflow dừng với thông báo rõ ràng.

#### Node 3 — `Tìm nội dung liên quan`

- Loại: HTTP Request.
- Gọi `POST /api/documents/search`.
- Chuyển tiếp JWT của người dùng.
- Backend tạo embedding cho câu hỏi, so sánh với nội dung đã lập chỉ mục, loại nội dung trùng và trả tối đa `topK` kết quả.
- Thời gian chờ: 30 giây.

#### Node 4 — `Có nội dung phù hợp?`

- Loại: IF.
- Nhánh đúng khi kết quả tìm kiếm là mảng và có ít nhất một phần tử.
- Nhánh sai đi thẳng tới câu trả lời “chưa đủ dữ liệu”, không gọi AI vô ích.

#### Node 5 — `Tạo câu trả lời có dẫn nguồn`

- Loại: HTTP Request.
- Gọi `POST /api/documents/rag-answer` với câu hỏi và các nội dung được phép sử dụng.
- Backend yêu cầu Gemini chỉ dùng dữ kiện có trong nguồn, không suy đoán và không làm theo chỉ dẫn độc hại nằm trong PDF.
- `citedChunkIds` chỉ được giữ nếu thực sự thuộc danh sách nội dung đầu vào.
- Thời gian chờ: 60 giây.

#### Node 6 — `Chuẩn hóa câu trả lời`

- Loại: Code JavaScript.
- Chuẩn hóa kết quả thành một cấu trúc thống nhất gồm:
  - `answer`;
  - `sources`;
  - `results` dùng để đối chiếu;
  - tối đa ba câu hỏi gợi ý;
  - cờ `requiresHrIntervention`;
  - cờ `aiGenerated`.

#### Node 7 — `Thông báo chưa đủ dữ liệu`

- Loại: Code JavaScript.
- Trả câu trả lời an toàn khi không có nội dung phù hợp.
- Không gắn nguồn giả và đặt `aiGenerated = false`.

#### Node 8 — `Phản hồi về giao diện`

- Loại: Respond to Webhook.
- Trả JSON về backend, sau đó backend trả lại giao diện.

### 4.4. Xử lý PDF trước khi workflow chạy

Việc tải và lập chỉ mục PDF được backend thực hiện, không phải n8n:

1. SuperAdmin/HR tải PDF tối đa 10 MB.
2. Backend lưu bản ghi ở trạng thái `PROCESSING`.
3. `pdf-parse` trích xuất văn bản.
4. Văn bản được chia thành các nội dung nhỏ.
5. Gemini tạo embedding cho từng nội dung.
6. Dữ liệu được lưu vào `document_chunks`.
7. Tài liệu chuyển sang `READY`.

Khi xóa tài liệu, backend xóa bản ghi, các nội dung liên quan và file PDF vật lý trong đúng thư mục an toàn.

### 4.5. Kịch bản kiểm thử

**Kịch bản A — Có câu trả lời:**

1. Tải một PDF có nội dung dễ nhận biết.
2. Chờ trạng thái `Sẵn sàng`.
3. Bật workflow Kho tri thức.
4. Nhập câu hỏi có câu trả lời trong PDF và bấm `Kiểm thử`.
5. Kết quả đúng phải có câu trả lời, tên nguồn, độ tương đồng và khu vực nội dung đối chiếu.

**Kịch bản B — Không đủ dữ liệu:**

1. Hỏi nội dung hoàn toàn không xuất hiện trong tài liệu.
2. Hệ thống phải nói chưa đủ dữ liệu.
3. Không được tạo nguồn giả hoặc câu hỏi gợi ý không có căn cứ.

**Kịch bản C — n8n chưa bật:**

1. Tắt workflow.
2. Đặt câu hỏi trên giao diện.
3. Backend phải báo rõ workflow Kho tri thức chưa được bật.

---

## 5. Luồng 4.1 — Nhắc hoàn thành khóa học bắt buộc

### 5.1. Thông tin chung

- File: `02_mandatory_training_reminder.json`
- Lịch chạy: `0 8 * * *` — 08:00 mỗi ngày.
- Múi giờ: `Asia/Ho_Chi_Minh`.
- Số node: 12.
- API lấy dữ liệu: `GET /api/training/automation/pending-reminders`.
- API ghi kết quả: `POST /api/training/automation/reminder-results`.

Backend chỉ đưa một lượt đào tạo vào danh sách nhắc khi thỏa tất cả điều kiện:

1. Nhân viên đang hoạt động.
2. Khóa học thuộc loại `MANDATORY`.
3. Chưa hoàn thành.
4. Tiến độ dưới 50%.
5. Hạn hoàn thành còn tối đa ba ngày hoặc đã quá hạn.
6. Chưa được nhắc trong 20 giờ gần nhất.

### 5.2. Luồng xử lý

```text
[1. Lịch 08:00] -> [2. Cấu hình] -> [3. Lấy danh sách]
                                           │
                                           ▼
                                  [4. Tách từng lượt]
                                           │
                                           ▼
                                  [5. Có cần nhắc?]
                                           │ Có
                                           ▼
                                  [6. Soạn nội dung]
                                           │
                                           ▼
                                  [7. Email nhân viên]
                                           │
                                           ▼
                                  [8. Có quản lý?]
                                     ├── Có -> [9. Email quản lý]
                                     └── Không ───────────────┐
                                                              ▼
                                                   [10. Telegram]
                                                              │
                                                              ▼
                                                   [11. Tổng hợp]
                                                              │
                                                              ▼
                                                   [12. Callback]
```

### 5.3. Giải thích 12 node

| STT | Node | Loại | Nhiệm vụ chính |
|---:|---|---|---|
| 1 | `Lịch chạy 08 giờ mỗi ngày` | Schedule Trigger | Khởi động workflow lúc 08:00 mỗi ngày |
| 2 | `Nạp cấu hình an toàn` | Set | Nạp API base, khóa tự động hóa, email gửi, email kiểm thử và Telegram chat ID |
| 3 | `Lấy danh sách cần nhắc` | HTTP Request | Gọi backend bằng `X-Automation-Secret` để lấy các lượt đủ điều kiện |
| 4 | `Tách từng lượt đào tạo` | Code | Mỗi lượt đào tạo trở thành một item; nếu rỗng tạo item `skip = true` |
| 5 | `Có trường hợp cần nhắc?` | IF | Nhánh `true` tiếp tục gửi; nhánh `false` kết thúc bình thường khi danh sách cần nhắc rỗng, không phải lỗi |
| 6 | `Soạn nội dung nhắc bằng tiếng Việt` | Code | Tạo tiêu đề, email HTML, tin Telegram, nhãn còn hạn/quá hạn và chọn người nhận thử nghiệm |
| 7 | `Gửi thư nhắc nhân viên` | Email Send | Gửi email cho nhân viên; thử lại tối đa ba lần, cách nhau hai giây |
| 8 | `Có quản lý trực tiếp?` | IF | Kiểm tra có người quản lý hợp lệ để nhận thư hay không |
| 9 | `Thông báo cho quản lý` | Email Send | Gửi thông báo đôn đốc cho quản lý trực tiếp hoặc quản lý phòng ban dự phòng |
| 10 | `Thông báo kênh đào tạo` | Telegram | Gửi tóm tắt cho nhóm đào tạo, kể cả khi chưa có quản lý |
| 11 | `Tổng hợp kết quả gửi` | Code | Tính `SENT`, `PARTIAL` hoặc `FAILED` từ kết quả từng kênh |
| 12 | `Lưu kết quả về hệ thống` | HTTP Request | Callback để backend lưu số lần nhắc, thời điểm nhắc, run ID và trạng thái leo thang |

### 5.4. Cơ chế an toàn và chống gửi lặp

- Các API tự động hóa không dùng JWT người dùng mà dùng header `X-Automation-Secret`.
- Backend so sánh khóa bằng hash và `timingSafeEqual`.
- `retryOnFail` được bật cho Email và Telegram.
- `continueRegularOutput` giúp workflow vẫn tổng hợp được trạng thái khi một kênh lỗi.
- Cooldown 20 giờ ngăn workflow gửi lặp nhiều lần trong cùng ngày.
- `runId` giúp callback có tính lặp an toàn: cùng một lần chạy không làm tăng bộ đếm hai lần.
- Nếu nhân viên chưa có `manager_id`, backend tìm Manager đang hoạt động cùng phòng ban.

### 5.5. Kịch bản kiểm thử trực tiếp

1. Tạo hoặc chọn một khóa bắt buộc.
2. Gán cho nhân viên với hạn còn từ một đến ba ngày.
3. Đặt tiến độ dưới 50%.
4. Trong node `Nạp cấu hình an toàn`, để trống `testEmployeeEmail` nếu muốn gửi theo email thật của nhân viên và đặt `testManagerEmail` nếu tài khoản quản lý vẫn dùng email đăng nhập mẫu.
5. Bấm `Execute workflow`.
6. Kiểm tra:
   - Node `Lấy danh sách cần nhắc` trả `count = 1` hoặc lớn hơn.
   - Email nhân viên xuất hiện trong hộp thư thử nghiệm.
   - Email quản lý xuất hiện nếu có quản lý.
   - Telegram có thông báo.
   - Node callback trả `recorded = true`.
7. Chạy lại ngay: backend có thể trả `count = 0` do cooldown 20 giờ. Đây là hành vi đúng.

---

## 6. Luồng 4.2 — Kỳ đánh giá KPI tháng và đôn đốc hạn chót

### 6.1. Thông tin chung

- File: `03_monthly_performance_review_reminder.json`
- Số node: 12.
- Lịch mở kỳ: `0 8 25 * *` — 08:00 ngày 25 hằng tháng.
- Lịch nhắc lần hai: `0 8 28 * *` — 08:00 ngày 28 hằng tháng.
- API lấy dữ liệu: `GET /api/training/automation/review-reminders`.
- API ghi kết quả: `POST /api/training/automation/review-reminder-results`.

Backend chỉ trả những nhân viên đang hoạt động và chưa có bản đánh giá trong kỳ hiện tại. Người nhận được chọn theo thứ tự:

1. Quản lý trực tiếp của nhân viên.
2. Manager đang hoạt động cùng phòng ban.
3. HR đang hoạt động làm người nhận dự phòng.

### 6.2. Hai giai đoạn thông báo

| Giai đoạn | Ngày | Giá trị `phase` | Nội dung |
|---|---:|---|---|
| Mở kỳ | 25 | `OPENING` | Thông báo danh sách nhân viên cần được đánh giá |
| Nhắc lần hai | 28 | `SECOND_REMINDER` | Nhắc những đánh giá vẫn chưa được nộp |

Hạn hoàn thành được backend tính là ngày cuối cùng của tháng.

### 6.3. Giải thích 12 node

| STT | Node | Loại | Nhiệm vụ chính |
|---:|---|---|---|
| 1 | `Cron ngày 25 - Mở kỳ đánh giá` | Schedule Trigger | Kích hoạt đợt `OPENING` |
| 2 | `Cron ngày 28 - Đôn đốc chưa nộp` | Schedule Trigger | Kích hoạt đợt `SECOND_REMINDER` |
| 3 | `Nạp cấu hình an toàn` | Set | Nạp URL, khóa, email, Telegram, đường dẫn biểu mẫu và biến kiểm thử |
| 4 | `Xác định đợt thông báo` | Code | Tính ngày theo giờ Việt Nam, xác định phase và tạo run ID |
| 5 | `Lấy danh sách quản lý cần nhắc` | HTTP Request | Gọi backend với `asOf` và `phase` |
| 6 | `Tách từng quản lý phụ trách` | Code | Mỗi quản lý cùng danh sách nhân viên chưa nộp trở thành một item |
| 7 | `Có quản lý cần thông báo?` | IF | Nhánh `true` tiếp tục gửi; nhánh `false` dừng an toàn khi không còn đánh giá thiếu |
| 8 | `Soạn nội dung đánh giá bằng tiếng Việt` | Code | Tạo bảng HTML nhân viên, hạn hoàn thành, email và Telegram |
| 9 | `Gửi thư cho quản lý` | Email Send | Gửi danh sách đánh giá còn thiếu tới người phụ trách |
| 10 | `Thông báo kênh đánh giá` | Telegram | Thông báo kỳ, người phụ trách, số lượng còn thiếu và hạn |
| 11 | `Tổng hợp kết quả thông báo` | Code | Đánh giá Email/Telegram thành `SENT/PARTIAL/FAILED` |
| 12 | `Lưu kết quả nhắc đánh giá` | HTTP Request | Lưu run ID, phase, danh sách nhân viên và kết quả vào backend |

### 6.4. Kiểm thử không cần chờ đến ngày 25 hoặc 28

Trong node `Nạp cấu hình an toàn`, dùng hai trường chỉ dành cho demo:

```text
testPhase = OPENING
testAsOf  = 2026-10-25T01:00:00.000Z
```

Hoặc để kiểm tra nhắc lần hai:

```text
testPhase = SECOND_REMINDER
testAsOf  = 2026-10-28T01:00:00.000Z
```

Sau khi demo phải xóa hai giá trị này để lịch tự động dùng ngày thật.

Kết quả mong đợi:

- Backend gom đúng nhân viên chưa có đánh giá theo từng người phụ trách.
- Email có bảng tên, chức danh, phòng ban và hạn hoàn thành.
- Telegram hiển thị số đánh giá còn thiếu.
- Callback lưu trạng thái.
- Nếu một phase đã được ghi `SENT` cho cùng người nhận, backend không tiếp tục trả nhắc trùng.

---

## 7. Luồng 4.3 — Quy trình thôi việc tự động liên phòng ban

### 7.1. Thông tin chung

- File: `04_offboarding_workflow.json`
- Số node: 12.
- Trigger: `POST /webhook/tv4-offboarding`.
- Backend kích hoạt khi HR/SuperAdmin gọi `POST /api/offboarding`.
- API lấy hồ sơ: `GET /api/offboarding/automation/:id`.
- API callback: `POST /api/offboarding/automation/:id/results`.

### 7.2. Luồng xử lý

```text
HR duyệt thôi việc
        │
        ▼
Backend lưu hồ sơ APPROVED và bắn webhook
        │
        ▼
[1. Webhook] -> [2. Cấu hình] -> [3. Xác thực khóa]
                                      │
                                      ▼
                             [4. Lấy hồ sơ backend]
                                      │
                                      ▼
                             [5. Soạn nội dung]
                                      │
                                      ▼
                              [6. Email IT]
                                      │
                                      ▼
                          [7. Email Kế toán]
                                      │
                                      ▼
                         [8. Email nhân viên]
                                      │
                                      ▼
                             [9. Telegram]
                                      │
                                      ▼
                           [10. Tổng hợp]
                                      │
                                      ▼
                            [11. Callback]
                                      │
                                      ▼
                            [12. Phản hồi]
```

Các bước gửi hiện được nối tuần tự để n8n giữ đủ kết quả của từng kênh trước khi tổng hợp và ghi trạng thái cuối cùng về backend.

### 7.3. Giải thích 12 node

| STT | Node | Loại | Nhiệm vụ chính |
|---:|---|---|---|
| 1 | `Webhook - HR Duyệt Thôi Việc` | Webhook | Nhận `caseId` từ backend |
| 2 | `Nạp cấu hình liên phòng ban` | Set | Nạp URL backend, khóa, các email, Telegram và link khảo sát |
| 3 | `Xác thực yêu cầu từ hệ thống` | Code | So sánh secret trong header và kiểm tra `caseId` là số nguyên dương |
| 4 | `Lấy hồ sơ thôi việc đã duyệt` | HTTP Request | Lấy hồ sơ chính thức từ backend; không tin hoàn toàn payload webhook |
| 5 | `Soạn nội dung điều phối bằng tiếng Việt` | Code | Tạo ba email riêng và tin Telegram; escape dữ liệu đưa vào HTML |
| 6 | `Gửi ticket cho phòng IT` | Email Send | Yêu cầu thu hồi thiết bị, khóa email/VPN và bàn giao dữ liệu |
| 7 | `Gửi thông báo cho Kế toán` | Email Send | Yêu cầu tính lương, phép năm và đối chiếu tạm ứng |
| 8 | `Gửi thư cảm ơn và khảo sát` | Email Send | Gửi thư cảm ơn và liên kết khảo sát thôi việc tới email cá nhân |
| 9 | `Thông báo kênh liên phòng ban` | Telegram | Thông báo tóm tắt hồ sơ đã được duyệt |
| 10 | `Tổng hợp kết quả liên phòng ban` | Code | Theo dõi đủ bốn kênh IT, Kế toán, nhân viên và Telegram |
| 11 | `Lưu kết quả thôi việc về hệ thống` | HTTP Request | Ghi kết quả và chuyển trạng thái backend |
| 12 | `Phản hồi kết quả offboarding` | Respond to Webhook | Trả kết quả `SENT/PARTIAL/FAILED` cho lời gọi ban đầu |

### 7.4. Trạng thái hồ sơ

```text
APPROVED -> IN_PROGRESS -> COMPLETED
                       ├-> PARTIAL
                       └-> FAILED
```

- `COMPLETED`: cả bốn kênh thành công.
- `PARTIAL`: có ít nhất một kênh thành công nhưng chưa đủ bốn kênh.
- `FAILED`: không có kênh nào thành công.
- Callback trùng `runId` được nhận diện và không ghi lặp.

### 7.5. Kịch bản kiểm thử

1. Bật workflow ở chế độ Active để backend gọi production webhook.
2. Dùng tài khoản HR hoặc SuperAdmin tạo hồ sơ thôi việc cho một Employee đang hoạt động.
3. Chọn ngày làm việc cuối ở hiện tại hoặc tương lai.
4. Trong node cấu hình, đặt `testEmployeeEmail` và `testInternalEmail` về hộp thư thử nghiệm.
5. Kiểm tra bốn kết quả:
   - email ticket IT;
   - email quyết toán Kế toán;
   - email cảm ơn và khảo sát;
   - tin Telegram.
6. Kiểm tra callback: trạng thái hồ sơ phải là `COMPLETED` nếu cả bốn kênh thành công hoặc `PARTIAL` nếu một kênh lỗi.

---

## 8. Phân tích năng lực bằng AI trong giao diện Đào tạo

Đây là chức năng backend/frontend thuộc TV4, không phải một workflow n8n riêng.

### 8.1. Hai chế độ phân tích

| Chế độ | Dữ liệu sử dụng | Cách hiển thị |
|---|---|---|
| `FULL` | KPI, nhận xét quản lý, chức danh, phòng ban và lịch sử đào tạo | Phân tích đầy đủ |
| `PRELIMINARY` | Chức danh, phòng ban, lịch sử đào tạo và kỹ năng trong kho khóa học | `Phân tích sơ bộ — chưa có dữ liệu KPI` |

Nhân viên mới chưa có KPI vẫn được phân tích sơ bộ nếu đã có đủ chức danh và phòng ban. Hệ thống không khẳng định đây là điểm yếu đã được đo lường; kết quả chỉ là gợi ý phát triển.

### 8.2. Quy trình gợi ý khóa học

1. Chỉ cho phép chọn người có vai trò `EMPLOYEE`.
2. Lấy tối đa ba đánh giá hiệu suất gần nhất nếu có.
3. Loại các khóa đã được gán.
4. Gemini xác định kỹ năng cần phát triển.
5. Gemini đối chiếu với kỹ năng của các khóa còn lại.
6. Backend xác minh lại `courseId` hoặc tên khóa để AI không tạo khóa không tồn tại.
7. Nếu AI không chọn được nhưng kỹ năng trùng nhau, backend dùng thuật toán khớp kỹ năng dự phòng.
8. Nếu chưa có khóa phù hợp, giao diện vẫn hiển thị khoảng trống năng lực và thông báo cần bổ sung kho khóa học.
9. Người dùng phải bấm `Gán khóa học`; AI không tự ý ghi dữ liệu.

---

## 9. Ma trận API và bảo mật

| API | Người gọi | Cách bảo vệ |
|---|---|---|
| `/api/documents/*` | SuperAdmin/HR hoặc workflow chuyển tiếp JWT | `JwtAuthGuard` + `RolesGuard` |
| `/api/training/courses`, `/assignments`, `/ai-suggest` | SuperAdmin/HR | `JwtAuthGuard` + `RolesGuard` |
| `/api/onboarding/trainings/*` | Employee | JWT, chỉ thao tác dữ liệu cá nhân |
| `/api/performance-reviews/*` | Manager/HR/SuperAdmin | JWT + vai trò |
| `/api/training/automation/*` | n8n | `AutomationSecretGuard` |
| `/api/offboarding` | HR/SuperAdmin | JWT + vai trò |
| `/api/offboarding/automation/*` | n8n | `AutomationSecretGuard` |

Nguyên tắc quan trọng:

- JWT người dùng và khóa tự động hóa là hai loại xác thực khác nhau.
- Không đưa App Password Gmail, bot token hoặc khóa tự động hóa vào Git.
- Các trường email thử nghiệm chỉ dùng khi demo; hệ thống thật phải dùng email thật của đúng người nhận.

---

## 10. Kiểm thử tự động trong mã nguồn

### 10.1. Backend

```powershell
cd "D:\Nam 3\CD2\HumanResources\backend"
npm.cmd run build
npm.cmd run test:tv4-automation
npm.cmd run test:documents
```

Các bài kiểm thử bao phủ:

- điều kiện lọc khóa bắt buộc;
- fallback quản lý theo phòng ban;
- cooldown và callback chống ghi lặp;
- phân tích sơ bộ khi chưa có KPI;
- cấu trúc 12 node của workflow 4.1–4.3;
- hai lịch ngày 25 và 28;
- theo dõi đủ bốn kênh offboarding;
- xóa PDF an toàn;
- workflow Kho tri thức có đủ nhánh có/không có dữ liệu;
- AI chỉ giữ nguồn hợp lệ và có phương án dự phòng khi Gemini không phản hồi.

### 10.2. Frontend

```powershell
cd "D:\Nam 3\CD2\HumanResources\frontend"
.\node_modules\.bin\tsc.cmd -b --pretty false
npm.cmd run lint
npm.cmd run build
```

---

## 11. Bảng xử lý lỗi nhanh

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Backend báo `EADDRINUSE :3001` | Đã có backend khác giữ cổng | Dừng đúng tiến trình cũ hoặc dùng phiên đang chạy |
| n8n gọi backend bị lỗi kết nối | Sai `apiBaseUrl` giữa Docker và npx | Docker dùng `host.docker.internal`; chạy trực tiếp dùng `localhost` |
| API tự động hóa trả 401 | `automationSecret` không khớp `.env` | Đồng bộ lại hai giá trị, không thêm khoảng trắng |
| Workflow RAG trả 404 | Workflow chưa Active hoặc sai webhook | Bật Active và kiểm tra path `tv4-knowledge-rag` |
| Workflow 4.1 trả `count = 0` | Chưa đủ điều kiện hoặc vừa được nhắc dưới 20 giờ | Kiểm tra loại khóa, tiến độ, hạn và `lastReminderAt` |
| Email node có tam giác đỏ | Chưa gắn SMTP credential hoặc sai App Password | Chọn `Connect to SMTP`, kiểm tra host/port/SSL |
| Telegram không có tin | Sai bot credential/chat ID hoặc bot chưa vào nhóm | Thêm bot, gửi tin trong nhóm, lấy lại chat ID |
| Quản lý không nhận email | Email giả hoặc chưa có quản lý phù hợp | Dùng email thật khi chạy thật; kiểm tra manager/phòng ban |
| Nhân viên mới không phân tích AI | Thiếu chức danh hoặc phòng ban | Hoàn thiện hai trường bắt buộc của hồ sơ |
| AI tìm thấy kỹ năng nhưng không có khóa | Kho khóa học chưa chứa kỹ năng tương ứng | Tạo thêm khóa với `skillsProvided` phù hợp |

---

## 12. Checklist bàn giao

- [ ] Bốn file workflow import được vào n8n.
- [ ] Ba workflow 4.1–4.3 có đúng 12 node; workflow Kho tri thức có 8 node.
- [ ] Múi giờ của workflow lịch là `Asia/Ho_Chi_Minh`.
- [ ] Đã thay toàn bộ giá trị `THAY_BANG_...` trong node cấu hình.
- [ ] Đã gắn SMTP credential cho tất cả Email node.
- [ ] Đã gắn Telegram credential cho tất cả Telegram node.
- [ ] Backend và n8n dùng cùng một `N8N_AUTOMATION_SECRET`.
- [ ] Workflow webhook đã bật Active trước khi backend gọi.
- [ ] Đã dùng hộp thư và nhóm Telegram thử nghiệm trước khi gửi cho người thật.
- [ ] Không commit token, App Password, JWT hoặc khóa tự động hóa.
- [ ] Đã chạy kiểm thử backend và build frontend.

---

## 13. Kết luận kỹ thuật

Phân hệ TV4 tạo thành một chu trình khép kín:

```text
Dữ liệu nghiệp vụ -> Backend kiểm tra -> n8n điều phối -> Email/Telegram
        ^                                                    │
        └──────────── Callback và lưu vết kết quả ───────────┘
```

Giá trị chính không nằm ở việc “gửi được một email”, mà ở khả năng chọn đúng đối tượng, đúng thời điểm, gửi qua nhiều kênh, thử lại khi lỗi, chống gửi trùng và lưu được bằng chứng xử lý về hệ thống.
