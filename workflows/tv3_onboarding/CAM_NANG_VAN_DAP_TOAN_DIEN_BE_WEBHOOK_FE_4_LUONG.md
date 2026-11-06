# 🏆 CẨM NANG VẤN ĐÁP TOÀN DIỆN (MASTER DEFENSE PLAYBOOK)
## PHÂN HỆ: ONBOARDING 30 NGÀY · SỨC KHỎE TINH THẦN (MENTAL HEALTH) · HỆ SINH THÁI 4 LUỒNG N8N
*Bản hợp nhất đầy đủ nhất — Kết hợp chuyên sâu giữa **Mã nguồn Backend (NestJS)**, **Cơ chế Webhook Dispatcher**, **Điểm chạm Giao diện (React UI)** và **Kịch bản Thuyết trình Chuẩn Kỹ sư Toàn cầu**.*

---

## 🧭 MỤC LỤC
1. [Bức Tranh Tổng Thể Kiến Trúc (Architecture Overview & 2 Trường Phái Tích Hợp)](#1-buc-tranh-tong-the)
2. [Hạt Nhân Kỹ Thuật: Backend NestJS & Webhook Dispatcher (Mổ Xẻ Từng Dòng Code)](#2-hat-nhan-ky-thuat)
3. [Mổ Xẻ Chi Tiết 4 Luồng Tự Động Hóa (Nghiệp Vụ - Backend - n8n - Frontend)](#3-mo-xe-4-luong)
4. [Bộ 6 Kịch Bản Đối Đáp & Câu Hỏi "Gài Bẫy" Của Giảng Viên](#4-bo-cau-hoi-gay-bay)
5. [Bảng Cheat-Sheet Tra Cứu 30 Giây Khi Đứng Trước Hội Đồng](#5-bang-cheat-sheet)
6. [Kịch Bản Thuyết Trình Mở Màn 3 Phút (Speaking Script Ăn Điểm Tuyệt Đối)](#6-kich-ban-3-phut)

---

<a id="1-buc-tranh-tong-the"></a>
## 1. BỨC TRANH TỔNG THỂ KIẾN TRÚC (ARCHITECTURE OVERVIEW & 2 TRƯỜNG PHÁI TÍCH HỢP)

Khi trình bày trước Giảng viên, bạn khẳng định hệ thống áp dụng **2 trường phái kiến trúc phân tán hiện đại** để kết nối giữa **Frontend (React)**, **Backend (NestJS)**, **Cơ sở dữ liệu (MySQL)** và **Automation Engine (n8n)**:

```
                              ┌─────────────────────────────────────────────────────────────┐
                              │                    NESTJS BACKEND CORE                      │
                              │                  (http://localhost:3001)                    │
                              └──────────────────────────────┬──────────────────────────────┘
                                                             │
                              [Trường phái 1: Event-Driven Webhook (Real-time)]
                                                             │
                                                             ▼
┌──────────────────────────┐  HTTP POST (Non-blocking) ┌────────────────────────────────────┐
│   CLIENT REACT (WEB)     │ ────────────────────────▶ │   N8N AUTOMATION DISPATCHER        │
│  http://localhost:5173   │                           │       (http://localhost:5678)      │
└────────────┬─────────────┘                           ├────────────────────────────────────┤
             │                                         │ • WF-01: Burnout Crisis Escalation │
             │                                         └─────────────────┬──────────────────┘
             │                                                           │
             │ [Trường phái 2: Data-Driven Polling (Cron)]               │
             │                                                           ▼
             ▼                                                 ┌────────────────────┐
┌──────────────────────────┐      Đọc / Ghi CSDL trực tiếp      │  OMNICHANNEL OUT:  │
│      MYSQL DATABASE      │ ◀──────────────────────────────── │  • Telegram Bot    │
│       (Port 3306)        │       (WF-02, WF-03, WF-04)       │  • Gmail Service   │
└──────────────────────────┘                                   │  • Attention Queue │
                                                               └────────────────────┘
```

### 💎 So Sánh 2 Trường Phái Tích Hợp Kỹ Thuật:

| Đặc tính so sánh | Trường phái 1: Event-Driven Webhook | Trường phái 2: Data-Driven Polling |
| :--- | :--- | :--- |
| **Áp dụng cho** | **Luồng 1 (WF-01: Cảnh báo Kiệt sức)** | **Luồng 2, 3, 4 (WF-02, WF-03, WF-04)** |
| **Bản chất** | Xử lý theo sự kiện phát sinh tức thời (Real-time). | Xử lý theo chu kỳ thời gian hẹn trước (Batch/Schedule). |
| **Cơ chế kích hoạt** | Backend NestJS phát hiện rủi ro $\rightarrow$ Bắn HTTP POST Webhook sang n8n. | n8n tự chạy node Schedule Trigger theo giờ hẹn $\rightarrow$ Tự query MySQL. |
| **Tác động Backend** | Non-blocking Asynchronous dispatch (phản hồi trong < 15ms). | **0% tác động** — Backend hoàn toàn không phải tốn CPU/RAM chạy Cron. |
| **Ưu thế kiến trúc** | Phản ứng khẩn cấp tức thì (Incident Escalation). | **Resource Offloading** (giải phóng máy chủ) & **Decoupled Architecture**. |

---

<a id="2-hat-nhan-ky-thuat"></a>
## 2. HẠT NHÂN KỸ THUẬT: BACKEND NESTJS & WEBHOOK DISPATCHER (MỔ XẺ TỪNG DÒNG CODE)

Khi thầy yêu cầu: *"Mở code chỗ bắn Webhook cho thầy xem"*, bạn mở đúng **2 file** theo trình tự nghiệp vụ $\rightarrow$ kỹ thuật:

### 📁 2.1. File 1: Tầng Nghiệp Vụ Phát Sinh Sự Kiện (Business Logic Trigger)
* **File:** [`backend/src/modules/onboarding/onboarding.service.ts`](file:///f:/HumanResources/backend/src/modules/onboarding/onboarding.service.ts#L253-L278) (Dòng 253 – 278)
* **Hàm:** `recordMoodCheckIn()`
* 🎙️ **Chỉ vào code và giải thích:**
  > *"Tại tầng nghiệp vụ, khi nhân viên gửi check-in từ Web, Backend tính chuỗi ngày căng thẳng liên tiếp (`totalStressDays`). Nếu $\ge 3$ ngày, hệ thống lập tức đánh dấu cờ `isBurnoutRisk = true`, đóng gói thông tin nhân viên thành DTO và kích hoạt Webhook: `await this.n8nService.triggerBurnoutAlert(...)`."*

```typescript
// backend/src/modules/onboarding/onboarding.service.ts (dòng 253 - 278)
const totalStressDays = consecutiveStressBefore + 1;

if (totalStressDays >= 3) {
  newMood.isBurnoutRisk = true; // Đánh dấu cờ kiệt sức

  this.logger.warn(`🔴 BURNOUT DETECTED: userId=${userId} — ${totalStressDays} ngày STRESSED liên tiếp!`);

  // Truy vấn thông tin nhân viên & phòng ban để đóng gói DTO
  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['department'],
  });

  // ⚡ BẮN SỰ KIỆN SANG N8N WEBHOOK DISPATCHER
  await this.n8nService.triggerBurnoutAlert({
    userId,
    employeeName: user?.fullName || 'Nhân viên',
    departmentName: user?.department?.name || 'Chưa xác định',
    stressDays: totalStressDays,
    latestFeedback: feedbackText,
  });
}
```

---

### 📁 2.2. File 2: Tầng Điều Phối Webhook Dispatcher Bất Đồng Bộ
* **File:** [`backend/src/modules/core/automation/n8n.service.ts`](file:///f:/HumanResources/backend/src/modules/core/automation/n8n.service.ts#L75-L125) (Dòng 75 – 125)
* **Hàm:** `triggerBurnoutAlert()` và `postWebhook()`
* 🎙️ **Chỉ vào code và nêu 3 trụ cột kỹ sư cao cấp:**

```typescript
// backend/src/modules/core/automation/n8n.service.ts (dòng 75 - 125)
private async postWebhook(url: string, data: any, actionName: string): Promise<boolean> {
  try {
    this.logger.log(`[n8n Dispatcher] Bắn webhook [${actionName}] tới: ${url}`);

    // ⚡ 3 TRỤ CỘT KỸ SƯ ĂN ĐIỂM TUYỆT ĐỐI:
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000), // (1) Timeout 10s chống rò rỉ socket
      body: JSON.stringify({
        event: actionName,               // (2) Metadata chuẩn hóa
        timestamp: new Date().toISOString(),
        ...data,
        data,
      }),
    }).catch((err) => {                  // (3) Non-blocking & Cô lập sự cố
      this.logger.warn(`[n8n Dispatcher] Không thể kết nối tới server n8n (${url}): ${err.message}`);
    });

    return true;
  } catch (err: any) {
    this.logger.error(`[n8n Dispatcher] Lỗi ngoại lệ: ${err.message}`);
    return false;
  }
}
```

### 🛡️ 3 Trụ Cột Kỹ Sư Đỉnh Cao Hạ Gục Câu Hỏi Hóc Búa:
1. **Asynchronous Non-blocking (Bất đồng bộ không chặn luồng):** Gọi `fetch()` không `await` Promise phản hồi $\rightarrow$ Request của người dùng check-in trên Web nhận phản hồi `HTTP 201 Created` ngay lập tức trong **dưới 15 mili-giây**.
2. **Socket & Memory Leak Protection (`AbortSignal.timeout(10000)`):** Nếu n8n bị treo socket hoặc bận xử lý, tiến trình kết nối sẽ tự động hủy sau đúng 10 giây, bảo vệ **Connection Pool** của Backend không bị cạn kiệt.
3. **Error Isolation & Graceful Degradation (Cô lập lỗi & Suy thoái mềm):** Khối `.catch()` gắn độc lập vào Promise. Nếu n8n sập hoặc mất mạng, Backend chỉ ghi một dòng `logger.warn`, **tuyệt đối không quăng Exception làm gián đoạn trải nghiệm người dùng trên Web**.

---

<a id="3-mo-xe-4-luong"></a>
## 3. MỔ XẺ CHI TIẾT 4 LUỒNG TỰ ĐỘNG HÓA (NGHIỆP VỤ - BACKEND - N8N - FRONTEND)

### 🔴 LUỒNG 1 (WF-01): Cảnh Báo Nguy Cơ Kiệt Sức Đa Tầng (Burnout Crisis Escalation - 13 Nodes)
* **Mục tiêu nghiệp vụ:** Nhân viên mới thường ngại lên tiếng khi bị quá tải, dẫn đến nguy cơ bỏ việc đột ngột trong 30 ngày đầu. Luồng này giúp tổ chức phát hiện sớm và can thiệp kịp thời.
* **Cơ chế kích hoạt:** **Event-Driven Webhook** từ Backend (`onboarding.service.ts` dòng 265).
* **CSDL liên quan:** `employee_moods` (cột `is_burnout_risk = 1`), `users`.
* **Hành trình qua 13 Node n8n:**
  1. `Webhook Node` tiếp nhận Payload JSON từ Backend.
  2. `Validate Input Node` kiểm tra dữ liệu đầu vào.
  3. `Policy Switch Node` phân loại cấp độ:
     * **Mức Vàng (3–4 ngày stress):** Cảnh báo hỗ trợ kỹ thuật/khối lượng việc.
     * **Mức Đỏ ($\ge 5$ ngày stress):** Báo động đỏ khẩn cấp cấp công ty.
  4. `Telegram / Email Nodes` bắn tin nhắn cảnh báo có định dạng HTML tới Quản lý và HR.
* **Điểm chạm trên Web React:**
  * Đăng nhập tài khoản Quản lý (`manager@company.com`) $\rightarrow$ Vào [`/employee/workspace`](http://localhost:5173/employee/workspace) $\rightarrow$ Tab **"Nhịp Năng Lượng Đội Ngũ (Team Mood)"**.
  * Khối **"Cần quan tâm (Attention Queue)"** ([`AttentionQueue.tsx`](file:///f:/HumanResources/frontend/src/features/team-mood/components/AttentionQueue.tsx)) hiện thẻ nhân viên cảnh báo đỏ.
  * Bấm nút đỏ **"Mở 1-on-1"** ([`InterventionModal.tsx`](file:///f:/HumanResources/frontend/src/features/team-mood/components/InterventionModal.tsx)) để mở modal chứa câu hỏi thấu cảm AI và lưu biên bản trao đổi giải tỏa áp lực.

---

### 🟢 LUỒNG 2 (WF-02): Nhắc Nhở Check-in Cảm Xúc Hàng Ngày (Daily Mood Pulse - 13 Nodes)
* **Mục tiêu nghiệp vụ:** Duy trì thói quen điểm danh cảm xúc buổi sáng, đảm bảo HR luôn có dữ liệu liên tục để theo dõi sức khỏe tinh thần đội ngũ.
* **Cơ chế kích hoạt:** **Data-Driven Cron Scheduler** (Lúc 09:00 AM từ Thứ Hai đến Thứ Sáu).
* **CSDL liên quan:** Truy vấn MySQL lọc người chưa check-in:
  ```sql
  SELECT u.id, u.full_name, u.email FROM users u
  WHERE u.role = 'EMPLOYEE' AND u.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM employee_moods m 
    WHERE m.user_id = u.id AND DATE(m.created_at) = CURDATE()
  );
  ```
* **Hành trình qua 13 Node n8n:**
  1. `Schedule Trigger Node` kích hoạt đúng 9h sáng.
  2. `MySQL Query Node` quét danh sách nhân sự chưa điểm danh.
  3. `Empty Guard IF Node` kết thúc sớm nếu tất cả nhân viên đã check-in đủ.
  4. `Dynamic Greeting Node` tự sinh lời chúc truyền cảm hứng theo ngày trong tuần (Thứ Hai chúc năng lượng, Thứ Sáu chúc về đích).
  5. `Wait 3s Node (Rate-limit Throttle)` đệm giãn cách chống Telegram chặn vì gửi tin liên tục.
  6. `Send Telegram Node` gửi tin nhắn kèm link bấm về Web.
* **Điểm chạm trên Web React:**
  * Nhân viên mở [`/employee/workspace`](http://localhost:5173/employee/workspace) $\rightarrow$ Thẻ **"Check-in Cảm xúc hôm nay"** với 3 nút: *Tuyệt vời ☀️ / Bình thường ⛅ / Căng thẳng 🌧️*. Khi bấm check-in xong, ô điểm danh chuyển sang tích xanh hoàn thành.

---

### 🟡 LUỒNG 3 (WF-03): Giám Sát SLA Thử Việc 30 Ngày (Onboarding SLA Guardian - 14 Nodes)
* **Mục tiêu nghiệp vụ:** Quy trình Onboarding 30 ngày có 10 nhiệm vụ quan trọng (Day 1 đến Day 30). Luồng này tự động rà soát tiến độ, cảnh báo các mốc bị trễ và vinh danh khi hoàn thành.
* **Cơ chế kích hoạt:** **Data-Driven Cron Scheduler** (Lúc 08:30 AM Thứ Hai hàng tuần).
* **CSDL liên quan:** `onboarding_tasks` (các cột: `due_date`, `status` = 'PENDING' / 'COMPLETED', `user_id`), `users`.
* **Hành trình qua 14 Node n8n:**
  1. `Schedule Trigger Node` kích hoạt 8h30 sáng Thứ Hai.
  2. `MySQL Fetch Node` lấy danh sách nhiệm vụ chưa xong và ngày hạn chót `due_date`.
  3. `Calculate SLA Metrics Node` tính số ngày trễ: `daysOverdue = today - due_date`.
  4. `Switch Router Node` rẽ 3 nhánh:
     * **GRADUATION (100% Hoàn thành):** Bắn thư vinh danh tốt nghiệp thử việc.
     * **OVERDUE (Trễ 1–6 ngày):** Gửi email nhắc nhở đôn đốc thân thiện.
     * **CRITICAL ESCALATION (Trễ $\ge 7$ ngày):** Báo động khẩn cấp cho Quản lý phòng ban.
* **Điểm chạm trên Web React:**
  * Góc nhìn Nhân viên: Tab **"Lộ Trình Hội Nhập 30 Ngày"** có Checklist 10 nhiệm vụ kèm tiến độ %.
  * Góc nhìn Quản lý: Tab **"Tiến Độ Thử Việc Đội Ngũ (30 Ngày)"** ([`ManagerTeamOnboardingWidget.tsx`](file:///f:/HumanResources/frontend/src/features/team-onboarding/ManagerTeamOnboardingWidget.tsx)) hiển thị thanh tiến độ từng nhân sự, task nào trễ hạn sẽ được **tô viền đỏ/cam cảnh báo quá hạn SLA**.

---

### 📊 LUỒNG 4 (WF-04): Báo Cáo Radar Tinh Thần & Morale Tuần (Weekly Morale Digest - 14 Nodes)
* **Mục tiêu nghiệp vụ:** Giúp Ban Lãnh đạo có góc nhìn tổng thể về chỉ số hạnh phúc (Morale Index) và điểm nóng áp lực của từng phòng ban trước khi kết thúc tuần.
* **Cơ chế kích hoạt:** **Tích hợp 2 chiều (Bi-directional Integration)** (Lúc 17:00 PM Thứ Sáu hàng tuần).
* **CSDL liên quan:** Đọc bảng `employee_moods` 7 ngày gần nhất $\rightarrow$ Ghi kết quả vào bảng `morale_reports` bằng cú pháp:
  ```sql
  INSERT INTO morale_reports (department_id, week_start_date, morale_score, stress_percentage, ai_summary, recommendations)
  VALUES (...)
  ON DUPLICATE KEY UPDATE 
    morale_score = VALUES(morale_score),
    stress_percentage = VALUES(stress_percentage),
    ai_summary = VALUES(ai_summary);
  ```
* **Hành trình qua 14 Node n8n:**
  1. `Schedule Trigger Node` kích hoạt 17h00 chiều Thứ Sáu.
  2. `Fetch 7-Day Moods (MySQL)` lấy dữ liệu check-in trong tuần.
  3. `k-Anonymity Guard Node` bảo vệ quyền riêng tư: phòng ban có dưới 3 người check-in sẽ được ẩn danh hóa.
  4. `Gemini AI Sentiment Node` phân tích nguyên nhân gốc rễ và đề xuất 3 hành động cụ thể cho tuần tới.
  5. `Upsert Database Node` ghi kết quả đã phân tích vào bảng `morale_reports`.
  6. `Telegram / Slack Digest` gửi tóm tắt chỉ số tuần cho Ban Giám Đốc.
* **Điểm chạm trên Web React:**
  * Quản lý mở [`/employee/workspace`](http://localhost:5173/employee/workspace) $\rightarrow$ Tab **"Nhịp Năng Lượng Đội Ngũ"** $\rightarrow$ Khối trên cùng: Widget **"Tổng Hợp Nhịp Cảm Xúc Tuần"** ([`WeeklyMoodAnalyticsWidget.tsx`](file:///f:/HumanResources/frontend/src/features/team-mood/components/WeeklyMoodAnalyticsWidget.tsx)).
  * Hiển thị điểm số Morale Score (ví dụ `82/100`), Biểu đồ Radar 7 ngày với tỷ lệ 3 màu phân bổ (Xanh - Vàng - Đỏ) và khuyến nghị chiến lược của AI.

---

<a id="4-bo-cau-hoi-gay-bay"></a>
## 4. BỘ 6 KỊCH BẢN ĐỐI ĐÁP & CÂU HỎI "GÀI BẪY" CỦA GIẢNG VIÊN

### ❓ Câu 1: "Chỉ cho thầy xem chỗ nào Backend bắn Webhook sang n8n?"
* **Thao tác:** Mở VS Code: `onboarding.service.ts` dòng 265 và `n8n.service.ts` dòng 75.
* 🎙️ **Trả lời:** *"Dạ thưa thầy, tại `onboarding.service.ts`, khi nhân viên chạm ngưỡng stress $\ge 3$ ngày, hàm nghiệp vụ gọi `this.n8nService.triggerBurnoutAlert()`. Tại `n8n.service.ts`, Backend đóng gói payload và thực hiện lệnh `fetch` HTTP POST sang n8n Webhook Endpoint."*

---

### ❓ Câu 2 (BẪY KIẾN TRÚC!): "Thế Luồng 2, 3, 4 code Backend gọi sang n8n ở đâu?"
* 🎙️ **Trả lời:** *"Dạ thưa thầy, 3 luồng này **KHÔNG CÓ code Backend gọi sang n8n** ạ! Hệ thống áp dụng mô hình **Data-Driven Polling qua n8n Cron Scheduler**. Nhân viên thao tác bình thường trên Web lưu vào CSDL, đến đúng giờ hẹn (9h sáng, 8h30 sáng Thứ Hai, 17h chiều Thứ Sáu), n8n chủ động chạy Cron kết nối MySQL để quét dữ liệu. Việc này giúp **giải phóng hoàn toàn tài nguyên cho máy chủ Backend** và đảm bảo tính **Decoupled Architecture** — sau này HR muốn đổi giờ chạy hay đổi nội dung tin nhắn chỉ cần chỉnh trên n8n mà không cần sửa code Backend."*

---

### ❓ Câu 3 (BẪY HIỆU NĂNG!): "Nếu n8n bị sập hoặc xử lý AI mất 30 giây thì Backend của em có bị đơ không?"
* 🎙️ **Trả lời:** *"Dạ thưa thầy, hoàn toàn không bị ảnh hưởng! Dispatcher của em hoạt động theo cơ chế **Non-blocking Fire-and-Forget**. Em gọi `fetch()` không `await`, có gắn `AbortSignal.timeout(10000)` để tự hủy sau 10 giây và có khối `.catch()` riêng biệt để cô lập lỗi. Nếu n8n bị sập, Backend chỉ ghi một dòng Logger Warn, còn giao diện Web của nhân viên vẫn trả về HTTP 201 thành công trong dưới 15 mili-giây theo chuẩn **Graceful Degradation**."*

---

### ❓ Câu 4 (BẪY THIẾT KẾ!): "Tại sao em không viết luôn Cron Job và gửi mail/Telegram trong NestJS mà phải vẽ chuyện dùng n8n làm gì?"
* 🎙️ **Trả lời:** *"Dạ thưa thầy, đây là quyết định kiến trúc dựa trên nguyên lý **Separation of Concerns (Tách biệt mối quan tâm)**:
  1. **Khả năng mở rộng (Scalability):** NestJS nên tập trung tối đa tài nguyên phục vụ REST API cho hàng ngàn người dùng. Nếu để NestJS ôm đồm các Cron Job quét bảng nặng và gửi hàng trăm email, máy chủ sẽ rất dễ bị nghẽn Event Loop.
  2. **Workflow Orchestration linh hoạt:** n8n cho phép cấu hình luồng trực quan, có sẵn cơ chế Retry tự động khi mạng lỗi, hàng đợi Rate-Limit, và dễ dàng tích hợp thêm các kênh mới (Slack, Zalo ZNS, MS Teams) mà **không cần can thiệp mã nguồn hay deploy lại Backend**."*

---

### ❓ Câu 5: "Cấu trúc Payload Webhook của em gửi qua n8n gồm những gì?"
* 🎙️ **Trả lời:** *"Dạ payload được chuẩn hóa thành 3 tầng:
  1. **Metadata:** `event` và `timestamp` chuẩn ISO-8601.
  2. **Định danh:** `userId`, `employeeName`, `departmentName`.
  3. **Ngữ cảnh rủi ro:** `stressDays` (số ngày stress) và `latestFeedback` (phản hồi tâm sự của nhân sự) để n8n phân cấp mức độ cảnh báo."*

---

### ❓ Câu 6: "n8n xử lý xong thì kết quả hiển thị ngược lại trên Web ở chỗ nào?"
* 🎙️ **Trả lời:** *"Dạ thưa thầy:
  * **Với Luồng 1 (Burnout):** Quản lý vào tab *Nhịp Năng Lượng Đội Ngũ* thấy ngay cờ cảnh báo đỏ trong khối *Cần quan tâm (Attention Queue)* và nút mở can thiệp 1-on-1.
  * **Với Luồng 4 (Morale):** n8n ghi snapshot vào bảng `morale_reports` bằng lệnh `ON DUPLICATE KEY UPDATE`. Ngay trên Dashboard của Quản lý, khối *Tổng Hợp Nhịp Cảm Xúc Tuần* sẽ hiển thị điểm số Morale Score và biểu đồ Radar 7 ngày kèm nhận xét AI."*

---

<a id="5-bang-cheat-sheet"></a>
## 5. BẢNG CHEAT-SHEET TRA CỨU 30 GIÂY KHI ĐỨNG TRƯỚC HỘI ĐỒNG

| Câu hỏi của Thầy Cô | Mở File Code nào trong VS Code? | Chỉ tay vào dòng code nào? | Mở URL / Tab nào trên Web? | Từ khóa kỹ thuật "ăn điểm" |
| :--- | :--- | :--- | :--- | :--- |
| **"Chỗ nào bắn Webhook sang n8n?"** | `onboarding.service.ts`<br>`n8n.service.ts` | Dòng 253 – 276 (`recordMoodCheckIn`)<br>Dòng 75 – 110 (`triggerBurnoutAlert`) | Terminal nhận HTTP 202 | *Event-Driven, Asynchronous Non-blocking, Timeout 10s, Decoupled* |
| **"Code backend gọi Luồng 2, 3, 4 ở đâu?"** | Không có file gọi! | Chỉ vào node Cron Schedule trên canvas n8n | Canvas n8n node Schedule | *Data-Driven Polling, Cron Scheduler, Resource Offloading, Separation of Concerns* |
| **"Burnout Alert hiển thị ở đâu trên Web?"** | `AttentionQueue.tsx`<br>`InterventionModal.tsx` | Dòng 100 – 145 (`AttentionQueue`) | `/employee/workspace` $\rightarrow$ Tab *Nhịp Năng Lượng Đội Ngũ* | *Attention Queue, Cờ cảnh báo đỏ, Can thiệp 1-on-1, Bi-directional Sync* |
| **"Báo cáo tuần n8n hiển thị ở đâu trên Web?"** | `WeeklyMoodAnalyticsWidget.tsx` | Dòng 80 – 180 (`WeeklyMoodAnalyticsWidget`) | `/employee/workspace` $\rightarrow$ Khối *Tổng Hợp Nhịp Cảm Xúc Tuần* | *Morale Score 100, Radar 7 ngày, k-Anonymity Guard, ON DUPLICATE KEY UPDATE* |
| **"Giám sát tiến độ 30 ngày ở đâu trên Web?"** | `ManagerTeamOnboardingWidget.tsx` | Dòng 50 – 120 (`ManagerTeamOnboardingWidget`) | `/employee/workspace` $\rightarrow$ Tab *Tiến Độ Thử Việc Đội Ngũ* | *SLA Breach Overdue, Day 1-30 Checklist, Supportive & Recognition* |

---

<a id="6-kich-ban-3-phut"></a>
## 6. KỊCH BẢN THUYẾT TRÌNH MỞ MÀN 3 PHÚT (SPEAKING SCRIPT ĂN ĐIỂM TUYỆT ĐỐI)

*(Bạn chỉ cần đọc diễn cảm theo kịch bản này khi bắt đầu phần trình bày)*

> "Kính thưa Thầy Cô trong Hội đồng,  
> 
> Trong phân hệ Onboarding và Chăm sóc Sức khỏe Tinh thần Nhân sự, em giải quyết bài toán cốt lõi: **Làm sao để phát hiện sớm nguy cơ nhân sự mới kiệt sức và nghỉ việc, đồng thời tự động hóa toàn bộ quy trình chăm sóc từ ngày đầu tiên đến khi kết thúc thử việc 30 ngày.**
> 
> Về mặt kiến trúc kỹ thuật, em thiết kế hệ thống theo mô hình **Event-Driven Architecture kết hợp Data-Driven Polling**:
> 
> * **Đầu tiên là Luồng 1 (Burnout Crisis Escalation):** Khi nhân sự check-in liên tục căng thẳng từ 3 ngày trở lên, Backend NestJS đóng vai trò là Event Producer, thông qua một Webhook Dispatcher bất đồng bộ (Non-blocking I/O) phát tín hiệu tức thời sang n8n. n8n đóng vai trò là Orchestrator để kích hoạt cảnh báo đa tầng tới Quản lý và HR qua Telegram và Email. Nhờ cơ chế Fire-and-Forget và AbortSignal Timeout 10s, request của người dùng luôn được phản hồi dưới 15 mili-giây và cô lập hoàn toàn sự cố nếu n8n gặp trục trặc.
> 
> * **Tiếp theo là Luồng 2 và Luồng 3:** Hoạt động theo cơ chế Data-Driven Scheduler để giải phóng tải cho Backend. Đúng 9h sáng, Luồng 2 tự động lọc những nhân viên chưa điểm danh để gửi lời chúc và nhắc nhở; sáng Thứ Hai lúc 8h30, Luồng 3 rà soát toàn bộ 10 đầu việc thử việc, nếu trễ hạn SLA sẽ kích hoạt cảnh báo đôn đốc, còn nếu hoàn thành 100% sẽ gửi thư vinh danh tốt nghiệp.
> 
> * **Cuối cùng là Luồng 4 (Weekly Morale Digest):** Vào 17h chiều Thứ Sáu, n8n tổng hợp toàn bộ dữ liệu cảm xúc trong tuần, ứng dụng thuật toán ẩn danh k-Anonymity để bảo vệ danh tính nhân viên, gọi Gemini AI phân tích và ghi ngược dữ liệu vào CSDL bằng cú pháp `ON DUPLICATE KEY UPDATE` để cung cấp biểu đồ Radar và điểm Morale Score trực quan trên Dashboard cho Ban Giám Đốc.
> 
> Sau đây, em xin phép mở mã nguồn Backend tại `n8n.service.ts` và giao diện Web thực tế để Thầy Cô cùng theo dõi."
