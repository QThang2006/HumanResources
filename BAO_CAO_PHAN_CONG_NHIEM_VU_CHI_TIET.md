# 📋 BÁO CÁO PHÂN TÍCH TÍNH HỢP LÝ & KẾ HOẠCH PHÂN CÔNG NHIỆM VỤ DỰ ÁN
## HỆ THỐNG QUẢN TRỊ TUYỂN DỤNG & NHÂN SỰ ĐA TÁC NHÂN (HR TECH AI & N8N AGENTIC ATS)
*Dành cho: Nhóm phát triển dự án | Cập nhật: 01/10/2026 | Phiên bản chuẩn hóa*

---

## 🧭 MỤC LỤC
1. [Phần 1: Phân Tích Cặn Kẽ Tính Hợp Lý Của Kế Hoạch (Feasibility & Workload Analysis)](#phần-1-phân-tích-cặn-kẽ-tính-hợp-lý-của-kế-hoạch)
2. [Phần 2: Ranh Giới Trách Nhiệm & Kiến Trúc Dịch Vụ Cốt Lõi (Architecture Contract)](#phần-2-ranh-giới-trách-nhiệm--kiến-trúc-dịch-vụ-cốt-lõi)
3. [Phần 3: Hồ Sơ Nhiệm Vụ Chi Tiết Của Từng Thành Viên](#phần-3-hồ-sơ-nhiệm-vụ-chi-tiết-của-từng-thành-viên)
   * [3.1. Trưởng Nhóm: Core Platform, Gemini AI & n8n Automation Engine](#31-trưởng-nhóm-core-platform-gemini-ai--n8n-automation-engine)
   * [3.2. Thành Viên 2: Tuyển Dụng ATS, CV Matcher & Phỏng Vấn Kỹ Thuật](#32-thành-viên-2-tuyển-dụng-ats-cv-matcher--phỏng-vấn-kỹ-thuật)
   * [3.3. Thành Viên 3: Onboarding 30 Ngày, Sức Khỏe Tinh Thần & Copilot](#33-thành-viên-3-onboarding-30-ngày-sức-khỏe-tinh-thần--copilot)
   * [3.4. Thành Viên 4: Quản Trị Hệ Thống RBAC, Kho Tri Thức PDF & Khóa Học L&D](#34-thành-viên-4-quản-trị-hệ-thống-rbac-kho-tri-thức-pdf--khóa-học-ld)
4. [Phần 4: Lộ Trình Triển Khai 4 Sprint (Timeline & Milestones)](#phần-4-lộ-trình-triển-khai-4-sprint)
5. [Phần 5: Quy Chuẩn Phối Hợp & Quy Tắc An Toàn (Team Working Agreement)](#phần-5-quy-chuẩn-phối-hợp--quy-tắc-an-toàn)

---

## PHẦN 1: PHÂN TÍCH CẶN KẼ TÍNH HỢP LÝ CỦA KẾ HOẠCH

Để đảm bảo dự án thành công và không bị gãy gánh giữa đường, kế hoạch phân chia này đã được thẩm định dựa trên **4 tiêu chí kỹ thuật công nghệ**:

### 1.1. Cân bằng khối lượng công việc (Workload Balancing)
* **Trước đây (Cách chia cũ):** Nếu chia 1 bạn Backend, 1 bạn Frontend ➔ Bạn Frontend phải ngồi chờ Backend viết API; hoặc nếu bắt mỗi bạn tự cấu hình AI/n8n ➔ Cả nhóm bị sa lầy vào lỗi kết nối API Key và Docker Webhook.
* **Hiện tại (Cách chia mới):**
  * **Trưởng nhóm:** Đã hoàn thành 100% móng nhà (Hạ tầng, Auth, 11 bảng CSDL, Interceptor, Guard). Bây giờ nhận thêm trọng trách làm **"Nhà máy AI & Automation"** tập trung. Khối lượng rất vừa vặn, không phải vẽ HTML từng nút bấm mà tập trung vào phần công nghệ lõi đỉnh cao nhất.
  * **3 Thành viên (TV2, TV3, TV4):** Mỗi bạn sở hữu trọn vẹn **1 phân hệ màn hình cụ thể (Fullstack lát cắt dọc)**. Khối lượng mỗi bạn tương đương nhau: từ 2–3 màn hình giao diện React + 1 module API NestJS tương ứng.

### 1.2. Tính độc lập & Miễn dịch xung đột (Decoupling & Zero-Conflict)
* Mỗi thành viên chỉ sửa file trong đúng thư mục module của mình.
* Toàn bộ mã nguồn cốt lõi (`common/`, `entities/`, `layouts/`, `api/client.ts`) do Trưởng nhóm khóa cứng. Không ai có thể vô tình làm hỏng code của người khác.

### 1.3. Tính khả thi khi chạy độc lập (Local Independence)
* Cả 4 máy đều có sẵn cơ sở dữ liệu MySQL đồng bộ 11 bảng và 4 tài khoản mẫu (`admin`, `hr`, `manager`, `quan.pham`).
* Không ai phải chờ ai: TV3 không cần chờ TV2 tuyển người mới có dữ liệu làm Onboarding. TV3 cứ dùng tài khoản có sẵn để test mượt mà!

### 1.4. Cơ chế chống sập (Fallback Resilience)
* Trưởng nhóm sẽ tích hợp sẵn cơ chế **Fallback Mock Data** trong `GeminiService` và `N8nService`: Nếu máy bạn nào chưa có internet, hết quota Gemini API hoặc chưa bật container n8n, hệ thống vẫn tự sinh ra dữ liệu mẫu thông minh để giao diện không bao giờ bị báo lỗi đỏ!

---

## PHẦN 2: RANH GIỚI TRÁCH NHIỆM & KIẾN TRÚC DỊCH VỤ CỐT LÕI

```
       ┌─────────────────────────────────────────────────────────────────────────────┐
       │                   TRƯỞNG NHÓM (CORE PLATFORM LEAD)                           │
       │   Quản trị CSDL • Bảo mật JWT • Duyệt Pull Request • Xây dựng SDK AI & n8n  │
       └───────┬──────────────────────────────┬──────────────────────────────┬───────┘
               │                              │                              │
       Hàm AI & Webhook n8n           Hàm AI & Webhook n8n           Hàm AI & Webhook n8n
               │                              │                              │
               ▼                              ▼                              ▼
 ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
 │       THÀNH VIÊN 2        │  │       THÀNH VIÊN 3        │  │       THÀNH VIÊN 4        │
 │     TUYỂN DỤNG ATS        │  │       ONBOARDING          │  │     QUẢN TRỊ RBAC         │
 │ • Cổng việc làm           │  │ • Check-in tâm trạng      │  │ • Đổi quyền cán bộ        │
 │ • Bàn Kanban hồ sơ CV     │  │ • Lộ trình thử việc 30d   │  │ • Cấu hình API Endpoint   │
 │ • Chấm điểm phỏng vấn     │  │ • Bảng giám sát Team Mood │  │ • Sổ tay quy chế PDF      │
 │ • 1-Click Tuyển dụng      │  │ • Chatbox Copilot 24/7    │  │ • Danh mục đào tạo L&D    │
 └───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
```

---

## PHẦN 3: HỒ SƠ NHIỆM VỤ CHI TIẾT CỦA TỪNG THÀNH VIÊN

---

### 3.1. TRƯỞNG NHÓM: CORE PLATFORM, GEMINI AI & N8N AUTOMATION ENGINE
* **Vị trí:** Tech Lead & Core AI/Automation Architect.
* **Nhánh Git:** `main` (hoặc nhánh làm việc `feature/core-ai-automation`).
* **Trọng tâm công việc:** Xây dựng bộ SDK tiện ích trong `GeminiService` và `N8nService` để 3 thành viên chỉ cần gọi 1 dòng lệnh.

#### 🛠️ Danh mục 7 dịch vụ Trưởng nhóm cung cấp:
1. **`geminiService.generateJobDescription(title, dept, level)`**
   * *Đầu vào:* Tên chức danh, phòng ban, cấp bậc.
   * *Đầu ra:* JSON gồm Mô tả công việc, Yêu cầu kỹ năng, Chế độ đãi ngộ.
   * *Cấp cho:* Thành viên 2 (Nút `+ Tạo Nhanh Job Bằng AI`).
2. **`geminiService.scoreResume(resumeText, jobDescription)`**
   * *Đầu vào:* Toàn văn CV ứng viên và mô tả công việc.
   * *Đầu ra:* Điểm số phù hợp `%` (VD: `88.5%`), danh sách điểm mạnh, điểm yếu.
   * *Cấp cho:* Thành viên 2 (Huy hiệu AI Matcher trên thẻ ứng viên).
3. **`geminiService.generateInterviewQuestions(resumeText, jobRequirements)`**
   * *Đầu vào:* CV ứng viên và yêu cầu kỹ thuật.
   * *Đầu ra:* 3–5 câu hỏi phỏng vấn kỹ thuật sát với thực tế kèm tiêu chí đánh giá.
   * *Cấp cho:* Thành viên 2 & Trưởng phòng (Popup chấm điểm phỏng vấn).
4. **`n8nService.triggerInterviewScheduled(payload)`**
   * *Hành động:* Bắn Webhook sang n8n ➔ Tự tạo sự kiện Google Calendar + Link Google Meet ➔ Tự gửi Email thông báo lịch phỏng vấn cho ứng viên và người phỏng vấn.
   * *Cấp cho:* Thành viên 2 (Nút `Xếp Lịch Phỏng Vấn`).
5. **`n8nService.triggerEmployeeHired(payload)`**
   * *Hành động:* Bắn Webhook sang n8n ➔ Tự sinh mật khẩu tài khoản ➔ Gửi Email thư mời nhận việc (Offer Letter) ➔ Tự tạo 5 nhiệm vụ Onboarding vào MySQL.
   * *Cấp cho:* Thành viên 2 (Nút `Tuyển Dụng 1-Click`).
6. **`n8nService.triggerBurnoutAlert(payload)`**
   * *Hành động:* Bắn Webhook cảnh báo khẩn cấp sang Telegram Bot và hòm thư của HR khi nhân viên căng thẳng kéo dài.
   * *Cấp cho:* Thành viên 3 (Hộp cảnh báo kiệt sức).
7. **`geminiService.chatCopilot(query, corporatePolicyContext)`**
   * *Đầu vào:* Câu hỏi của nhân viên + Nội dung quy chế công ty (RAG).
   * *Đầu ra:* Câu trả lời tự nhiên, thân thiện và chính xác về ngày phép, chế độ, nội quy.
   * *Cấp cho:* Thành viên 3 (Widget Trợ lý Sổ tay AI).

---

### 3.2. THÀNH VIÊN 2: TUYỂN DỤNG ATS, CV MATCHER & PHỎNG VẤN KỸ THUẬT
* **Vị trí:** Fullstack Engineer - Phân hệ Tuyển dụng.
* **Nhánh Git riêng:** `feature/recruitment-ats`.
* **File Frontend phụ trách:**
  * [`frontend/src/pages/CareersPage.tsx`](file:///c:/Users/ADMIN/Human_Resources/frontend/src/pages/CareersPage.tsx) *(Cổng việc làm)*
  * [`frontend/src/pages/JobDetailPage.tsx`](file:///c:/Users/ADMIN/Human_Resources/frontend/src/pages/JobDetailPage.tsx) *(Xem chi tiết & Nộp CV)*
  * [`frontend/src/pages/RecruitmentAdminPage.tsx`](file:///c:/Users/ADMIN/Human_Resources/frontend/src/pages/RecruitmentAdminPage.tsx) *(Bàn điều hành ATS Kanban)*
* **Thư mục Backend phụ trách:**
  * `backend/src/modules/jobs/`
  * `backend/src/modules/applications/`

#### 📝 Các bước thực hiện chi tiết:
* **Bước 1 (CRUD Jobs):** Hoàn thiện API tạo và lấy danh sách tin tuyển dụng. Đổ dữ liệu thật lên giao diện `CareersPage` (Thẻ việc làm, tìm kiếm, lọc theo phòng ban).
* **Bước 2 (Form Nộp Hồ Sơ):** Hoàn thiện trang `JobDetailPage` cho phép ứng viên nhập thông tin, dán link CV hoặc upload file. Lưu đơn ứng tuyển vào bảng `applications`.
* **Bước 3 (Bàn ATS Kanban):** 
  * Tại `RecruitmentAdminPage`, hiển thị danh sách Jobs bên trái; khi click vào Job nào thì bảng Kanban 3 cột bên phải tải ứng viên của Job đó.
  * Hiển thị điểm số phù hợp do AI chấm dạng huy hiệu (gọi hàm `scoreResume` của Trưởng nhóm).
* **Bước 4 (Phỏng vấn & 1-Click Tuyển dụng):**
  * Xếp lịch phỏng vấn: Gọi hàm `n8nService.triggerInterviewScheduled` để sinh link Google Meet.
  * Nút `Tuyển Dụng (Hire)`: Gọi hàm `n8nService.triggerEmployeeHired` để chuyển ứng viên thành nhân viên chính thức.

* **Cách tự test:** Đăng nhập tài khoản `hr@company.com` (Pass: `admin123`), tạo thử 1 job mới và thao tác trên bảng Kanban.

---

### 3.3. THÀNH VIÊN 3: ONBOARDING 30 NGÀY, SỨC KHỎE TINH THẦN & COPILOT
* **Vị trí:** Fullstack Engineer - Phân hệ Hội nhập & Văn hóa Doanh nghiệp.
* **Nhánh Git riêng:** `feature/onboarding-copilot`.
* **File Frontend phụ trách:**
  * [`frontend/src/pages/EmployeeWorkspacePage.tsx`](file:///c:/Users/ADMIN/Human_Resources/frontend/src/pages/EmployeeWorkspacePage.tsx) *(Bao gồm góc nhìn Employee và Manager)*
* **Thư mục Backend phụ trách:**
  * `backend/src/modules/onboarding/` *(Checklist nhiệm vụ & Tâm trạng nhân viên)*

#### 📝 Các bước thực hiện chi tiết:
* **Bước 1 (Check-in Cảm Xúc Hàng Ngày):**
  * Dựng widget *"Hôm nay bạn cảm thấy thế nào?"* với 3 nút bấm cảm xúc: 😀 *Tuyệt vời*, 😐 *Bình thường*, 🙁 *Căng thẳng*.
  * Viết API lưu vào bảng `employee_moods` (gồm `userId`, `rating`, `note`).
* **Bước 2 (Lộ Trình Thử Việc 30 Ngày):**
  * Đọc danh sách nhiệm vụ từ bảng `onboarding_tasks` theo `userId` người đăng nhập.
  * Khi người dùng tích chọn checkbox ➔ Cập nhật tiến độ %, thanh tiến độ tự động nhảy (VD: `25%` ➔ `50%`).
* **Bước 3 (Bảng Giám Sát Team Mood Cho Trưởng Phòng):**
  * Khi đăng nhập bằng tài khoản Trưởng phòng (`manager@company.com`): Hiển thị danh sách cảm xúc của các nhân viên phòng IT.
  * Nếu phát hiện nhân viên có phản hồi căng thẳng ➔ Hiện hộp cảnh báo đỏ và nút `Hẹn 1-on-1 Gỡ Rối`. Đồng thời gọi `n8nService.triggerBurnoutAlert` của Trưởng nhóm để bắn tin Telegram cho HR.
* **Bước 4 (Trợ Lý Sổ Tay AI Copilot):**
  * Khung chatbox ở cột bên phải: Khi người dùng gõ câu hỏi ➔ Gọi hàm `geminiService.chatCopilot` của Trưởng nhóm để hiển thị câu trả lời thông minh.

* **Cách tự test:** Đăng nhập tài khoản `employee@company.com` (Pass: `admin123`) để test check-in tâm trạng và checklist; chuyển sang `manager@company.com` để xem bảng giám sát.

---

### 3.4. THÀNH VIÊN 4: QUẢN TRỊ HỆ THỐNG RBAC, KHO TRI THỨC PDF & KHÓA HỌC L&D
* **Vị trí:** Fullstack Engineer - Phân hệ Quản trị & Đào tạo.
* **Nhánh Git riêng:** `feature/admin-system-settings`.
* **File Frontend phụ trách:**
  * [`frontend/src/pages/AdminSettingsPage.tsx`](file:///c:/Users/ADMIN/Human_Resources/frontend/src/pages/AdminSettingsPage.tsx) *(Bao gồm góc nhìn SuperAdmin và HR)*
* **Thư mục Backend phụ trách:**
  * `backend/src/modules/users/` *(Quản lý người dùng & phân quyền Role)*
  * Bổ sung API lưu cấu hình hệ thống & danh mục khóa học nội bộ.

#### 📝 Các bước thực hiện chi tiết:
* **Bước 1 (Bảng Quản Lý Nhân Sự & Phân Quyền RBAC Console):**
  * Đọc toàn bộ danh sách người dùng từ bảng `users` hiển thị lên bảng (Tên, Email, Phòng ban, Chức danh, Role hiện tại).
  * Viết API `PATCH /api/users/:id/role`: Khi SuperAdmin chọn đổi Role trong dropdown ➔ Cập nhật quyền mới vào MySQL.
* **Bước 2 (Cấu Hình Kết Nối Hạ Tầng):**
  * Làm 2 ô nhập: **Google Gemini API Key** (dạng password ẩn) và **n8n Webhook Endpoint** kèm nút `Lưu Cấu Hình Kỹ Thuật`.
* **Bước 3 (Kho Tri Thức Doanh Nghiệp & Sổ Tay AI):**
  * Hiển thị bảng danh sách tài liệu PDF quy chế (`So_tay_nhan_vien_2026.pdf`, `Quy_che_bao_hiem.pdf`), thống kê số đoạn Chunks và nhãn READY.
  * Làm khung Testing Sandbox: Ô nhập câu hỏi thử nghiệm và nút `Test AI` để xem độ khớp Cosine Similarity.
* **Bước 4 (Quản Lý Khóa Học & Đào Tạo AI L&D):**
  * Hiển thị danh mục khóa học kèm các nhãn: `BẮT BUỘC`, `AI CHỈ ĐỊNH (SKILL-GAP)`, `KỸ NĂNG MỀM`.
  * Hiển thị tiến độ hoàn thành của nhân sự toàn công ty.

* **Cách tự test:** Đăng nhập tài khoản `superadmin@company.com` (Pass: `admin123`), thử đổi quyền của 1 nhân viên và lưu cấu hình API.

---

## PHẦN 4: LỘ TRÌNH TRIỂN KHAI 4 SPRINT (TIMELINE & MILESTONES)

```
Tuần 1 (Sprint 1)        Tuần 2 (Sprint 2)        Tuần 3 (Sprint 3)        Tuần 4 (Sprint 4)
 ──────────────           ──────────────           ──────────────           ──────────────
• Xong 100% Hạ Tầng     • TV2: CRUD Jobs &       • TV2: Gắn AI Matcher &  • Kiểm thử chéo
• Database 11 bảng        Kanban ATS               1-Click Tuyển dụng     • Quay video Demo
• Login/Logout chuẩn    • TV3: Mood Check-in     • TV3: Báo kiệt sức n8n  • Thuyết trình
• Phân chia nhiệm vụ    • TV4: RBAC & Đổi Role   • TV4: Kho RAG & Khóa học  bảo vệ đồ án
```

---

## PHẦN 5: QUY CHUẨN PHỐI HỢP & QUY TẮC AN TOÀN (TEAM WORKING AGREEMENT)

1. **Quy tắc Git bất di bất dịch:**
   * Không bao giờ được phép `git push origin main`.
   * Mọi tính năng phải tạo nhánh riêng: `feature/recruitment-ats`, `feature/onboarding-copilot`, `feature/admin-system-settings`.
   * Khi hoàn thành một tính năng: Tạo **Pull Request (PR)** trên GitHub để Trưởng nhóm review và merge.
2. **Quy tắc gọi API:**
   * Sử dụng `apiClient` từ `src/api/client.ts` để tự động có Token xác thực, không dùng `fetch()` thô.
3. **Họp nhanh hàng ngày (10 phút lúc 9h sáng trên Discord/Zalo):**
   * Mỗi bạn chỉ chia sẻ ngắn gọn: *Hôm qua làm được gì? Hôm nay làm gì? Đang gặp vướng mắc gì cần Trưởng nhóm hỗ trợ?*

---
*Bản kế hoạch này là cam kết chất lượng của toàn đội để cùng nhau đạt điểm tối đa trong buổi bảo vệ đồ án!*
