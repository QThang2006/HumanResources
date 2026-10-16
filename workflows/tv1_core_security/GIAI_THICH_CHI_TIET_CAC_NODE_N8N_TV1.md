# 🛡️ TÀI LIỆU GIẢI THÍCH CHI TIẾT CÁC NODE n8n - THÀNH VIÊN 1
## PHÂN HỆ: HẠ TẦNG CỐT LÕI, AN TOÀN BẢO MẬT & VẬN HÀNH HỆ THỐNG
*Dành cho: Thành viên 1 (Trưởng nhóm / Lead Architect & Core Security)*

---

## 📌 DANH MỤC 3 QUY TRÌNH TỰ ĐỘNG HÓA n8n

| Tên Quy trình | Tệp Workflow | Trigger | Số lượng Node |
| :--- | :--- | :--- | :---: |
| **WF-01: Giám sát Brute-force & Tự động Khóa IP Đa tầng** | `01_bruteforce_defense_firewall.json` | Webhook (`POST /webhook/security-alert`) | **12** |
| **WF-02: Kiểm tra Sức khỏe CSDL & Tự động Backup 02:00 AM** | `02_db_health_automated_backup.json` | Schedule Cron (`0 2 * * *`) | **12** |
| **WF-03: Thu thập Crash Log 500 & Trợ lý Chẩn đoán AI Debugger** | `03_system_incident_ai_debugger.json` | Webhook (`POST /webhook/incident-alert`) | **12** |

---

# 1. CHI TIẾT QUY TRÌNH WF-01: BRUTE-FORCE DEFENSE & FIREWALL (12 NODES)

### 🎯 Mục tiêu nghiệp vụ
Bảo vệ các tài khoản quản trị (`SUPERADMIN`, `HR`) trước các cuộc tấn công dò quét mật khẩu tự động (Credential Stuffing / Brute-force). Hệ thống tự động phát hiện, tính toán thời gian khóa tăng dần, gọi API cập nhật danh sách đen (Blacklist) và gửi báo động đỏ về Telegram DevSecOps.

### 📋 Bảng phân tích chi tiết từng Node:

| STT | Tên Node | Loại Node (Type) | Chức năng & Xử lý kỹ thuật |
| :---: | :--- | :--- | :--- |
| **1** | `1. Webhook Security Event` | `n8n-nodes-base.webhook` | Tiếp nhận gói tin JSON từ Backend NestJS khi có thao tác đăng nhập thất bại. |
| **2** | `2. Sanitize & Parse Network Info` | `n8n-nodes-base.code` | Bóc tách địa chỉ IP (chuyển đổi IPv6 `::ffff:x.x.x.x` về IPv4 chuẩn), email mục tiêu, User-Agent và phân loại tài khoản nhạy cảm (`isPrivilegedTarget`). |
| **3** | `3. Rate Limiter & Attempt Counter` | `n8n-nodes-base.code` | Đếm số lần thử thất bại trong khung thời gian 15 phút. Nếu nhắm vào tài khoản SUPERADMIN, hệ số cảnh báo được kích hoạt nhanh hơn. |
| **4** | `4. IF Limit Exceeded (>= 5)?` | `n8n-nodes-base.if` | Rẽ nhánh điều kiện: Nếu số lần sai $\ge 5$, chuyển sang quy trình phong tỏa; nếu nhỏ hơn, chỉ ghi log giám sát. |
| **5** | `5. Calc Ban Window & Incident ID` | `n8n-nodes-base.code` | Sinh mã sự cố duy nhất (`INC-BRUTE-XXXX`), tính toán thời gian phạt: Khóa 60 phút (user thường) hoặc 1.440 phút (24 giờ đối với tấn công Admin). |
| **6** | `6. Sync Blacklist to Backend API` | `n8n-nodes-base.httpRequest` | Gọi endpoint `POST /api/auth/block-ip` của Backend để đồng bộ IP vào bộ nhớ Cache/Blacklist, từ chối mọi kết nối từ IP này ngay tại Middleware. |
| **7** | `7. Gemini AI Threat Classifier` | `n8n-nodes-base.code` | Đánh giá mức độ nguy hiểm: Phân biệt giữa người dùng gõ nhầm pass và hành vi quét botnet tự động. |
| **8** | `8. Switch Risk Severity Tier` | `n8n-nodes-base.switch` | Rẽ 2 luồng phản ứng: Mức báo động đỏ (`CRITICAL_ATTACK`) và mức cảnh báo cao (`HIGH_SUSPICIOUS`). |
| **9** | `9. Telegram Alert DevSecOps` | `n8n-nodes-base.telegram` | Bắn tin nhắn khẩn cấp vào kênh Telegram An ninh kèm IP, số lần thử và nút mở khóa khẩn cấp nếu là nhầm lẫn. |
| **10** | `10. Gmail Security Warning to User` | `n8n-nodes-base.gmail` | Tự động gửi email cảnh báo cho chủ sở hữu tài khoản: *"Tài khoản của bạn vừa bị thử mật khẩu bất thường từ IP [x]"*. |
| **11** | `11. MySQL Security Audit Logger` | `n8n-nodes-base.mySql` | Ghi vết toàn bộ dữ liệu kiểm toán vào bảng `audit_logs` để lưu bằng chứng pháp lý và truy vết. |
| **12** | `12. Respond HTTP 202 Accepted` | `n8n-nodes-base.respondToWebhook` | Phản hồi mã HTTP 202 cho Backend xác nhận n8n đã tiếp nhận và thực thi phong tỏa an ninh. |

---

# 2. CHI TIẾT QUY TRÌNH WF-02: DATABASE HEALTH & AUTOMATED BACKUP (12 NODES)

### 🎯 Mục tiêu nghiệp vụ
Đảm bảo tính toàn vẹn và sẵn sàng cao của hệ thống (Disaster Recovery). Chạy tự động lúc 02:00 sáng hàng ngày: Đo lường sức khỏe server, tính toán % dung lượng CSDL sử dụng, sao lưu nén file `.sql.gz` và báo cáo tình trạng cho Ban Quản trị.

### 📋 Bảng phân tích chi tiết từng Node:

| STT | Tên Node | Loại Node (Type) | Chức năng & Xử lý kỹ thuật |
| :---: | :--- | :--- | :--- |
| **1** | `1. Schedule 02:00 AM Cron` | `n8n-nodes-base.scheduleTrigger` | Hẹn giờ tự động kích hoạt vào lúc 02:00 sáng mỗi ngày (`0 2 * * *`). |
| **2** | `2. Ping Backend Health Check` | `n8n-nodes-base.httpRequest` | Gọi `/api/system-config/health` kiểm tra Uptime, RAM Heap và trạng thái sống của Backend. |
| **3** | `3. IF Backend Is Online?` | `n8n-nodes-base.if` | Kiểm tra phản hồi HTTP Status Code: Nếu 200 OK thì tiếp tục sao lưu; nếu server chết, chuyển hướng cứu hộ khẩn cấp. |
| **4** | `4. MySQL Query Database Metrics` | `n8n-nodes-base.mySql` | Chạy query `information_schema.tables` tính toán tổng dung lượng (MB) và số bảng thực thể trong CSDL `hr_enterprise_db`. |
| **5** | `5. Calculate Storage & Metrics` | `n8n-nodes-base.code` | Tính toán % hạn ngạch ổ đĩa đã sử dụng, tạo tên file backup chuẩn hóa (`db_backup_BKP-YYYYMMDD-0200.sql.gz`). |
| **6** | `6. IF Storage Warning (>80%)?` | `n8n-nodes-base.if` | Kiểm tra xem CSDL có vượt quá 80% định mức cho phép hay không để gắn cờ báo động. |
| **7** | `7. Trigger DB Snapshot Dump` | `n8n-nodes-base.httpRequest` | Gọi tiến trình sao lưu CSDL nén ngầm độc lập ngoài luồng web. |
| **8** | `8. Format Health Report HTML` | `n8n-nodes-base.code` | Tạo bảng biểu HTML báo cáo tổng quan hạ tầng, hiển thị dung lượng, số lượng bảng và trạng thái an toàn. |
| **9** | `9. Telegram Alert Tech Lead` | `n8n-nodes-base.telegram` | Bắn tin nhắn tóm tắt nhanh vào nhóm chat Kỹ thuật: *"✅ Sao lưu CSDL 02:00 AM thành công (38.5MB)"*. |
| **10** | `10. Gmail Executive DB Digest` | `n8n-nodes-base.gmail` | Gửi email báo cáo định kỳ chi tiết kèm dung lượng và trạng thái máy chủ cho Tech Lead. |
| **11** | `11. MySQL Clean Old Session Logs` | `n8n-nodes-base.mySql` | Dọn dẹp các bản ghi log tạm, token hết hạn cũ hơn 90 ngày để tối ưu hóa hiệu năng CSDL. |
| **12** | `12. Set Completed State` | `n8n-nodes-base.set` | Ghi nhận trạng thái hoàn thành ca trực bảo trì đêm an toàn. |

---

# 3. CHI TIẾT QUY TRÌNH WF-03: SYSTEM INCIDENT & AI DEBUGGER (12 NODES)

### 🎯 Mục tiêu nghiệp vụ
Đóng vai trò là "Trạm cấp cứu sự cố độc lập" (External Incident Dispatcher). Khi Backend gặp lỗi Uncaught Exception 500, n8n bắt lấy stack trace, nhờ AI Gemini chẩn đoán nguyên nhân gốc rễ, gợi ý mã code fix và phân loại gửi thông báo đích danh tới Trưởng nhóm hoặc DBA.

### 📋 Bảng phân tích chi tiết từng Node:

| STT | Tên Node | Loại Node (Type) | Chức năng & Xử lý kỹ thuật |
| :---: | :--- | :--- | :--- |
| **1** | `1. Webhook Incident Event` | `n8n-nodes-base.webhook` | Lắng nghe gói tin báo lỗi từ bộ lọc `HttpExceptionFilter` của Backend NestJS. |
| **2** | `2. Parse Stack Trace & File Line` | `n8n-nodes-base.code` | Trích xuất Regex tìm ra chính xác tên tệp tin bị lỗi (VD: `training.service.ts`) và số dòng code gặp sự cố. |
| **3** | `3. Deduplication & Incident Ref` | `n8n-nodes-base.code` | Sinh mã sự cố duy nhất (`ERR-XXXX`), tính toán chữ ký số của lỗi để chống bão tin nhắn (Storm Throttling). |
| **4** | `4. IF Is Serious Incident (>=500)?` | `n8n-nodes-base.if` | Phân loại lỗi: Lỗi hệ thống nghiêm trọng (500) được kích hoạt báo động ngay lập tức; lỗi người dùng (400, 404) chỉ ghi nhận thống kê. |
| **5** | `5. Gemini AI Root Cause Analysis` | `n8n-nodes-base.code` | Trợ lý AI phân tích stack trace, chỉ ra nguyên nhân gốc rễ (Root Cause) và giải pháp khắc phục bằng mã nguồn cụ thể. |
| **6** | `6. Format Actionable Playbook` | `n8n-nodes-base.code` | Định dạng bản tin sự cố chuẩn kỹ thuật: Endpoint, File/Dòng lỗi, Chẩn đoán AI và Hướng dẫn khắc phục. |
| **7** | `7. Switch Incident Type` | `n8n-nodes-base.switch` | Phân loại luồng xử lý: Sự cố CSDL (`DATABASE_CRITICAL`) vs Sự cố Logic lập trình (`LOGIC_HIGH`). |
| **8** | `8. Telegram Alert DBA Lead` | `n8n-nodes-base.telegram` | Bắn tin nhắn khẩn cấp vào kênh CSDL kèm tag `@DBA_Lead` khi lỗi liên quan đến MySQL/Deadlock. |
| **9** | `9. Telegram Alert Dev Lead` | `n8n-nodes-base.telegram` | Bắn tin nhắn vào kênh Kỹ thuật kèm tag `@Backend_Dev` đính kèm đoạn code gợi ý của Gemini để fix bug. |
| **10** | `10. MySQL Incident Logger` | `n8n-nodes-base.mySql` | Lưu vết sự cố vào bảng `audit_logs` để phục vụ đo lường thời gian khắc phục sự cố (MTTR). |
| **11** | `11. Gmail Technical Digest` | `n8n-nodes-base.gmail` | Gửi email báo cáo kỹ thuật chi tiết kèm toàn bộ stack trace cho Ban Quản trị. |
| **12** | `12. Respond HTTP 200 Handled` | `n8n-nodes-base.respondToWebhook` | Trả về mã phản hồi HTTP 200 cho Backend xác nhận sự cố đã được tiếp nhận và phân phối thành công. |

---

# 💡 TẠI SAO BẢN THIẾT KẾ NÀY KHÔNG THỂ BỊ BẮT BẺ TRƯỚC HỘI ĐỒNG?

1. **Chuẩn số lượng:** Đúng 3 quy trình, mỗi quy trình đạt chính xác **12 nodes**.
2. **Không trùng lặp Backend:**
   - Backend làm nhiệm vụ nghiệp vụ (Auth JWT, CRUD CSDL, chấm điểm CV, AI Copilot).
   - n8n làm nhiệm vụ điều phối bên ngoài (Tường lửa WAF, Cron Job sao lưu đêm, Trạm cấp cứu bắt lỗi độc lập).
3. **Đa dạng các loại Node n8n:** Webhook, Schedule Trigger, Code (JavaScript), IF, Switch, HTTP Request, MySQL, Telegram, Gmail, Respond to Webhook.
