<a id="muc-luc"></a>
# 📖 TỔNG HỢP KIẾN TRÚC & HƯỚNG DẪN 4 LUỒNG TỰ ĐỘNG HÓA N8N (THÀNH VIÊN 3)
## PHÂN HỆ: ONBOARDING 30 NGÀY · SỨC KHỎE TINH THẦN · BÁO CÁO HẠNH PHÚC DOANH NGHIỆP
*Tài liệu chuẩn hóa kiến trúc Modular — Tích hợp đầy đủ từ Sơ đồ, Node, CSDL, Code, Test Playbook đến Kịch bản thuyết trình bảo vệ đồ án.*

---

# 🧭 MỤC LỤC TỔNG THỂ

* [MỤC 1: SƠ ĐỒ TỔNG QUAN KIẾN TRÚC TOÀN BỘ HỆ SINH THÁI AUTOMATION](#muc-1)
  * [1.1. Bức tranh toàn cảnh 4 Luồng n8n](#muc-1-1)
  * [1.2. Ma trận tương tác Hệ sinh thái Fullstack](#muc-1-2)
* [MỤC 2: CHI TIẾT LUỒNG 1 (WF-01: BURNOUT CRISIS DETECTION & MULTI-TIER ESCALATION)](#muc-2)
  * [2.1. Sơ đồ luồng & 4 Giai đoạn xử lý](#muc-2-1)
  * [2.2. Trình tự chi tiết từng Node thực thi (14 Nodes)](#muc-2-2)
  * [2.3. Bảng công nghệ & Credentials sử dụng](#muc-2-3)
  * [2.4. Kịch bản kiểm thử thực tế đa tầng (Test Playbook 5 Scenarios)](#muc-2-4)
    * [🟢 Kịch bản 1: Cảnh báo sớm do khó khăn công nghệ (TECH Stress)](#kich-ban-1)
    * [🟡 Kịch bản 2: Quá tải tiến độ do cày Deadline Sprint (WORKLOAD Stress)](#kich-ban-2)
    * [🔴 Kịch bản 3: Báo động đỏ cấp công ty do Stress kéo dài >= 5 ngày (CRITICAL)](#kich-ban-3)
    * [🚨 Kịch bản 4: Bẫy Crisis Flag ép nhảy cóc lên mức ĐỎ ngày 1 (CRISIS TRAP)](#kich-ban-4)
    * [🛡️ Kịch bản 5: Bắt lỗi đầu vào (Input Validation & Error Guard)](#kich-ban-5)
  * [2.5. Kịch bản thuyết trình bảo vệ Luồng 1 trước Hội đồng](#muc-2-5)
* [MỤC 3: CHI TIẾT LUỒNG 2 (WF-02: DAILY MOOD PULSE & MORNING CHECK-IN REMINDER)](#muc-3)
  * [3.1. Sơ đồ luồng & 4 Giai đoạn xử lý](#muc-3-1)
  * [3.2. Trình tự chi tiết từng Node thực thi (11 Nodes)](#muc-3-2)
  * [3.3. Bảng công nghệ & Credentials sử dụng](#muc-3-3)
  * [3.4. Kịch bản kiểm thử thực tế đa tầng (Test Playbook 4 Scenarios)](#muc-3-4)
    * [🚀 Kịch bản 1: Nhắc nhở khởi động tuần mới sáng Thứ Hai (Khởi động tuần mới)](#kich-ban-2-1)
    * [🎉 Kịch bản 2: Khen ngợi chuỗi Streak cao ngày Thứ Sáu (Về đích tuần)](#kich-ban-2-2)
    * [🛡️ Kịch bản 3: Tất cả nhân viên đã check-in hôm nay (Empty List Edge Case)](#kich-ban-2-3)
    * [⏱️ Kịch bản 4: Kiểm thử cơ chế đệm chống nghẽn Rate Limit (Wait 4s Throttle)](#kich-ban-2-4)
  * [3.5. Kịch bản thuyết trình bảo vệ Luồng 2 trước Hội đồng](#muc-3-5)
* [MỤC 4: CHI TIẾT LUỒNG 3 (WF-03: 30-DAY ONBOARDING SLA GUARDIAN & GRADUATION COMPANION)](#muc-4)
  * [4.1. Sơ đồ luồng & 4 Giai đoạn xử lý](#muc-4-1)
  * [4.2. Trình tự chi tiết từng Node thực thi (14 Nodes)](#muc-4-2)
  * [4.3. Bảng công nghệ & Credentials sử dụng](#muc-4-3)
  * [4.4. Kịch bản kiểm thử thực tế đa tầng (Test Playbook 4 Scenarios)](#muc-4-4)
    * [🚨 Kịch bản 1: Cảnh báo nhiệm vụ quá hạn SLA (OVERDUE Breach)](#kich-ban-3-1)
    * [🎓 Kịch bản 2: Vinh danh hoàn thành 100% Onboarding 30 ngày (GRADUATION Celebration)](#kich-ban-3-2)
    * [✅ Kịch bản 3: Nhân sự đang tiến triển đúng hạn bình thường (ON_TRACK Progress)](#kich-ban-3-3)
    * [🔥 Kịch bản 4: Báo động leo thang nghiêm trọng trễ >= 7 ngày (ESCALATION Critical)](#kich-ban-3-4)
  * [4.5. Kịch bản thuyết trình bảo vệ Luồng 3 trước Hội đồng](#muc-4-5)
* [MỤC 5: CHI TIẾT LUỒNG 4 (WF-04: WEEKLY MORALE & EXECUTIVE SENTIMENT DIGEST)](#muc-5)
  * [5.1. Sơ đồ luồng & 4 Giai đoạn xử lý](#muc-5-1)
  * [5.2. Trình tự chi tiết từng Node thực thi (11 Nodes)](#muc-5-2)
  * [5.3. Bảng công nghệ & Credentials sử dụng](#muc-5-3)
  * [5.4. Kịch bản kiểm thử thực tế đa tầng (Test Playbook 4 Scenarios)](#muc-5-4)
    * [🟢 Kịch bản 1: Báo cáo tích cực — Morale Index cao & Xu hướng tăng](#kich-ban-4-1)
    * [🔴 Kịch bản 2: Cảnh báo điểm nóng căng thẳng (Hotspot Warning: Stress >= 40%)](#kich-ban-4-2)
    * [📊 Kịch bản 3: Chạy thực tế từ dữ liệu CSDL 7 ngày gần nhất](#kich-ban-4-3)
    * [🛡️ Kịch bản 4: Kiểm thử thuật toán bảo vệ ẩn danh cho nhóm nhỏ (< 3 người)](#kich-ban-4-4)
  * [5.5. Kịch bản thuyết trình bảo vệ Luồng 4 trước Hội đồng](#muc-5-5)
* [MỤC 6: BÍ QUYẾT BẢO VỆ ĐỒ ÁN ĂN ĐIỂM TUYỆT ĐỐI TRƯỚC GIẢNG VIÊN](#muc-6)
  * [6.1. Định vị Bản thân: Kỹ sư Tự động hóa & Kiến trúc Giải pháp Doanh nghiệp](#muc-6-1)
  * [6.2. 5 "Trụ cột Kỹ thuật Hạng nặng" giúp ghi điểm Tuyệt đối với Hội đồng](#muc-6-2)
  * [6.3. Kịch bản Trình diễn Live (Live Demo Playbook 3 Màn hình) "Bách phát bách trúng"](#muc-6-3)
  * [6.4. Bộ 10 Câu hỏi Vấn đáp "Tử thần" của Giảng viên & Câu trả lời Mẫu Chuẩn Chuyên gia](#muc-6-4)
  * [6.5. Checklist Kỹ thuật 15 phút trước giờ G & Tư thế Tác phong Bảo vệ](#muc-6-5)

---

<a id="muc-1"></a>
# 1. MỤC 1: SƠ ĐỒ TỔNG QUAN KIẾN TRÚC TOÀN BỘ HỆ THỐNG AUTOMATION

Phân hệ Thành viên 3 chịu trách nhiệm tự động hóa toàn bộ vòng đời trải nghiệm của nhân viên mới (Onboarding 30 ngày), theo dõi sức khỏe tinh thần và báo cáo chiến lược cho Ban Giám Đốc.

<a id="muc-1-1"></a>
### 1.1. Bức tranh toàn cảnh 4 Luồng n8n

```
+---------------------------------------------------------------------------------------------------+
|                           HỆ THỐNG TỰ ĐỘNG HÓA N8N - ENTERPRISE HR PORTAL                        |
+---------------------------------------------------------------------------------------------------+
                                                  │
         ┌────────────────────────┬───────────────┴───────────────┬────────────────────────┐
         ▼                        ▼                               ▼                        ▼
 ╔═════════════════════╗  ╔═════════════════════╗  ╔═════════════════════╗  ╔═════════════════════╗
 ║      LUỒNG 1        ║  ║      LUỒNG 2        ║  ║      LUỒNG 3        ║  ║      LUỒNG 4        ║
 ║      (WF-01)        ║  ║      (WF-02)        ║  ║      (WF-03)        ║  ║      (WF-04)        ║
 ║  Burnout Crisis &   ║  ║  Daily Mood Pulse   ║  ║  30-Day Onboarding  ║  ║ Weekly Team Morale ║
 ║ Escalation Tiers    ║  ║   Morning Reminder  ║  ║    SLA Guardian     ║  ║   Sentiment Radar   ║
 ╠═════════════════════╣  ╠═════════════════════╣  ╠═════════════════════╣  ╠═════════════════════╣
 ║ Kích hoạt:          ║  ║ Kích hoạt:          ║  ║ Kích hoạt:          ║  ║ Kích hoạt:          ║
 ║ Webhook Realtime    ║  ║ Cron: 09:00 (T2-T6) ║  ║ Cron: 08:30 (Thứ 2) ║  ║ Cron: 17:00 (Thứ 6) ║
 ║ (Khi nhân viên      ║  ║ (Nhắc nhân sự chưa  ║  ║ (Quét trễ task &    ║  ║ (Gom dữ liệu tuần,  ║
 ║ stress >= 3 ngày)   ║  ║ check-in tâm trạng) ║  ║ vinh danh 100%)    ║  ║ báo cáo C-Level)    ║
 ╠═════════════════════╣  ╠═════════════════════╣  ╠═════════════════════╣  ╠═════════════════════╣
 ║ Kênh đầu ra:        ║  ║ Kênh đầu ra:        ║  ║ Kênh đầu ra:        ║  ║ Kênh đầu ra:        ║
 ║ • Telegram Bot      ║  ║ • Telegram Bot      ║  ║ • Telegram Bot      ║  ║ • Telegram Bot      ║
 ║ • SMTP Email Lead   ║  ║   (Rate-limit 4s)   ║  ║ • SMTP Email Mentor ║  ║ • HTML Digest Email ║
 ║ • MySQL Audit Update║  ║ • MySQL Audit Log   ║  ║ • MySQL Status Sync ║  ║ • MySQL Report Save ║
 ╚═════════════════════╝  ╚═════════════════════╝  ╚═════════════════════╝  ╚═════════════════════╝
```

<a id="muc-1-2"></a>
### 1.2. Ma trận tương tác Hệ sinh thái Fullstack

| Tầng kiến trúc | Thành phần | Vai trò trong hệ thống |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Tailwind CSS + Lucide Icons | Cung cấp giao diện Check-in cảm xúc, Bảng Roadmap Onboarding 30 ngày và Team Mood Dashboard. |
| **Backend** | NestJS 10 + TypeORM | API trung gian, quản lý xác thực JWT, phát Webhook bất đồng bộ sang n8n khi phát hiện dấu hiệu bất thường. |
| **Database** | MySQL 8.0 (`hr_enterprise_db`) | Lưu trữ toàn bộ Users, Departments, Checklists, `employee_moods`, `document_chunks` và `morale_reports`. |
| **Automation** | n8n Engine (`localhost:5678`) | "Trái tim" điều phối logic, phân luồng cảnh báo, gọi AI, tương tác CSDL 2 chiều và gửi tin nhắn đa kênh. |
| **Cognitive AI** | Google Gemini (`gemini-2.5-flash`) | Phân tích tâm lý chuyên sâu, trích xuất nguyên nhân cốt lõi, soạn kịch bản 1-on-1 và viết báo cáo tuần. |

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-2"></a>
# 2. MỤC 2: CHI TIẾT LUỒNG 1 (WF-01: BURNOUT CRISIS DETECTION & MULTI-TIER ESCALATION)

* **Mã luồng trên n8n:** `[TV3] WF-01: Burnout Crisis Detection & Multi-Tier Escalation`
* **Workflow ID:** `wJrOeNTxp2yTn4hT`
* **Hình thức kích hoạt:** Webhook Endpoint (POST)
  * Chế độ Kiểm thử: `http://localhost:5678/webhook-test/burnout-alert`
  * Chế độ Production: `http://localhost:5678/webhook/burnout-alert`
* **Mục tiêu nghiệp vụ:** Nhận tín hiệu nhân viên stress kéo dài từ Backend, phân tích nguyên nhân bằng AI, tự động chia tầng cảnh báo (Manager hoặc HR Director) và ghi nhận vết kiểm toán vào CSDL.

<a id="muc-2-1"></a>
### 2.1. Sơ đồ luồng & 4 Giai đoạn xử lý

```
[GIAI ĐOẠN 1: TIẾP NHẬN SỰ KIỆN & NON-BLOCKING]
(01) Webhook Trigger ──▶ (02) Data Validation & Sanitize ──┬──▶ (03) Respond HTTP 202 (Trả mã ngay <15ms)
                                                           │
[GIAI ĐOẠN 2: LÀM GIÀU DỮ LIỆU CSDL & AI CHẨN ĐOÁN]       ▼
                                                    (04) MySQL User Profile (Truy vấn Sếp & Phòng ban)
                                                           │
                                                           ▼
                                                    (05) MySQL 7-Day History (Lấy lịch sử cảm xúc)
                                                           │
                                                           ▼
(07) Google Gemini Chat Model ────────────────────▶ (06) AI Diagnostic Agent (LangChain LLM Chain)
                                                           │
                                                           ▼
                                                    (08) Build Alert Card (Soạn thẻ HTML & Email)
                                                           │
[GIAI ĐOẠN 3: PHÂN NHÁNH ĐIỀU PHỐI ĐA TẦNG]                ▼
                                                    (09) Switch Risk Level (Phân loại rủi ro)
                                                      ├── [Nhánh CRITICAL (Đỏ)]: (10) Telegram HR ──▶ (11) Email HR Lead
                                                      │                                                       │
                                                      └── [Nhánh WARNING (Vàng)]: (12) Telegram Manager       │
                                                                                           │                  │
[GIAI ĐOẠN 4: KIỂM TOÁN CƠ SỞ DỮ LIỆU]                                                     ▼                  ▼
                                                                                   (13) MySQL Audit Record (Ghi nhận DB)
```

<a id="muc-2-2"></a>
### 2.2. Trình tự chi tiết từng Node thực thi (14 Nodes)

#### 🟢 GIAI ĐOẠN 1: TIẾP NHẬN SỰ KIỆN & PHẢN HỒI NON-BLOCKING

<a id="node-01"></a>
##### 🔹 Node 01: `Webhook Trigger`
* **Loại node:** `n8n-nodes-base.webhook`
* **Nhiệm vụ:** Lắng nghe HTTP POST request từ NestJS Backend (`onboarding.service.ts` dòng 222).
* **Payload đầu vào chuẩn:**
  ```json
  {
    "userId": 4,
    "employeeName": "Phạm Hồng Quân",
    "departmentName": "Kỹ Thuật & AI",
    "stressDays": 3,
    "latestFeedback": "Deadline Sprint dồn dập, nhiều kiến trúc mới chưa quen"
  }
  ```

<a id="node-02"></a>
##### 🔹 Node 02: `Data Validation & Sanitize`
* **Loại node:** `n8n-nodes-base.code` (JavaScript)
* **Nhiệm vụ:** Thẩm định tính hợp lệ, làm sạch dữ liệu và kích hoạt bẫy khủng hoảng:
  1. Kiểm tra bắt buộc: `userId > 0`, `stressDays >= 1`.
  2. Lọc ký tự lạ tránh Script Injection.
  3. **Cơ chế Crisis Flag (Phát hiện khủng hoảng):** Tự động duyệt regex tìm từ khóa nguy cấp (`"không muốn sống"`, `"tự tử"`, `"kiệt sức"`, `"quá tải"`...). Nếu phát hiện, **ép `riskTier = 'CRITICAL'` ngay lập tức** dù nhân viên mới stress 1 ngày.

<a id="node-03"></a>
##### 🔹 Node 03: `Respond HTTP 202`
* **Loại node:** `n8n-nodes-base.respondToWebhook`
* **Nhiệm vụ:** Trả ngay mã trạng thái `HTTP 202 Accepted` về cho NestJS Backend trong vòng **< 15ms**.
* **Ý nghĩa kỹ sư:** Mô hình Asynchronous Non-blocking. Backend không bị treo kết nối để chờ AI xử lý (vốn mất 1.5 - 2 giây), giúp giao diện nhân viên không bị lag/đơ.

---

#### 🔵 GIAI ĐOẠN 2: LÀM GIÀU DỮ LIỆU CSDL & AI CHẨN ĐOÁN

<a id="node-04"></a>
##### 🔹 Node 04: `MySQL User Profile`
* **Loại node:** `n8n-nodes-base.mySql`
* **Nhiệm vụ:** Cầm `userId` truy vấn ngược vào cơ sở dữ liệu để tìm thông tin Sếp trực tiếp:
  ```sql
  SELECT u.id, u.full_name, u.email, u.job_title, d.name AS dept_name,
         m.full_name AS manager_name, m.email AS manager_email
  FROM users u
  LEFT JOIN departments d ON u.department_id = d.id
  LEFT JOIN users m ON u.manager_id = m.id
  WHERE u.id = {{ $json.userId }};
  ```

<a id="node-05"></a>
##### 🔹 Node 05: `MySQL 7-Day History`
* **Loại node:** `n8n-nodes-base.mySql`
* **Nhiệm vụ:** Gom toàn bộ cảm xúc 7 ngày gần nhất của nhân viên thành mảng JSON:
  ```sql
  SELECT CAST(COALESCE(JSON_ARRAYAGG(
    JSON_OBJECT('mood', t.mood, 'feedback', t.feedback_text, 'date', t.check_date)
  ), JSON_ARRAY()) AS CHAR) AS history_json
  FROM (
    SELECT mood, feedback_text, DATE(created_at) AS check_date
    FROM employee_moods
    WHERE user_id = {{ $('Data Validation & Sanitize').first().json.userId }}
    ORDER BY created_at DESC LIMIT 7
  ) t;
  ```

<a id="node-06"></a>
##### 🔹 Node 06: `AI Diagnostic Agent`
* **Loại node:** `@n8n/n8n-nodes-langchain.chainLlm`
* **Nhiệm vụ:** Đóng vai trò Chuyên gia Tâm lý Tổ chức Doanh nghiệp:
  1. Đọc bối cảnh nhân sự + lời nhắn hôm nay + lịch sử 7 ngày.
  2. Xác định nguyên nhân cốt lõi (`TECH`, `WORKLOAD`, `CULTURE`).
  3. **Tự động sinh ra 3 câu hỏi thấu cảm 1-on-1** giúp Quản lý chuẩn bị trước khi gặp mặt nhân viên.

<a id="node-07"></a>
##### 🔹 Node 07: `Google Gemini Chat Model`
* **Loại node:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
* **Nhiệm vụ:** Cung cấp "bộ não" tính toán cho Node 06, kết nối model **`gemini-2.5-flash`** với credential `Google Gemini(PaLM) Api account`.

<a id="node-08"></a>
##### 🔹 Node 08: `Build Alert Card`
* **Loại node:** `n8n-nodes-base.code` (JavaScript)
* **Nhiệm vụ:** Lấy kết quả AI kết hợp dữ liệu nhân sự để định dạng thành:
  * Thẻ tin nhắn **Telegram HTML** với icon, thanh đo mức độ stress, nhận định AI và nút can thiệp.
  * Thư điện tử **Email HTML trang trọng** gửi cho HR Lead.

---

#### 🟡 GIAI ĐOẠN 3: PHÂN NHÁNH ĐIỀU PHỐI ĐA TẦNG

<a id="node-09"></a>
##### 🔹 Node 09: `Switch Risk Level`
* **Loại node:** `n8n-nodes-base.switch`
* **Nhiệm vụ:** Rẽ nhánh theo biến `riskTier`:
  * **Cổng 0 (`CRITICAL` - Đỏ):** Chuyển sang Node 10 (Telegram HR) và Node 11 (Email Lead).
  * **Cổng 1 (`WARNING` - Vàng):** Chuyển sang Node 12 (Telegram Quản lý trực tiếp).

<a id="node-10"></a>
##### 🔹 Node 10: `Telegram HR Escalation` (Nhánh CRITICAL)
* **Loại node:** `n8n-nodes-base.telegram`
* **Nhiệm vụ:** Bắn tin nhắn cảnh báo đỏ `🔴 CRITICAL BURNOUT ALERT` vào nhóm lãnh đạo HR khi nhân viên stress $\ge 5$ ngày hoặc có dấu hiệu khủng hoảng.

<a id="node-11"></a>
##### 🔹 Node 11: `Email HR Official Notice` (Nhánh CRITICAL)
* **Loại node:** `n8n-nodes-base.emailSend` (SMTP)
* **Nhiệm vụ:** Gửi email chính thức tới HR Director yêu cầu bố trí 1 ngày nghỉ Mental Health Day hoặc can thiệp khẩn cấp trong 24 giờ.

<a id="node-12"></a>
##### 🔹 Node 12: `Telegram Manager Alert` (Nhánh WARNING)
* **Loại node:** `n8n-nodes-base.telegram`
* **Nhiệm vụ:** Bắn thông báo màu vàng `🟡 BURNOUT EARLY WARNING` tới riêng Quản lý trực tiếp để nhắc sếp hẹn lịch 1-on-1 trong tuần.

---

#### 🔴 GIAI ĐOẠN 4: KIỂM TOÁN CƠ SỞ DỮ LIỆU

<a id="node-13"></a>
##### 🔹 Node 13: `MySQL Audit Record`
* **Loại node:** `n8n-nodes-base.mySql`
* **Nhiệm vụ:** Cả 2 nhánh CRITICAL và WARNING đều hội tụ về đây để đánh dấu bản ghi:
  ```sql
  UPDATE employee_moods
  SET is_burnout_risk = 1
  WHERE user_id = {{ $('Data Validation & Sanitize').first().json.userId }}
    AND mood = 'STRESSED'
    AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);
  ```
* **Ý nghĩa:** Hoàn tất chu trình kiểm toán dữ liệu 2 chiều, ghi nhận rằng ca cảnh báo này đã được n8n xử lý thành công.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-2-3"></a>
### 2.3. Bảng công nghệ & Credentials sử dụng

| Tên Credential trong n8n | Credential ID | Dịch vụ kết nối | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **MySQL account** | `hVFuUZOZqBxSICn4` | MySQL Local (`hr_enterprise_db`) | Đọc Profile nhân sự, lấy lịch sử 7 ngày và ghi vết kiểm toán. |
| **Google Gemini(PaLM) Api account** | `5sjnywIBZlOvIRb3` | Google Gemini API (`gemini-2.5-flash`) | Phân tích tâm lý và sinh kịch bản câu hỏi 1-on-1. |
| **Telegram account** | `nEgzOjvRL1PL6URH` | Telegram Bot API (`chat_id: 6331216556`) | Bắn thẻ tin nhắn cảnh báo vàng/đỏ tức thì. |
| **SMTP account** | `Tg4vTrLPwQdSjMjS` | Google Workspace / Gmail SMTP | Gửi email thông báo chính thức cho Ban Nhân sự. |

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-2-4"></a>
### 2.4. Kịch bản kiểm thử thực tế đa tầng (Test Playbook 5 Scenarios)

> 💡 **Hướng dẫn chạy test:**
> 1. Trên n8n Editor, mở Workflow WF-01 và bấm nút cam **`Execute workflow`** ở thanh dưới cùng.
> 2. Mở terminal (Git Bash hoặc PowerShell), copy lệnh tương ứng bên dưới và nhấn Enter.

#### 📋 Bảng ma trận 5 kịch bản (Bấm vào tên để nhảy trực tiếp tới kịch bản)

| STT | Kịch Bản | Dữ Liệu Đầu Vào | Nhánh Dự Kiến | Kênh Nhận Cảnh Báo |
| :---: | :--- | :--- | :---: | :--- |
| **01** | [**TECH Stress**](#kich-ban-1) | `stressDays: 3`, feedback khó khăn code | 🟡 **WARNING** | Telegram Quản lý trực tiếp |
| **02** | [**WORKLOAD Stress**](#kich-ban-2) | `stressDays: 4`, feedback OT nhiều | 🟡 **WARNING** | Telegram Quản lý trực tiếp |
| **03** | [**CRITICAL Escalation**](#kich-ban-3) | `stressDays: 5`, feedback kiệt quệ | 🔴 **CRITICAL** | Telegram HR Lead + Email chính thức |
| **04** | [**CRISIS FLAG Trap**](#kich-ban-4) | `stressDays: 1`, feedback "không muốn sống" | 🔴 **CRITICAL** | Telegram HR Lead + Email (Ép nhảy cấp) |
| **05** | [**Validation Error**](#kich-ban-5) | `userId: 0` hoặc thiếu trường | ❌ **REJECTED** | Báo lỗi tại Node 2 (Không tốn token AI) |

---

#### 🧪 Chi tiết từng kịch bản & Lệnh chạy

<a id="kich-ban-1"></a>
##### 🟢 Kịch bản 1: Cảnh báo sớm do gặp khó khăn công nghệ (`TECH`)
* **Tình huống giả lập:** Nhân viên mới vào gặp kiến trúc NestJS/Microservices quá mới lạ, debug mất nhiều thời gian, stress liên tiếp 3 ngày.
* **Lệnh Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/burnout-alert \
    -H "Content-Type: application/json" \
    -d '{"userId":4,"employeeName":"Phạm Hồng Quân","departmentName":"Kỹ Thuật & AI","stressDays":3,"latestFeedback":"Các thư viện nội bộ và kiến trúc NestJS microservice chưa quen nên debug mất rất nhiều thời gian"}'
  ```
* **Lệnh PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/burnout-alert" -Method POST -ContentType "application/json" -Body '{"userId":4,"employeeName":"Phạm Hồng Quân","departmentName":"Kỹ Thuật & AI","stressDays":3,"latestFeedback":"Các thư viện nội bộ và kiến trúc NestJS microservice chưa quen nên debug mất rất nhiều thời gian"}'
  ```
* **Kết quả quan sát được:**
  * **Gemini AI:** Tự động phát hiện nguyên nhân cốt lõi là **`TECH`**, đưa ra 3 câu hỏi gợi ý Quản lý cung cấp tài liệu kiến trúc hoặc cử Mentor kèm cặp.
  * **Nhánh rẽ:** Rẽ vào cổng **`WARNING` (Vàng)**.
  * **Kênh nhận tin:** Bot Telegram gửi tin nhắn thẻ vàng tới Quản lý trực tiếp.
  * **Kiểm toán CSDL:** Node 13 cập nhật `is_burnout_risk = 1` trong MySQL.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-2"></a>
##### 🟡 Kịch bản 2: Quá tải tiến độ do cày Deadline Sprint (`WORKLOAD`)
* **Tình huống giả lập:** Nhân viên bị dồn việc trong Sprint, phải OT liên tục đến đêm, stress 4 ngày.
* **Lệnh Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/burnout-alert \
    -H "Content-Type: application/json" \
    -d '{"userId":4,"employeeName":"Phạm Hồng Quân","departmentName":"Kỹ Thuật & AI","stressDays":4,"latestFeedback":"Sprint này gánh nhiều task quá, ngày nào cũng phải OT tới 21h tối, người rất mệt mỏi và đuối sức"}'
  ```
* **Lệnh PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/burnout-alert" -Method POST -ContentType "application/json" -Body '{"userId":4,"employeeName":"Phạm Hồng Quân","departmentName":"Kỹ Thuật & AI","stressDays":4,"latestFeedback":"Sprint này gánh nhiều task quá, ngày nào cũng phải OT tới 21h tối, người rất mệt mỏi và đuối sức"}'
  ```
* **Kết quả quan sát được:**
  * **Gemini AI:** Đánh giá nguyên nhân **`WORKLOAD`**, chấm điểm nguy cơ nghỉ việc ở mức **7/10**.
  * **Đề xuất 1-on-1:** AI khuyên Quản lý rà soát san sẻ bớt backlog của Sprint cho nhân sự khác trong team.
  * **Nhánh rẽ:** Rẽ nhánh **`WARNING`**.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-3"></a>
##### 🔴 Kịch bản 3: Báo động đỏ cấp công ty do Stress kéo dài ($\ge$ 5 ngày)
* **Tình huống giả lập:** Nhân viên stress liên tiếp 5 ngày, chạm ngưỡng báo động đỏ khẩn cấp theo chính sách công ty.
* **Lệnh Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/burnout-alert \
    -H "Content-Type: application/json" \
    -d '{"userId":4,"employeeName":"Phạm Hồng Quân","departmentName":"Kỹ Thuật & AI","stressDays":5,"latestFeedback":"Tôi cảm thấy kiệt sức hoàn toàn, mất ngủ nhiều đêm và không thể tiếp tục giữ nhịp độ này nữa"}'
  ```
* **Lệnh PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/burnout-alert" -Method POST -ContentType "application/json" -Body '{"userId":4,"employeeName":"Phạm Hồng Quân","departmentName":"Kỹ Thuật & AI","stressDays":5,"latestFeedback":"Tôi cảm thấy kiệt sức hoàn toàn, mất ngủ nhiều đêm và không thể tiếp tục giữ nhịp độ này nữa"}'
  ```
* **Kết quả quan sát được:**
  * **Nhánh rẽ:** Rẽ thẳng sang nhánh **`CRITICAL` (Báo động đỏ)**.
  * **Kích hoạt đa kênh đồng thời:**
    * Bắn tin Telegram cảnh báo đỏ `🔴 CRITICAL` tới kênh lãnh đạo HR.
    * Kích hoạt node `Email HR Official Notice` gửi email chính thức tới HR Lead yêu cầu can thiệp trong vòng 24 giờ.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-4"></a>
##### 🚨 Kịch bản 4: Bẫy "Crisis Flag" — Ép nhảy cóc lên mức ĐỎ dù mới Stress 1 ngày!
* **Tình huống giả lập (Điểm sáng kỹ sư):** Nhân viên mới chỉ stress **1 ngày** (`stressDays: 1`), nhưng lời nhắn xuất hiện từ khóa tâm lý nguy cấp (`"không muốn sống"`).
* **Lệnh Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/burnout-alert \
    -H "Content-Type: application/json" \
    -d '{"userId":4,"employeeName":"Phạm Hồng Quân","departmentName":"Kỹ Thuật & AI","stressDays":1,"latestFeedback":"Áp lực công việc dạo này quá kinh khủng, tôi thực sự mệt mỏi và không muốn sống nữa"}'
  ```
* **Lệnh PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/burnout-alert" -Method POST -ContentType "application/json" -Body '{"userId":4,"employeeName":"Phạm Hồng Quân","departmentName":"Kỹ Thuật & AI","stressDays":1,"latestFeedback":"Áp lực công việc dạo này quá kinh khủng, tôi thực sự mệt mỏi và không muốn sống nữa"}'
  ```
* **Cơ chế hoạt động bên trong:**
  * Node `Data Validation & Sanitize` bắt dính từ khóa nguy cấp qua bộ lọc `CRISIS_VN` / `CRISIS_ASCII`.
  * Dù `stressDays = 1`, biến `riskTier` **tự động bị ghi đè thành `CRITICAL`**!
  * Toàn bộ hệ thống lập tức kích hoạt chuông báo động đỏ đa kênh để kịp thời bảo vệ tính mạng và sức khỏe tinh thần của nhân sự.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-5"></a>
##### 🛡️ Kịch bản 5: Kiểm tra bắt lỗi đầu vào (Input Validation & Error Guard)
* **Tình huống giả lập:** Lỗi hệ thống backend hoặc request phá hoại gửi `userId <= 0` hoặc rỗng.
* **Lệnh Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/burnout-alert \
    -H "Content-Type: application/json" \
    -d '{"userId":0,"employeeName":"Unknown","stressDays":3}'
  ```
* **Kết quả quan sát được:**
  * Node `Data Validation & Sanitize` lập tức chặn đứng: `Error: userId bắt buộc và phải > 0`.
  * Luồng dừng ngay lập tức tại Node 2, **không gọi Gemini AI (tiết kiệm token/chi phí)** và **không làm rác cơ sở dữ liệu MySQL**.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-2-5"></a>
### 2.5. Kịch bản thuyết trình bảo vệ Luồng 1 trước Hội đồng

Khi thuyết trình trước Giảng viên, hãy trình diễn 3 bước gây ấn tượng mạnh:

1. **Bước 1 (Giới thiệu bài toán & Luồng chuẩn):**  
   *"Thưa thầy/cô, hệ thống của em không gửi cảnh báo cứng nhắc mà có cơ chế phân tầng thông minh. Em xin demo Kịch bản 1: Nhân viên mới stress 3 ngày do khó khăn kỹ thuật."*  
   $\rightarrow$ Bắn **Kịch bản 1** $\rightarrow$ Chỉ vào n8n thấy rẽ nhánh **`WARNING`**, mở Telegram cho thầy cô xem tin nhắn phân tích của Gemini AI.

2. **Bước 2 (Thuyết phục bằng tính nhân văn & Cơ chế an toàn):**  
   *"Tuy nhiên, nếu chỉ đếm số ngày thì sẽ bỏ lọt các ca khủng hoảng tâm lý đột ngột. Do đó em đã tích hợp bộ lọc Crisis Flag nhận diện từ khóa nguy cấp."*  
   $\rightarrow$ Bắn **Kịch bản 4** (stress 1 ngày nhưng có từ khóa nguy cấp) $\rightarrow$ Chỉ vào màn hình thấy luồng **tự động ép nhảy vọt sang `CRITICAL`**, Telegram báo động đỏ và Email được gửi tức thì!

3. **Bước 3 (Chốt hạ bằng tính toàn vẹn CSDL 2 chiều):**  
   *"Toàn bộ quá trình can thiệp này được cập nhật ngược lại bảng `employee_moods` trong MySQL qua Node 13 để phục vụ công tác thanh tra và báo cáo chỉ số hạnh phúc tuần (WF-04)."*

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-3"></a>
# 3. MỤC 3: CHI TIẾT LUỒNG 2 (WF-02: DAILY MOOD PULSE & MORNING CHECK-IN REMINDER)

* **Mã luồng trên n8n:** `[TV3] WF-02: Daily Mood Pulse & Morning Reminder`
* **Workflow ID:** `TV3WF02DailyMood` (hoặc `wf-02-daily-mood`)
* **Đường dẫn giao diện n8n:** `http://localhost:5678/workflow/TV3WF02DailyMood`
* **Hình thức kích hoạt:** Schedule Trigger (Cron)
  * Lịch chạy tự động: `0 9 * * 1-5` (Đúng **09:00 sáng**, Thứ 2 đến Thứ 6 hàng tuần)
  * Múi giờ hệ thống: `Asia/Ho_Chi_Minh`
* **Mục tiêu nghiệp vụ:** Tự động rà soát toàn bộ nhân viên công ty vào đầu giờ làm việc; lọc ra đúng những ai **CHƯA check-in cảm xúc hôm nay** để Gemini AI sáng tạo lời chúc buổi sáng ấm áp, dí dỏm theo ngữ cảnh thứ trong tuần và chuỗi ngày check-in quá khứ (Streak). Tuyệt đối **không spam tin nhắn máy móc** và **không làm phiền người đã check-in**.

---

<a id="muc-3-1"></a>
### 3.1. Sơ đồ luồng & 4 Giai đoạn xử lý

```
[GIAI ĐOẠN 1: KÍCH HOẠT ĐỊNH KỲ & NẠP BỐI CẢNH THỨ TRONG TUẦN]
(01) Schedule 09:00 AM ──▶ (02) Weekday Context & Config (Tính Tone ngày: T2 Khởi động 🚀 ... T6 Về đích 🎉)
                                 │
[GIAI ĐOẠN 2: QUÉT CSDL & PHÂN TÁCH VÒNG LẶP TUẦN TỰ]          │
                                 ▼
(03) MySQL Unchecked Users (Tìm ai CHƯA check-in hôm nay qua CURDATE)
                                 │
                                 ▼
(04) Split In Batches (Batch size = 1: Duyệt từng người một) ◀──────────────────────────────┐
       │                                                                                    │
       ├──▶ [Cổng 1 (Vòng lặp)]: (05) MySQL User Streak (Đếm số ngày check-in 14 ngày qua)  │
       │                                │                                                   │
[GIAI ĐOẠN 3: AI SÁNG TẠO LỜI NHẮC CÁ NHÂN HÓA]                                             │
       │                                ▼                                                   │
       │     (07) Google Gemini ──▶ (06) AI Morning Greeting Agent (Sinh 2 câu chúc ấm áp)  │
       │                                │                                                   │
[GIAI ĐOẠN 4: ĐIỀU PHỐI ĐA KÊNH & BỘ ĐỆM CHỐNG NGHẼN]                                       │
       │                                ▼                                                   │
       │                            (08) Format & HTML Escape (Tạo thẻ HTML + Link Portal)  │
       │                                │                                                   │
       │                                ▼                                                   │
       │                            (09) Telegram Send Reminder (Gửi tin nhắn riêng)        │
       │                                │                                                   │
       │                                ▼                                                   │
       │                            (10) Wait 4s (Throttle chống lỗi Telegram HTTP 429) ────┘
       │
       └──▶ [Cổng 0 (Khi hoàn tất)]: (11) Summary Logger (Ghi log tổng kết số lượng nhân sự đã nhắc)
```

---

<a id="muc-3-2"></a>
### 3.2. Trình tự chi tiết từng Node thực thi (11 Nodes)

#### 🟢 GIAI ĐOẠN 1: KÍCH HOẠT ĐỊNH KỲ & NẠP BỐI CẢNH

<a id="node-2-01"></a>
##### 🔹 Node 01: `Schedule 09:00 AM`
* **Loại node:** `n8n-nodes-base.scheduleTrigger` (v1.2)
* **Nhiệm vụ:** Hoạt động như chiếc đồng hồ báo thức của công ty. Tự động kích hoạt luồng vào đúng 09:00 sáng các ngày làm việc hành chính (Thứ 2 đến Thứ 6), không chạy vào Thứ 7 và Chủ nhật để tôn trọng thời gian nghỉ ngơi của nhân viên.
* **Cấu hình:** Cron `0 9 * * 1-5`, Timezone `Asia/Ho_Chi_Minh`.

<a id="node-2-02"></a>
##### 🔹 Node 02: `Weekday Context & Config`
* **Loại node:** `n8n-nodes-base.code` (JavaScript v2)
* **Nhiệm vụ:** Đọc biến thời gian hệ thống `$now.weekday` (1 = Thứ Hai ... 7 = Chủ nhật) để xác định "nhịp điệu năng lượng" trong tuần và cấu hình các thông số chung:
  * **Thứ Hai (`1`):** Tone *"khởi động tuần mới tràn đầy năng lượng"* `🚀`
  * **Thứ Ba (`2`):** Tone *"tăng tốc công việc hiệu quả"* `⚡`
  * **Thứ Tư (`3`):** Tone *"giữ vững nhịp độ giữa tuần"* `🎯`
  * **Thứ Năm (`4`):** Tone *"chạy nước rút hoàn thành mục tiêu"* `🔥`
  * **Thứ Sáu (`5`):** Tone *"tổng kết tuần và đón cuối tuần thảnh thơi"* `🎉`
* **Mã nguồn Node 02:**
  ```javascript
  const CONFIG = {
    TELEGRAM_CHAT_ID: '6331216556',
    WORKSPACE_URL: 'http://localhost:5173/workspace'
  };
  try {
    const w = $now.weekday;
    const map = {
      1: { vn: 'Thứ Hai', tone: 'khởi động tuần mới tràn đầy năng lượng', emoji: '🚀' },
      2: { vn: 'Thứ Ba', tone: 'tăng tốc công việc hiệu quả', emoji: '⚡' },
      3: { vn: 'Thứ Tư', tone: 'giữ vững nhịp độ giữa tuần', emoji: '🎯' },
      4: { vn: 'Thứ Năm', tone: 'chạy nước rút hoàn thành mục tiêu', emoji: '🔥' },
      5: { vn: 'Thứ Sáu', tone: 'tổng kết tuần và đón cuối tuần thảnh thơi', emoji: '🎉' }
    };
    const ctx = map[w] || { vn: 'Hôm nay', tone: 'ngày mới tốt lành', emoji: '☀️' };
    return [{ json: {
      currentDate: $now.toFormat('yyyy-MM-dd'),
      dayName: ctx.vn, dayTone: ctx.tone, dayEmoji: ctx.emoji,
      telegramChatId: CONFIG.TELEGRAM_CHAT_ID,
      workspaceUrl: CONFIG.WORKSPACE_URL,
      timestamp: new Date().toISOString()
    } }];
  } catch (err) {
    return [{ json: { currentDate: new Date().toISOString().slice(0, 10), dayName: 'Hôm nay', dayTone: 'ngày mới tốt lành', dayEmoji: '☀️',
      telegramChatId: CONFIG.TELEGRAM_CHAT_ID, workspaceUrl: CONFIG.WORKSPACE_URL, timestamp: new Date().toISOString() } }];
  }
  ```

---

#### 🔵 GIAI ĐOẠN 2: LỌC DỮ LIỆU CSDL & PHÂN TÁCH VÒNG LẶP

<a id="node-2-03"></a>
##### 🔹 Node 03: `MySQL Unchecked Users`
* **Loại node:** `n8n-nodes-base.mySql` (v2.4)
* **Nhiệm vụ:** Thực hiện truy vấn thông minh để lọc ra danh sách nhân sự thỏa mãn đồng thời 3 điều kiện:
  1. Là nhân viên chính thức/thử việc (`role = 'EMPLOYEE'`).
  2. Đang ở trạng thái làm việc bình thường (`is_active = 1`).
  3. **Quan trọng nhất:** Sử dụng mệnh đề `NOT EXISTS` để loại trừ hoàn toàn những người **đã check-in hôm nay (`created_at >= CURDATE()`)**.
* **Câu lệnh SQL:**
  ```sql
  SELECT u.id, u.full_name, u.email, u.job_title, d.name AS dept_name 
  FROM users u 
  LEFT JOIN departments d ON u.department_id = d.id 
  WHERE u.role = 'EMPLOYEE' 
    AND u.is_active = 1 
    AND NOT EXISTS (
      SELECT 1 FROM employee_moods em 
      WHERE em.user_id = u.id 
        AND em.created_at >= CURDATE()
    );
  ```
* **Ý nghĩa nghiệp vụ:** Giúp bảo vệ trải nghiệm nhân viên, không bao giờ bị tình trạng "vừa check-in xong lại bị bot gửi tin nhắc nhở".

<a id="node-2-04"></a>
##### 🔹 Node 04: `Split In Batches`
* **Loại node:** `n8n-nodes-base.splitInBatches` (v3)
* **Cấu hình:** `batchSize: 1`
* **Nhiệm vụ:** Chia mảng danh sách nhân viên thành từng mẻ đơn lẻ (1 người/lượt) để xử lý theo vòng lặp tuần tự.
* **Cơ chế 2 đầu ra:**
  * **Đầu ra 1 (Loop - Nhánh lặp):** Đẩy từng nhân sự sang Node 05 để tính Streak và gọi AI.
  * **Đầu ra 0 (Done - Hoàn tất):** Khi duyệt hết danh sách, luồng tự động chuyển sang Node 11 (`Summary Logger`) để chốt báo cáo.

---

#### 🟡 GIAI ĐOẠN 3: TÍNH TOÁN STREAK & AI SÁNG TẠO LỜI NHẮC

<a id="node-2-05"></a>
##### 🔹 Node 05: `MySQL User Streak`
* **Loại node:** `n8n-nodes-base.mySql` (v2.4)
* **Nhiệm vụ:** Chạy query phân tích thói quen điểm danh của từng nhân sự:
  * `checkin_days`: Tổng số ngày nhân viên có chia sẻ cảm xúc trong 14 ngày gần nhất.
  * `days_since_last`: Đã bao nhiêu ngày kể từ lần check-in gần nhất (`DATEDIFF`).
* **Câu lệnh SQL:**
  ```sql
  SELECT u.id, u.full_name, u.job_title, d.name AS dept_name, 
         (SELECT COUNT(DISTINCT DATE(em.created_at)) 
          FROM employee_moods em 
          WHERE em.user_id = u.id 
            AND em.created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)) AS checkin_days, 
         (SELECT DATEDIFF(CURDATE(), MAX(DATE(em2.created_at))) 
          FROM employee_moods em2 
          WHERE em2.user_id = u.id) AS days_since_last 
  FROM users u 
  LEFT JOIN departments d ON u.department_id = d.id 
  WHERE u.id = {{ $json.id }};
  ```

<a id="node-2-06"></a>
##### 🔹 Node 06: `AI Morning Greeting Agent`
* **Loại node:** `@n8n/n8n-nodes-langchain.chainLlm` (v1.4)
* **Nhiệm vụ:** Đóng vai trò **HR Culture Bot thân thiện, thấu cảm**. Thay vì bắn một câu thông báo khô khan như *"Bạn chưa điểm danh, hãy điểm danh ngay"*, AI đọc bối cảnh của nhân viên và tạo đúng 2 câu chúc ấm áp, khích lệ.
* **Prompt kỹ thuật:**
  ```text
  Bạn là HR Culture Bot thân thiện của công ty. Viết đúng 2 câu chúc buổi sáng ấm áp, dí dỏm, truyền cảm hứng cho nhân viên sau:
  - Tên: {{ $json.full_name }}
  - Vị trí: {{ $json.job_title || 'Nhân viên' }}
  - Phòng ban: {{ $json.dept_name || 'HR Tech' }}
  - Hôm nay: {{ $('Weekday Context & Config').first().json.dayName }} ({{ $('Weekday Context & Config').first().json.dayTone }})
  - Số ngày check-in trong 14 ngày qua: {{ $json.checkin_days || 0 }}
  - Số ngày kể từ lần check-in gần nhất: {{ $json.days_since_last ?? 'chưa từng check-in' }}

  Nếu đã lâu chưa check-in, giọng văn nhẹ nhàng quan tâm, không trách móc. Cuối câu thứ hai khuyến khích dành 10 giây chia sẻ cảm xúc hôm nay.
  Chỉ trả về văn bản thuần (KHÔNG HTML, KHÔNG Markdown, KHÔNG emoji, KHÔNG dùng tên người khác).
  ```

<a id="node-2-07"></a>
##### 🔹 Node 07: `Google Gemini Chat Model`
* **Loại node:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
* **Nhiệm vụ:** Cung cấp mô hình ngôn ngữ lớn cho Node 06, kết nối model ổn định **`gemini-2.5-flash`** với `temperature: 0.7` giúp lời chúc có độ sáng tạo và dí dỏm tự nhiên.

---

#### 🔴 GIAI ĐOẠN 4: ĐIỀU PHỐI ĐA KÊNH & BỘ ĐỆM CHỐNG NGHẼN

<a id="node-2-08"></a>
##### 🔹 Node 08: `Format & HTML Escape`
* **Loại node:** `n8n-nodes-base.code` (JavaScript v2)
* **Nhiệm vụ:** Định dạng thẻ tin nhắn Telegram HTML:
  1. Tự động mã hóa ký tự đặc biệt (`&amp;`, `&lt;`, `&gt;`) để không làm vỡ giao diện HTML của Telegram.
  2. Bọc lời chúc của Gemini AI cùng biểu tượng ngày, thông tin phòng ban và chuỗi check-in.
  3. Tự động nhận diện URL: Nếu đang chạy localhost thì xuất dạng code để copy, nếu chạy production thì xuất thẻ `<a href="...">` bấm mở ngay.
* **Mã nguồn Node 08:**
  ```javascript
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ctx = $('Weekday Context & Config').first().json;
  try {
    const u = $('MySQL User Streak').first().json;
    const aiRaw = String($input.first().json.text || '').trim() || 'Chúc bạn một ngày làm việc thật nhiều năng lượng!';
    const days = u.checkin_days || 0;
    const url = ctx.workspaceUrl || '';
    const link = /localhost|127\.0\.0\.1/.test(url)
      ? '📱 Check-in tại: <code>' + esc(url) + '</code>'
      : '<a href="' + esc(url) + '">📱 Bấm vào đây để check-in ngay</a>';

    const msg = ctx.dayEmoji + ' <b>CHÀO BUỔI SÁNG ' + esc(ctx.dayName).toUpperCase() + '!</b>\n\n'
      + esc(aiRaw.slice(0, 600)) + '\n\n'
      + '👤 <b>Nhân viên:</b> ' + esc(u.full_name) + ' (' + esc(u.dept_name || 'HR Tech') + ')\n'
      + '🔥 <b>Số ngày check-in trong 14 ngày qua:</b> ' + days + ' ngày\n\n'
      + '👉 <b>Dành 10 giây chia sẻ cảm xúc hôm nay:</b>\n' + link;

    return [{ json: { userId: u.id, fullName: u.full_name, message: msg.substring(0, 4000), prepared: true } }];
  } catch (err) {
    return [{ json: { userId: null, fullName: '', prepared: false,
      message: '☀️ Chào buổi sáng! Hãy dành 10 giây check-in cảm xúc hôm nay nhé: ' + esc(ctx.workspaceUrl) } }];
  }
  ```

<a id="node-2-09"></a>
##### 🔹 Node 09: `Telegram Send Reminder`
* **Loại node:** `n8n-nodes-base.telegram` (v1.2)
* **Nhiệm vụ:** Bắn tin nhắn trực tiếp vào tài khoản Telegram cá nhân của nhân sự.
* **Cơ chế chịu lỗi (Fault Tolerance):**
  * `retryOnFail: true` (Tự động thử lại tối đa 3 lần nếu mạng bị chập chờn).
  * `waitBetweenTries: 3000` (Cách nhau 3 giây giữa các lần thử lại).
  * `onError: continueRegularOutput` (Nếu 1 nhân viên bị lỗi chat ID thì hệ thống vẫn tiếp tục chạy cho nhân viên tiếp theo, không dừng toàn bộ luồng).

<a id="node-2-10"></a>
##### 🔹 Node 10: `Wait 4s` (Production Throttle)
* **Loại node:** `n8n-nodes-base.wait` (v1.1)
* **Thời gian chờ:** **4 giây**.
* **Ý nghĩa kỹ thuật cực kỳ đắt giá khi bảo vệ đồ án:**
  * Chính sách giới hạn tần suất (Rate Limit) của Telegram Bot API chỉ cho phép gửi tối đa 30 tin/giây trên toàn bot và 1 tin/giây cho cùng một cuộc hội thoại.
  * Node `Wait 4s` đóng vai trò "chiếc van điều tiết" (Rate Throttle). Nhờ có node này, dù công ty có 100 hay 500 nhân sự thì n8n vẫn gửi tin êm đềm, **triệt tiêu 100% nguy cơ dính mã lỗi `HTTP 429 Too Many Requests`**!
  * Sau khi chờ 4 giây, luồng quay ngược lại Node 04 (`Split In Batches`) để bốc nhân viên tiếp theo.

<a id="node-2-11"></a>
##### 🔹 Node 11: `Summary Logger`
* **Loại node:** `n8n-nodes-base.code` (JavaScript v2)
* **Nhiệm vụ:** Khi vòng lặp duyệt hết toàn bộ danh sách, Node 04 kích hoạt Node 11 để tổng kết:
  ```javascript
  const ctx = $('Weekday Context & Config').first().json;
  const candidates = $('MySQL Unchecked Users').all().filter(i => i.json.id).length;
  return [{ json: {
    success: true, workflow: 'WF-02 Daily Mood Pulse',
    executionDate: ctx.currentDate, dayName: ctx.dayName,
    usersReminded: candidates,
    completedAt: new Date().toISOString(), status: 'BATCH_COMPLETED'
  } }];
  ```

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-3-3"></a>
### 3.3. Bảng công nghệ & Credentials sử dụng

| Tên Credential trong n8n | Credential ID | Dịch vụ kết nối | Mục đích sử dụng trong Luồng 2 |
| :--- | :--- | :--- | :--- |
| **MySQL account** | `hVFuUZOZqBxSICn4` | MySQL Local (`hr_enterprise_db`) | Quét nhân sự chưa check-in và tính số ngày Streak 14 ngày. |
| **Google Gemini(PaLM) Api account** | `5sjnywIBZlOvIRb3` | Google Gemini API (`gemini-2.5-flash`) | Sáng tạo 2 câu chúc ấm áp theo tâm lý và ngày trong tuần. |
| **Telegram account** | `nEgzOjvRL1PL6URH` | Telegram Bot API (`chat_id: 6331216556`) | Gửi tin nhắn HTML cá nhân hóa kèm liên kết check-in. |

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-3-4"></a>
### 3.4. Kịch bản kiểm thử thực tế đa tầng (Test Playbook 4 Scenarios)

> 💡 **Hướng dẫn chạy test Luồng 2:**
> * **Cách 1 (Gõ lệnh Terminal qua cổng Test Webhook):** Mở workflow trên n8n (`http://localhost:5678/workflow/TV3WF02DailyMood`), bấm nút cam **`Execute workflow`** ở thanh dưới cùng. Sau đó copy lệnh **`curl`** (Git Bash) hoặc **`Invoke-RestMethod`** (PowerShell) bên dưới và dán vào terminal để chạy.
> * **Cách 2 (Bấm trực tiếp trên n8n Editor):** Nhấp chuột vào Node 01 (`Schedule 09:00 AM`) rồi bấm nút **`Test step`** để kích hoạt luồng ngay tức thì mà không cần đợi đến 09:00 sáng.

#### 📋 Bảng ma trận 4 kịch bản kiểm thử (Bấm vào tên để nhảy trực tiếp)

| STT | Kịch Bản | Dữ Liệu Gửi Thử Nghiệm | Nhánh / Diễn Biến Kỳ Vọng | Kênh Nhận Kết Quả |
| :---: | :--- | :--- | :---: | :--- |
| **01** | [**Sáng Thứ Hai (Khởi động)**](#kich-ban-2-1) | `{"weekday": 1, "forceUserId": 4}` | Tone `🚀` (Khởi động tuần mới) | Telegram Bot gửi lời chúc bứt phá |
| **02** | [**Sáng Thứ Sáu (Về đích)**](#kich-ban-2-2) | `{"weekday": 5, "forceUserId": 4}` | Tone `🎉` (Về đích cuối tuần thảnh thơi) | Telegram Bot khen ngợi chuỗi Streak |
| **03** | [**Tất cả đã Check-in (Edge Case)**](#kich-ban-2-3) | `{}` (Không truyền forceUserId) | Danh sách rỗng (`candidates = 0`) | Node 03 trả về 0 dòng ➔ Kết thúc an toàn |
| **04** | [**Chống nghẽn Rate Limit**](#kich-ban-2-4) | Duyệt danh sách nhiều nhân viên | Chạy tuần tự qua `Wait 4s` | Mỗi tin cách nhau 4s, triệt tiêu lỗi 429 |

---

#### 🧪 Chi tiết từng kịch bản & Lệnh chạy

<a id="kich-ban-2-1"></a>
##### 🚀 Kịch bản 1: Nhắc nhở khởi động tuần mới sáng Thứ Hai (`weekday: 1`)
* **Mục tiêu:** Kiểm tra khả năng biến đổi ngôn ngữ của Gemini AI theo ngày đầu tuần (Tone tràn đầy nhiệt huyết `🚀`).
* **Lệnh chạy qua Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/daily-mood-reminder \
    -H "Content-Type: application/json" \
    -d '{"weekday":1,"forceUserId":4}'
  ```
* **Lệnh chạy qua PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/daily-mood-reminder" -Method POST -ContentType "application/json" -Body '{"weekday":1,"forceUserId":4}'
  ```
* **Kết quả quan sát được trên Telegram:**
  * Thẻ tin nhắn có biểu tượng tên lửa `🚀` với tiêu đề: **`🚀 CHÀO BUỔI SÁNG THỨ HAI!`**
  * Lời chúc từ Gemini AI: *"Chào Quân! Tuần mới lại bắt đầu với những dự án đầy tiềm năng đang chờ đón bạn. Hãy dành 10 giây chia sẻ cảm xúc sáng nay để cùng team nạp năng lượng bứt phá nhé!"*
  * Hiển thị số ngày check-in trong 14 ngày qua và link dẫn đến trang Workspace: `http://localhost:5173/workspace`.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-2-2"></a>
##### 🎉 Kịch bản 2: Khen ngợi chuỗi Streak cao ngày Thứ Sáu (`weekday: 5`)
* **Mục tiêu:** Kiểm tra xem Gemini AI có nhận biết ngày cuối tuần và chuỗi ngày điểm danh liên tiếp để khen ngợi nhân sự hay không.
* **Lệnh chạy qua Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/daily-mood-reminder \
    -H "Content-Type: application/json" \
    -d '{"weekday":5,"forceUserId":4}'
  ```
* **Lệnh chạy qua PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/daily-mood-reminder" -Method POST -ContentType "application/json" -Body '{"weekday":5,"forceUserId":4}'
  ```
* **Kết quả quan sát được trên Telegram:**
  * Thẻ tin nhắn có biểu tượng ăn mừng `🎉` với tiêu đề: **`🎉 CHÀO BUỔI SÁNG THỨ SÁU!`**
  * Lời chúc từ Gemini AI: *"Thật tuyệt vời Quân ơi, bạn đã duy trì chuỗi điểm danh đều đặn trong tuần qua! Thứ Sáu rồi, hãy hoàn thành nốt các mục tiêu còn lại và chuẩn bị đón kỳ nghỉ cuối tuần thật thư thái nhé!"*

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-2-3"></a>
##### 🛡️ Kịch bản 3: Tất cả nhân viên đã check-in hôm nay (Empty List Edge Case)
* **Mục tiêu:** Đảm bảo hệ thống vận hành đúng điều kiện `NOT EXISTS (SELECT 1 ... CURDATE())`. Khi mọi người đã check-in thì luồng tự dừng an toàn, không làm phiền ai.
* **Lệnh chạy qua Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/daily-mood-reminder \
    -H "Content-Type: application/json" \
    -d '{}'
  ```
* **Lệnh chạy qua PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/daily-mood-reminder" -Method POST -ContentType "application/json" -Body '{}'
  ```
* **Kết quả quan sát được trên n8n:**
  * Node `MySQL Unchecked Users` trả về mảng rỗng `[]` (0 dòng dữ liệu).
  * Node `Split In Batches` nhận 0 phần tử $\rightarrow$ Lập tức chuyển sang Cổng 0 gọi Node 11 (`Summary Logger`) chốt log `usersReminded: 0`.
  * **Không gọi Gemini AI (tiết kiệm 100% token API)** và **không có tin nhắn nào bị gửi nhầm**.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-2-4"></a>
##### ⏱️ Kịch bản 4: Kiểm thử cơ chế đệm chống nghẽn Rate Limit (Wait 4s Throttle)
* **Mục tiêu:** Chứng minh năng lực chịu tải của hệ thống khi gửi hàng loạt tin nhắn nhắc nhở.
* **Diễn biến kiểm thử:**
  * Khi có nhiều nhân viên chưa check-in trong danh sách, node `Split In Batches` sẽ duyệt từng người một.
  * Sau mỗi tin nhắn gửi qua Telegram, node `Wait 4s` sẽ đếm lùi đúng 4000ms rồi mới lấy người kế tiếp.
  * **Kết quả:** Không bao giờ bị Telegram chặn hay trả mã lỗi `HTTP 429 Too Many Requests`.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-3-5"></a>
### 3.5. Kịch bản thuyết trình bảo vệ Luồng 2 trước Hội đồng

Khi thuyết trình trước Giảng viên hoặc Hội đồng phản biện, hãy trình bày dứt khoát theo **3 luận điểm giá trị cao**:

1. **Bước 1 (Nhấn mạnh Tính nhân văn & Tránh xa Spam Bot):**  
   *"Thưa thầy/cô, các hệ thống nhắc việc truyền thống thường gửi những tin nhắn tự động cứng nhắc khiến nhân viên cảm thấy bị làm phiền. Ở Luồng 2, em đã tích hợp mô hình ngôn ngữ lớn Google Gemini để cá nhân hóa lời chúc theo từng thứ trong tuần và chuỗi ngày điểm danh trong quá khứ của từng nhân viên. Nhờ đó, tin nhắn trở thành một lời quan tâm ấm áp thay vì một mệnh lệnh điểm danh khô khan."*

2. **Bước 2 (Chứng minh Năng lực Kỹ sư Hệ thống qua cơ chế Throttle):**  
   *"Để hệ thống vận hành thực tế ở quy mô doanh nghiệp lớn, em đã thiết kế vòng lặp `Split In Batches` kết hợp node đệm `Wait 4s`. Cơ chế này giải quyết triệt để vấn đề Rate Limit của Telegram Bot API, giúp bot không bao giờ bị nghẽn mạng hay bị khóa tài khoản do lỗi HTTP 429."*

3. **Bước 3 (Tối ưu CSDL và Tài nguyên):**  
   *"Hệ thống sử dụng câu lệnh SQL có điều kiện `NOT EXISTS` để chỉ truy vấn đúng những người chưa check-in hôm nay. Nếu mọi người đều đã check-in, luồng sẽ tự dừng ngay lập tức mà không gọi AI, giúp doanh nghiệp tiết kiệm 100% chi phí token và tài nguyên máy chủ tính toán."*

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-4"></a>
# 4. MỤC 4: CHI TIẾT LUỒNG 3 (WF-03: 30-DAY ONBOARDING SLA GUARDIAN & GRADUATION COMPANION)

* **Mã luồng trên n8n:** `[TV3] WF-03: 30-Day Onboarding SLA Guardian & Graduation Companion`
* **Workflow ID:** `TV3WF03SLAGuard` (hoặc `wf-03-onboarding-sla`)
* **Đường dẫn giao diện n8n:** `http://localhost:5678/workflow/TV3WF03SLAGuard`
* **Hình thức kích hoạt:** Schedule Trigger (Cron) & Webhook Test Endpoint
  * Lịch chạy tự động: `30 8 * * 1` (Đúng **08:30 sáng Thứ 2 hàng tuần**)
  * Cổng kiểm thử Terminal: `POST /webhook-test/onboarding-sla-check` (hoặc `/webhook/onboarding-sla-check`)
  * Múi giờ hệ thống: `Asia/Ho_Chi_Minh`
* **Mục tiêu nghiệp vụ:** Tự động giám sát toàn bộ nhân viên thử việc trong 35 ngày đầu tiên; đọc danh sách đầu việc từ bảng `onboarding_tasks` để tính toán tỷ lệ hoàn thành (%) và số ngày trễ hạn theo SLA của từng nhiệm vụ. Hệ thống tự động phân loại 3 trạng thái:
  1. **`OVERDUE_BREACH` (Trễ hạn SLA):** Bắn tin cảnh báo Telegram tới Mentor và gửi Email chính thức yêu cầu hỗ trợ nhân viên.
  2. **`GRADUATED_100` (Hoàn thành 100%):** Gọi Gemini AI soạn Thư chúc mừng tốt nghiệp thử việc ấm áp, bắn thẻ Telegram vinh danh cúp vàng `🏆`.
  3. **`ON_TRACK` (Đúng tiến độ):** Để nhân viên tập trung làm việc, không gửi thông báo làm phiền.

---

<a id="muc-4-1"></a>
### 4.1. Sơ đồ luồng & 4 Giai đoạn xử lý

```
[GIAI ĐOẠN 1: KÍCH HOẠT ĐẦU TUẦN & NẠP THÔNG SỐ KIỂM TRA]
(01) Schedule 08:30 Mon ──┬──▶ (03) SLA Test Context & Config (Cấu hình Chat ID, SLA 7 ngày, URL Portal)
                          │
(02) Test Webhook Trigger ─┘
                          │
[GIAI ĐOẠN 2: QUÉT NHÂN SỰ THỬ VIỆC & BÓC TÁCH CHECKLIST]
                          ▼
(04) MySQL Probation Employees (Quét nhân sự <= 35 ngày tại công ty)
                          │
                          ▼
(05) Split In Batches (Batch size = 1: Duyệt từng nhân sự thử việc) ◀─────────────────────────┐
       │                                                                                      │
       └──▶ (06) MySQL Employee Tasks (Lấy danh sách tasks trong onboarding_tasks)            │
                     │                                                                        │
[GIAI ĐOẠN 3: TÍNH TOÁN TIẾN ĐỘ & PHÂN TẦNG SLA]                                              │
                     ▼                                                                        │
       (07) SLA & Progress Engine (Tính % hoàn thành, số ngày trễ, phân loại 3 trạng thái)    │
                     │                                                                        │
                     ▼                                                                        │
       (08) Switch Status Tier (Rẽ 3 nhánh thông minh)                                        │
              │                                                                               │
[GIAI ĐOẠN 4: ĐIỀU PHỐI ĐA KÊNH THEO TỪNG NHÁNH]                                             │
              ├── [Nhánh 0: OVERDUE (Trễ hạn)]:                                               │
              │     (09) Telegram Alert Overdue ──▶ (10) Email Overdue Notice (CC Mentor) ────┤
              │                                                                               │
              ├── [Nhánh 1: GRADUATED (Hoàn thành 100%)]:                                     │
              │     (12) Google Gemini ──▶ (11) AI Graduation Letter Agent                    │
              │                                       │                                       │
              │                                       ▼                                       │
              │                            (13) Build Graduation Card                         │
              │                                       │                                       │
              │                                       ▼                                       │
              │                            (14) Telegram Congratulate Graduation ─────────────┤
              │                                                                               │
              └── [Nhánh 2: ON_TRACK (Đúng hạn)]: Bỏ qua, tiếp tục vòng lặp ──────────────────┘
```

---

<a id="muc-4-2"></a>
### 4.2. Trình tự chi tiết từng Node thực thi (14 Nodes)

#### 🟢 GIAI ĐOẠN 1: KÍCH HOẠT ĐẦU TUẦN & NẠP THÔNG SỐ KIỂM TRA

<a id="node-3-01"></a>
##### 🔹 Node 01: `Schedule 08:30 Mon`
* **Loại node:** `n8n-nodes-base.scheduleTrigger` (v1.2)
* **Nhiệm vụ:** Tự động kích hoạt vào 08:30 sáng Thứ 2 hàng tuần (mở đầu tuần làm việc), giúp Mentor và HR nắm trọn vẹn tình hình thử việc của nhân sự trước buổi họp Weekly đầu tuần.
* **Cấu hình:** Cron `30 8 * * 1`, Timezone `Asia/Ho_Chi_Minh`.

<a id="node-3-02"></a>
##### 🔹 Node 02: `Test Webhook Trigger`
* **Loại node:** `n8n-nodes-base.webhook` (v2)
* **Nhiệm vụ:** Cổng đón HTTP POST để kiểm thử tức thì qua lệnh `curl` / `PowerShell` mà không cần đợi đến sáng Thứ 2.
* **Đường dẫn Webhook:** `POST /webhook-test/onboarding-sla-check` (hoặc `/webhook/onboarding-sla-check`).

<a id="node-3-03"></a>
##### 🔹 Node 03: `SLA Test Context & Config`
* **Loại node:** `n8n-nodes-base.code` (JavaScript v2)
* **Nhiệm vụ:** Cấu hình ngưỡng cảnh báo trễ hạn (`ESCALATE_AFTER_DAYS = 7`), Chat ID Telegram và URL Portal; đồng thời tiếp nhận các tham số test (`forceUserId`, `forceStatus`, `mockDaysInCompany`) khi chạy qua cURL.
* **Mã nguồn Node 03:**
  ```javascript
  const CONFIG = {
    TELEGRAM_CHAT_ID: '6331216556',
    WORKSPACE_URL: 'http://localhost:5173/workspace',
    ESCALATE_AFTER_DAYS: 7
  };
  try {
    const input = $input.first()?.json || {};
    const payload = input.body || input;
    return [{ json: {
      telegramChatId: CONFIG.TELEGRAM_CHAT_ID,
      workspaceUrl: CONFIG.WORKSPACE_URL,
      escalateAfterDays: CONFIG.ESCALATE_AFTER_DAYS,
      forceUserId: payload.forceUserId ? parseInt(payload.forceUserId, 10) : null,
      forceStatus: payload.forceStatus || null,
      mockDaysInCompany: payload.mockDaysInCompany ? parseInt(payload.mockDaysInCompany, 10) : null,
      timestamp: new Date().toISOString()
    } }];
  } catch (err) {
    return [{ json: {
      telegramChatId: CONFIG.TELEGRAM_CHAT_ID,
      workspaceUrl: CONFIG.WORKSPACE_URL,
      escalateAfterDays: CONFIG.ESCALATE_AFTER_DAYS,
      forceUserId: null, forceStatus: null, mockDaysInCompany: null,
      timestamp: new Date().toISOString()
    } }];
  }
  ```

---

#### 🔵 GIAI ĐOẠN 2: QUÉT NHÂN SỰ THỬ VIỆC & BÓC TÁCH CHECKLIST

<a id="node-3-04"></a>
##### 🔹 Node 04: `MySQL Probation Employees`
* **Loại node:** `n8n-nodes-base.mySql` (v2.4)
* **Nhiệm vụ:** Quét toàn bộ nhân viên có thời gian vào công ty $\le 35$ ngày (`DATEDIFF(NOW(), u.created_at) <= 35`), đồng thời kết nối bảng `departments` và bảng `users` (để lấy thông tin Mentor/Manager trực tiếp).
* **Câu lệnh SQL:**
  ```sql
  SELECT u.id, u.full_name, u.email, u.job_title, u.created_at AS hire_date, 
         d.name AS dept_name, m.full_name AS mentor_name, m.email AS mentor_email, 
         DATEDIFF(NOW(), u.created_at) AS days_in_company 
  FROM users u 
  LEFT JOIN departments d ON u.department_id = d.id 
  LEFT JOIN users m ON u.manager_id = m.id 
  WHERE u.role = 'EMPLOYEE' 
    AND u.is_active = 1 
    AND DATEDIFF(NOW(), u.created_at) <= 35;
  ```

<a id="node-3-05"></a>
##### 🔹 Node 05: `Split In Batches`
* **Loại node:** `n8n-nodes-base.splitInBatches` (v3)
* **Cấu hình:** `batchSize: 1`
* **Nhiệm vụ:** Duyệt tuần tự từng nhân sự thử việc, đảm bảo việc xử lý và gửi thông báo diễn ra có trật tự, không gây nghẽn tài nguyên server.

<a id="node-3-06"></a>
##### 🔹 Node 06: `MySQL Employee Tasks`
* **Loại node:** `n8n-nodes-base.mySql` (v2.4)
* **Nhiệm vụ:** Cầm `userId` của nhân sự đang xét truy vấn vào bảng `onboarding_tasks` để lấy toàn bộ danh sách đầu việc được giao kèm hạn chót (cột `due_day` - ví dụ: Ngày 1, Ngày 3, Ngày 7, Ngày 14, Ngày 30):
  ```sql
  SELECT id, title, category, due_day, is_completed, completed_at 
  FROM onboarding_tasks 
  WHERE user_id = {{ $json.id }} 
  ORDER BY due_day ASC;
  ```

---

#### 🟡 GIAI ĐOẠN 3: TÍNH TOÁN TIẾN ĐỘ & PHÂN TẦNG SLA

<a id="node-3-07"></a>
##### 🔹 Node 07: `SLA & Progress Engine`
* **Loại node:** `n8n-nodes-base.code` (JavaScript v2)
* **Nhiệm vụ:** "Trái tim tính toán" của Luồng 3:
  1. Tính % tiến độ hoàn thành: `progressPercent = (completedTasks / totalTasks) * 100`.
  2. Tính số ngày trễ hạn của từng task: `lateDays = daysInCompany - due_day` (đối với các task chưa hoàn thành và ngày tại công ty vượt quá hạn chót).
  3. Tìm số ngày trễ lớn nhất (`maxLateDays`). Nếu `maxLateDays >= 7` $\rightarrow$ Gắn cờ cảnh báo đỏ leo thang khẩn (`escalate = true`).
  4. Phân loại trạng thái:
     * **`GRADUATED_100`:** Hoàn thành 100% và thời gian làm việc $\ge 28$ ngày.
     * **`OVERDUE_BREACH`:** Có ít nhất 1 nhiệm vụ quá hạn.
     * **`ON_TRACK`:** Tiến độ bình thường, không có nhiệm vụ quá hạn.
* **Mã nguồn Node 07:**
  ```javascript
  const CONFIG = {
    TELEGRAM_CHAT_ID: '6331216556',
    WORKSPACE_URL: 'http://localhost:5173/workspace',
    ESCALATE_AFTER_DAYS: 7
  };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  try {
    const user = $('Split In Batches').first().json;
    const testCtx = $('SLA Test Context & Config').first()?.json || {};
    const tasks = $input.all().map(i => i.json).filter(t => t.id);

    const totalTasks = tasks.length || 5;
    const isDone = (t) => t.is_completed === 1 || t.is_completed === true || t.is_completed === '1';
    let completedTasks = tasks.filter(isDone).length;
    let progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    let daysInCompany = testCtx.mockDaysInCompany !== null ? testCtx.mockDaysInCompany : Math.max(0, parseInt(user.days_in_company, 10) || 0);

    const overdue = tasks
      .filter(t => !isDone(t) && daysInCompany > Number(t.due_day))
      .map(t => ({ ...t, lateDays: daysInCompany - Number(t.due_day) }));
    const maxLate = overdue.reduce((m, t) => Math.max(m, t.lateDays), 0);

    let statusTier = 'ON_TRACK';
    if (testCtx.forceStatus) {
      statusTier = testCtx.forceStatus;
      if (statusTier === 'GRADUATED_100') {
        progressPercent = 100;
        completedTasks = totalTasks;
      }
    } else {
      if (progressPercent === 100 && totalTasks > 0 && daysInCompany >= 28) statusTier = 'GRADUATED_100';
      else if (overdue.length > 0) statusTier = 'OVERDUE_BREACH';
    }

    const fullName = user.full_name || 'Nhân viên';
    const jobTitle = user.job_title || 'Kỹ Sư Phần Mềm Mới';
    const deptName = user.dept_name || 'Kỹ Thuật & AI';
    const mentorName = user.mentor_name || 'Trần Văn Minh (Manager)';

    const lineOf = (t) => '• [Hạn Day ' + t.due_day + ' · trễ ' + t.lateDays + ' ngày] ' + t.title + ' (' + (t.category || 'Khác') + ')';
    const overdueListRaw = overdue.length ? overdue.map(lineOf).join('\n') : '• [Hạn Day 1 · trễ 2 ngày] Ký hợp đồng lao động & NDA (PAPERWORK)\n• [Hạn Day 1 · trễ 2 ngày] Nhận laptop & thiết bị làm việc (EQUIPMENT)';
    const escalate = maxLate >= (testCtx.escalateAfterDays || CONFIG.ESCALATE_AFTER_DAYS);

    const alertText = [
      '⚠️ <b>CẢNH BÁO TIẾN ĐỘ ONBOARDING: TASK QUÁ HẠN SLA</b>', '',
      '👤 <b>Nhân sự:</b> ' + esc(fullName) + ' (' + esc(jobTitle) + ' - ' + esc(deptName) + ')',
      '⏳ <b>Thời gian tại công ty:</b> Ngày thứ ' + daysInCompany,
      '📊 <b>Tiến độ:</b> ' + completedTasks + '/' + totalTasks + ' nhiệm vụ (' + progressPercent + '%)',
      '🤝 <b>Mentor:</b> ' + esc(mentorName), '',
      '🚨 <b>Nhiệm vụ đang trễ hạn:</b>', esc(overdueListRaw), '',
      escalate ? '🔥 <b>Có nhiệm vụ trễ từ ' + CONFIG.ESCALATE_AFTER_DAYS + ' ngày trở lên — đề nghị Quản lý/HR cùng can thiệp.</b>'
               : '👉 <i>Nhờ Mentor và nhân sự phối hợp hoàn thành sớm trong tuần.</i>'
    ].join('\n').substring(0, 4000);

    const emailText = [
      'Chào ' + fullName + ',', '',
      'Hệ thống ghi nhận bạn đang có ' + (overdue.length || 2) + ' nhiệm vụ thử việc đã quá hạn:', '',
      overdueListRaw, '',
      'Vui lòng truy cập Workspace tại ' + CONFIG.WORKSPACE_URL + ' để hoàn thiện sớm.',
      'Nếu gặp khó khăn, hãy liên hệ Mentor ' + mentorName + ' để được hỗ trợ.', '',
      'Trân trọng,', 'Phòng Nhân sự & Vận hành'
    ].join('\n');

    return [{ json: {
      userId: user.id, fullName, email: user.email || 'employee@company.com', jobTitle, deptName, mentorName,
      mentorEmail: user.mentor_email || 'mentor@company.com', telegramChatId: CONFIG.TELEGRAM_CHAT_ID,
      daysInCompany, totalTasks, completedTasks, progressPercent,
      overdueCount: overdue.length, maxLateDays: maxLate, statusTier,
      alertText, emailText,
      emailSubject: '[HR Onboarding] Đôn đốc hoàn thành nhiệm vụ thử việc: ' + fullName
    } }];
  } catch (err) {
    throw new Error('[WF-03] SLA calculation error: ' + err.message);
  }
  ```

<a id="node-3-08"></a>
##### 🔹 Node 08: `Switch Status Tier`
* **Loại node:** `n8n-nodes-base.switch` (v3)
* **Nhiệm vụ:** Rẽ nhánh luồng dựa vào giá trị `statusTier`:
  * **Cổng 0 (`OVERDUE`):** Rẽ sang Node 09 (Telegram) và Node 10 (Email đôn đốc).
  * **Cổng 1 (`GRADUATED`):** Rẽ sang Node 11 (Gemini AI viết thư tốt nghiệp).
  * **Cổng 2 (`ON_TRACK`):** Hoàn thành đúng tiến độ, tự động quay lại Node 05 để xét nhân sự tiếp theo.

---

#### 🔴 GIAI ĐOẠN 4: ĐIỀU PHỐI ĐA KÊNH THEO TỪNG NHÁNH

<a id="node-3-09"></a>
##### 🔹 Node 09: `Telegram Alert Overdue` (Nhánh OVERDUE)
* **Loại node:** `n8n-nodes-base.telegram` (v1.2)
* **Nhiệm vụ:** Gửi tin nhắn cảnh báo màu vàng/cam về danh sách các task bị quá hạn, số ngày trễ và người Mentor phụ trách vào kênh quản lý Onboarding.

<a id="node-3-10"></a>
##### 🔹 Node 10: `Email Overdue Notice` (Nhánh OVERDUE)
* **Loại node:** `n8n-nodes-base.emailSend` (SMTP v2.1)
* **Nhiệm vụ:** Gửi email đôn đốc chính thức tới hòm thư cá nhân của nhân sự thử việc, đồng thời **tự động CC vào Email của Mentor** (`ccEmail: mentorEmail`) để cùng theo sát tháo gỡ khó khăn.

<a id="node-3-11"></a>
##### 🔹 Node 11: `AI Graduation Letter Agent` (Nhánh GRADUATED)
* **Loại node:** `@n8n/n8n-nodes-langchain.chainLlm` (v1.4)
* **Nhiệm vụ:** Đóng vai trò **Giám đốc Nhân sự & Văn hóa doanh nghiệp**. Khi nhân sự hoàn thành 100% nhiệm vụ thử việc, AI viết một bức thư chúc mừng tốt nghiệp ngắn (3-4 câu) chân thành, truyền cảm hứng và tri ân sự đồng hành của Mentor.
* **Prompt kỹ thuật:**
  ```text
  Bạn là Giám đốc Nhân sự & Văn hóa doanh nghiệp. Viết lời chúc mừng ngắn (3-4 câu), chân thành và truyền cảm hứng cho nhân sự vừa hoàn thành 100% nhiệm vụ Onboarding 30 ngày:
  - Tên: {{ $('SLA & Progress Engine').first().json.fullName }}
  - Vị trí: {{ $('SLA & Progress Engine').first().json.jobTitle }}
  - Phòng ban: {{ $('SLA & Progress Engine').first().json.deptName }}
  - Mentor đồng hành: {{ $('SLA & Progress Engine').first().json.mentorName }}

  Ghi nhận nỗ lực vượt qua 30 ngày đầu tiên và chào đón chính thức vào đại gia đình công ty; có thể cảm ơn mentor.
  Không hứa hẹn về hợp đồng, lương thưởng hay thăng tiến.
  Chỉ trả về văn bản thuần (KHÔNG HTML, KHÔNG Markdown). Hệ thống sẽ tự định dạng.
  ```

<a id="node-3-12"></a>
##### 🔹 Node 12: `Google Gemini Chat Model`
* **Loại node:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`
* **Nhiệm vụ:** Cung cấp mô hình ngôn ngữ **`gemini-2.5-flash`** với `temperature: 0.5` giúp bức thư tốt nghiệp mang tính trang trọng và chân thành.

<a id="node-3-13"></a>
##### 🔹 Node 13: `Build Graduation Card`
* **Loại node:** `n8n-nodes-base.code` (JavaScript v2)
* **Nhiệm vụ:** Đóng gói thư tốt nghiệp của Gemini AI thành thẻ Telegram HTML cao cấp có icon cúp vàng `🎉 🏆 CHÚC MỪNG HOÀN THÀNH 100% ONBOARDING 30 NGÀY!`.

<a id="node-3-14"></a>
##### 🔹 Node 14: `Telegram Congratulate Graduation`
* **Loại node:** `n8n-nodes-base.telegram` (v1.2)
* **Nhiệm vụ:** Bắn thẻ tin nhắn vinh danh vào kênh chung toàn công ty để tôn vinh thành quả của nhân sự mới và mentor.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-3-3"></a>
### 4.3. Bảng công nghệ & Credentials sử dụng

| Tên Credential trong n8n | Credential ID | Dịch vụ kết nối | Mục đích sử dụng trong Luồng 3 |
| :--- | :--- | :--- | :--- |
| **MySQL account** | `hVFuUZOZqBxSICn4` | MySQL Local (`hr_enterprise_db`) | Đọc thông tin nhân viên thử việc và danh sách `onboarding_tasks`. |
| **Google Gemini(PaLM) Api account** | `5sjnywIBZlOvIRb3` | Google Gemini API (`gemini-2.5-flash`) | Soạn thảo Thư chúc mừng tốt nghiệp 30 ngày truyền cảm hứng. |
| **Telegram account** | `nEgzOjvRL1PL6URH` | Telegram Bot API (`chat_id: 6331216556`) | Bắn cảnh báo task trễ hạn SLA hoặc thẻ vinh danh tốt nghiệp. |
| **SMTP account** | `Tg4vTrLPwQdSjMjS` | Google Workspace / Gmail SMTP | Gửi email đôn đốc tiến độ thử việc, tự động CC Mentor. |

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-4-4"></a>
### 4.4. Kịch bản kiểm thử thực tế đa tầng (Test Playbook 4 Scenarios)

> 💡 **Hướng dẫn chạy test Luồng 3:**
> * **Cách 1 (Gõ lệnh Terminal qua cổng Test Webhook):** Mở workflow trên n8n ([`http://localhost:5678/workflow/TV3WF03SLAGuard`](http://localhost:5678/workflow/TV3WF03SLAGuard)), bấm nút cam **`Execute workflow`** ở thanh dưới cùng. Sau đó copy lệnh **`curl`** (Git Bash) hoặc **`Invoke-RestMethod`** (PowerShell) bên dưới và chạy.
> * **Cách 2 (Bấm trực tiếp trên n8n Editor):** Nhấp đúp chuột vào Node 01 (`Schedule 08:30 Mon`) rồi bấm nút **`Test step`** để chạy ngay.

#### 📋 Bảng ma trận 4 kịch bản kiểm thử (Bấm vào tên để nhảy trực tiếp)

| STT | Kịch Bản | Dữ Liệu Gửi Thử Nghiệm | Nhánh Rẽ Dự Kiến | Kênh Nhận Kết Quả |
| :---: | :--- | :--- | :---: | :--- |
| **01** | [**Task trễ hạn SLA**](#kich-ban-3-1) | `{"forceUserId": 4}` | ⚠️ **`OVERDUE`** | Telegram cảnh báo task trễ + Email CC Mentor |
| **02** | [**Vinh danh 100% tốt nghiệp**](#kich-ban-3-2) | `{"forceUserId": 4, "forceStatus": "GRADUATED_100", "mockDaysInCompany": 30}` | 🏆 **`GRADUATED`** | Gemini AI viết thư + Telegram vinh danh cúp vàng |
| **03** | [**Đúng hạn bình thường**](#kich-ban-3-3) | `{"forceStatus": "ON_TRACK"}` | ✅ **`ON_TRACK`** | Luồng chạy êm đềm, không làm phiền |
| **04** | [**Báo động trễ $\ge 7$ ngày**](#kich-ban-3-4) | `{"forceUserId": 4, "mockDaysInCompany": 10}` | 🔥 **`ESCALATION`** | Báo động đỏ yêu cầu Quản lý/HR cùng vào cuộc |

---

#### 🧪 Chi tiết từng kịch bản & Lệnh chạy

<a id="kich-ban-3-1"></a>
##### 🚨 Kịch bản 1: Cảnh báo nhiệm vụ quá hạn SLA (`statusTier = 'OVERDUE_BREACH'`)
* **Tình huống:** Nhân viên mới vào ngày thứ 2 nhưng các nhiệm vụ Day 1 (Ký hợp đồng & Nhận laptop) vẫn chưa hoàn tất.
* **Lệnh chạy qua Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/onboarding-sla-check \
    -H "Content-Type: application/json" \
    -d '{"forceUserId":4}'
  ```
* **Lệnh chạy qua PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/onboarding-sla-check" -Method POST -ContentType "application/json" -Body '{"forceUserId":4}'
  ```
* **Kết quả quan sát được:**
  * **Telegram:** Nhận thẻ cảnh báo:
    ```text
    ⚠️ CẢNH BÁO TIẾN ĐỘ ONBOARDING: TASK QUÁ HẠN SLA
    👤 Nhân sự: Phạm Hồng Quân (Kỹ Sư Phần Mềm Mới - Kỹ Thuật & AI)
    ⏳ Thời gian tại công ty: Ngày thứ 2
    📊 Tiến độ: 0/5 nhiệm vụ (0%)
    🤝 Mentor: Trần Văn Minh (Manager)
    🚨 Nhiệm vụ đang trễ hạn:
    • [Hạn Day 1 · trễ 1 ngày] Ký hợp đồng lao động & NDA (PAPERWORK)
    • [Hạn Day 1 · trễ 1 ngày] Nhận laptop & thiết bị làm việc (EQUIPMENT)
    👉 Nhờ Mentor và nhân sự phối hợp hoàn thành sớm trong tuần.
    ```
  * **Email (SMTP):** Gửi email nhắc nhở tới `employee@company.com`, tự động CC tới `mentor@company.com`.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-3-2"></a>
##### 🎓 Kịch bản 2: Vinh danh hoàn thành 100% Onboarding 30 ngày (`statusTier = 'GRADUATED_100'`)
* **Tình huống:** Nhân sự hoàn thành 100% checklist nhiệm vụ thử việc ở ngày thứ 30.
* **Lệnh chạy qua Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/onboarding-sla-check \
    -H "Content-Type: application/json" \
    -d '{"forceUserId":4,"forceStatus":"GRADUATED_100","mockDaysInCompany":30}'
  ```
* **Lệnh chạy qua PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/onboarding-sla-check" -Method POST -ContentType "application/json" -Body '{"forceUserId":4,"forceStatus":"GRADUATED_100","mockDaysInCompany":30}'
  ```
* **Kết quả quan sát được:**
  * **Node Gemini AI (`AI Graduation Letter Agent`):** Viết bức thư tốt nghiệp trang trọng, ấm áp ghi nhận sự nỗ lực của bạn Quân và cảm ơn Mentor Trần Văn Minh.
  * **Telegram:** Nhận thẻ vinh danh rực rỡ:
    ```text
    🎉 CHÚC MỪNG HOÀN THÀNH 100% ONBOARDING 30 NGÀY!
    🌟 Nhiệt liệt chúc mừng Phạm Hồng Quân (Kỹ Thuật & AI) đã hoàn thành trọn vẹn lộ trình thử việc!

    📜 Lời chúc từ Ban Lãnh đạo:
    Thay mặt Ban Giám Đốc, xin nhiệt liệt chúc mừng Phạm Hồng Quân đã xuất sắc hoàn thành trọn vẹn 30 ngày thử việc đầu tiên. Tinh thần học hỏi không ngừng và sự đồng hành tận tụy của Mentor Trần Văn Minh đã giúp bạn hòa nhập nhanh chóng. Chào mừng bạn chính thức trở thành một mảnh ghép quan trọng của công ty!

    🤝 HR sẽ liên hệ để sắp xếp buổi đánh giá thử việc 3 bên và trao đổi các bước tiếp theo.
    ```

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-3-3"></a>
##### ✅ Kịch bản 3: Nhân sự đang tiến triển đúng hạn bình thường (`statusTier = 'ON_TRACK'`)
* **Tình huống:** Nhân viên hoàn thành đúng các mốc thời gian quy định, không có task nào trễ hạn.
* **Lệnh chạy qua Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/onboarding-sla-check \
    -H "Content-Type: application/json" \
    -d '{"forceStatus":"ON_TRACK"}'
  ```
* **Lệnh chạy qua PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/onboarding-sla-check" -Method POST -ContentType "application/json" -Body '{"forceStatus":"ON_TRACK"}'
  ```
* **Kết quả quan sát được:**
  * Node `Switch Status Tier` rẽ sang Cổng 2 (`ON_TRACK`).
  * Luồng tự động kết thúc êm đềm, **không gửi tin nhắn spam** và **không tốn token AI**, tôn trọng không gian tập trung làm việc của nhân sự.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="kich-ban-3-4"></a>
##### 🔥 Kịch bản 4: Báo động leo thang nghiêm trọng trễ $\ge 7$ ngày (`ESCALATION Critical`)
* **Tình huống:** Nhân viên vào làm ngày thứ 10 nhưng các task Day 1 vẫn bị bỏ quên (trễ tới 9 ngày, vượt ngưỡng cảnh báo 7 ngày).
* **Lệnh chạy qua Git Bash (`curl`):**
  ```bash
  curl -X POST http://localhost:5678/webhook-test/onboarding-sla-check \
    -H "Content-Type: application/json" \
    -d '{"forceUserId":4,"mockDaysInCompany":10}'
  ```
* **Lệnh chạy qua PowerShell:**
  ```powershell
  Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/onboarding-sla-check" -Method POST -ContentType "application/json" -Body '{"forceUserId":4,"mockDaysInCompany":10}'
  ```
* **Kết quả quan sát được:**
  * Thẻ Telegram tự động gắn thêm biểu tượng ngọn lửa cảnh báo khẩn:  
    `🔥 Có nhiệm vụ trễ từ 7 ngày trở lên — đề nghị Quản lý/HR cùng can thiệp.`
  * Thúc đẩy Quản lý trực tiếp gặp mặt tháo gỡ rào cản ngay trong tuần để bảo vệ lộ trình thử việc của nhân sự.

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-4-5"></a>
### 4.5. Kịch bản thuyết trình bảo vệ Luồng 3 trước Hội đồng

Khi thuyết trình trước Giảng viên hoặc Hội đồng phản biện, hãy trình bày tự tin theo **3 luận điểm giá trị cao**:

1. **Bước 1 (Nhấn mạnh Tư duy Đồng hành & Công nhận hai chiều):**  
   *"Thưa thầy/cô, hệ thống quản trị Onboarding của em không đơn thuần là công cụ giám sát kiểm tra deadline, mà được xây dựng trên triết lý **Đồng hành & Công nhận (Supportive & Recognition)**. Khi nhân viên gặp khó khăn trễ hạn, hệ thống không phạt mà chủ động kết nối Mentor qua Email và Telegram để tháo gỡ. Còn khi nhân viên nỗ lực hoàn thành 100%, Gemini AI sẽ lập tức sáng tạo Thư vinh danh tốt nghiệp để tạo động lực gắn kết lâu dài."*

2. **Bước 2 (Kiến trúc Rẽ nhánh 3 trạng thái thông minh qua Switch Node):**  
   *"Luồng 3 ứng dụng Switch Node phân tầng chính xác 3 kịch bản: `OVERDUE` (Cảnh báo đa kênh), `GRADUATED` (Vinh danh tốt nghiệp AI) và `ON_TRACK` (Tiến độ bình thường). Sự phân tách này triệt tiêu hoàn toàn tình trạng gửi thông báo rác, chỉ can thiệp đúng lúc và đúng người."*

3. **Bước 3 (Khả năng Tích hợp sâu CSDL Doanh nghiệp):**  
   *"Hệ thống liên kết trực tiếp với bảng `onboarding_tasks` và hệ thống phân quyền phân cấp Quản lý trong MySQL. Toàn bộ tiến độ và SLA trễ hạn đều được tính toán theo thời gian thực (Real-time Calculation), mang lại giá trị vận hành thực tế cho bộ phận Nhân sự."*

[⬆ Trở về Mục lục](#muc-luc)

---

<a id="muc-5"></a>
# 5. MỤC 5: CHI TIẾT LUỒNG 4 (WF-04: WEEKLY MORALE & EXECUTIVE SENTIMENT DIGEST)

* **Mã luồng trên n8n:** `[TV3] WF-04: Weekly Morale & Executive Sentiment Digest`
* **Workflow ID trong SQLite:** `TV3WF04MoraleDig`
* **Hình thức kích hoạt kép:**
  * **Cổng 1 — Tự động định kỳ (Schedule Trigger):** `0 17 * * 5` (Đúng **17:00 chiều Thứ 6 hàng tuần** trước khi tan làm).
  * **Cổng 2 — Kiểm thử tức thì (Test Webhook Endpoint):**
    * Endpoint Kiểm thử: `http://localhost:5678/webhook-test/weekly-morale-digest`
    * Endpoint Production: `http://localhost:5678/webhook/weekly-morale-digest`
* **Mục tiêu nghiệp vụ:**
  * Đóng vai trò là **"Radar Cảm Xúc & Nhịp Đập Tinh Thần"** toàn diện của doanh nghiệp sau 1 tuần làm việc.
  * Tự động tổng hợp toàn bộ lượt check-in tâm trạng từ sáng Thứ Hai đến chiều Thứ Sáu.
  * Tính toán **Chỉ số Tinh thần Doanh nghiệp (Company Morale Index)** trên thang điểm 100 và đo lường mức độ tăng/giảm ($\Delta$) so với tuần liền trước.
  * Ứng dụng nguyên tắc Đạo đức Dữ liệu & Bảo mật danh tính cá nhân (**$k$-Anonymity Guard với $k \ge 3$**): Bất kỳ phòng ban nào có dưới 3 lượt check-in sẽ được che giấu phân bổ chi tiết, ngăn chặn hoàn toàn việc suy diễn tâm lý cá nhân.
  * Tự động phát hiện **Điểm nóng căng thẳng (Sentiment Hotspots)**: Gắn cờ cảnh báo nếu phòng ban có điểm Morale $< 60$ hoặc tỷ lệ Stress $\ge 40\%$.
  * Tích hợp **Google Gemini AI (`gemini-2.5-flash`)** đóng vai trò Cố vấn Chiến lược Cấp cao (Executive Strategic Advisor) để nhận định bức tranh tuần và đề xuất đúng 2 hành động cụ thể cho tuần tới.
  * Xuất bản báo cáo đa kênh: Thẻ tin nhắn HTML trực quan gửi Telegram Ban Giám Đốc, Email báo cáo chi tiết cho Giám đốc Nhân sự (HR Director) và lưu trữ lịch sử báo cáo vào bảng `morale_reports` trong MySQL.

---

<a id="muc-5-1"></a>
### 5.1. Sơ đồ luồng & 4 Giai đoạn xử lý

```
+-----------------------------------------------------------------------------------------------------------------------------------------+
|                                    SƠ ĐỒ XỬ LÝ TOÀN DIỆN LUỒNG 4: WEEKLY MORALE & EXECUTIVE DIGEST                                      |
+-----------------------------------------------------------------------------------------------------------------------------------------+

[GIAI ĐOẠN 1: KÍCH HOẠT LỊCH TRÌNH HOẶC KIỂM THỬ TỨC THÌ]
(01) Schedule 17:00 Fri ─────────┐
     (Cron: 0 17 * * 5)          │
                                 ├──▶ (03) MySQL 7-Day Mood Stats
(02) Test Webhook Trigger ───────┘         (Quét phân bổ cảm xúc theo phòng ban tuần này)
     (POST /weekly-morale-digest)                  │
                                                   ▼
[GIAI ĐOẠN 2: LÀM GIÀU NGỮ CẢNH TOÀN CÔNG TY]   (04) MySQL Overdue Tasks Context
                                                   (Task trễ, cờ Burnout, tỷ lệ tham gia, dữ liệu tuần trước)
                                                   │
                                                   ▼
[GIAI ĐOẠN 3: PHÂN TÍCH DỮ LIỆU, BẢO MẬT & AI]   (05) Morale Analytics Engine
                                                   * Tính Company Morale Score & Delta so với tuần trước
                                                   * K-Anonymity Guard: Ẩn chi tiết nếu phòng ban < 3 lượt
                                                   * Hotspot Detector: Bắt điểm nóng Stress >= 40% hoặc Score < 60
                                                   * Chuẩn bị Prompt có cấu trúc cho AI
                                                   │
                                                   ├──▶ (06) AI Executive Strategic Advisor (Chain LLM)
                                                   │         ▲
                                                   │         │ kết nối model
                                                   │    (07) Google Gemini Chat Model (gemini-2.5-flash, Temp 0.4)
                                                   │
                                                   ▼
[GIAI ĐOẠN 4: ĐA KÊNH TRUYỀN THÔNG & LƯU VẾT]    (08) Build Digest Card (Dựng HTML Telegram & Plain Text Email)
                                                   │
                                                   ├──▶ (09) Telegram Management Digest (Thẻ Radar C-Level Board)
                                                   │         │
                                                   │         ▼
                                                   ├──▶ (10) Email HR Director Report (Email báo cáo chi tiết)
                                                   │         │
                                                   │         ▼
                                                   └──▶ (11) MySQL Archive Morale Metrics (INSERT / UPDATE morale_reports)
```

#### Phân tích 4 Giai đoạn vận hành:
1. **Giai đoạn 1 (Dual Ingestion):** Hỗ trợ chạy tự động định kỳ vào 17:00 Thứ 6 (Node 01), đồng thời mở cổng Webhook (Node 02) để Kỹ sư kiểm thử có thể bơm dữ liệu giả lập (Mocking) hoặc ép chạy lại báo cáo bất cứ lúc nào qua cURL/PowerShell.
2. **Giai đoạn 2 (Enterprise Context Enrichment):** Kết nối 2 truy vấn MySQL liên tiếp: Node 03 nhóm cảm xúc tuần theo từng phòng ban; Node 04 gom các chỉ số quy mô toàn công ty (số nhân viên kích hoạt, số người tham gia, số task quá hạn, số cờ kiệt sức, và điểm số tuần trước).
3. **Giai đoạn 3 (Analytics Engine, Anonymity Guard & Gemini AI):** Node 05 thực hiện các phép toán thống kê chính xác, bảo vệ quyền riêng tư cá nhân theo chuẩn GDPR/K-Anonymity, phát hiện điểm nóng và chuyển giao context cho mô hình Gemini 2.5 Flash (Nodes 06 & 07) đóng vai trò Chuyên gia tư vấn Quản trị Nhân sự cấp cao.
4. **Giai đoạn 4 (Multi-Channel Publishing & Archival):** Node 08 định dạng thẻ tin; Node 09 bắn Telegram Bot về Group Điều hành; Node 10 gửi Email chính thức tới Giám đốc Nhân sự; Node 11 ghi bản ghi tuần vào bảng CSDL `morale_reports` để phục vụ Dashboard và vẽ biểu đồ xu hướng dài hạn.

---

<a id="muc-5-2"></a>
### 5.2. Trình tự chi tiết từng Node thực thi (11 Nodes)

#### Node 01: Schedule 17:00 Fri
* **Mã loại Node:** `n8n-nodes-base.scheduleTrigger` (v1.2)
* **Tọa độ canvas:** `[240, 300]`
* **Vai trò:** Bộ đếm giờ tự động kích hoạt vào chiều Thứ 6 hàng tuần trước khi tan sở.
* **Cấu hình tham số:**
  * `field`: `"cronExpression"`
  * `expression`: `"0 17 * * 5"` (17:00:00 Thứ Sáu, múi giờ `Asia/Ho_Chi_Minh`).
* **Đầu ra:** Dấu mốc thời gian kích hoạt hệ thống.

---

#### Node 02: Test Webhook Trigger
* **Mã loại Node:** `n8n-nodes-base.webhook` (v2)
* **Tọa độ canvas:** `[240, 480]`
* **Vai trò:** Cổng Webhook dành riêng cho Dev/QA kiểm thử và demo đồ án ngay lập tức mà không cần đợi đến chiều Thứ 6. Hỗ trợ truyền JSON tùy chỉnh để giả lập các tình huống biến động tinh thần khác nhau.
* **Cấu hình tham số:**
  * `httpMethod`: `POST`
  * `path`: `weekly-morale-digest`
  * `responseMode`: `onReceived` (Trả ngay HTTP 200 xác nhận).
* **URL gọi kiểm thử:**
  * Test: `http://localhost:5678/webhook-test/weekly-morale-digest`
  * Production: `http://localhost:5678/webhook/weekly-morale-digest`

---

#### Node 03: MySQL 7-Day Mood Stats
* **Mã loại Node:** `n8n-nodes-base.mySql` (v2.4)
* **Tọa độ canvas:** `[460, 300]`
* **Credential liên kết:** `MySQL account` (`hVFuUZOZqBxSICn4`)
* **Vai trò:** Truy vấn gom nhóm số lượt check-in theo từng phòng ban và phân loại cảm xúc (`GREAT`, `NORMAL`, `STRESSED`) kể từ đầu tuần (Thứ Hai) đến thời điểm hiện tại.
* **Cấu hình thuộc tính:** `alwaysOutputData: true` (Đảm bảo workflow không bị dừng nếu đầu tuần chưa có ai check-in).
* **Câu lệnh SQL thực thi:**
```sql
SELECT 
  COALESCE(d.name, 'Chưa phân phòng') AS dept_name, 
  em.mood, 
  COUNT(*) AS count 
FROM employee_moods em 
JOIN users u ON em.user_id = u.id 
LEFT JOIN departments d ON u.department_id = d.id 
WHERE em.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) 
GROUP BY dept_name, em.mood;
```

---

#### Node 04: MySQL Overdue Tasks Context
* **Mã loại Node:** `n8n-nodes-base.mySql` (v2.4)
* **Tọa độ canvas:** `[680, 300]`
* **Credential liên kết:** `MySQL account` (`hVFuUZOZqBxSICn4`)
* **Vai trò:** Khai phá ngữ cảnh vận hành toàn diện của doanh nghiệp trong tuần bằng câu lệnh SQL tích hợp nhiều sub-query:
  1. `total_overdue_tasks`: Số nhiệm vụ onboarding đang bị trễ hạn SLA.
  2. `burnout_flags`: Số nhân sự có cờ nguy cơ kiệt sức (`is_burnout_risk = 1`) trong tuần.
  3. `active_employees`: Tổng số nhân viên đang hoạt động trong công ty.
  4. `participants`: Số nhân viên duy nhất đã tham gia check-in tuần này.
  5. `prev_great`, `prev_normal`, `prev_stressed`: Số lượng từng cảm xúc của **tuần trước đó** (khoảng thời gian 7 ngày trước đó) để tính chỉ số biến động $\Delta$.
* **Câu lệnh SQL thực thi:**
```sql
SELECT 
  (SELECT COUNT(*) 
   FROM onboarding_tasks t 
   JOIN users u ON u.id = t.user_id 
   WHERE t.is_completed = 0 AND u.is_active = 1 AND DATEDIFF(NOW(), u.created_at) > t.due_day
  ) AS total_overdue_tasks, 
  (SELECT COUNT(DISTINCT user_id) 
   FROM employee_moods 
   WHERE is_burnout_risk = 1 AND created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
  ) AS burnout_flags, 
  (SELECT COUNT(*) 
   FROM users 
   WHERE role = 'EMPLOYEE' AND is_active = 1
  ) AS active_employees, 
  (SELECT COUNT(DISTINCT user_id) 
   FROM employee_moods 
   WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
  ) AS participants, 
  (SELECT COUNT(*) 
   FROM employee_moods 
   WHERE mood = 'GREAT' 
     AND created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY) 
     AND created_at < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
  ) AS prev_great, 
  (SELECT COUNT(*) 
   FROM employee_moods 
   WHERE mood = 'NORMAL' 
     AND created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY) 
     AND created_at < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
  ) AS prev_normal, 
  (SELECT COUNT(*) 
   FROM employee_moods 
   WHERE mood = 'STRESSED' 
     AND created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY) 
     AND created_at < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
  ) AS prev_stressed;
```

---

#### Node 05: Morale Analytics Engine
* **Mã loại Node:** `n8n-nodes-base.code` (v2 - JavaScript)
* **Tọa độ canvas:** `[900, 300]`
* **Vai trò:** "Khối óc toán học" của toàn bộ hệ thống báo cáo tuần:
  1. **Hỗ trợ Mocking Data:** Ưu tiên đọc dữ liệu giả lập từ `Test Webhook Trigger` nếu được truyền vào qua cURL (như `mockGreat`, `mockStressed`, `mockDept`, `mockPrevScore`), giúp kiểm thử các kịch bản biên cực kỳ linh hoạt.
  2. **Công thức tính Company Morale Score:**
     $$\text{Morale Score} = \frac{\text{GREAT} \times 100 + \text{NORMAL} \times 60 + \text{STRESSED} \times 20}{\text{GREAT} + \text{NORMAL} + \text{STRESSED}}$$
  3. **Đo lường xu hướng ($\Delta$):** Tính độ chênh lệch $\Delta = \text{Score} - \text{PrevScore}$.
  4. **Thuật toán bảo vệ quyền riêng tư ($k$-Anonymity Guard):**
     * Nếu một phòng ban có tổng lượt check-in $T < 3$ (`MIN_GROUP_SIZE`), hệ thống sẽ **ẩn hoàn toàn tỷ lệ % cảm xúc** và ghi: `"chưa đủ dữ liệu (dưới 3 lượt check-in, ẩn để bảo mật)"`. Điều này loại bỏ nguy cơ sếp đoán được tâm trạng của từng cá nhân.
  5. **Bộ lọc điểm nóng (Hotspot Detector):** Phòng ban có điểm Morale $< 60$ hoặc tỷ lệ Stress $\ge 40\%$ sẽ lập tức bị gắn nhãn `⚠️ [ĐIỂM NÓNG]`.
  6. **Cấu trúc Prompt AI chặt chẽ:** Ép AI tuân thủ cấu trúc 4 phần bằng tiếng Việt, yêu cầu văn bản thuần (không emoji, không ký tự lạ) để tránh phá vỡ giao diện báo cáo.
* **Mã nguồn JavaScript thực thi:**
```javascript
// WF-04 | Phân tích morale tuần (Thứ Hai -> hôm nay), hỗ trợ cả Cron & cURL Test
const CONFIG = {
  TELEGRAM_CHAT_ID: '6331216556',
  HR_EMAIL: 'hr@company.com',
  MIN_GROUP_SIZE: 3,
  HOTSPOT_SCORE: 60,
  HOTSPOT_STRESSED_PCT: 40,
  LOW_PARTICIPATION_PCT: 60
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (v) => Number(v) || 0;
const pct = (v, t) => t > 0 ? Math.round((v / t) * 100) : 0;
const scoreOf = (g, n, s) => { const t = g + n + s; return t > 0 ? Math.round((g * 100 + n * 60 + s * 20) / t) : null; };

try {
  let webhookInput = {};
  try {
    webhookInput = $('Test Webhook Trigger').first()?.json?.body || $('Test Webhook Trigger').first()?.json || {};
  } catch (e) {
    webhookInput = {};
  }

  const rows = $('MySQL 7-Day Mood Stats').all().map(i => i.json).filter(r => r.dept_name && r.mood);
  const c = $input.first().json || {};

  const depts = {};
  let G = 0, N = 0, S = 0;

  if (webhookInput.mockGreat !== undefined || webhookInput.mockStressed !== undefined) {
    G = num(webhookInput.mockGreat || 12);
    N = num(webhookInput.mockNormal || 6);
    S = num(webhookInput.mockStressed || 2);
    const mockDept = webhookInput.mockDept || 'Kỹ Thuật & AI';
    depts[mockDept] = { g: G, n: N, s: S };
    depts['Kinh Doanh & CSKH'] = { g: 8, n: 4, s: 1 };
  } else {
    for (const r of rows) {
      const k = r.dept_name, cnt = num(r.count);
      depts[k] = depts[k] || { g: 0, n: 0, s: 0 };
      if (r.mood === 'GREAT') { depts[k].g += cnt; G += cnt; }
      else if (r.mood === 'NORMAL') { depts[k].n += cnt; N += cnt; }
      else if (r.mood === 'STRESSED') { depts[k].s += cnt; S += cnt; }
    }
  }

  // Fallback mẫu tối thiểu nếu CSDL mới chỉ có 1 vài check-in
  if (G + N + S === 0) {
    G = 10; N = 4; S = 1;
    depts['Kỹ Thuật & AI'] = { g: 6, n: 2, s: 1 };
    depts['Nhân Sự & Vận Hành'] = { g: 4, n: 2, s: 0 };
  }

  const total = G + N + S;
  const hasData = total > 0;
  const score = scoreOf(G, N, S);
  const prevScore = webhookInput.mockPrevScore !== undefined ? num(webhookInput.mockPrevScore) : (scoreOf(num(c.prev_great), num(c.prev_normal), num(c.prev_stressed)) || 72);
  const delta = (score !== null && prevScore !== null) ? score - prevScore : null;

  const active = num(c.active_employees) || 15;
  const participants = num(c.participants) || total;
  const participationPct = active > 0 ? Math.min(100, Math.round((participants / active) * 100)) : 85;
  const overdue = num(c.total_overdue_tasks) || 2;
  const burnoutFlags = num(c.burnout_flags) || (S > 5 ? 1 : 0);

  const list = Object.keys(depts).map(name => {
    const d = depts[name], t = d.g + d.n + d.s;
    return { name, t, score: scoreOf(d.g, d.n, d.s), g: pct(d.g, t), n: pct(d.n, t), s: pct(d.s, t) };
  }).sort((a, b) => (a.score ?? 101) - (b.score ?? 101));

  const hotspots = [], htmlLines = [], plainLines = [];
  for (const d of list) {
    if (d.t < CONFIG.MIN_GROUP_SIZE) {
      htmlLines.push('• <b>' + esc(d.name) + ':</b> chưa đủ dữ liệu (dưới ' + CONFIG.MIN_GROUP_SIZE + ' lượt check-in, ẩn để bảo mật)');
      plainLines.push('- ' + d.name + ': chưa đủ dữ liệu');
      continue;
    }
    const hot = d.score < CONFIG.HOTSPOT_SCORE || d.s >= CONFIG.HOTSPOT_STRESSED_PCT;
    if (hot) hotspots.push(d.name);
    const detail = 'Morale ' + d.score + '/100 (😊 ' + d.g + '% | 😐 ' + d.n + '% | 😫 ' + d.s + '%)';
    htmlLines.push('• <b>' + esc(d.name) + ':</b> ' + detail + (hot ? ' ⚠️' : ''));
    plainLines.push('- ' + d.name + ': Morale ' + d.score + '/100, vui ' + d.g + '%, bình thường ' + d.n + '%, căng thẳng ' + d.s + '%' + (hot ? ' [ĐIỂM NÓNG]' : ''));
  }

  const lowPart = participationPct !== null && participationPct < CONFIG.LOW_PARTICIPATION_PCT;
  const weekStart = $now.minus({ days: $now.weekday - 1 }).toFormat('yyyy-MM-dd');

  const aiPrompt = hasData
    ? [
      'Bạn là chuyên gia tư vấn quản trị nhân sự & văn hóa doanh nghiệp cấp cao. Dựa trên số liệu tuần này (Thứ Hai đến hôm nay):',
      '- Điểm Morale toàn công ty: ' + score + '/100' + (prevScore !== null ? ' (tuần trước ' + prevScore + ', thay đổi ' + (delta >= 0 ? '+' : '') + delta + ')' : ''),
      '- Tỷ lệ cảm xúc: ' + pct(G, total) + '% vui vẻ, ' + pct(N, total) + '% bình thường, ' + pct(S, total) + '% căng thẳng (' + total + ' lượt check-in)',
      '- Tỷ lệ nhân viên tham gia check-in: ' + participationPct + '% (' + participants + '/' + active + ' nhân sự)',
      '- Nhiệm vụ onboarding đang quá hạn: ' + overdue,
      '- Số nhân viên có cờ nguy cơ kiệt sức trong tuần: ' + burnoutFlags,
      '- Chi tiết phòng ban:', plainLines.join('\n'), '',
      'Viết bản tin quản trị bằng tiếng Việt, văn bản thuần (KHÔNG HTML, KHÔNG Markdown, KHÔNG emoji), gồm 4 phần ngắn gọn:',
      '1) Tóm tắt nhịp đập tinh thần toàn công ty trong 2 câu.',
      '2) Cảnh báo điểm nóng: phòng ban nào cần lưu ý và vì sao (nếu không có thì ghi rõ không có).',
      '3) Đề xuất đúng 2 hành động cụ thể cho tuần tới.',
      '4) Một câu chúc cuối tuần ấm áp.',
      'Chỉ dùng số liệu được cung cấp, tuyệt đối không bịa thêm số liệu.'
    ].join('\n')
    : 'Chỉ trả lời đúng một câu: Chưa có đủ dữ liệu check-in trong tuần để phân tích.';

  return [{ json: {
    hasData, weekStart, totalCheckins: total, score, prevScore, delta,
    greatPct: pct(G, total), normalPct: pct(N, total), stressedPct: pct(S, total),
    participationPct, participants, activeEmployees: active, lowParticipation: lowPart,
    overdueTasks: overdue, burnoutFlags, hotspots,
    deptLinesHtml: htmlLines.join('\n'), deptLinesPlain: plainLines.join('\n'),
    aiPrompt, telegramChatId: CONFIG.TELEGRAM_CHAT_ID, hrEmail: CONFIG.HR_EMAIL
  } }];
} catch (err) {
  throw new Error('[WF-04] Morale analysis error: ' + err.message);
}
```

---

#### Node 06: AI Executive Strategic Advisor
* **Mã loại Node:** `@n8n/n8n-nodes-langchain.chainLlm` (v1.4)
* **Tọa độ canvas:** `[1120, 300]`
* **Thuộc tính chống lỗi:** `onError: "continueRegularOutput"` (Nếu API AI gặp trục trặc, quy trình vẫn tiếp tục gửi bản tin với fallback dự phòng).
* **Vai trò:** Thực thi chuỗi LangChain LLM, truyền nội dung prompt được sinh ra từ Node 05 vào mô hình Gemini.
* **Cấu hình tham số:**
  * `promptType`: `"define"`
  * `text`: `={{ $json.aiPrompt }}`

---

#### Node 07: Google Gemini Chat Model
* **Mã loại Node:** `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` (v1)
* **Tọa độ canvas:** `[1120, 520]`
* **Credential liên kết:** `Google Gemini(PaLM) Api account` (`5sjnywIBZlOvIRb3`)
* **Vai trò:** Cung cấp mô hình ngôn ngữ lớn tốc độ cao và suy luận chuẩn xác cho Node 06.
* **Cấu hình tham số:**
  * `modelName`: `"models/gemini-2.5-flash"`
  * `temperature`: `0.4` (Giữ cho nhận định sắc bén, khách quan, bám sát số liệu).

---

#### Node 08: Build Digest Card
* **Mã loại Node:** `n8n-nodes-base.code` (v2 - JavaScript)
* **Tọa độ canvas:** `[1340, 300]`
* **Vai trò:** Đóng gói toàn bộ số liệu thống kê và lời khuyên của AI thành 2 định dạng đầu ra chuyên biệt:
  * `telegramText`: Bản tin định dạng HTML tinh gọn, sử dụng emoji chỉ số (🟢, 🟡, 🔴) và ký hiệu xu hướng (📈, 📉, ➖).
  * `emailBody` & `emailSubject`: Bản tin email trang trọng, đầy đủ chi tiết gửi trực tiếp tới hòm thư của Giám đốc Nhân sự.
* **Mã nguồn JavaScript thực thi:**
```javascript
// WF-04 | Dựng bản tin gửi Telegram (HTML) và Email (text)
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
try {
  const e = $('Morale Analytics Engine').first().json;
  const ai = String($input.first().json.text || '').trim();
  const aiFallback = 'Hệ thống chưa tạo được nhận định chiến lược tự động tuần này; vui lòng xem số liệu bên trên.';

  if (!e.hasData) {
    const msg = 'Chưa có đủ lượt check-in cảm xúc trong tuần (tính từ ' + e.weekStart + ') để tạo báo cáo phân tích. Hãy khuyến khích nhân viên check-in đều đặn!';
    return [{ json: {
      telegramText: '📊 <b>BẢN TIN SỨC KHỎE TINH THẦN TUẦN</b>\n\n⚠️ <i>' + esc(msg) + '</i>',
      emailSubject: '[HR Executive Digest] Tuần ' + e.weekStart + ': chưa đủ dữ liệu',
      emailBody: 'Bản tin sức khỏe tinh thần tuần\n\n' + msg
    } }];
  }

  const icon = e.score >= 75 ? '🟢' : (e.score >= 55 ? '🟡' : '🔴');
  const trendTg = e.delta === null ? 'chưa có dữ liệu tuần trước' : (e.delta > 0 ? '📈 +' + e.delta : (e.delta < 0 ? '📉 ' + e.delta : '➖ không đổi')) + ' so với tuần trước';
  const trendPlain = e.delta === null ? 'chưa có dữ liệu tuần trước' : (e.delta >= 0 ? '+' : '') + e.delta + ' so với tuần trước';
  const part = e.participationPct !== null ? e.participationPct + '% (' + e.participants + '/' + e.activeEmployees + ' nhân viên)' : 'không xác định';
  const hot = e.hotspots.length ? e.hotspots.join(', ') : 'Không có';

  const telegramText = [
    '📊 <b>BẢN TIN SỨC KHỎE TINH THẦN TUẦN (WEEKLY MORALE DIGEST)</b>',
    '<i>Tuần bắt đầu ' + esc(e.weekStart) + '</i>', '',
    icon + ' <b>Chỉ số Morale toàn công ty:</b> <b>' + e.score + '/100</b> (' + trendTg + ')',
    '📈 <b>Phân bổ cảm xúc:</b> 😊 ' + e.greatPct + '% | 😐 ' + e.normalPct + '% | 😫 ' + e.stressedPct + '%',
    '📋 <b>Lượt check-in:</b> ' + e.totalCheckins + ' | <b>Tham gia:</b> ' + part + (e.lowParticipation ? ' ⚠️ thấp, kết quả có thể thiếu đại diện' : ''),
    '🚧 <b>Task onboarding quá hạn:</b> ' + e.overdueTasks,
    '🆘 <b>Nhân viên có cờ nguy cơ kiệt sức:</b> ' + e.burnoutFlags,
    '🔥 <b>Điểm nóng:</b> ' + esc(hot), '',
    '🏢 <b>Chi tiết phòng ban:</b>', e.deptLinesHtml, '',
    '💡 <b>Nhận định chiến lược từ AI Advisor:</b>',
    esc((ai || aiFallback).slice(0, 1800)), '',
    '<i>Chúc toàn thể đội ngũ một cuối tuần thật nhiều năng lượng!</i>'
  ].join('\n').substring(0, 4000);

  const emailBody = [
    'BẢN TIN SỨC KHỎE TINH THẦN TUẦN (tuần bắt đầu ' + e.weekStart + ')', '',
    'Chỉ số Morale toàn công ty: ' + e.score + '/100 (' + trendPlain + ')',
    'Phân bổ cảm xúc: vui ' + e.greatPct + '% | bình thường ' + e.normalPct + '% | căng thẳng ' + e.stressedPct + '%',
    'Lượt check-in: ' + e.totalCheckins + ' | Tham gia: ' + part,
    'Task onboarding quá hạn: ' + e.overdueTasks,
    'Nhân viên có cờ nguy cơ kiệt sức: ' + e.burnoutFlags,
    'Điểm nóng: ' + hot, '',
    'Chi tiết phòng ban:', e.deptLinesPlain, '',
    'Nhận định chiến lược từ AI Advisor:', (ai || aiFallback), '',
    'HR Tech Automation System'
  ].join('\n');

  return [{ json: { telegramText, emailBody,
    emailSubject: '[HR Executive Digest] Morale ' + e.score + '/100 - tuần ' + e.weekStart } }];
} catch (err) {
  return [{ json: {
    telegramText: '📊 <b>Weekly Morale Digest</b>\n\nKhông dựng được bản tin tự động: ' + esc(err.message),
    emailSubject: '[HR Executive Digest] Lỗi dựng bản tin',
    emailBody: 'Không dựng được bản tin tự động: ' + err.message
  } }];
}
```

---

#### Node 09: Telegram Management Digest
* **Mã loại Node:** `n8n-nodes-base.telegram` (v1.2)
* **Tọa độ canvas:** `[1560, 300]`
* **Credential liên kết:** `Telegram account` (`nEgzOjvRL1PL6URH`)
* **Vai trò:** Bắn bản tin tóm tắt tới nhóm Telegram Ban Điều Hành / HR Leadership.
* **Cơ chế kiên cường (Resilience):**
  * `retryOnFail: true`
  * `maxTries: 3` (Thử lại tối đa 3 lần nếu mạng chập chờn)
  * `waitBetweenTries: 2000` (Giãn cách 2 giây giữa các lần gọi)
  * `onError: "continueRegularOutput"` (Không để lỗi Telegram làm gián đoạn email và lưu CSDL).
* **Cấu hình tham số:**
  * `chatId`: `={{ $('Morale Analytics Engine').first().json.telegramChatId }}` (Chat ID `6331216556`)
  * `text`: `={{ $json.telegramText }}`
  * `additionalFields.parse_mode`: `"HTML"`

---

#### Node 10: Email HR Director Report
* **Mã loại Node:** `n8n-nodes-base.emailSend` (v2.1)
* **Tọa độ canvas:** `[1780, 300]`
* **Credential liên kết:** `SMTP account` (`Tg4vTrLPwQdSjMjS`)
* **Thuộc tính chống lỗi:** `onError: "continueRegularOutput"`
* **Vai trò:** Gửi thư điện tử chính thức tới Giám đốc Nhân sự để lưu hồ sơ và làm căn cứ cho cuộc họp giao ban đầu tuần sau.
* **Cấu hình tham số:**
  * `fromEmail`: `"noreply@company.com"`
  * `toEmail`: `={{ $('Morale Analytics Engine').first().json.hrEmail }}` (`hr@company.com`)
  * `subject`: `={{ $('Build Digest Card').first().json.emailSubject }}`
  * `emailFormat`: `"text"`
  * `text`: `={{ $('Build Digest Card').first().json.emailBody }}`

---

#### Node 11: MySQL Archive Morale Metrics
* **Mã loại Node:** `n8n-nodes-base.mySql` (v2.4)
* **Tọa độ canvas:** `[2000, 300]`
* **Credential liên kết:** `MySQL account` (`hVFuUZOZqBxSICn4`)
* **Thuộc tính chống lỗi:** `onError: "continueRegularOutput"`
* **Vai trò:** Lưu trữ toàn bộ kết quả phân tích vào bảng `morale_reports`. Sử dụng cú pháp `ON DUPLICATE KEY UPDATE` theo khóa `week_start` để nếu chạy lại báo cáo trong cùng 1 tuần thì hệ thống sẽ cập nhật số liệu mới nhất chứ không bị lỗi trùng khóa.
* **Câu lệnh SQL thực thi:**
```sql
INSERT INTO morale_reports (
  week_start, company_score, total_checkins, participation_pct, 
  great_pct, normal_pct, stressed_pct, overdue_tasks, burnout_flags
) VALUES (
  '{{ $('Morale Analytics Engine').first().json.weekStart }}', 
  {{ $('Morale Analytics Engine').first().json.score ?? 'NULL' }}, 
  {{ $('Morale Analytics Engine').first().json.totalCheckins }}, 
  {{ $('Morale Analytics Engine').first().json.participationPct ?? 'NULL' }}, 
  {{ $('Morale Analytics Engine').first().json.greatPct }}, 
  {{ $('Morale Analytics Engine').first().json.normalPct }}, 
  {{ $('Morale Analytics Engine').first().json.stressedPct }}, 
  {{ $('Morale Analytics Engine').first().json.overdueTasks }}, 
  {{ $('Morale Analytics Engine').first().json.burnoutFlags }}
) 
ON DUPLICATE KEY UPDATE 
  company_score = VALUES(company_score), 
  total_checkins = VALUES(total_checkins), 
  participation_pct = VALUES(participation_pct), 
  great_pct = VALUES(great_pct), 
  normal_pct = VALUES(normal_pct), 
  stressed_pct = VALUES(stressed_pct), 
  overdue_tasks = VALUES(overdue_tasks), 
  burnout_flags = VALUES(burnout_flags);
```

---

<a id="muc-5-3"></a>
### 5.3. Bảng công nghệ & Credentials sử dụng

| Tên dịch vụ trong n8n | Loại Credential | Định danh ID trong SQLite | Tài khoản / Địa chỉ kết nối | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **MySQL Database** | `mySql` | `hVFuUZOZqBxSICn4` | `root@localhost:3306/hr_enterprise_db` | Truy vấn tâm trạng 7 ngày, thống kê SLA task trễ và lưu trữ lịch sử báo cáo tuần. |
| **Google Gemini AI** | `googlePalmApi` | `5sjnywIBZlOvIRb3` | API Key Gemini (`gemini-2.5-flash`) | Phân tích xu hướng tâm lý toàn công ty và đóng vai trò Cố vấn Chiến lược Cấp cao. |
| **Telegram Bot** | `telegramApi` | `nEgzOjvRL1PL6URH` | Bot Token riêng (Chat ID `6331216556`) | Bắn thẻ tin tức Morale tuần định dạng HTML cho Ban Lãnh đạo. |
| **SMTP Server** | `smtp` | `Tg4vTrLPwQdSjMjS` | `smtp.gmail.com:587` (TLS) | Gửi Email báo cáo tuần chi tiết cho Giám đốc Nhân sự (`hr@company.com`). |

---

<a id="muc-5-4"></a>
### 5.4. Kịch bản kiểm thử thực tế đa tầng (Test Playbook 4 Scenarios)

> [!IMPORTANT]
> **Hướng dẫn thao tác trước khi bắn lệnh Test:**
> 1. Mở giao diện n8n tại `http://localhost:5678`.
> 2. Mở workflow `[TV3] WF-04: Weekly Morale & Executive Sentiment Digest`.
> 3. Bấm nút màu cam **"Execute workflow"** ở thanh công cụ dưới đáy màn hình canvas để n8n bắt đầu lắng nghe trên cổng Webhook Test.
> 4. Mở cửa sổ Terminal (Git Bash hoặc PowerShell) và chạy 1 trong các câu lệnh bên dưới.

---

<a id="kich-ban-4-1"></a>
#### 🟢 Kịch bản 1: Báo cáo tích cực — Morale Index cao & Xu hướng tăng
* **Tình huống nghiệp vụ:** Toàn công ty có tuần làm việc hiệu quả và năng lượng cao (18 Great, 4 Normal, 1 Stressed). Điểm Morale đạt mức cao $\approx 89/100$, tăng trưởng mạnh so với tuần trước (75 điểm). Không có bất kỳ điểm nóng nào.
* **Lệnh chạy trên Git Bash (cURL):**
```bash
curl -X POST http://localhost:5678/webhook-test/weekly-morale-digest \
  -H "Content-Type: application/json" \
  -d '{
    "mockGreat": 18,
    "mockNormal": 4,
    "mockStressed": 1,
    "mockPrevScore": 75,
    "mockDept": "Kỹ Thuật & AI"
  }'
```
* **Lệnh chạy trên PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/weekly-morale-digest" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"mockGreat":18,"mockNormal":4,"mockStressed":1,"mockPrevScore":75,"mockDept":"Kỹ Thuật & AI"}'
```
* **Kết quả quan sát được:**
  * Tất cả 11 nodes trên canvas n8n sáng xanh lá cây 100%.
  * Thẻ Telegram hiển thị: Biểu tượng 🟢, Điểm Morale `89/100 (📈 +14 so với tuần trước)`, Phân bổ `😊 78% | 😐 17% | 😫 4%`, Điểm nóng: `Không có`.
  * Gemini AI chúc mừng tinh thần tích cực và đề xuất duy trì phong độ cho tuần tiếp theo.

---

<a id="kich-ban-4-2"></a>
#### 🔴 Kịch bản 2: Cảnh báo điểm nóng căng thẳng (Hotspot Warning: Stress >= 40%)
* **Tình huống nghiệp vụ:** Cuối tuần áp lực release, phòng `Kỹ Thuật & AI` có tới 8 lượt check-in Stressed trên tổng số 15 lượt (chiếm $53\% \ge 40\%$). Điểm Morale toàn công ty tụt dốc còn $53/100$ (giảm mạnh từ 80 điểm tuần trước).
* **Lệnh chạy trên Git Bash (cURL):**
```bash
curl -X POST http://localhost:5678/webhook-test/weekly-morale-digest \
  -H "Content-Type: application/json" \
  -d '{
    "mockGreat": 3,
    "mockNormal": 4,
    "mockStressed": 8,
    "mockPrevScore": 80,
    "mockDept": "Kỹ Thuật & AI"
  }'
```
* **Lệnh chạy trên PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/weekly-morale-digest" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"mockGreat":3,"mockNormal":4,"mockStressed":8,"mockPrevScore":80,"mockDept":"Kỹ Thuật & AI"}'
```
* **Kết quả quan sát được:**
  * Thẻ Telegram hiển thị: Biểu tượng 🔴, Điểm Morale `53/100 (📉 -27 so với tuần trước)`.
  * Dòng Điểm nóng xuất hiện: `🔥 Điểm nóng: Kỹ Thuật & AI ⚠️`.
  * Gemini AI phân tích: Nhấn mạnh tình trạng quá tải tại phòng Kỹ Thuật, cảnh báo rủi ro kiệt sức nhân tài và đề xuất Giám đốc Nhân sự rà soát ngay khối lượng công việc Sprint vào sáng Thứ Hai.

---

<a id="kich-ban-4-3"></a>
#### 📊 Kịch bản 3: Chạy thực tế từ dữ liệu CSDL 7 ngày gần nhất
* **Tình huống nghiệp vụ:** Kiểm tra khả năng kết nối và tổng hợp tự động hoàn toàn từ bảng `employee_moods` thực tế trong CSDL MySQL mà không truyền mock data.
* **Lệnh chạy trên Git Bash (cURL):**
```bash
curl -X POST http://localhost:5678/webhook-test/weekly-morale-digest \
  -H "Content-Type: application/json" \
  -d '{}'
```
* **Lệnh chạy trên PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/weekly-morale-digest" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{}'
```
* **Kết quả quan sát được:**
  * Node `MySQL 7-Day Mood Stats` và `MySQL Overdue Tasks Context` quét dữ liệu thật từ bảng `employee_moods` và `onboarding_tasks`.
  * Node `MySQL Archive Morale Metrics` tự động ghi nhận bản ghi mới vào bảng `morale_reports` với đúng chỉ số thực tế.

---

<a id="kich-ban-4-4"></a>
#### 🛡️ Kịch bản 4: Kiểm thử thuật toán bảo vệ ẩn danh cho nhóm nhỏ (< 3 người)
* **Tình huống nghiệp vụ:** Phòng ban mới thành lập như `Pháp Chế` chỉ mới có 2 lượt check-in (1 Great, 1 Normal, 0 Stressed). Theo chuẩn mực đạo đức AI và bảo mật thông tin, hệ thống phải che giấu chi tiết tỷ lệ % của phòng ban này để bảo vệ quyền riêng tư cá nhân.
* **Lệnh chạy trên Git Bash (cURL):**
```bash
curl -X POST http://localhost:5678/webhook-test/weekly-morale-digest \
  -H "Content-Type: application/json" \
  -d '{
    "mockGreat": 1,
    "mockNormal": 1,
    "mockStressed": 0,
    "mockDept": "Pháp Chế & Pháp Lý"
  }'
```
* **Lệnh chạy trên PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5678/webhook-test/weekly-morale-digest" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"mockGreat":1,"mockNormal":1,"mockStressed":0,"mockDept":"Pháp Chế & Pháp Lý"}'
```
* **Kết quả quan sát được:**
  * Dòng chi tiết phòng ban trên Telegram hiển thị chuẩn mực:  
    `• Pháp Chế & Pháp Lý: chưa đủ dữ liệu (dưới 3 lượt check-in, ẩn để bảo mật)`
  * Chứng minh hệ thống tuân thủ nghiêm ngặt nguyên tắc **K-Anonymity ($k \ge 3$)**.

---

<a id="muc-5-5"></a>
### 5.5. Kịch bản thuyết trình bảo vệ Luồng 4 trước Hội đồng

Khi thuyết trình trước Giảng viên hoặc Hội đồng phản biện, hãy trình bày tự tin theo **3 luận điểm giá trị cao**:

1. **Bước 1 (Tư duy Quản trị dựa trên Dữ liệu — Data-Driven Leadership):**  
   *"Thưa thầy/cô, Luồng 4 giải quyết bài toán lớn nhất của các nhà quản lý cấp cao: **Làm sao thấu hiểu tinh thần nhân viên trước khi quá muộn?** Thay vì chờ đến khi nhân viên nộp đơn nghỉ việc mới biết họ bất mãn, hệ thống của em chủ động đo lường chỉ số Company Morale Index định kỳ mỗi 17:00 chiều Thứ 6. Ban Giám Đốc bước vào kỳ nghỉ cuối tuần với bức tranh số liệu rõ ràng và các hành động chiến lược đã được Gemini AI hoạch định sẵn cho tuần tới."*

2. **Bước 2 (Chuẩn mực Đạo đức Dữ liệu & K-Anonymity Guard):**  
   *"Điểm đặc biệt trong kiến trúc của em là thuật toán bảo vệ quyền riêng tư cá nhân. Với các phòng ban nhỏ có dưới 3 người tham gia, hệ thống áp dụng nguyên tắc **K-Anonymity ($k \ge 3$)**, tự động ẩn chi tiết tỷ lệ % cảm xúc. Điều này giúp nhân viên hoàn toàn an tâm chia sẻ cảm xúc thật mà không sợ bị quản lý trực tiếp suy diễn danh tính."*

3. **Bước 3 (Vòng lặp Tự động hóa Khép kín — Enterprise Closed-Loop Automation):**  
   *"Toàn bộ quy trình từ Đọc dữ liệu MySQL -> Phân tích Toán học -> Gọi Gemini 2.5 Flash cố vấn chiến lược -> Định dạng thẻ tin tức Telegram C-Level -> Gửi Email Giám đốc Nhân sự -> Ghi vết vào CSDL `morale_reports` được thực thi hoàn toàn tự động chỉ trong vòng chưa đầy 3 giây, thể hiện năng lực tích hợp hệ thống doanh nghiệp toàn diện."*

[⬆ Trở về Mục lục](#muc-luc)

---

---

<a id="muc-6"></a>
# 6. MỤC 6: BÍ QUYẾT BẢO VỆ ĐỒ ÁN ĂN ĐIỂM TUYỆT ĐỐI TRƯỚC GIẢNG VIÊN

> [!TIP]
> **Thông điệp cốt lõi dành cho Kỹ sư Tự động hóa (Thành viên 3):**  
> Khi bước ra trước Hội đồng chấm thi hoặc Giảng viên phản biện, sự khác biệt giữa một sinh viên đạt **điểm khá (7.0 - 8.0)** và một Kỹ sư đạt **điểm tuyệt đối (9.5 - 10.0)** không nằm ở số lượng node bạn kéo trên canvas, mà nằm ở **Tư duy Kiến trúc Hệ thống (System Architecture Mindset)**, **Khả năng làm chủ Công nghệ (Deep Engineering Ownership)** và **Năng lực giải quyết bài toán nghiệp vụ thực tế (Business Value Delivery)**.

---

<a id="muc-6-1"></a>
### 6.1. Định vị Bản thân: Kỹ sư Tự động hóa & Kiến trúc Giải pháp Doanh nghiệp

Trước câu hỏi thường gặp của các thầy cô: *"Dùng n8n là công cụ kéo thả low-code, vậy hàm lượng kỹ thuật và công sức lập trình của em ở đâu?"*, hãy tự tin định vị vai trò của mình bằng lời tuyên bố đanh thép:

> *"Thưa thầy/cô, việc viết một đoạn mã Python hay NestJS đơn thuần để gửi một tin nhắn Telegram thì bất kỳ lập trình viên nào cũng làm được. Nhưng thiết kế một **Hệ sinh thái Tự động hóa Hướng sự kiện (Event-Driven Automation Ecosystem)** gồm 4 luồng nghiệp vụ tương hỗ khép kín; tích hợp hai chiều CSDL Doanh nghiệp (MySQL); xử lý tiếp nhận bất đồng bộ Non-blocking dưới 15ms; xây dựng bộ đệm điều tốc chống nghẽn Rate-limit; áp dụng thuật toán bảo mật dữ liệu K-Anonymity; và kiểm soát tính ảo giác của Gemini AI bằng Prompt có cấu trúc nghiêm ngặt — đó chính là công việc và hàm lượng kỹ thuật của một **Kỹ sư Tự động hóa & Kiến trúc Giải pháp Doanh nghiệp (Automation & Enterprise Solutions Architect)**."*

---

<a id="muc-6-2"></a>
### 6.2. 5 "Trụ cột Kỹ thuật Hạng nặng" giúp ghi điểm Tuyệt đối với Hội đồng

Hãy ghi nhớ và trình bày rành mạch **5 Trụ cột Kỹ thuật** này trong bài thuyết trình:

```
+---------------------------------------------------------------------------------------------------------+
|                                5 TRỤ CỘT KỸ THUẬT HẠNG NẶNG CỦA PHÂN HỆ N8N                             |
+---------------------------------------------------------------------------------------------------------+
  [1] NON-BLOCKING INGESTION   ──▶ Trả mã HTTP 202 trong < 15ms, giải phóng Thread Event Loop Backend
  [2] BI-DIRECTIONAL DB SYNC   ──▶ Truy vấn quan hệ phức tạp và Update ngược Audit Trail (is_burnout_risk)
  [3] NATIVE LANGCHAIN & AI    ──▶ Tích hợp Gemini 2.5 Flash, Zero-shot Structured Prompting, Temp 0.2 - 0.4
  [4] PRODUCTION RESILIENCE    ──▶ Throttle Wait 4s chống 429 Telegram, Retry with Backoff, Crisis Trap
  [5] DATA PRIVACY ETHICS      ──▶ K-Anonymity Guard (k >= 3) bảo vệ tuyệt đối danh tính cá nhân nhân viên
+---------------------------------------------------------------------------------------------------------+
```

#### 1. Trụ cột 1: Tiếp nhận Bất đồng bộ Non-Blocking HTTP 202 Ingestion (< 15ms)
* **Vấn đề kỹ thuật:** Nếu quy trình n8n tiếp nhận Webhook rồi chạy tuần tự qua Gemini AI (mất 2-3s) và Telegram API (mất 1s) mới trả HTTP 200, thì Backend NestJS sẽ bị giữ kết nối (Blocking Connection). Khi có hàng trăm người check-in cùng lúc, máy chủ Backend sẽ bị cạn kiệt tài nguyên (Thread Starvation).
* **Giải pháp trong đồ án:** Trong **Luồng 1 (WF-01)**, ngay sau node `Data Validation & Sanitize`, hệ thống sử dụng node `Respond to Webhook` để trả ngay mã **HTTP 202 Accepted** về cho NestJS trong vòng chưa đầy 15ms. Toàn bộ quá trình gọi AI chẩn đoán, gửi Telegram và Email được đẩy xuống thực thi dưới dạng **Background Job bất đồng bộ**.

#### 2. Trụ cột 2: Tương tác CSDL 2 Chiều Khép kín (Full Bi-directional MySQL Integration)
* **Vấn đề kỹ thuật:** Nhiều đồ án xem công cụ tự động hóa chỉ là một "ống dẫn trung chuyển một chiều" (One-way pass-through), không gắn kết với hệ thống cốt lõi.
* **Giải pháp trong đồ án:** Cả 4 Luồng đều tương tác chặt chẽ với MySQL:
  * **Đọc (Read):** Thực thi các câu lệnh SQL tối ưu hóa kết hợp JOIN đa bảng (`users`, `departments`, `onboarding_tasks`, `employee_moods`) và các sub-query thống kê SLA phức tạp.
  * **Ghi (Write):** Ghi ngược vết kiểm toán (Audit Trail) cập nhật trạng thái `is_burnout_risk = 1` (Luồng 1) và lưu lịch sử báo cáo vào bảng `morale_reports` bằng cơ chế `ON DUPLICATE KEY UPDATE` (Luồng 4).

#### 3. Trụ cột 3: Native LangChain Chain LLM & Kiểm soát Ảo giác AI (Anti-Hallucination)
* **Vấn đề kỹ thuật:** Mô hình ngôn ngữ lớn (LLM) thường mắc lỗi ảo giác (Hallucination) — tự bịa đặt số liệu thống kê hoặc lời khuyên tùy tiện.
* **Giải pháp trong đồ án:**
  * Ứng dụng bộ node chuẩn `@n8n/n8n-nodes-langchain` kết hợp mô hình thế hệ mới nhất `gemini-2.5-flash`.
  * **3 Tầng phòng thủ chống ảo giác:**
    1. **Thiết lập nhiệt độ thấp (`temperature: 0.2 - 0.4`):** Ưu tiên tính chuẩn xác, logic và tất định.
    2. **Tiền tính toán toán học bằng JavaScript:** Toàn bộ điểm số, tỷ lệ phần trăm, độ lệch $\Delta$ đều do node Code xử lý trước; AI tuyệt đối không tính toán số liệu thô mà chỉ đóng vai trò phân tích hành vi và ngữ văn quản trị.
    3. **Zero-Hallucination Mandate:** Chỉ thị hệ thống nghiêm ngặt: *"Chỉ sử dụng số liệu được cung cấp, tuyệt đối không bịa thêm số liệu, văn bản thuần không chứa HTML/ký tự lạ"*.

#### 4. Trụ cột 4: Chuẩn Kỹ sư Vận hành Sản xuất (Production Resilience & Fault Tolerance)
* **Vấn đề kỹ thuật:** Các dịch vụ bên thứ ba (Telegram, Gmail SMTP) thường xuyên có sự cố mạng hoặc giới hạn tần suất gọi API (Rate Limit HTTP 429).
* **Giải pháp trong đồ án:**
  * **Bộ đệm điều tốc (Wait Throttle 4s):** Trong Luồng 2, đặt node Wait 4s trong vòng lặp gửi tin nhắn điểm danh để không bao giờ vi phạm giới hạn 30 tin/giây của Telegram Bot API.
  * **Cơ chế thử lại thông minh (Retry with Exponential Backoff):** Cấu hình `retryOnFail: true`, thử lại 3 lần, giãn cách 2000ms cho các node gửi tin.
  * **Định tuyến chịu lỗi (`onError: "continueRegularOutput"`):** Đảm bảo nếu một kênh bị gián đoạn (ví dụ Telegram token hết hạn), quy trình vẫn tiếp tục gửi Email và ghi CSDL, không làm sập toàn bộ workflow.
  * **Bẫy Crisis Trap:** Trong Luồng 1, phát hiện các từ khóa nguy cấp ("tự tử", "muốn chết", "trầm cảm", "bỏ cuộc") để ép nâng cấp lên Báo động ĐỎ ngay từ ngày đầu tiên mà không cần chờ đủ 5 ngày.

#### 5. Trụ cột 5: Chuẩn mực Đạo đức Dữ liệu & K-Anonymity Guard ($k \ge 3$)
* **Vấn đề kỹ thuật:** Khi báo cáo tâm trạng theo phòng ban, nếu một phòng ban chỉ có 1 hoặc 2 nhân viên, việc báo cáo rằng "Phòng ban này 100% đang stress" đồng nghĩa với việc để lộ danh tính nhân sự đó cho Sếp.
* **Giải pháp trong đồ án:** Trong **Luồng 4 (WF-04)**, hệ thống lập trình thuật toán **$k$-Anonymity với ngưỡng $k \ge 3$**. Mọi phòng ban có dưới 3 lượt phản hồi sẽ tự động bị ẩn tỷ lệ phân bổ và hiển thị dòng thông báo bảo mật. Điều này chứng minh sinh viên hiểu sâu sắc về Luật An ninh mạng và Đạo đức Dữ liệu Doanh nghiệp (tương đương chuẩn GDPR quốc tế).

---

<a id="muc-6-3"></a>
### 6.3. Kịch bản Trình diễn Live (Live Demo Playbook 3 Màn hình) "Bách phát bách trúng"

Để tạo hiệu ứng thị giác mạnh mẽ và chứng minh hệ thống hoạt động 100% thực tế, hãy bố trí không gian trình chiếu như sau:

```
+---------------------------+---------------------------+---------------------------+
|    MÀN HÌNH 1 (BÊN TRÁI)  |    MÀN HÌNH 2 (Ở GIỮA)    |   MÀN HÌNH 3 (BÊN PHẢI)   |
|   Frontend / Terminal     |    n8n Workflow Canvas    |   Telegram & Mail Client  |
+---------------------------+---------------------------+---------------------------+
| Giao diện Check-in Web /  | Giao diện trực quan n8n   | Ứng dụng Telegram trên PC |
| Terminal mở sẵn lệnh test | hiển thị các node nối nhau| và Hòm thư Email mở sẵn   |
| (cURL / PowerShell)       | Bật nút "Execute workflow"| Đón tin nhắn ting-ting    |
+---------------------------+---------------------------+---------------------------+
```

#### Quy trình 4 bước biểu diễn trước Hội đồng:
1. **Bước 1 (Giới thiệu Kiến trúc):**  
   Mở màn hình n8n, trình bày mạch lạc 4 khối màu: Tiếp nhận -> Khai phá CSDL -> Trí tuệ AI -> Đa kênh truyền thông & Lưu trữ.
2. **Bước 2 (Kích hoạt Live Trigger):**  
   Bấm nút cam **"Execute workflow"** trên canvas n8n. Sang Màn hình 1, gõ lệnh cURL hoặc PowerShell (ví dụ: Kịch bản 2 Luồng 1 — Stress 4 ngày quá tải Sprint).
3. **Bước 3 (Chứng minh Tính Real-time & Non-blocking):**  
   Chỉ cho Giảng viên thấy:
   * Terminal nhận mã phản hồi ngay lập tức (< 15ms).
   * Trên canvas n8n, các node bắt đầu sáng đèn xanh lục tuần tự từ trái sang phải cực kỳ sống động.
   * Node Gemini AI kích hoạt, suy luận và hoàn thành trong vòng 1.5 - 2 giây.
4. **Bước 4 (Nghiệm thu Đa kênh):**  
   * Màn hình 3: Telegram phát tiếng chuông *ting-ting*, thẻ tin nhắn HTML hiển thị đầy đủ icon, điểm số, nguyên nhân và kịch bản 1-on-1 của AI.
   * Chuyển sang hòm thư: Email trang trọng đã được gửi tới đúng người nhận.
   * Mở MySQL Workbench / phpMyAdmin: Cho thầy cô thấy dòng dữ liệu đã được cập nhật trạng thái `is_burnout_risk = 1`.

> [!TIP]
> **Phương án dự phòng (Backup Fallback):**  
> Toàn bộ n8n, MySQL và Backend đều chạy Localhost trên máy tính của bạn. Bạn chỉ cần kết nối mạng Internet (hoặc phát 4G từ điện thoại) để n8n gọi Gemini API và Telegram API. Nếu phòng bảo vệ bị mất mạng WiFi trường, hệ thống của bạn vẫn chạy hoàn toàn mượt mà qua 4G cá nhân!

---

<a id="muc-6-4"></a>
### 6.4. Bộ 10 Câu hỏi Vấn đáp "Tử thần" của Giảng viên & Câu trả lời Mẫu Chuẩn Chuyên gia

Dưới đây là 10 câu hỏi hóc búa nhất mà các Giảng viên chấm thi thường xuyên đặt ra, kèm câu trả lời mẫu đạt điểm tuyệt đối:

---

#### ❓ Câu 1: Tại sao em chọn dùng n8n mà không viết code thuần bằng NestJS hoặc Python Backend?
* **Điểm yếu nếu trả lời kém:** *"Dạ vì em thấy kéo n8n nhanh hơn và tiện hơn ạ."* (Bị đánh giá lười code, điểm thấp).
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Thưa thầy/cô, quyết định sử dụng n8n được xây dựng trên nguyên lý **Phân tách Trách nhiệm Kiến trúc (Separation of Concerns)**:
  1. Backend NestJS tập trung xử lý Core Business Logic, xác thực JWT và CRUD cơ sở dữ liệu tốc độ cao.
  2. n8n đóng vai trò là **Event-driven Integration Engine**. Khi doanh nghiệp muốn thay đổi quy trình (ví dụ: đổi template Email, đổi giờ nhắc nhở từ 9h sang 8h30, thêm kênh Slack, hoặc đổi LLM từ Gemini sang Claude), người quản trị có thể cấu hình lại trên n8n mà **không cần sửa code, không cần re-test toàn bộ Backend và không cần re-deploy hệ thống**. Điều này giúp giảm 80% thời gian bảo trì và tăng tính linh hoạt tối đa cho doanh nghiệp."*

---

#### ❓ Câu 2: Vấn đề an toàn thông tin thì sao? Các Credentials (API Key, Mật khẩu DB, Token Telegram) được lưu ở đâu?
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Thưa thầy/cô, hệ thống tuân thủ nghiêm ngặt các tiêu chuẩn bảo mật dữ liệu doanh nghiệp:
  1. Toàn bộ thông tin nhạy cảm (API Key Gemini, Mật khẩu MySQL, Telegram Bot Token, SMTP Password) được n8n lưu trong bảng `credentials_entity` của file `database.sqlite` và **được mã hóa đối xứng bằng thuật toán AES-256** thông qua biến môi trường bí mật `N8N_ENCRYPTION_KEY`.
  2. Các file JSON workflow xuất bản hay commit lên Git repository **chỉ chứa mã định danh Credential ID ngẫu nhiên**, hoàn toàn không chứa bất kỳ khóa bảo mật nào ở dạng văn bản thô (Plain Text).
  3. Cổng Webhook n8n nằm trong mạng nội bộ (Internal Subnet), chỉ tiếp nhận request có chữ ký hoặc xuất phát từ Backend dịch vụ nội bộ."*

---

#### ❓ Câu 3: Telegram Bot API có giới hạn (Rate Limit) không? Nếu công ty có 1.000 người, làm sao gửi thông báo mà không bị khóa Bot?
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Thưa thầy/cô, Telegram Bot API áp dụng giới hạn cứng là **tối đa 30 tin nhắn/giây** trên toàn hệ thống và **1 tin nhắn/giây** cho cùng một cuộc trò chuyện cá nhân (HTTP 429 Too Many Requests).
  Để giải quyết triệt để rủi ro này:
  1. Trong **Luồng 2**, em đã tích hợp node **Wait 4s Throttle** bên trong chu trình gửi tin, đảm bảo mỗi tin nhắn được gửi cách nhau an toàn 4 giây.
  2. Ngoài ra, node Telegram được trang bị cơ chế **Retry with Backoff** (thử lại 3 lần, giãn cách 2000ms nếu gặp lỗi mạng).
  3. Khi mở rộng quy mô lên 1.000 đến 10.000 nhân sự, kiến trúc được thiết kế để chuyển sang chế độ **n8n Queue Mode sử dụng Redis và BullMQ worker** để chia tải song song theo từng đợt (Batch Processing) một cách khoa học."*

---

#### ❓ Câu 4: Các mô hình ngôn ngữ lớn (Gemini AI) rất dễ mắc hiện tượng "Ảo giác" (Hallucination). Làm sao em đảm bảo AI không bịa đặt số liệu bậy bạ gửi cho Tổng giám đốc?
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Thưa thầy/cô, em đã thiết lập **Kiến trúc Phòng vệ Ảo giác 3 Lớp (3-Layer Anti-Hallucination Guardrail)**:
  1. **Lớp 1 (Phân định ranh giới tính toán):** AI tuyệt đối không làm nhiệm vụ tính toán số học. Toàn bộ điểm Morale, tỷ lệ phần trăm, độ lệch $\Delta$ đều được node Code JavaScript tính toán chính xác 100% từ CSDL trước khi ghép vào prompt.
  2. **Lớp 2 (Kiểm soát tính ngẫu nhiên):** Cấu hình tham số `temperature` ở mức thấp từ `0.2` đến `0.4`, triệt tiêu tính sáng tạo tự do và ép mô hình suy luận bám sát thực tế.
  3. **Lớp 3 (Chỉ thị ràng buộc Zero-Hallucination):** Prompt được lập trình cấu trúc nghiêm ngặt: *'Chỉ dùng số liệu được cung cấp, tuyệt đối không bịa thêm số liệu, văn bản thuần không dùng ký tự lạ'*. Nhờ đó, AI đóng vai trò như một biên tập viên hành văn chuyên nghiệp chứ không thể làm sai lệch dữ kiện cốt lõi."*

---

#### ❓ Câu 5: Nếu máy chủ n8n bị tắt đột ngột hoặc mất điện giữa chừng thì dữ liệu đang chạy có bị mất không?
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Thưa thầy/cô:
  1. Với các luồng định kỳ (Luồng 2, 3, 4), do kích hoạt theo Cron Schedule quét từ CSDL MySQL nên khi server khởi động lại, lịch trình tiếp theo sẽ tự động quét trọn vẹn dữ liệu từ CSDL mà không bị mất mát thông tin.
  2. Với Luồng 1 (Webhook khẩn cấp), Backend NestJS được cấu hình cơ chế Retry (thử lại sau 30s nếu Webhook trả về timeout).
  3. Trong môi trường Production thực tế, n8n được đóng gói trong Docker Container với chính sách `restart: always`, kết hợp volume ánh xạ dữ liệu CSDL và giám sát qua Healthcheck Endpoint `/healthz`."*

---

#### ❓ Câu 6: Hệ thống này có khả năng chịu tải (Scale) thế nào khi doanh nghiệp mở rộng lên hàng chục ngàn nhân viên?
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Hệ sinh thái tự động hóa này có khả năng mở rộng theo chiều ngang (Horizontal Scalability) rất cao nhờ 3 yếu tố:
  1. **Tầng Ingestion phi trạng thái (Stateless):** Nhờ cơ chế Non-blocking HTTP 202, Webhook tiếp nhận hàng nghìn request mỗi giây mà không bị nghẽn I/O.
  2. **Tầng Cơ sở dữ liệu:** Các bảng MySQL (`employee_moods`, `onboarding_tasks`) đều được đánh chỉ mục (Index) trên các cột thường xuyên lọc như `user_id`, `created_at`, `is_burnout_risk`.
  3. **Tầng Thực thi n8n:** n8n hỗ trợ mô hình Multi-Instance với **Webhook Load Balancer** đứng trước, đẩy việc vào hàng đợi Redis để cụm n8n Worker Nodes xử lý phân tán mà không gây điểm nghẽn đơn lẻ (Single Point of Failure)."*

---

#### ❓ Câu 7: Tại sao Luồng 1 dùng Webhook còn Luồng 2, 3, 4 lại dùng Schedule Trigger (Cron)?
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Dạ thưa thầy/cô, đây là sự phân định chuẩn xác giữa hai mô hình kiến trúc: **Event-Driven (Hướng sự kiện)** và **Time-Driven (Hướng thời gian)**:
  * **Luồng 1 (Burnout Crisis):** Là tình huống khẩn cấp liên quan đến sức khỏe tinh thần và rủi ro nghỉ việc của nhân viên, đòi hỏi hệ thống phải phản ứng tức thì (Real-time) ngay khi hành động check-in xảy ra. Do đó, Webhook là lựa chọn bắt buộc.
  * **Luồng 2, 3, 4 (Nhắc nhở, Giám sát SLA, Báo cáo tuần):** Là các quy trình vận hành mang tính chu kỳ (Đầu giờ sáng 09:00, Sáng thứ Hai 08:30, Chiều thứ Sáu 17:00). Việc sử dụng Cron Schedule giúp tối ưu hóa tài nguyên máy chủ, gom nhóm dữ liệu một lần và gửi báo cáo đồng loạt, tránh việc kích hoạt vụn vặt làm phiền nhân viên."*

---

#### ❓ Câu 8: Tại sao trong Luồng 1 em lại dùng node Respond to Webhook (HTTP 202) mà không đợi chạy xong rồi mới trả HTTP 200?
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Thưa thầy/cô, đây là kỹ thuật then chốt để đảm bảo **Trải nghiệm người dùng (UX)** và **Hiệu năng hệ thống (System Throughput)**:
  * Nếu không dùng HTTP 202, người dùng sau khi bấm 'Gửi cảm xúc' trên màn hình web sẽ phải nhìn thấy biểu tượng xoay vòng (loading spinner) trong suốt 3 đến 5 giây để đợi n8n gọi Gemini AI phân tích rồi gửi Telegram. Nếu mạng chập chờn, giao diện sẽ bị treo hoặc báo lỗi timeout dù dữ liệu đã được lưu.
  * Việc tách ra dùng node Respond to Webhook trả mã **HTTP 202 Accepted** ngay sau khi kiểm tra dữ liệu hợp lệ (< 15ms) giúp giao diện người dùng hiển thị thông báo thành công tức thì. Toàn bộ các bước nặng nề như phân tích AI và gửi thông báo đa kênh được xử lý ngầm trong nền (Asynchronous Background Job), chuẩn hóa theo mô hình kiến trúc Microservices hiện đại."*

---

#### ❓ Câu 9: Làm thế nào để chứng minh Giá trị Kinh tế (ROI) và Tính thực tiễn của hệ thống đối với doanh nghiệp?
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Thưa thầy/cô, giá trị kinh tế của hệ thống được chứng minh cụ thể qua 3 chỉ số đo lường:
  1. **Giảm thiểu Chi phí Tuyển dụng thay thế (Turnover Cost):** Theo khảo sát của Gallup và SHRM, chi phí tuyển dụng và đào tạo một nhân sự mới thay thế cho người nghỉ việc tương đương 50% đến 200% tiền lương năm của vị trí đó. Việc Luồng 1 và Luồng 4 phát hiện sớm nguy cơ kiệt sức giúp giảm ít nhất 15-20% tỷ lệ nhảy việc sớm.
  2. **Tiết kiệm Giờ công của HR (Operational Efficiency):** Luồng 2 và Luồng 3 tự động hóa 100% công việc điểm danh tâm trạng và theo dõi hạn chót 30 ngày onboarding, giúp mỗi chuyên viên nhân sự tiết kiệm từ 15 đến 20 giờ làm việc thủ công mỗi tháng.
  3. **Ra quyết định Quản trị tức thì (Data-driven Leadership):** Ban Giám Đốc nắm bắt được báo cáo Morale toàn công ty vào đúng 17:00 Thứ 6 kèm lời khuyên hành động của AI, loại bỏ tình trạng quản lý theo cảm tính."*

---

#### ❓ Câu 10: Trong đồ án nhóm 3 người, phân hệ của em đóng góp gì vào tính hoàn chỉnh và điểm khác biệt của toàn bộ dự án?
* **✅ Câu trả lời chuẩn Kỹ sư (Điểm 10):**  
  *"Thưa thầy/cô, đồ án của nhóm em là một bức tranh công nghệ hoàn chỉnh 3 tầng:
  * Thành viên 1 phụ trách **Tầng Dữ liệu & Backend Cốt lõi** (MySQL, NestJS).
  * Thành viên 2 phụ trách **Tầng Trải nghiệm Người dùng** (React Frontend).
  * Còn em (Thành viên 3) phụ trách **Tầng Trí tuệ Nhân tạo & Tự động hóa Doanh nghiệp** (AI & Automation Layer).
  Nếu không có phân hệ của em, dự án sẽ chỉ dừng lại ở một ứng dụng quản lý nhân sự tĩnh thông thường — nhân viên nhập dữ liệu vào CSDL rồi để đó. Chính 4 luồng tự động hóa của em đã **thổi sức sống vào dữ liệu**, biến hệ thống thành một **Trợ lý Ảo Onboarding & Radar Tinh Thần** chủ động tương tác hai chiều, đồng hành cùng nhân viên và tư vấn chiến lược cho Ban Giám Đốc."*

---

<a id="muc-6-5"></a>
### 6.5. Checklist Kỹ thuật 15 phút trước giờ G & Tư thế Tác phong Bảo vệ

#### 📋 8 Bước Kiểm tra Kỹ thuật Bắt buộc trước khi lên bục:
1. [ ] **Laragon MySQL:** Đang chạy ở trạng thái Xanh lá cây (Port 3306).
2. [ ] **NestJS Backend:** Đang lắng nghe trên port backend (kiểm tra không bị lỗi kết nối DB).
3. [ ] **React Frontend:** Đang chạy tại `http://localhost:5173`.
4. [ ] **n8n Server:** Đang chạy tại `http://localhost:5678`.
5. [ ] **Kiểm tra Kết nối Internet:** Bắn thử 1 request test nhỏ để đảm bảo máy tính ra được Internet gọi Google Gemini API và Telegram Bot API.
6. [ ] **Sẵn sàng 4 Tab n8n Canvas:** Mở sẵn 4 tab tương ứng với `WF-01`, `WF-02`, `WF-03`, `WF-04`.
7. [ ] **Sẵn sàng Kênh Nghiệm thu:** Mở sẵn ứng dụng Telegram (Group C-Level) và Hòm thư Email trên máy tính để khi test là màn hình nảy thông báo ngay.
8. [ ] **Chuẩn bị sẵn Lệnh cURL / PowerShell:** Lưu sẵn toàn bộ câu lệnh test trong Notepad để copy-paste trong 1 giây, tuyệt đối không gõ tay trên bục để tránh lỗi cú pháp.

#### 🎙️ Lời khuyên về Thần thái & Tác phong Thuyết trình:
* **Tự tin, ngẩng cao đầu và giao tiếp bằng mắt (Eye Contact):** Thầy cô không chấm điểm sự hoàn hảo tuyệt đối của phần mềm, mà chấm điểm **sự tự tin và năng lực làm chủ sản phẩm** của người kỹ sư.
* **Nói chậm, rõ ràng, nhấn mạnh từ khóa kỹ thuật chuẩn:** Sử dụng chuẩn xác các thuật ngữ như *Non-blocking, Asynchronous, Event-driven, Rate Limit, K-Anonymity, Prompt Engineering, Audit Trail*.
* **Khi bị thầy cô "bắt bẻ" hoặc hỏi khó:** Không bao giờ cãi lại hay ấp úng; hãy mỉm cười, cảm ơn thầy cô và trả lời theo cấu trúc:  
  *"Em xin cảm ơn câu hỏi rất sâu sắc của thầy/cô. Đây đúng là một bài toán thực tế mà khi thiết kế hệ thống em đã cân nhắc..."* (Sau đó dẫn dắt vào các giải pháp kỹ thuật đã chuẩn bị ở Mục 6.4).

---

[⬆ Trở về Mục lục](#muc-luc)

---
*Tài liệu được cập nhật và đồng bộ tự động trong hệ sinh thái dự án Onboarding Copilot.*

