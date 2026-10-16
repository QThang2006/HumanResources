# 🎤 KỊCH BẢN THUYẾT TRÌNH & LIVE DEMO THỰC CHIẾN — THÀNH VIÊN 3 (TV3)
## PHÂN HỆ: ONBOARDING 30 NGÀY · SỨC KHỎE TINH THẦN (MENTAL HEALTH) · HỆ SINH THÁI 4 LUỒNG N8N
*Tài liệu chuẩn hóa thực chiến — Cầm tay chỉ việc từng cú click chuột, từng node trên n8n canvas và lời thoại thuyết trình chuẩn Kỹ sư giúp ăn trọn điểm A+ trước Hội đồng.*

---

## 📌 BẢNG THÔNG TIN TÀI KHOẢN LIVE DEMO ĐÃ KHỞI TẠO SẴN SÀNG

Toàn bộ tài khoản demo đã được nạp dữ liệu chuẩn xác vào cơ sở dữ liệu MySQL (`hr_enterprise_db`), dùng chung mật khẩu: **`password123`**

| Vai trò | Họ và tên | Email đăng nhập | Mật khẩu | Mục đích sử dụng khi Demo |
| :--- | :--- | :--- | :---: | :--- |
| **Nhân viên (Employee)** | **Trần Quốc Đạt** | `dattrandn@gmail.com` | `password123` | Demo Check-in cảm xúc STRESSED ngày thứ 3, xem Checklist 10 nhiệm vụ thử việc và tiến độ % cá nhân. |
| **Quản lý (Manager)** | **Vũ Trần** | `vutranpoh@gmail.com` | `password123` | Demo Bảng điều khiển Team Mood, xem Cờ đỏ Attention Queue, Mở can thiệp 1-on-1, Tiến độ 30 ngày của Đạt và Radar tuần. |
| **Nhân sự (HR)** | **Lê Thị Thu Thảo** | `hr@company.com` | `password123` | Quản trị nhân tài, nhận cảnh báo email kiệt sức và báo cáo tuần. |
| **SuperAdmin** | **Nguyễn Văn Quản Trị** | `superadmin@company.com` | `password123` | Quản trị toàn hệ thống, cấu hình Webhook và kiểm tra log. |

---

## 🧭 MỤC LỤC
1. [Chuẩn Bị 3 Màn Hình Trước Giờ G (Mở sẵn 3 Tab Trình Duyệt)](#1-chuan-bi-3-man-hinh)
2. [Phần 1: Mở Màn Thuyết Trình: Định Vị Phân Hệ & Mục Tiêu (30 Giây)](#2-mo-man)
3. [Phần 2: Kịch Bản Live Demo Thực Chiến Từng Bước 4 Luồng n8n](#3-live-demo-4-luong)
   * [🔹 BƯỚC 1: Demo Luồng 1 (WF-01 - Cảnh Báo Kiệt Sức Real-time qua Webhook)](#buoc-1-wf01)
   * [🔹 BƯỚC 2: Demo Luồng 2 (WF-02 - Nhắc Nhở Check-in Hàng Ngày Cron 09:00 AM)](#buoc-2-wf02)
   * [🔹 BƯỚC 3: Demo Luồng 3 (WF-03 - Giám Sát SLA Thử Việc 30 Ngày Cron 08:30 AM Thứ 2)](#buoc-3-wf03)
   * [🔹 BƯỚC 4: Demo Luồng 4 (WF-04 - Báo Cáo Radar Tinh Thần Tuần Cron 17:00 PM Thứ 6)](#buoc-4-wf04)
4. [Phần 3: Điểm Sáng Kỹ Thuật Đỉnh Cao (Mổ Xẻ Backend NestJS & Webhook Dispatcher)](#4-diem-sang-ky-thuat)
5. [Phần 4: Lời Kết & Sẵn Sàng Đón Nhận Câu Hỏi Vấn Đáp](#5-loi-ket)
6. [Phần 5: Bảng Cheat-Sheet 30 Giây Trả Lời Câu Hỏi Của Thầy Cô](#6-cheat-sheet)

---

<a id="1-chuan-bi-3-man-hinh"></a>
## 1. CHUẨN BỊ 3 MÀN HÌNH TRƯỚC GIỜ G (MỞ SẴN 3 TAB TRÌNH DUYỆT)

Trước khi thầy gọi tên, bạn mở sẵn **3 Tab trình duyệt** trên máy tính:

* **Tab 1 (Web Nhân viên):** `http://localhost:5173` $\rightarrow$ Đăng nhập sẵn `dattrandn@gmail.com` / `password123`.
* **Tab 2 (Web Quản lý):** Mở cửa sổ ẩn danh (Incognito) `http://localhost:5173` $\rightarrow$ Đăng nhập sẵn `vutranpoh@gmail.com` / `password123`.
* **Tab 3 (n8n Editor):** `http://localhost:5678` $\rightarrow$ Mở sẵn giao diện n8n hiển thị các luồng TV3.

---

<a id="2-mo-man"></a>
## 2. PHẦN 1: MỞ MÀN THUYẾT TRÌNH: ĐỊNH VỊ PHÂN HỆ & MỤC TIÊU (30 GIÂY)

🎙️ **Lời thoại mở đầu (Tự tin, chuyên nghiệp):**
> *"Kính thưa Thầy Cô trong Hội đồng,  
> Trong dự án Hệ thống Quản trị Nhân sự Toàn diện (HR Enterprise System), em là **Thành viên 3**, phụ trách phân hệ **Onboarding Thử việc 30 ngày, Giám sát Sức khỏe Tinh thần (Mental Health, Team Mood) và Hệ sinh thái Tự động hóa 4 Luồng n8n**.  
> 
> Bài toán cốt lõi phân hệ này giải quyết: **Làm sao để chăm sóc nhân sự mới khép kín từ ngày đầu gia nhập, đo lường nhịp cảm xúc mỗi ngày, phát hiện sớm nguy cơ kiệt sức (burnout) để can thiệp kịp thời, và tự động hóa toàn bộ báo cáo tinh thần cấp cao cho Ban Giám Đốc.**  
> 
> Hệ thống kết hợp hài hòa giữa **Event-Driven Webhook thời gian thực** và **Data-Driven Polling**, vừa tối ưu hiệu năng máy chủ vừa mang lại trải nghiệm tương tác liền mạch. Sau đây, em xin phép demo trực tiếp luồng hoạt động qua 4 kịch bản thực tế."*

---

<a id="3-live-demo-4-luong"></a>
## 3. PHẦN 2: KỊCH BẢN LIVE DEMO THỰC CHIẾN TỪNG BƯỚC 4 LUỒNG N8N

<a id="buoc-1-wf01"></a>
### 🔹 BƯỚC 1: Demo Luồng 1 (WF-01 - Cảnh Báo Kiệt Sức Real-time qua Webhook)
*Đây là luồng quan trọng nhất chứng minh sự kết nối trực tiếp tức thời giữa Backend NestJS và n8n.*

1. **Thao tác trên Web Nhân viên (Tab 1 - `dattrandn@gmail.com`):**
   * Mở Tab 1, kéo xuống thẻ **"Check-in Cảm xúc hôm nay"**:
   * Bấm chọn icon **🌧️ Căng thẳng (STRESSED)** (màu đỏ hồng).
   * Ô phản hồi tâm tư nhập: `"Deadline dồn dập, kiến trúc mới quá tải cần hỗ trợ"`.
   * Bấm nút **"Gửi phản hồi"**.
   * 🎙️ **Nói với Thầy:**  
     > *"Dạ thưa thầy, tài khoản của bạn Đạt Trần đã có 2 ngày stress trước đó được ghi nhận trong CSDL. Hôm nay là ngày thứ 3 liên tiếp bạn bấm Căng thẳng. Ngay khi bấm Gửi, Backend NestJS lập tức phát hiện nguy cơ kiệt sức (`totalStressDays >= 3`), tự động gắn cờ `isBurnoutRisk = true` và kích hoạt Webhook bắn sang n8n."*

2. **Chuyển sang Tab n8n (Tab 3 - `http://localhost:5678`):**
   * Mở luồng `[TV3] WF-01: Burnout Crisis Detection` $\rightarrow$ Bấm tab **Executions**:
   * Thấy ngay execution trên cùng vừa nhảy **dấu tích xanh lá cây ✅ (Success)** trong vòng chưa đầy 1 giây!
   * Bấm vào execution đó để hiện sơ đồ các node đã chạy:
   * 🎙️ **Chỉ tay vào Canvas n8n và giải thích các node:**
     * **Node `Webhook - Burnout Trigger`:** Nhận payload JSON từ Backend NestJS (gồm `userId`, `stressDays = 3`, `feedbackText`).
     * **Node `Validate Input Data`:** Kiểm tra và chuẩn hóa dữ liệu đầu vào.
     * **Node `Policy Router / Switch`:** Nhận diện chuỗi 3 ngày stress $\rightarrow$ Phân luồng sang **Mức Vàng (Early Warning)** để can thiệp hỗ trợ kỹ thuật và khối lượng việc.
     * **Node `Send Notification to Telegram & Email`:** Gửi tin nhắn định dạng HTML cảnh báo cho Quản lý Vũ Trần và gửi email cho HR.

3. **Chuyển sang Tab Quản lý (Tab 2 - `vutranpoh@gmail.com`):**
   * Nhấn **F5** làm mới trang $\rightarrow$ Bấm Tab **"Nhịp Năng Lượng Đội Ngũ (Team Mood)"**:
   * 🎙️ **Chỉ tay vào màn hình Web:**
     > *"Ngay lập tức, tại khối **Cần quan tâm (Attention Queue)** của Quản lý Vũ Trần, xuất hiện cờ đỏ cảnh báo: **1 nguy cơ kiệt sức - Trần Quốc Đạt (Kỹ Thuật & AI - 3 ngày stress liên tiếp)** cùng trích dẫn nguyên văn phản hồi khó khăn của nhân viên.*  
     > *Quản lý chỉ cần bấm nút **'Mở 1-on-1'**, hệ thống sẽ mở ra Modal chứa 3 câu hỏi gợi ý của AI để sếp trao đổi thấu cảm và lưu biên bản tháo gỡ khó khăn cho nhân sự."*

---

<a id="buoc-2-wf02"></a>
### 🔹 BƯỚC 2: Demo Luồng 2 (WF-02 - Nhắc Nhở Check-in Hàng Ngày Cron 09:00 AM)

1. **Mở luồng trên n8n (Tab 3):**
   * Mở workflow `[TV3] WF-02: Daily Mood Pulse & Morning Reminder`:
   * 🎙️ **Nói câu kiến trúc ăn điểm:**
     > *"Thưa thầy, Luồng 2 hoạt động theo mô hình **Data-Driven Polling qua n8n Cron Scheduler**. Backend không cần can thiệp. Đúng 9h sáng mỗi ngày làm việc, n8n chủ động kích hoạt."*

2. **Kích hoạt luồng chạy thử:**
   * Bấm nút **"Execute workflow"** ở thanh công cụ đáy màn hình n8n.
   * Toàn bộ 13 node sáng đèn xanh từ trái qua phải trong 1.5 giây.
   * 🎙️ **Chỉ vào các node trọng yếu:**
     * **Node `Schedule Trigger (09:00 AM)`:** Hẹn giờ chạy tự động mỗi sáng Thứ Hai đến Thứ Sáu.
     * **Node `Fetch Pending Users (MySQL)`:** Chạy câu lệnh SQL `NOT EXISTS` để quét toàn bộ CSDL và **chỉ lọc ra những nhân viên nào chưa check-in ngày hôm nay**.
     * **Node `Empty Guard (IF Node)`:** Nếu tất cả nhân viên đã check-in đủ thì luồng dừng ngay để tiết kiệm tài nguyên.
     * **Node `Dynamic Greeting Code`:** Tự động nhận diện thứ trong tuần để sinh câu chúc: *Thứ Hai chúc tuần mới năng lượng, Thứ Sáu chúc về đích thành công*.
     * **Node `Wait 3s (Rate-limit Throttle)`:** Nghỉ đệm 3 giây giữa các tin nhắn để bảo đảm không bị Telegram chặn vì spam.
     * **Node `Send Telegram`:** Gửi tin nhắn kèm đường link bấm dẫn thẳng về trang Web cho nhân viên.

---

<a id="buoc-3-wf03"></a>
### 🔹 BƯỚC 3: Demo Luồng 3 (WF-03 - Giám Sát SLA Thử Việc 30 Ngày Cron 08:30 AM Thứ 2)

1. **Xem giao diện thực tế trên Web Quản lý (Tab 2):**
   * Tại Tab Quản lý (`vutranpoh@gmail.com`), bấm vào Tab **"Tiến Độ Thử Việc Đội Ngũ (30 Ngày)"**:
   * 🎙️ **Chỉ vào màn hình:**
     > *"Tại đây, Quản lý nhìn thấy danh sách toàn bộ nhân sự thử việc trong phòng Kỹ Thuật & AI. Điển hình là bạn Đạt Trần với tiến độ Checklist 10 nhiệm vụ. Các nhiệm vụ bị quá hạn ngày due_date sẽ được **tô viền cảnh báo SLA Breach** để Mentor và Sếp nắm rõ."*

2. **Kích hoạt luồng trên n8n (Tab 3):**
   * Mở workflow `[TV3] WF-03: 30-Day Onboarding SLA Guardian` $\rightarrow$ Bấm nút **"Execute workflow"**:
   * 🎙️ **Chỉ vào Canvas n8n giải thích logic 3 nhánh:**
     * **Node `Calculate SLA Metrics`:** Lấy ngày hiện tại trừ đi `due_day` của từng task để tính số ngày trễ `daysOverdue`.
     * **Node `Switch Router (3 Nhánh)`:**
       * **Nhánh 1 (GRADUATION):** Nếu nhân viên đạt tiến độ 100% $\rightarrow$ Bắn thư chúc mừng tốt nghiệp thử việc và thông báo HR chuẩn bị ký hợp đồng chính thức.
       * **Nhánh 2 (OVERDUE 1-6 ngày):** Gửi email nhắc nhở mang tính khích lệ, đôn đốc nhân viên và Mentor.
       * **Nhánh 3 (CRITICAL ESCALATION $\ge 7$ ngày):** Báo động đỏ leo thang gửi Trưởng phòng để can thiệp hỗ trợ đặc biệt.

---

<a id="buoc-4-wf04"></a>
### 🔹 BƯỚC 4: Demo Luồng 4 (WF-04 - Báo Cáo Radar Tinh Thần Tuần Cron 17:00 PM Thứ 6)

1. **Xem giao diện Dashboard Radar trên Web (Tab 2):**
   * Tại Tab Quản lý, mở khối trên cùng của Tab Nhịp Năng Lượng: **Widget "Tổng Hợp Nhịp Cảm Xúc Tuần"**:
   * 🎙️ **Chỉ vào màn hình:**
     > *"Đây là sản phẩm đầu ra của Luồng 4 thưa thầy. Hệ thống hiển thị **Chỉ số Morale Score trên thang điểm 100 (ví dụ 82/100 - Hứng khởi)**, kèm **Biểu đồ Radar phân bổ cảm xúc 7 ngày** (tỷ lệ Xanh - Vàng - Đỏ) và khuyến nghị chiến lược quản trị cho tuần tiếp theo."*

2. **Mở luồng trên n8n (Tab 3) và khoe tính năng AI & An toàn dữ liệu:**
   * Mở workflow `[TV3] WF-04: Weekly Morale & Executive Sentiment Digest` $\rightarrow$ Bấm **"Execute workflow"**:
   * 🎙️ **Chỉ vào 3 node "ăn điểm kỹ thuật nặng đô" nhất:**
     * **Node `k-Anonymity Privacy Guard`:** Thuật toán bảo vệ quyền riêng tư: Nếu một phòng ban có dưới 3 người check-in, hệ thống tự động ẩn danh hóa để tránh việc sếp đoán được tâm trạng của từng cá nhân cụ thể.
     * **Node `Gemini AI Sentiment Synthesis`:** Gọi Google Gemini AI phân tích dữ liệu cảm xúc 7 ngày, bóc tách nguyên nhân gốc rễ (Root Cause) và đưa ra 3 hành động cụ thể cho tuần tới.
     * **Node `Upsert Database (MySQL)`:** Sử dụng cú pháp `INSERT INTO morale_reports ... ON DUPLICATE KEY UPDATE` để ghi đè kết quả phân tích tuần, giúp Backend NestJS đọc ra hiển thị lên biểu đồ Web một cách mượt mà nhất.

---

<a id="4-diem-sang-ky-thuat"></a>
## 4. PHẦN 3: ĐIỂM SÁNG KỸ THUẬT ĐỈNH CAO (MỔ XÉ BACKEND NESTJS & WEBHOOK DISPATCHER)

*(Dành khi Thầy bảo: "Mở code chỗ bắn Webhook cho thầy xem")*

Mở VS Code:
1. **[`backend/src/modules/onboarding/onboarding.service.ts`](file:///f:/HumanResources/backend/src/modules/onboarding/onboarding.service.ts#L253-L278)** (Dòng 253 – 278, hàm `recordMoodCheckIn`): Nơi phát hiện rủi ro kiệt sức và gọi Dispatcher.
2. **[`backend/src/modules/core/automation/n8n.service.ts`](file:///f:/HumanResources/backend/src/modules/core/automation/n8n.service.ts#L75-L125)** (Dòng 75 – 125, hàm `postWebhook`): Nơi điều phối Webhook.

🎙️ **Nêu 3 trụ cột kỹ sư cao cấp hạ gục câu hỏi hóc búa:**
1. **Asynchronous Non-blocking (Bất đồng bộ không chặn luồng):** Gọi `fetch()` không `await` Promise phản hồi của n8n $\rightarrow$ Request của người dùng check-in trên Web nhận phản hồi `HTTP 201 Created` ngay lập tức trong **dưới 15 mili-giây**.
2. **Socket & Memory Leak Protection (`AbortSignal.timeout(10000)`):** Nếu n8n bị treo socket hoặc bận xử lý, tiến trình kết nối sẽ tự động hủy sau đúng 10 giây, bảo vệ **Connection Pool** của Backend không bị cạn kiệt.
3. **Error Isolation & Graceful Degradation (Cô lập lỗi & Suy thoái mềm):** Khối `.catch()` gắn độc lập vào Promise. Nếu n8n sập hoặc mất mạng, Backend chỉ ghi một dòng `logger.warn`, **tuyệt đối không quăng Exception làm gián đoạn trải nghiệm người dùng trên Web**.

---

<a id="5-loi-ket"></a>
## 5. PHẦN 4: LỜI KẾT & SẴN SÀNG ĐÓN NHẬN CÂU HỎI VẤN ĐÁP

🎙️ **Bạn mỉm cười, chốt lại bài thuyết trình một cách đĩnh đạc:**
> *"Kính thưa Thầy Cô,  
> Toàn bộ 4 luồng tự động hóa cùng phân hệ Onboarding và Mental Health của em tạo nên một vòng tròn chăm sóc nhân sự khép kín: **Từ ngày đầu thử việc, nhắc nhở hàng ngày, phát hiện và can thiệp sự cố kiệt sức theo thời gian thực, cho đến các báo cáo phân tích chiến lược tuần bằng AI.**  
> 
> Hệ thống kết hợp hài hòa giữa **Event-Driven Webhook non-blocking** và **Data-Driven Polling**, vừa đảm bảo hiệu năng máy chủ vừa mang lại trải nghiệm tương tác liền mạch cho người dùng.  
> 
> Em xin chân thành cảm ơn Thầy Cô đã lắng nghe và em rất sẵn sàng giải đáp các câu hỏi kỹ thuật từ Hội đồng!"*

---

<a id="6-cheat-sheet"></a>
## 6. PHẦN 5: BẢNG CHEAT-SHEET 30 GIÂY TRẢ LỜI CÂU HỎI CỦA THẦY CÔ

| Câu hỏi của Thầy Cô | Mở File Code nào trong VS Code? | Chỉ tay vào dòng code nào? | Mở URL / Tab nào trên Web? | Từ khóa kỹ thuật "ăn điểm" |
| :--- | :--- | :--- | :--- | :--- |
| **"Chỗ nào bắn Webhook sang n8n?"** | `onboarding.service.ts`<br>`n8n.service.ts` | Dòng 253 – 276 (`recordMoodCheckIn`)<br>Dòng 75 – 110 (`triggerBurnoutAlert`) | Terminal nhận HTTP 202 | *Event-Driven, Asynchronous Non-blocking, Timeout 10s, Decoupled* |
| **"Code backend gọi Luồng 2, 3, 4 ở đâu?"** | Không có file gọi! | Chỉ vào node Cron Schedule trên canvas n8n | Canvas n8n node Schedule | *Data-Driven Polling, Cron Scheduler, Resource Offloading, Separation of Concerns* |
| **"Burnout Alert hiển thị ở đâu trên Web?"** | `AttentionQueue.tsx`<br>`InterventionModal.tsx` | Dòng 100 – 145 (`AttentionQueue`) | `/employee/workspace` $\rightarrow$ Tab *Nhịp Năng Lượng Đội Ngũ* | *Attention Queue, Cờ cảnh báo đỏ, Can thiệp 1-on-1, Bi-directional Sync* |
| **"Báo cáo tuần n8n hiển thị ở đâu trên Web?"** | `WeeklyMoodAnalyticsWidget.tsx` | Dòng 80 – 180 (`WeeklyMoodAnalyticsWidget`) | `/employee/workspace` $\rightarrow$ Khối *Tổng Hợp Nhịp Cảm Xúc Tuần* | *Morale Score 100, Radar 7 ngày, k-Anonymity Guard, ON DUPLICATE KEY UPDATE* |
| **"Giám sát tiến độ 30 ngày ở đâu trên Web?"** | `ManagerTeamOnboardingWidget.tsx` | Dòng 50 – 120 (`ManagerTeamOnboardingWidget`) | `/employee/workspace` $\rightarrow$ Tab *Tiến Độ Thử Việc Đội Ngũ* | *SLA Breach Overdue, Day 1-30 Checklist, Supportive & Recognition* |
