# 🚀 BÁO CÁO TỔNG QUAN KIẾN TRÚC & TÀI LIỆU BÀN GIAO DỰ ÁN
## HỆ THỐNG QUẢN TRỊ TUYỂN DỤNG & NHÂN SỰ ĐA TÁC NHÂN AI (HR & ATS MULTI-AGENT)
*Dành cho: Nhóm phát triển dự án | Lưu hành nội bộ*

---

## 📌 PHẦN 1: TỔNG QUAN & TRIẾT LÝ XÂY DỰNG DỰ ÁN

### 1.1. Mục tiêu dự án
Dự án nhằm xây dựng một hệ thống **Quản trị Tuyển dụng (ATS)** và **Quản lý Nhân sự (HR Workspace)** hiện đại, ứng dụng công nghệ **AI Agent (Google Gemini)** và **Tự động hóa luồng làm việc (n8n)**. Hệ thống giải quyết các bài toán thực tế:
1. Tự động sinh mô tả công việc (JD) chuẩn theo vị trí tuyển dụng.
2. Quản lý ứng viên theo mô hình Kanban kéo thả trực quan.
3. Chuyển đổi ứng viên trúng tuyển thành nhân viên chính thức chỉ với **1-Click** (tự động tạo tài khoản, sinh nhiệm vụ Onboarding).
4. Đồng hành cùng nhân viên mới: AI Copilot giải đáp nội quy & Hệ thống theo dõi tâm trạng (Burnout Alert).
5. Phân quyền chặt chẽ theo 4 vai trò (**SUPERADMIN**, **HR**, **MANAGER**, **EMPLOYEE**).

### 1.2. Triết lý phân chia kiến trúc (Core Architectural Boundary)
Để dự án đảm bảo **tính chuẩn mực của một hệ sinh thái doanh nghiệp** nhưng **vẫn giữ không gian tự tay lập trình nghiệp vụ cho từng thành viên**, dự án được chia làm 2 ranh giới:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. TẦNG NGOẠI VI & CẤU HÌNH NỀN TẢNG (Trưởng nhóm đã dựng xong 100%)    │
│    - Cơ sở dữ liệu: Chuẩn hóa 3NF gồm 11 bảng quan hệ chặt chẽ.        │
│    - Backend: Toàn bộ Interceptors, Filters, Guards, Decorators, DTOs. │
│    - Frontend: Axios Client với Bearer Token Interceptor, Routing,     │
│      Protected Route, Design System (Button, Card, Badge, Modal...).   │
│    - Hạ tầng: Docker Compose (MySQL 8.0, n8n), file .env mẫu.         │
├────────────────────────────────────────────────────────────────────────┤
│ 2. TẦNG NGHIỆP VỤ BÊN TRONG (Giao diện khởi đầu & Chờ các bạn code)     │
│    - Đã chạy thật 100%: Toàn bộ luồng Login / Logout, lưu trữ JWT,     │
│      xác thực phiên, Seed 4 tài khoản mẫu, hiển thị Avatar & Role.     │
│    - Các trang & dịch vụ còn lại: Dựng sẵn Khung Giao Diện Khởi Đầu    │
│      (Starter Wireframe / Skeleton) kèm biển hướng dẫn TODO rõ ràng     │
│      cho từng thành viên nhận việc mà không phải lo làm lại cấu hình!  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 PHẦN 2: GIẢI THÍCH CHI TIẾT CẤU TRÚC THƯ MỤC

### 2.1. Cấu trúc Tổng thể Dự án (Root Directory)
```
Human_Resources/
├── backend/                  # Nguồn mã nguồn Backend (NestJS 10, TypeORM, MySQL)
├── frontend/                 # Nguồn mã nguồn Frontend (React 18, Vite 5, Tailwind CSS)
├── docker-compose.yml        # Cấu hình container Docker cho MySQL 8.0 và n8n
├── README.md                 # Tài liệu hướng dẫn khởi chạy nhanh
└── .gitignore                # Bỏ qua node_modules, dist, .env
```

---

### 2.2. Chi tiết Cấu trúc Backend (`backend/src/`)
Backend được xây dựng theo kiến trúc mô-đun chuẩn của **NestJS**, tách biệt rõ rệt giữa hạ tầng dùng chung (`common/`), cơ sở dữ liệu (`entities/`) và các phân hệ nghiệp vụ (`modules/`).

```
backend/src/
├── common/                               # 🛡️ TẦNG HẠ TẦNG & CẤU HÌNH DÙNG CHUNG
│   ├── decorators/                       # Custom Decorators tăng tốc viết code
│   │   ├── current-user.decorator.ts     # @CurrentUser(): Lấy thông tin user đăng nhập từ JWT
│   │   ├── roles.decorator.ts            # @Roles(...): Khai báo vai trò được phép truy cập
│   │   └── public.decorator.ts           # @Public(): Mở route công khai (không cần token)
│   ├── filters/                          
│   │   └── http-exception.filter.ts      # Bắt lỗi toàn cục, trả về format lỗi chuẩn {statusCode, message, timestamp}
│   ├── guards/                           # Bộ gác cổng bảo vệ API
│   │   ├── jwt-auth.guard.ts             # Kiểm tra tính hợp lệ của JWT Token trong Header
│   │   └── roles.guard.ts                # So sánh vai trò của User với @Roles đã định nghĩa
│   ├── interceptors/                     # Can thiệp vào luồng Request & Response
│   │   ├── transform.interceptor.ts      # Bọc mọi kết quả API trả về thành {statusCode: 200, success: true, data: ...}
│   │   └── logging.interceptor.ts        # In ra console thời gian thực thi (ms) của từng API
│   └── index.ts                          # Export tập trung các tiện ích dùng chung
│
├── entities/                             # 🗄️ CƠ SỞ DỮ LIỆU (11 BẢNG CHUẨN 3NF)
│   ├── department.entity.ts              # Phòng ban công ty
│   ├── user.entity.ts                    # Tài khoản người dùng (quan hệ phòng ban, quản lý trực tiếp)
│   ├── job.entity.ts                     # Tin tuyển dụng
│   ├── application.entity.ts             # Đơn ứng tuyển của ứng viên (lưu điểm AI CV, trạng thái)
│   ├── interview.entity.ts               # Lịch phỏng vấn với ứng viên
│   ├── onboarding-task.entity.ts         # Nhiệm vụ hội nhập dành cho nhân viên mới
│   ├── employee-mood.entity.ts           # Nhật ký cảm xúc hàng ngày & cờ cảnh báo Burnout
│   ├── document.entity.ts                # Tài liệu nội bộ & chính sách công ty
│   ├── training-course.entity.ts         # Khóa đào tạo kỹ năng
│   ├── employee-training.entity.ts       # Tiến độ học tập của nhân viên
│   └── performance-review.entity.ts      # Đánh giá hiệu suất & KPI định kỳ
│
├── modules/                              # 🧩 CÁC PHÂN HỆ NGHIỆP VỤ
│   ├── auth/                             # Xác thực & Cấp phát JWT (ĐÃ CHẠY 100%)
│   │   ├── dto/login.dto.ts              # Kiểm tra dữ liệu đăng nhập đầu vào
│   │   ├── auth.controller.ts            # Endpoint: /api/auth/login, /api/auth/logout, /api/auth/profile
│   │   ├── auth.service.ts               # Mã hóa Bcrypt, ký JWT token, giải mã định danh
│   │   ├── jwt.strategy.ts               # Chiến lược Passport JWT
│   │   └── auth.module.ts                
│   ├── users/                            # Quản lý người dùng & Khởi tạo dữ liệu mẫu (Seed Data)
│   │   ├── users.controller.ts           # Endpoint cập nhật quyền, lấy danh sách nhân sự
│   │   └── users.service.ts              # Tự động nạp sẵn 4 tài khoản mẫu vào MySQL khi chạy lần đầu
│   ├── core/                             # Tầng kết nối dịch vụ ngoài
│   │   ├── ai/gemini.service.ts          # Singleton gọi Google Gemini AI (sinh JD, chấm điểm CV)
│   │   └── automation/n8n.service.ts     # Singleton bắn Webhook sang n8n tự động hóa
│   ├── jobs/                             # Phân hệ Tin tuyển dụng (Khung mẫu cho Thành viên 2)
│   ├── applications/                     # Phân hệ Ứng tuyển & Phỏng vấn (Khung mẫu cho Thành viên 2)
│   └── onboarding/                       # Phân hệ Hội nhập, Mood & Copilot (Khung mẫu cho Thành viên 3)
│
├── app.module.ts                         # Module gốc kết nối TypeORM MySQL và kích hoạt các Modules
└── main.ts                               # File chạy chính: Đăng ký Global Filter, Interceptors, ValidationPipe, CORS
```

---

### 2.3. Chi tiết Cấu trúc Frontend (`frontend/src/`)
Frontend được tổ chức theo cấu trúc chuẩn công nghiệp với **React 18 + TypeScript + Tailwind CSS**, đảm bảo các thành viên viết code có tính kế thừa cao và không bị xung đột.

```
frontend/src/
├── api/                                  # 🌐 TẦNG GIAO TIẾP VỚI BACKEND
│   ├── client.ts                         # Cấu hình Axios Interceptor:
│   │                                     #   - Tự động lấy JWT từ localStorage đính vào Header `Bearer <token>`
│   │                                     #   - Lắng nghe mã lỗi 401 Unauthorized để tự logout và chuyển trang
│   ├── auth.api.ts                       # Gọi API đăng nhập, lấy thông tin cá nhân
│   ├── jobs.api.ts                       # Gọi API lấy danh sách việc làm, tạo tin mới
│   ├── applications.api.ts               # Gọi API nộp CV, quản lý ứng viên ATS
│   ├── onboarding.api.ts                 # Gọi API nhiệm vụ onboarding, check-in cảm xúc
│   ├── users.api.ts                      # Gọi API danh sách nhân sự
│   └── index.ts                          # Export tập trung toàn bộ API endpoints
│
├── components/                           # 🎨 THƯ VIỆN GIAO DIỆN DÙNG CHUNG
│   ├── common/                           # Các thành phần giao diện nhỏ (UI Atoms)
│   │   ├── Button.tsx                    # Nút bấm chuẩn với các biến thể (primary, secondary, danger)
│   │   ├── Card.tsx                      # Khung thẻ nội dung bo tròn, đổ bóng sang trọng
│   │   ├── Badge.tsx                     # Huy hiệu hiển thị trạng thái, nhãn vai trò nhiều màu sắc
│   │   ├── Modal.tsx                     # Cửa sổ pop-up bật lên
│   │   ├── EmptyState.tsx                # Giao diện thông báo khi không có dữ liệu
│   │   └── index.ts                      # Export tập trung
│   ├── guards/                           
│   │   └── ProtectedRoute.tsx            # Bọc các trang yêu cầu đăng nhập và phân quyền theo Role
│   └── Navbar.tsx                        # Thanh điều hướng trên cùng:
│                                         #   - Hiển thị Logo, Tên ứng dụng
│                                         #   - Huy hiệu quyền người dùng (Role Badge)
│                                         #   - Bộ chuyển quyền nhanh (Quick Role Switcher) để test
│                                         #   - Nút Đăng xuất chức năng thực tế
│
├── context/                              # 🔐 QUẢN LÝ TRẠNG THÁI TOÀN CỤC
│   └── AuthContext.tsx                   # Quản lý phiên đăng nhập, lưu token, thông tin User hiện tại
│
├── layouts/                              # 📐 BỐ CỤC TRANG
│   └── MainLayout.tsx                    # Bố cục chuẩn gồm Navbar trên, Nội dung ở giữa, Footer dưới
│
├── pages/                                # 🖥️ CÁC MÀN HÌNH CHỨC NĂNG
│   ├── LoginPage.tsx                     # [HOÀN CHỈNH 100%] Đăng nhập email/mật khẩu + 4 thẻ bấm nhanh
│   ├── CareersPage.tsx                   # [KHỞI ĐẦU] Cổng việc làm công khai cho ứng viên xem tin
│   ├── JobDetailPage.tsx                 # [KHỞI ĐẦU] Chi tiết công việc & Form nộp hồ sơ CV
│   ├── RecruitmentAdminPage.tsx          # [KHỞI ĐẦU] Bàn điều hành ATS dành cho HR & Quản lý
│   ├── EmployeeWorkspacePage.tsx         # [KHỞI ĐẦU] Không gian làm việc nhân viên, Check-in cảm xúc
│   └── AdminSettingsPage.tsx             # [KHỞI ĐẦU] Trang quản trị hệ thống dành cho Superadmin
│
├── types/                                # 📝 ĐỊNH NGHĨA KIỂU DỮ LIỆU TYPESCRIPT
│   └── index.ts                          # Khai báo kiểu User, Job, Application, Mood...
│
├── App.tsx                               # Định tuyến React Router DOM (bọc ProtectedRoute theo Role)
└── main.tsx                              # Điểm gắn ứng dụng React vào DOM
```

---

## ⚡ PHẦN 3: NHỮNG GÌ ĐÃ CHẠY ĐƯỢC 100% (OUT-OF-THE-BOX)

Khi các bạn trong nhóm tải code về và khởi động, toàn bộ các tính năng sau đã hoạt động mượt mà:
1. **Khởi động và kết nối Database tự động**:
   - Khởi động MySQL 8.0 qua 1 lệnh Docker.
   - TypeORM tự động đồng bộ hóa tạo đủ **11 bảng** cùng các khóa ngoại và ràng buộc toàn vẹn.
2. **Khởi tạo dữ liệu mẫu (Seed Data)**:
   - Hệ thống tự động tạo 2 phòng ban: `Kỹ Thuật Công Nghệ` và `Nhân Sự & Vận Hành`.
   - Tự động tạo sẵn **4 tài khoản đại diện cho 4 quyền** với mật khẩu mặc định `Password123@`:
     - `admin@fpt.edu.vn` (Vai trò: **SUPERADMIN**)
     - `hr@fpt.edu.vn` (Vai trò: **HR**)
     - `manager.it@fpt.edu.vn` (Vai trò: **MANAGER**)
     - `quan.pham@fpt.edu.vn` (Vai trò: **EMPLOYEE**)
3. **Luồng Xác thực & Phân quyền hoàn chỉnh (Authentication & RBAC)**:
   - Đăng nhập nhập form hoặc **click nhanh vào 1 trong 4 thẻ tài khoản mẫu** tại màn hình Login.
   - Nhận mã JWT, lưu vào `localStorage`, tự động giải mã thông tin hiển thị lên Navbar.
   - Khi chuyển trang, `ProtectedRoute` tự động kiểm tra quyền, nếu không đúng vai trò sẽ hiển thị màn hình từ chối **403 Forbidden** lịch sự.
   - Nút **Đăng xuất (Logout)** xóa sạch session và chuyển hướng ngay về `/login`.
   - **Quick Role Switcher** trên góc phải Navbar cho phép kiểm thử chuyển đổi qua lại giữa các quyền mà không cần gõ lại mật khẩu.
4. **Hạ tầng API & Bắt lỗi tự động**:
   - Toàn bộ request từ Frontend tự động gắn kèm `Authorization: Bearer <token>`.
   - Khi token hết hạn hoặc sai lệch (401), Frontend tự động điều hướng người dùng về màn hình đăng nhập.
   - Toàn bộ kết quả Backend tự động được bọc trong cấu trúc chuẩn JSON `{ statusCode: 200, success: true, data: ... }`.

---

## 👥 PHẦN 4: BẢNG PHÂN CÔNG CÔNG VIỆC CHI TIẾT (WORK BREAKDOWN)

Nhờ hạ tầng ngoại vi và giao diện khởi đầu đã được thiết lập sẵn, các thành viên **chỉ việc tập trung 100% vào viết code nghiệp vụ logic** theo phân công dưới đây:

| Thành viên | Phân hệ phụ trách | Thư mục Backend cần code | File Frontend cần hoàn thiện | Nội dung công việc chính |
| :--- | :--- | :--- | :--- | :--- |
| **Thành viên 1** *(Lead)* | **Hạ tầng, Auth, DB & Điều phối** | `common/`, `entities/`, `modules/auth`, `core/` | `layouts/`, `api/client.ts`, `context/`, `components/` | ✅ **Đã hoàn thiện 100%** nền tảng cốt lõi, tiếp tục hỗ trợ review code và ghép nối hệ thống. |
| **Thành viên 2** | **Tuyển dụng ATS & AI Job** *(Sprint 2)* | `modules/jobs/`, `modules/applications/` | `pages/RecruitmentAdminPage.tsx`, `pages/CareersPage.tsx`, `pages/JobDetailPage.tsx` | 1. Hoàn thiện API CRUD tin tuyển dụng.<br>2. Gọi `geminiService.generateJD()` để sinh nội dung JD tự động.<br>3. Kéo thả Kanban danh sách ứng viên từ nộp đơn tới trúng tuyển.<br>4. Nút bấm 1-Click chuyển ứng viên trúng tuyển thành nhân viên mới. |
| **Thành viên 3** | **Hội nhập Nhân viên & AI Copilot** *(Sprint 3)* | `modules/onboarding/` | `pages/EmployeeWorkspacePage.tsx` | 1. API danh sách nhiệm vụ Onboarding theo ngày đầu nhận việc.<br>2. Chức năng Check-in tâm trạng hàng ngày (1 đến 5 sao).<br>3. Thuật toán phát hiện 3 ngày buồn liên tiếp để kích hoạt cờ `burnoutAlert`.<br>4. Widget Chatbox AI Copilot trả lời nội quy dựa trên tài liệu công ty. |
| **Thành viên 4** | **Đào tạo, KPI & Quản trị Hệ thống** *(Sprint 4)* | `modules/users/`, bổ sung modules tài liệu & đánh giá | `pages/AdminSettingsPage.tsx` | 1. Bảng quản trị danh sách người dùng, đổi vai trò (Role).<br>2. Upload tài liệu nội bộ & danh sách khóa học nội bộ.<br>3. Form tự đánh giá hiệu suất định kỳ (Self Performance Review). |

---

## 🛠️ PHẦN 5: HƯỚNG DẪN 3 BƯỚC KHỞI ĐỘNG DỰ ÁN CHO THÀNH VIÊN MỚI

Khi bạn trong nhóm clone repository về máy tính, chỉ cần làm đúng **3 bước đơn giản**:

### Bước 1: Khởi động Cơ sở dữ liệu MySQL bằng Docker
Mở Terminal tại thư mục gốc của dự án (`Human_Resources/`):
```bash
docker-compose up -d mysql
```
*(Lệnh này sẽ tự tạo container MySQL 8.0 chạy tại cổng 3306 với tài khoản `root` và mật khẩu `rootpassword`)*

### Bước 2: Cài đặt và Chạy Backend (NestJS)
Mở một cửa sổ Terminal mới:
```bash
cd backend
npm install
npm run start:dev
```
* Backend sẽ chạy tại: `http://localhost:3001`
* Terminal sẽ thông báo: `[TypeOrmModule] Database synchronized` và `[UsersService] Seeded 4 demo accounts successfully`.

### Bước 3: Cài đặt và Chạy Frontend (React + Vite)
Mở một cửa sổ Terminal mới khác:
```bash
cd frontend
npm install
npm run dev
```
* Truy cập ứng dụng tại: `http://localhost:5173`
* Bạn sẽ thấy màn hình đăng nhập hiển thị ngay với 4 thẻ tài khoản để bấm đăng nhập trải nghiệm!

---

## 💡 PHẦN 6: QUY TẮC LẬP TRÌNH DÀNH CHO CẢ NHÓM (TEAM CODE CONVENTION)

1. **Quy tắc gọi API ở Frontend**:
   - Tuyệt đối **không dùng `fetch()` thô** hoặc tạo mới instance `axios`.
   - Luôn sử dụng `apiClient` từ `src/api/client.ts` hoặc các file API domain (`jobs.api.ts`, `onboarding.api.ts`) để luôn tự động có Token xác thực.
2. **Quy tắc viết Controller ở Backend**:
   - Sử dụng `@UseGuards(JwtAuthGuard, RolesGuard)` khi API yêu cầu đăng nhập.
   - Thêm decorator `@Roles(UserRole.HR, UserRole.SUPERADMIN)` để phân quyền rõ ràng.
   - Lấy `userId` của người đang gọi API qua `@CurrentUser('id')`.
3. **Quy tắc Git**:
   - Nhánh `main`: Nhánh ổn định, chỉ Trưởng nhóm merge sau khi review.
   - Nhánh chức năng của từng bạn:
     - Thành viên 2: `git checkout -b feature/recruitment-ats`
     - Thành viên 3: `git checkout -b feature/onboarding-copilot`
     - Thành viên 4: `git checkout -b feature/admin-training-kpi`

---
*Chúc cả nhóm làm việc hiệu quả và hoàn thành xuất sắc đồ án với chất lượng tốt nhất!*
