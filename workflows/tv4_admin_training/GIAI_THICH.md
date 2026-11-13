# GIẢI THÍCH PHÂN HỆ VÀ WORKFLOW N8N — THÀNH VIÊN 4

> Phân hệ: Kho tri thức, Đào tạo nội bộ, Đánh giá định kỳ và Thôi việc liên phòng ban
---

## 1. Phạm vi thực tế của Thành viên 4

Thành viên 4 sở hữu ba luồng tự động hóa đúng theo phân công và một workflow bổ trợ cho Kho tri thức:

| Nhóm | Workflow trên n8n | File nguồn | Số node | Vai trò |
|---|---|---|---:|---|
| Bổ trợ giao diện TV4 | `TV4 - 01 Trả lời Kho tri thức có dẫn nguồn` | `01_tv4_knowledge_rag.json` | 8 | Nhận câu hỏi từ giao diện, tìm nội dung liên quan và trả lời kèm nguồn |
| Luồng 4.1 | `[TV4] WF-02: Mandatory Training Reminder & Escalation` | `02_mandatory_training_reminder.json` | 18 | Quét khóa bắt buộc sắp đến hạn, nhắc nhân viên, quản lý và kênh đào tạo |
| Luồng 4.2 | `[TV4] WF-03: Monthly KPI Review Cycle & Follow-up` | `03_monthly_performance_review_reminder.json` | 19 | Mở kỳ đánh giá ngày 25 và nhắc lần hai ngày 28 hằng tháng |
| Luồng 4.3 | `[TV4] WF-04: Offboarding Coordination & Delivery Recovery` | `04_offboarding_workflow.json` | 18 | Điều phối IT, Kế toán, nhân viên và kênh liên phòng ban khi HR duyệt thôi việc |

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

### 3.5. Chuẩn bị bản import an toàn trên Linux

Với instance đã có workflow, export đúng từng ID TV4 trước, giữ file ngoài repository. Dùng builder để giữ nguyên ID workflow, ID node cũ, cấu hình và tham chiếu credential:

```bash
node scripts/build-tv4-workflows.cjs \
  --source-dir /tmp/tv4-instance-backup \
  --output-dir /tmp/tv4-instance-ready
```

Thư mục đầu vào có ba file tên như trong bảng phần 1. Bản export có thể là một object hoặc mảng một workflow. Không dùng export của thành viên khác. Kiểm tra ba file đầu ra rồi import vào đúng instance đã export; không dùng ID của local cho host. Bản chuẩn bị chưa Publish và không ghim dữ liệu.

Cho lần khởi tạo mới, `node scripts/prepare-tv4-n8n-import.cjs` chuẩn bị mặc định ba workflow chính vào `/tmp/tv4-n8n-import`. Chỉ thêm `--include-knowledge` khi chủ động muốn chuẩn bị cả workflow 01. Có thể dùng `TV4_N8N_CREDENTIAL_SOURCE_DIR` để giữ tham chiếu SMTP/Telegram từ export TV4; script nhận tên cũ tiếng Việt hoặc tên mới tiếng Anh. `TV4_N8N_MAIL_CONFIG_FILE` có thể trỏ đến file cấu hình nhận thư ở ngoài repository.

Workflow và node của ba luồng chính dùng tên tiếng Anh; email/Telegram vẫn viết tiếng Việt. Sau import, rà soát sender, credential, Chat ID, backend URL, link workspace/khảo sát, trường test và múi giờ. Publish từng workflow TV4 khi sẵn sàng. Không restart instance n8n dùng chung chỉ để cập nhật TV4.

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

File: `02_mandatory_training_reminder.json`. Số node: **18**.

| STT | Node | Chức năng |
|---:|---|---|
| 1 | `Daily Training Schedule` | Chạy lúc 08:00 mỗi ngày theo giờ Việt Nam. |
| 2 | `Load Workflow Configuration` | Nạp backend URL, khóa tự động hóa, sender, email chuyển hướng và Chat ID. |
| 3 | `Validate Training Configuration` | Kiểm tra backend URL, sender và khóa bắt buộc; xác định Telegram có thể dùng. |
| 4 | `Fetch Training Reminders` | GET /api/training/automation/pending-reminders; backend quyết định ai đủ điều kiện. |
| 5 | `Split Training Assignments` | Tách mỗi lượt học thành một item; rỗng trả skip=true. |
| 6 | `Has Training Reminders?` | True vào xử lý; false kết thúc bình thường. |
| 7 | `Process Training Assignments` | Loop Over Items, batch=1; hoàn tất một lượt và callback trước khi sang lượt kế tiếp. |
| 8 | `Classify Training Alert` | Kiểm tra dữ liệu lượt học và phân biệt DUE_SOON/OVERDUE. |
| 9 | `Compose Training Notices` | Soạn email nhân viên, quản lý và Telegram; chọn người nhận thật hoặc chuyển hướng kiểm thử. |
| 10 | `Has Valid Employee Email?` | Chỉ gửi email nhân viên khi địa chỉ hợp lệ. |
| 11 | `Send Employee Reminder` | Gửi thư nhắc; lỗi không chặn các kênh còn lại. |
| 12 | `Should Notify Manager?` | Kiểm tra có quản lý, cần báo quản lý và email quản lý hợp lệ. |
| 13 | `Send Manager Reminder` | Gửi thư đôn đốc cho quản lý. |
| 14 | `Has Training Telegram Route?` | Kiểm tra Chat ID trước khi gọi Telegram. |
| 15 | `Send Training Telegram` | Gửi tóm tắt vào nhóm đào tạo. |
| 16 | `Summarize Training Delivery` | Tổng hợp từng kênh thành SENT/PARTIAL/FAILED, ghi rõ kênh lỗi hoặc không cần gửi. |
| 17 | `Record Training Delivery` | POST /api/training/automation/reminder-results; retry tối đa 3 lần cùng runId. |
| 18 | `Collect Training Receipt` | Xác nhận backend đã ghi; trả biên nhận gọn về Loop để xử lý lượt tiếp theo. |

Backend giữ nguyên điều kiện: nhân viên đang hoạt động, khóa bắt buộc chưa hoàn thành, tiến độ dưới 50%, đã quá hạn hoặc còn tối đa 3 ngày, lần nhắc trước cách ít nhất 20 giờ. N8n không tự nới các điều kiện này.

Khi thiếu email nhân viên, quản lý và Telegram hợp lệ vẫn được xử lý. Kênh thiếu địa chỉ được ghi thất bại thay vì báo đã gửi. Nếu không có quản lý phụ trách, quản lý không được tính là kênh bắt buộc. Callback dùng runId để chống tăng bộ đếm trùng; điều đó không bảo đảm SMTP chỉ giao thư đúng một lần nếu kết nối bị ngắt sau khi server nhận thư.

Demo: chọn lượt học đủ điều kiện, kiểm tra email chuyển hướng, Execute, xem kết quả từng kênh và callback. Chạy lại ngay có thể trả danh sách rỗng do cooldown.

---

## 6. Luồng 4.2 — Kỳ đánh giá và lịch nhắc cấu hình từ website

File: `03_monthly_performance_review_reminder.json`. **19 node**. Xem [lịch đánh giá TV4](../../docs/TV4_REVIEW_CALENDAR.md) để cấu hình và demo.

1. **Daily Review Schedule** chạy 08:00 hằng ngày.
2. **Load Workflow Configuration** nạp kết nối, sender, người nhận kiểm thử và link; không còn testPhase/testAsOf.
3. **Prepare Review Request** kiểm tra cấu hình và chuẩn bị runId.
4. **Fetch Review Recipients** gọi backend. Backend đọc lịch của tháng hiện tại, xác định phase và lọc/gom đối tượng.
5. **Is Review Phase Active?** dừng nếu hôm nay không trùng lịch.
6. **Split Review Recipients** tách từng nhóm quản lý; danh sách rỗng tạo skip=true.
7. **Has Review Recipients?** có nhóm thì xử lý, rỗng thì tổng kết số lượng 0.
8. **Process Review Recipients** xử lý từng quản lý, batch size 1.
9. **Compose Review Notices** soạn bảng nhân viên và thông báo theo phase từ backend.
10. **Has Valid Reviewer Email?** kiểm tra địa chỉ email.
11. **Send Review Email** gửi cho người phụ trách.
12. **Has Review Telegram Route?** kiểm tra nhóm Telegram.
13. **Send Review Telegram** thông báo từng nhóm.
14. **Summarize Review Delivery** tính SENT/PARTIAL/FAILED.
15. **Record Review Delivery** lưu callback theo kỳ, đợt, người nhận và runId.
16. **Collect Review Receipt** xác nhận kết quả ghi và quay lại Loop.
17. **Build Review Run Summary** tổng hợp các biên nhận khi vòng lặp hoàn tất.
18. **Has Review Summary Route?** kiểm tra kênh tổng kết.
19. **Send Review Run Summary** gửi tổng kết cho kênh HR.

Super Admin cấu hình ngày mở kỳ, ngày nhắc lần hai và hạn ngay trên website. HR chỉ xem lịch/tiến độ; quyền Manager/Employee không thay đổi. Mặc định ngày 25/28, hạn cuối tháng. Đổi lịch không xóa lịch sử gửi hoặc đặt lại chống gửi lặp. Chọn tháng để xem không đổi tháng thực thi của workflow. Workflow không chấm KPI.

---

## 7. Luồng 4.3 — Điều phối thôi việc và phục hồi kênh gửi lỗi

File: `04_offboarding_workflow.json`. Số node: **18**.

| STT | Node | Chức năng |
|---:|---|---|
| 1 | `Offboarding Approval Webhook` | Nhận POST /webhook/tv4-offboarding từ backend. |
| 2 | `Load Offboarding Configuration` | Nạp API, khóa xác thực, sender, email IT/Kế toán, Chat ID và khảo sát. |
| 3 | `Authenticate Offboarding Request` | Bắt buộc header khóa đúng và caseId số nguyên dương. |
| 4 | `Fetch Approved Offboarding Case` | GET /api/offboarding/automation/{caseId}; backend trả hồ sơ và alreadyNotified. |
| 5 | `Is Approved Case Valid?` | Kiểm tra mã khớp, nhân viên, ngày cuối và trạng thái APPROVED/IN_PROGRESS/PARTIAL/FAILED. |
| 6 | `Respond to Invalid Case` | Nhánh không hợp lệ trả HTTP 409, không gửi các thông báo thôi việc. |
| 7 | `Compose Offboarding Notices` | Soạn từng kênh, kiểm tra người nhận, đặt cờ send theo alreadyNotified. |
| 8 | `Should Notify IT?` | Chỉ gửi nếu IT chưa được xác nhận và địa chỉ hợp lệ. |
| 9 | `Send IT Handover Notice` | Yêu cầu IT bàn giao tài sản và xử lý quyền truy cập theo ngày cuối. |
| 10 | `Should Notify Finance?` | Chỉ gửi nếu Kế toán chưa được xác nhận và địa chỉ hợp lệ. |
| 11 | `Send Finance Handover Notice` | Gửi yêu cầu đối chiếu lương, phép và quyết toán. |
| 12 | `Should Notify Employee?` | Chỉ gửi nếu nhân viên chưa được xác nhận và email hợp lệ. |
| 13 | `Send Employee Farewell` | Gửi lời cảm ơn và khảo sát; ưu tiên email cá nhân. |
| 14 | `Should Notify Offboarding Telegram?` | Chỉ gửi nếu Telegram chưa được xác nhận và Chat ID hợp lệ. |
| 15 | `Send Offboarding Telegram` | Gửi tóm tắt hồ sơ cho nhóm phối hợp. |
| 16 | `Summarize Offboarding Delivery` | Kết hợp kênh đã thành công trước đó với kết quả mới; lưu attemptedChannels/skippedChannels. |
| 17 | `Record Offboarding Delivery` | POST /api/offboarding/automation/{caseId}/results; retry callback cùng runId. |
| 18 | `Respond to Offboarding Request` | Trả trạng thái và cờ kênh; callback lỗi trả HTTP 502 thay vì xác nhận giả rằng đã lưu. |

Gửi lại một hồ sơ PARTIAL không gửi lại kênh backend đã xác nhận thành công. Ví dụ IT, Kế toán và nhân viên đã nhận, Telegram lỗi: lần sau chỉ thử Telegram; kết quả cuối vẫn giữ ba cờ thành công trước đó.

SENT nghĩa là các kênh thông báo đã được xác nhận gửi; backend có thể chuyển hồ sơ COMPLETED theo logic hiện có. Điều đó không xác nhận IT đã thu hồi xong laptop hay Kế toán đã quyết toán xong. Workflow chỉ gửi yêu cầu, không tự khóa tài khoản hoặc xử lý tài chính.

Demo đầy đủ cần hồ sơ đã duyệt thật trong database kiểm thử và backend gọi webhook. Ghim dữ liệu chỉ thay đầu vào trong thực thi thủ công, không thay cho hồ sơ backend hay bỏ qua xác thực. Không ghim cấu hình/dữ liệu mẫu khi vận hành chính thức.

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

Kiểm thử nâng cấp riêng ba workflow trên Linux (không cần build lại khi backend đang watch):

```bash
cd backend
npm run test:tv4-workflows
```

Fixture chạy graph trên n8n thật được tạo bằng `node scripts/test-tv4-workflow-graph.cjs /tmp/tv4-qa-fixtures`. Phải import/chạy fixture bằng database n8n riêng; các node HTTP/SMTP/Telegram đã được thay bằng Code, không gửi ra ngoài. Chi tiết và kết quả ở `docs/TV4_WORKFLOW_UPGRADE.md`.

Các bài kiểm thử bao phủ:

- điều kiện lọc khóa bắt buộc;
- fallback quản lý theo phòng ban;
- cooldown và callback chống ghi lặp;
- phân tích sơ bộ khi chưa có KPI;
- cấu trúc 18/19/18 node của workflow 4.1–4.3;
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
- [ ] Ba workflow 4.1–4.3 có 18/19/18 node; workflow Kho tri thức giữ 8 node.
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
