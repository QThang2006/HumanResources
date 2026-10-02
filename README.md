# 🚀 HR & ATS MULTI-AGENT ECOSYSTEM (STARTER SPRINT 1)
> **Trạng thái repository:** Đã hoàn thiện 100% Hạ tầng cấu hình & Xác thực (Auth). Các phân hệ nghiệp vụ đang ở dạng **Khung khởi đầu (Starter Wireframe / Skeleton)** sẵn sàng cho các thành viên trong nhóm vào code.

---

## 📌 1. HIỆN TRẠNG DỰ ÁN (PROJECT STATUS)

### ✅ Những gì ĐÃ HOÀN THIỆN 100% (Chạy được ngay)
* **Cơ sở dữ liệu (TypeORM + MySQL 8.0):** 11 bảng chuẩn hóa 3NF, tự động kết nối và đồng bộ hóa qua Docker.
* **Cấu hình ngoại vi Backend (NestJS 10):**
  * `TransformInterceptor`: Tự động format chuẩn response API `{ statusCode, success, data }`.
  * `LoggingInterceptor`: Đo lường thời gian phản hồi (ms) của từng API request.
  * `HttpExceptionFilter`: Bắt lỗi tập trung toàn cục.
  * `JwtAuthGuard` & `RolesGuard`: Bảo vệ API và phân quyền 4 Roles (@Roles, @CurrentUser).
* **Cấu hình ngoại vi Frontend (React 18 + Vite + Tailwind):**
  * `Axios Interceptor` (`api/client.ts`): Tự động đính kèm `Bearer token` vào mọi request, bắt lỗi 401 tự logout.
  * `ProtectedRoute`: Chặn truy cập theo quyền người dùng, hiển thị trang 403 thân thiện.
  * Bộ UI Design System dùng chung (`Button`, `Card`, `Badge`, `Modal`, `EmptyState`).
* **Luồng Xác thực người dùng (Auth Flow):**
  * Đăng nhập (`/login`), Đăng xuất (`logout`), lưu trữ JWT an toàn trong `localStorage`.
  * Seed sẵn **4 tài khoản mẫu** đại diện cho 4 quyền.
  * Thanh điều hướng `Navbar` kèm bộ chuyển quyền nhanh (**Quick Role Switcher**).

---

### 🚧 Những gì ĐANG LÀ KHUNG KHỞI ĐẦU (Chờ các thành viên code)
* **Trang Tuyển dụng ATS (`/recruitment`):** Giao diện khung khởi đầu kèm bảng dữ liệu mẫu ➔ **Chờ Thành viên 2 code**.
* **Trang Việc làm & Nộp CV (`/jobs`, `/jobs/:id`):** Giao diện danh sách & form nộp ➔ **Chờ Thành viên 2 code**.
* **Trang Không gian nhân viên (`/workspace`):** Khung nhiệm vụ, check-in cảm xúc ➔ **Chờ Thành viên 3 code**.
* **Trang Quản trị hệ thống (`/admin`):** Khung danh sách nhân sự, phân quyền ➔ **Chờ Thành viên 4 code**.
* **Các Service & Controller (`jobs`, `applications`, `onboarding`):** Đã có sẵn DTO và hàm khung sườn kèm chú thích TODO chi tiết.

---

## 📁 2. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
Human_Resources/
├── docker-compose.yml       # Hạ tầng MySQL 8.0 (port 3306) & n8n Engine (port 5678)
├── README.md                # Tài liệu hiện trạng & khởi chạy nhanh
├── BAO_CAO_TONG_QUAN_VA_HUONG_DAN_NHOM.md # Báo cáo chi tiết bàn giao cho nhóm
│
├── backend/                 # NestJS 10 REST API (Port 3001)
│   ├── src/
│   │   ├── common/          # Interceptors, Filters, Guards, Decorators (Đã xong 100%)
│   │   ├── entities/        # 11 Bảng CSDL TypeORM chuẩn 3NF (Đã xong 100%)
│   │   ├── modules/
│   │   │   ├── auth/        # Đăng nhập, JWT, xác thực phiên (Đã xong 100%)
│   │   │   ├── users/       # Quản trị user, Seed 4 tài khoản mẫu (Đã xong 100%)
│   │   │   ├── core/        # Singleton Gemini AI & n8n Automation (Sẵn sàng gọi)
│   │   │   ├── jobs/        # [Khung sườn] Tin tuyển dụng & Sinh JD (TV2)
│   │   │   ├── applications/# [Khung sườn] Đơn ứng tuyển & Phỏng vấn (TV2)
│   │   │   └── onboarding/  # [Khung sườn] Hội nhập, Mood, Copilot (TV3)
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env
│   └── .env.example
│
└── frontend/                # React 18 + Vite 5 + Tailwind CSS (Port 5173)
    ├── src/
    │   ├── api/             # Axios Client Interceptor & Domain API calls
    │   ├── components/      # UI Atoms, ProtectedRoute, Navbar với Role Switcher
    │   ├── context/         # AuthContext (Quản lý User & Token)
    │   ├── layouts/         # MainLayout (Bố cục chung)
    │   └── pages/           # Màn hình chức năng
    │       ├── LoginPage.tsx            # [Chạy thật 100%] Form login & 4 thẻ demo
    │       ├── CareersPage.tsx          # [Khung khởi đầu] Cổng việc làm
    │       ├── JobDetailPage.tsx        # [Khung khởi đầu] Chi tiết việc làm
    │       ├── RecruitmentAdminPage.tsx # [Khung khởi đầu] Bàn tuyển dụng ATS (TV2)
    │       ├── EmployeeWorkspacePage.tsx# [Khung khởi đầu] Workspace nhân viên (TV3)
    │       └── AdminSettingsPage.tsx    # [Khung khởi đầu] Quản trị hệ thống (TV4)
    ├── .env
    └── .env.example
```

---

## 🚀 3. HƯỚNG DẪN KHỞI CHẠY 3 BƯỚC

### Bước 1: Khởi động MySQL qua Docker
Tại thư mục gốc `Human_Resources`:
```bash
docker compose up -d mysql
```
*(Nếu muốn dùng thêm n8n sau này thì gõ `docker compose up -d`)*

### Bước 2: Chạy Backend
Mở Terminal 1:
```bash
cd backend
npm install
npm run start:dev
```
* Backend chạy tại: `http://localhost:3001`
* Tự động tạo 11 bảng và nạp 4 tài khoản mẫu vào MySQL.

### Bước 3: Chạy Frontend
Mở Terminal 2:
```bash
cd frontend
npm install
npm run dev
```
* Mở trình duyệt: `http://localhost:5173`
* Màn hình đăng nhập hiển thị, bạn có thể click ngay vào 1 trong 4 thẻ tài khoản để vào hệ thống.

---

## 🔑 4. DANH SÁCH 4 TÀI KHOẢN MẪU ĐỂ TEST
Mật khẩu mặc định cho tất cả tài khoản: **`admin123`**

| Vai trò (Role) | Email đăng nhập | Tên hiển thị | Chức danh | Mục đích kiểm thử |
| :--- | :--- | :--- | :--- | :--- |
| **`SUPERADMIN`** | `superadmin@company.com` | Nguyễn Văn Quản Trị | Hệ Thống Trưởng | Kiểm tra quyền cao nhất, cấu hình API, trang `/admin` |
| **`HR`** | `hr@company.com` | Lê Thị Thu Thảo | Trưởng Nhóm Tuyển Dụng | Đăng tin tuyển dụng, ATS Kanban, trang `/recruitment` |
| **`MANAGER`** | `manager@company.com` | Trần Văn Minh | Trưởng Phòng Kỹ Thuật | Chấm điểm PV Kỹ thuật, Team Mood Monitor |
| **`EMPLOYEE`** | `employee@company.com` | Phạm Hồng Quân | Kỹ Sư Phần Mềm Mới | Checklist 30 ngày, Check-in cảm xúc, trang `/workspace` |

*(Lưu ý: Tại màn hình đăng nhập, bạn có thể gõ email/mật khẩu trên hoặc click nhanh vào 1 trong 4 thẻ Demo bên dưới để đăng nhập ngay lập tức mà không cần gõ phím).*


---

## 👥 5. PHÂN CHIA NHIỆM VỤ NHÓM (SPRINT BACKLOG)

* **Thành viên 1 (Trưởng nhóm):** Hạ tầng, DB 11 bảng, Auth, Guards, Interceptors, Điều phối và hỗ trợ nhóm.
* **Thành viên 2 (Sprint 2):** Tuyển dụng ATS, kéo thả Kanban ứng viên, gọi Gemini sinh JD, nút tuyển dụng 1-Click (`modules/jobs`, `modules/applications`, `RecruitmentAdminPage.tsx`).
* **Thành viên 3 (Sprint 3):** Nhiệm vụ Onboarding nhân viên, Check-in cảm xúc & thuật toán Burnout alert, Chatbox AI Copilot (`modules/onboarding`, `EmployeeWorkspacePage.tsx`).
* **Thành viên 4 (Sprint 4):** Quản trị danh sách nhân sự, phân quyền User, Tài liệu & Đào tạo nội bộ (`modules/users`, `AdminSettingsPage.tsx`).

---
*(Xem hướng dẫn chi tiết từng dòng code tại file `BAO_CAO_TONG_QUAN_VA_HUONG_DAN_NHOM.md`)*
