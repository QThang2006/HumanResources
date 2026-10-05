# 📋 HỒ SƠ KỸ THUẬT PHÂN HỆ THÀNH VIÊN 3
## ONBOARDING 30 NGÀY · SỨC KHỎE TINH THẦN · AI COPILOT RAG

> **Vai trò:** Fullstack Engineer — Phân hệ Hội Nhập & Văn Hóa Doanh Nghiệp
> **Nhánh Git:** `feature/onboarding-copilot`
> **Trang chính:** `/employee/workspace` — File: `frontend/src/pages/EmployeeWorkspacePage.tsx`
> **Module Backend:** `backend/src/modules/onboarding/`
> **Cập nhật:** 01/10/2026

---

## MỤC LỤC

1. [Tổng Quan Phân Hệ](#1-tổng-quan-phân-hệ)
2. [Sơ Đồ Kiến Trúc & Luồng Dữ Liệu](#2-sơ-đồ-kiến-trúc--luồng-dữ-liệu)
3. [Cơ Sở Dữ Liệu — Schema & Quan Hệ](#3-cơ-sở-dữ-liệu--schema--quan-hệ)
4. [Backend API — Danh Mục Endpoint & Contract](#4-backend-api--danh-mục-endpoint--contract)
5. [Frontend — Component Tree & Phân Rã Giao Diện](#5-frontend--component-tree--phân-rã-giao-diện)
6. [Tích Hợp AI & Automation (Gemini + n8n)](#6-tích-hợp-ai--automation-gemini--n8n)
7. [Lộ Trình Triển Khai Từng Bước](#7-lộ-trình-triển-khai-từng-bước)
8. [Kịch Bản Kiểm Thử (Test Playbook)](#8-kịch-bản-kiểm-thử-test-playbook)
9. [Danh Mục File Phụ Trách](#9-danh-mục-file-phụ-trách)
10. [Quy Tắc Kỹ Thuật Bắt Buộc](#10-quy-tắc-kỹ-thuật-bắt-buộc)

---

## 1. TỔNG QUAN PHÂN HỆ

### 1.1. Bối cảnh nghiệp vụ

Phân hệ này giải quyết **giai đoạn sau tuyển dụng** — khi ứng viên đã trúng tuyển và trở thành nhân viên mới. Trong thực tế doanh nghiệp, đây là giai đoạn quyết định nhân viên sẽ gắn bó hay rời bỏ công ty:

- **70% nhân viên** quyết định ở lại hay nghỉ việc trong **30 ngày đầu tiên** (nguồn: SHRM).
- **Kiệt sức (Burnout)** là nguyên nhân #1 khiến nhân viên nghỉ việc đột ngột mà cấp trên không kịp phát hiện.

### 1.2. Bốn tính năng cốt lõi

| # | Tính năng | Mô tả ngắn | Người dùng chính |
|---|-----------|-------------|------------------|
| 1 | **Check-in Cảm Xúc Hàng Ngày** | Widget 3 nút emoji (😊 😐 😫), lưu tâm trạng + ghi chú vào DB | EMPLOYEE |
| 2 | **Checklist Onboarding 30 Ngày** | Danh sách nhiệm vụ có checkbox, thanh tiến độ %, phân loại theo `PAPERWORK / EQUIPMENT / TRAINING / MEETING` | EMPLOYEE |
| 3 | **Team Mood Monitor & Burnout Alert** | Bảng giám sát cảm xúc toàn đội; cảnh báo đỏ khi phát hiện stress liên tục; nút "Hẹn 1-on-1"; kích hoạt n8n bắn Telegram | MANAGER, HR |
| 4 | **AI Copilot RAG (Trợ Lý Sổ Tay)** | Khung chatbox hỏi đáp nội quy công ty, chế độ bảo hiểm, ngày phép... AI trả lời dựa trên tài liệu quy chế (RAG) | EMPLOYEE |

### 1.3. Hai góc nhìn (Dual Persona) trên cùng một trang

Trang `EmployeeWorkspacePage.tsx` render giao diện **hoàn toàn khác nhau** tùy theo quyền người dùng đang đăng nhập:

| Góc nhìn | Quyền | Nội dung hiển thị |
|----------|-------|-------------------|
| **Personal Workspace** | `EMPLOYEE` | Mood check-in · Checklist 30 ngày · AI Copilot chatbox |
| **Team Mood Dashboard** | `MANAGER` | Bảng giám sát cảm xúc đội ngũ · Burnout alert · Nút hẹn 1-on-1 |

Logic phân tách trong code hiện tại:
```tsx
// EmployeeWorkspacePage.tsx
{user?.role === 'EMPLOYEE' && ( /* Giao diện nhân viên */ )}
{user?.role === 'MANAGER'  && ( /* Giao diện trưởng phòng */ )}
```

---

## 2. SƠ ĐỒ KIẾN TRÚC & LUỒNG DỮ LIỆU

### 2.1. Kiến trúc tổng thể phân hệ

```
┌─────────────────────────────────────────────────────────────────────┐
│                       FRONTEND (React 19 + Vite 5)                  │
│                                                                     │
│  ┌──────────────────────────────┐   ┌────────────────────────────┐  │
│  │    GÓC NHÌN EMPLOYEE        │   │    GÓC NHÌN MANAGER       │  │
│  │  ┌────────────────────────┐  │   │  ┌──────────────────────┐ │  │
│  │  │ 😊 Mood Check-in      │  │   │  │ 📊 Team Mood Board   │ │  │
│  │  │ ☑️ Checklist 30 ngày   │  │   │  │ 🔴 Burnout Alerts    │ │  │
│  │  │ 🤖 AI Copilot Chat    │  │   │  │ 🤝 Nút Hẹn 1-on-1   │ │  │
│  │  └────────────────────────┘  │   │  └──────────────────────┘ │  │
│  └──────────────────────────────┘   └────────────────────────────┘  │
│                            │                      │                 │
│                    onboardingApi (Axios)           │                 │
└────────────────────────────┼──────────────────────┼─────────────────┘
                             │         HTTP         │
                             ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   BACKEND (NestJS 10 — Port 3001)                   │
│                                                                     │
│  OnboardingController ──▶ OnboardingService                        │
│                               │          │          │               │
│                               ▼          ▼          ▼               │
│                      onboarding_tasks  employee_moods  documents    │
│                           (MySQL)       (MySQL)       (MySQL)       │
│                               │                                     │
│                      ┌────────┴────────────────┐                    │
│                      ▼                         ▼                    │
│              GeminiService              N8nService                  │
│          (AI Copilot RAG Text)     (Burnout → Telegram)            │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2. Luồng xử lý chính (Sequence)

**Luồng A — Nhân viên check-in cảm xúc:**
```
Employee ──▶ Bấm 😫 Căng Thẳng + nhập ghi chú
         ──▶ POST /api/onboarding/mood  { mood: 'STRESSED', feedbackText: '...' }
         ──▶ OnboardingService.recordMood()
              ├── Lưu vào bảng employee_moods
              ├── Đếm số ngày STRESSED liên tiếp (≥ 3 ngày?)
              │     └── CÓ ──▶ Đánh cờ isBurnoutRisk = true
              │              ──▶ Gọi n8nService.triggerBurnoutAlert()
              │              ──▶ n8n bắn Telegram / Email cho HR & Manager
              └── Trả về EmployeeMood record
```

**Luồng B — Manager xem Team Mood và can thiệp:**
```
Manager ──▶ GET /api/onboarding/burnout-alerts
         ──▶ Nhìn thấy nhân viên Phạm Hồng Quân: 🔴 Burnout Risk
         ──▶ Bấm "Hẹn 1-on-1 Gỡ Rối"
         ──▶ PATCH /api/onboarding/mood/:id/resolve  { note: 'Đã gặp hỗ trợ' }
         ──▶ OnboardingService.resolveBurnout()
              ├── Cập nhật isResolved = true, resolvedById, resolvedNote
              └── Trả về kết quả
```

**Luồng C — Nhân viên chat với AI Copilot:**
```
Employee ──▶ Nhập: "Thử việc có được nghỉ phép không?"
         ──▶ POST /api/onboarding/chat  { message: '...' }
         ──▶ OnboardingService.chatWithCopilot()
              ├── Lấy nội dung tài liệu quy chế từ bảng documents (RAG context)
              ├── Ghép prompt: systemInstruction + nội dung tài liệu + câu hỏi
              ├── Gọi geminiService.generateText(prompt, systemInstruction)
              └── Trả về { reply: '...', sourceDocuments: [...] }
```

---

## 3. CƠ SỞ DỮ LIỆU — SCHEMA & QUAN HỆ

### 3.1. Bảng `onboarding_tasks` — Nhiệm vụ hội nhập 30 ngày

> **File Entity:** `backend/src/entities/onboarding-task.entity.ts`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | `INT` PK AUTO_INCREMENT | Khóa chính |
| `user_id` | `INT` FK → `users.id` | Nhân viên được giao task (CASCADE khi xóa user) |
| `title` | `VARCHAR(255)` | Tên nhiệm vụ. VD: "Nộp bản sao CCCD cho HR" |
| `description` | `TEXT` NULLABLE | Hướng dẫn chi tiết cách thực hiện |
| `category` | `ENUM('PAPERWORK','EQUIPMENT','TRAINING','MEETING')` | Phân loại nhiệm vụ (Default: `EQUIPMENT`) |
| `due_day` | `INT` (Default: 7) | Hạn hoàn thành tính theo ngày thứ bao nhiêu kể từ ngày vào (Day 1, 7, 14, 30) |
| `is_completed` | `BOOLEAN` (Default: false) | Trạng thái hoàn thành |
| `completed_at` | `DATETIME` NULLABLE | Thời điểm nhân viên tích hoàn thành |
| `created_at` | `DATETIME` AUTO | Thời điểm tạo record |

**Enum `TaskCategory`:**
```typescript
export enum TaskCategory {
  PAPERWORK  = 'PAPERWORK',  // Thủ tục giấy tờ (CCCD, hợp đồng, bảo hiểm)
  EQUIPMENT  = 'EQUIPMENT',  // Thiết bị (laptop, thẻ ra vào, email công ty)
  TRAINING   = 'TRAINING',   // Đào tạo (đọc tài liệu, xem video orientation)
  MEETING    = 'MEETING',    // Gặp gỡ (gặp mentor, gặp trưởng phòng, team)
}
```

### 3.2. Bảng `employee_moods` — Nhật ký cảm xúc & Cảnh báo kiệt sức

> **File Entity:** `backend/src/entities/employee-mood.entity.ts`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | `INT` PK AUTO_INCREMENT | Khóa chính |
| `user_id` | `INT` FK → `users.id` | Nhân viên check-in (CASCADE khi xóa user) |
| `mood` | `ENUM('GREAT','NORMAL','STRESSED')` | Tâm trạng chọn |
| `feedback_text` | `TEXT` NULLABLE | Ghi chú / lý do bổ sung |
| `sentiment_label` | `ENUM('POSITIVE','NEUTRAL','NEGATIVE')` NULLABLE | Nhãn phân tích cảm xúc (do AI gán nếu có) |
| `is_burnout_risk` | `BOOLEAN` (Default: false) | Cờ đánh dấu nguy cơ kiệt sức |
| `is_resolved` | `BOOLEAN` (Default: false) | Đã được Manager/HR can thiệp xử lý chưa |
| `resolved_by_id` | `INT` FK → `users.id` NULLABLE | ID người đã can thiệp giải quyết |
| `resolved_note` | `TEXT` NULLABLE | Ghi chú của Manager khi can thiệp (VD: "Đã hẹn gặp 1-on-1") |
| `created_at` | `DATETIME` AUTO | Thời điểm check-in |

**Enum `MoodType` & `SentimentLabel`:**
```typescript
export enum MoodType {
  GREAT    = 'GREAT',     // 😊 Tuyệt vời
  NORMAL   = 'NORMAL',    // 😐 Bình thường
  STRESSED = 'STRESSED',  // 😫 Căng thẳng
}

export enum SentimentLabel {
  POSITIVE = 'POSITIVE',  // Tích cực
  NEUTRAL  = 'NEUTRAL',   // Trung tính
  NEGATIVE = 'NEGATIVE',  // Tiêu cực
}
```

### 3.3. Sơ đồ quan hệ (ERD) trong phạm vi phân hệ

```
┌──────────────────┐         ┌──────────────────────┐
│     users         │         │   onboarding_tasks    │
│──────────────────│    1:N  │──────────────────────│
│ id (PK)          │◄────────│ user_id (FK)          │
│ full_name        │         │ title                 │
│ email            │         │ category (ENUM)       │
│ role (ENUM)      │         │ due_day               │
│ department_id    │         │ is_completed          │
│ manager_id (FK)──┤ self    │ completed_at          │
└──────────────────┘         └──────────────────────┘
        │
        │ 1:N
        ▼
┌──────────────────────┐
│   employee_moods      │
│──────────────────────│
│ user_id (FK)          │
│ mood (ENUM)           │
│ feedback_text         │
│ sentiment_label       │
│ is_burnout_risk       │
│ is_resolved           │
│ resolved_by_id (FK)───┤──▶ users.id (Manager/HR)
│ resolved_note         │
└──────────────────────┘
```

---

## 4. BACKEND API — DANH MỤC ENDPOINT & CONTRACT

> **Controller:** `backend/src/modules/onboarding/onboarding.controller.ts`
> **Service:** `backend/src/modules/onboarding/onboarding.service.ts`
> **Base URL:** `http://localhost:3001/api/onboarding`

### 4.1. Tổng quan 6 endpoint

| # | Method | Path | Auth | Role | Mô tả |
|---|--------|------|------|------|-------|
| 1 | `GET` | `/tasks` | JWT | Any logged-in | Lấy checklist onboarding của user hiện tại |
| 2 | `PATCH` | `/tasks/:id/toggle` | JWT | Any logged-in | Tích / bỏ tích hoàn thành 1 task |
| 3 | `POST` | `/mood` | JWT | Any logged-in | Ghi nhận check-in cảm xúc hàng ngày |
| 4 | `GET` | `/burnout-alerts` | JWT | HR, SUPERADMIN | Lấy danh sách cảnh báo kiệt sức |
| 5 | `PATCH` | `/mood/:id/resolve` | JWT | MANAGER, HR | Can thiệp & đóng cảnh báo kiệt sức |
| 6 | `POST` | `/chat` | JWT | Any logged-in | Chat với AI Copilot hỏi đáp quy chế |

### 4.2. Chi tiết từng endpoint

#### Endpoint 1: `GET /api/onboarding/tasks`
**Mô tả:** Lấy danh sách nhiệm vụ onboarding 30 ngày của nhân viên đang đăng nhập. Tự động lấy `userId` từ JWT token qua decorator `@CurrentUser('id')`.

**Response mong muốn (sau khi bạn hoàn thiện):**
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "userId": 4,
    "progressPercent": 40,
    "tasks": [
      {
        "id": 1,
        "title": "Nộp bản sao CCCD & Hợp đồng lao động cho HR",
        "description": "Mang 2 bản photo CCCD và ký hợp đồng tại phòng Nhân sự tầng 3",
        "category": "PAPERWORK",
        "dueDay": 1,
        "isCompleted": true,
        "completedAt": "2026-10-01T09:30:00.000Z"
      },
      {
        "id": 2,
        "title": "Nhận laptop & cài đặt môi trường dev",
        "description": "Liên hệ anh Minh IT để nhận máy, cài VS Code, Docker, Git",
        "category": "EQUIPMENT",
        "dueDay": 1,
        "isCompleted": true,
        "completedAt": "2026-10-01T14:00:00.000Z"
      },
      {
        "id": 3,
        "title": "Đọc Sổ tay Nhân viên & Quy chế nội bộ",
        "description": "File PDF trên Google Drive, đọc kỹ chương 1-3 về giờ giấc và nghỉ phép",
        "category": "TRAINING",
        "dueDay": 7,
        "isCompleted": false,
        "completedAt": null
      },
      {
        "id": 4,
        "title": "Gặp Mentor hướng dẫn (1-on-1 đầu tiên)",
        "description": "Hẹn lịch 30 phút với anh/chị mentor được phân công",
        "category": "MEETING",
        "dueDay": 7,
        "isCompleted": false,
        "completedAt": null
      },
      {
        "id": 5,
        "title": "Hoàn thành bài kiểm tra định hướng văn hóa công ty",
        "description": "Quiz online 20 câu trên hệ thống LMS nội bộ",
        "category": "TRAINING",
        "dueDay": 30,
        "isCompleted": false,
        "completedAt": null
      }
    ]
  }
}
```

**Logic tính `progressPercent`:**
```typescript
const completed = tasks.filter(t => t.isCompleted).length;
const progressPercent = tasks.length > 0
  ? Math.round((completed / tasks.length) * 100)
  : 0;
```

---

#### Endpoint 2: `PATCH /api/onboarding/tasks/:id/toggle`
**Mô tả:** Đánh dấu hoàn thành hoặc bỏ hoàn thành một nhiệm vụ.

**Logic cần triển khai:**
```typescript
async toggleTask(taskId: number, userId: number) {
  const task = await this.taskRepository.findOne({
    where: { id: taskId, userId },  // Chỉ cho phép toggle task của chính mình
  });
  if (!task) throw new NotFoundException('Nhiệm vụ không tồn tại.');

  task.isCompleted = !task.isCompleted;
  task.completedAt = task.isCompleted ? new Date() : null;
  return this.taskRepository.save(task);
}
```

---

#### Endpoint 3: `POST /api/onboarding/mood`
**Mô tả:** Nhân viên ghi nhận tâm trạng hàng ngày.

**DTO đầu vào:** `CheckInMoodDto`
```typescript
{
  "mood": "STRESSED",           // Bắt buộc: 'GREAT' | 'NORMAL' | 'STRESSED'
  "feedbackText": "Deadline quá gấp, chưa quen tool nội bộ"  // Tùy chọn
}
```

**Logic cốt lõi cần triển khai:**
```typescript
async recordMood(userId: number, mood: MoodType, feedbackText?: string) {
  // 1. Tạo bản ghi mood mới
  const newMood = this.moodRepository.create({
    userId,
    mood,
    feedbackText,
  });

  // 2. Kiểm tra burnout: Đếm số ngày STRESSED liên tiếp gần nhất
  if (mood === MoodType.STRESSED) {
    const recentMoods = await this.moodRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 3,  // Lấy 3 bản ghi gần nhất
    });

    const consecutiveStress = recentMoods.filter(m => m.mood === MoodType.STRESSED).length;

    // Nếu đã STRESSED ≥ 2 ngày trước đó (tức tổng cộng ≥ 3 ngày liên tục với ngày hôm nay)
    if (consecutiveStress >= 2) {
      newMood.isBurnoutRisk = true;

      // 3. Gọi n8n bắn cảnh báo Telegram/Email cho HR & Manager
      await this.n8nService.triggerBurnoutAlert({
        userId,
        employeeName: '...',       // Query từ bảng users
        departmentName: '...',     // Query từ bảng departments
        stressDays: consecutiveStress + 1,
        latestFeedback: feedbackText,
      });
    }
  }

  return this.moodRepository.save(newMood);
}
```

---

#### Endpoint 4: `GET /api/onboarding/burnout-alerts`
**Mô tả:** Lấy danh sách tất cả bản ghi mood có `isBurnoutRisk = true` và `isResolved = false`.

**Phân quyền:** Chỉ `HR` và `SUPERADMIN` được gọi (đã khai báo sẵn `@Roles(UserRole.HR, UserRole.SUPERADMIN)` trong controller).

**Logic cần triển khai:**
```typescript
async getBurnoutAlerts() {
  return this.moodRepository.find({
    where: { isBurnoutRisk: true, isResolved: false },
    relations: ['user', 'user.department'],
    order: { createdAt: 'DESC' },
  });
}
```

---

#### Endpoint 5: `PATCH /api/onboarding/mood/:id/resolve`
**Mô tả:** Manager hoặc HR can thiệp xử lý cảnh báo kiệt sức. Đánh dấu `isResolved = true`.

**DTO đầu vào:** `ResolveMoodDto`
```typescript
{
  "note": "Đã hẹn gặp 1-on-1 ngày 05/10, đề xuất giảm tải sprint"  // Tùy chọn
}
```

**Logic cần triển khai:**
```typescript
async resolveBurnout(id: number, managerId: number, note?: string) {
  const mood = await this.moodRepository.findOne({ where: { id } });
  if (!mood) throw new NotFoundException('Không tìm thấy bản ghi cảm xúc.');

  mood.isResolved = true;
  mood.resolvedById = managerId;
  mood.resolvedNote = note || 'Đã can thiệp.';
  return this.moodRepository.save(mood);
}
```

---

#### Endpoint 6: `POST /api/onboarding/chat`
**Mô tả:** Nhân viên gửi câu hỏi cho AI Copilot. Hệ thống lấy nội dung tài liệu quy chế công ty từ bảng `documents` làm context (RAG), ghép với câu hỏi rồi gọi Gemini.

**DTO đầu vào:** `ChatCopilotDto`
```typescript
{
  "message": "Thử việc có được nghỉ phép không?"
}
```

**Logic cần triển khai:**
```typescript
async chatWithCopilot(userId: number, message: string) {
  // 1. Lấy nội dung tài liệu quy chế từ bảng documents (RAG Context)
  const docs = await this.docRepository.find({ take: 5 });
  const context = docs.map(d => d.content).join('\n---\n');

  // 2. Xây dựng system instruction cho Gemini
  const systemInstruction = `Bạn là Trợ lý Sổ tay Nhân viên của công ty.
Trả lời ngắn gọn, thân thiện, chính xác dựa trên nội dung quy chế sau:
${context}
Nếu không tìm thấy thông tin trong tài liệu, hãy nói rõ: "Tôi chưa có thông tin này trong sổ tay."`;

  // 3. Gọi Gemini AI
  const reply = await this.geminiService.generateText(message, systemInstruction);

  return {
    userId,
    reply,
    sourceDocuments: docs.map(d => d.title),
  };
}
```

---

## 5. FRONTEND — COMPONENT TREE & PHÂN RÃ GIAO DIỆN

### 5.1. File chính và API client

| File | Vai trò |
|------|---------|
| `frontend/src/pages/EmployeeWorkspacePage.tsx` | Trang chính — chứa toàn bộ giao diện 2 góc nhìn |
| `frontend/src/api/onboarding.api.ts` | Axios wrapper gọi 6 endpoint, đã viết sẵn 100% |
| `frontend/src/api/client.ts` | Axios instance dùng chung, tự gắn JWT — **KHÔNG ĐƯỢC SỬA** |
| `frontend/src/types/index.ts` | TypeScript interfaces (`OnboardingTask`, `EmployeeMood`) — đã khai báo sẵn |
| `frontend/src/context/AuthContext.tsx` | Quản lý state user đăng nhập — **KHÔNG ĐƯỢC SỬA** |

### 5.2. API client đã viết sẵn (chỉ cần import và gọi)

File `frontend/src/api/onboarding.api.ts` đã export sẵn toàn bộ hàm gọi API:

```typescript
import { onboardingApi } from '../api/onboarding.api';

// Lấy checklist
const { tasks, progressPercent } = await onboardingApi.getTasks();

// Toggle task
await onboardingApi.toggleTask(taskId);

// Check-in cảm xúc
await onboardingApi.checkInMood({ mood: 'STRESSED', feedbackText: '...' });

// Lấy danh sách cảnh báo burnout (MANAGER/HR)
const alerts = await onboardingApi.getBurnoutAlerts();

// Đóng cảnh báo burnout
await onboardingApi.resolveBurnout(moodId, 'Đã gặp hỗ trợ');

// Chat AI Copilot
const { reply, sourceDocuments } = await onboardingApi.chatWithCopilot('Hỏi gì đó...');
```

### 5.3. Cây component đề xuất (Component Tree)

```
EmployeeWorkspacePage.tsx
│
├── [EMPLOYEE view]
│   ├── <MoodCheckIn />                 ★ Widget 3 nút emoji + ô ghi chú
│   │     ├── State: selectedMood, feedbackText, isSubmitting, todayMood
│   │     ├── API: onboardingApi.checkInMood()
│   │     └── UX: Sau khi submit → hiện "Cảm ơn bạn đã chia sẻ!" + disable nút
│   │
│   ├── <OnboardingChecklist />         ★ Danh sách task + thanh tiến độ
│   │     ├── State: tasks[], progressPercent, loading
│   │     ├── API: onboardingApi.getTasks(), onboardingApi.toggleTask()
│   │     ├── UX: Checkbox click → optimistic update → sync DB
│   │     └── Sub: <ProgressBar percent={progressPercent} />
│   │           <TaskItem task={task} onToggle={handleToggle} />
│   │
│   └── <CopilotChat />                ★ Khung chatbox AI hỏi đáp
│         ├── State: messages[], inputText, isTyping
│         ├── API: onboardingApi.chatWithCopilot()
│         └── UX: Typing indicator "AI đang suy nghĩ..."
│                  Hiển thị sourceDocuments dưới câu trả lời
│
└── [MANAGER view]
    └── <TeamMoodDashboard />           ★ Bảng giám sát cảm xúc đội ngũ
          ├── State: alerts[], loading
          ├── API: onboardingApi.getBurnoutAlerts()
          │         onboardingApi.resolveBurnout()
          ├── Sub: <MoodAlertCard alert={alert} onResolve={handleResolve} />
          └── UX: Thẻ nhân viên với tên, phòng ban, chuỗi ngày stress,
                   feedback text, badge "🔴 BURNOUT RISK"
                   Nút "Hẹn 1-on-1 Gỡ Rối" → mở confirm → gọi API resolve
```

### 5.4. Thiết kế giao diện chi tiết từng component

#### A. `<MoodCheckIn />` — Widget check-in cảm xúc

```
┌─────────────────────────────────────────────────────┐
│ 😊 Hôm nay bạn cảm thấy thế nào?                   │
│ Ghi nhận nhanh tâm trạng để DN hỗ trợ bạn tốt nhất │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │    😊     │  │    😐     │  │    😫     │       │
│  │ Tuyệt Vời │  │Bình Thường│  │Căng Thẳng │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                     │
│  📝 Chia sẻ thêm (không bắt buộc):                  │
│  ┌─────────────────────────────────────────────┐    │
│  │ Hôm nay deadline gấp quá...                 │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│               [ ✅ Gửi Check-in ]                   │
└─────────────────────────────────────────────────────┘
```

#### B. `<OnboardingChecklist />` — Checklist 30 ngày

```
┌─────────────────────────────────────────────────────┐
│ ☑️ Checklist Hội Nhập 30 Ngày                        │
│ Hoàn thành các mốc quan trọng trong tháng đầu tiên  │
│                                                     │
│ Tiến độ: ████████░░░░░░░░ 40% (2/5 tasks)           │
│                                                     │
│ 📋 Ngày 1                                           │
│  ✅ Nộp bản sao CCCD & Hợp đồng lao động      [📄] │
│  ✅ Nhận laptop & cài đặt môi trường dev       [💻] │
│                                                     │
│ 📋 Ngày 7                                           │
│  ☐ Đọc Sổ tay Nhân viên & Quy chế nội bộ     [📚] │
│  ☐ Gặp Mentor hướng dẫn (1-on-1 đầu tiên)    [🤝] │
│                                                     │
│ 📋 Ngày 30                                          │
│  ☐ Hoàn thành bài kiểm tra định hướng văn hóa [📚] │
└─────────────────────────────────────────────────────┘
```

#### C. `<CopilotChat />` — Trợ lý AI Copilot

```
┌─────────────────────────────────────┐
│ 🤖 HR Copilot RAG 24/7    ● Online │
│ Hỏi đáp chính sách ngày phép,      │
│ bảo hiểm, nội quy công ty          │
│─────────────────────────────────────│
│                                     │
│  👤 Thử việc có được nghỉ phép     │
│     không?                          │
│                                     │
│  🤖 Theo Sổ tay Nhân viên chương   │
│     3, mục 3.2: Nhân viên trong     │
│     thời gian thử việc được nghỉ    │
│     phép tối đa 1 ngày/tháng       │
│     (không lương). Nghỉ phép có     │
│     lương áp dụng sau khi ký HĐ    │
│     chính thức.                     │
│     📎 Nguồn: So_tay_NV_2026.pdf   │
│                                     │
│─────────────────────────────────────│
│ ┌─────────────────────────────┐ [➤] │
│ │ Nhập câu hỏi quy chế...    │     │
│ └─────────────────────────────┘     │
└─────────────────────────────────────┘
```

#### D. `<TeamMoodDashboard />` — Bảng giám sát cảm xúc (MANAGER)

```
┌─────────────────────────────────────────────────────────┐
│ 📊 Giám Sát Sức Khỏe Tinh Thần & Tiến Độ Hội Nhập      │
│ Dành riêng cho Trưởng phòng Kỹ thuật Phần mềm (TECH)    │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔴 BURNOUT RISK                                     │ │
│ │ Phạm Hồng Quân · Backend Developer                 │ │
│ │ Phòng: Kỹ thuật Phần mềm (TECH)                    │ │
│ │                                                     │ │
│ │ Chuỗi stress: 😫😫😫 (3 ngày liên tục)              │ │
│ │ Phản hồi: "Deadline quá gấp, chưa quen tool..."    │ │
│ │ Thời gian: 01/10/2026 lúc 15:30                    │ │
│ │                                                     │ │
│ │ [ 🤝 Hẹn 1-on-1 Gỡ Rối ]                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟢 BÌNH THƯỜNG                                      │ │
│ │ Nguyễn Thị Lan · Frontend Developer                 │ │
│ │ Tâm trạng hôm nay: 😊 Tuyệt vời                    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 6. TÍCH HỢP AI & AUTOMATION (GEMINI + N8N)

### 6.1. Các hàm của Trưởng nhóm mà bạn SẼ GỌI

Bạn **không cần tự viết** logic gọi Google Gemini hay bắn Webhook. Trưởng nhóm đã cung cấp sẵn 2 service trong `backend/src/modules/core/`:

| Service | Hàm | Bạn gọi ở đâu | Tác dụng |
|---------|-----|----------------|----------|
| `GeminiService` | `generateText(prompt, systemInstruction)` | `chatWithCopilot()` | Gọi Gemini AI trả về văn bản tự nhiên (Copilot RAG) |
| `N8nService` | `triggerBurnoutAlert(payload)` | `recordMood()` | Bắn webhook sang n8n → Telegram/Email cảnh báo kiệt sức |

### 6.2. Cách inject và sử dụng

Hai service này đã được inject sẵn trong `OnboardingService` constructor:

```typescript
// onboarding.service.ts — đã có sẵn
constructor(
  @InjectRepository(OnboardingTask)
  private readonly taskRepository: Repository<OnboardingTask>,
  @InjectRepository(EmployeeMood)
  private readonly moodRepository: Repository<EmployeeMood>,
  @InjectRepository(Document)
  private readonly docRepository: Repository<Document>,
  @InjectRepository(EmployeeTraining)
  private readonly trainingRepository: Repository<EmployeeTraining>,
  private readonly geminiService: GeminiService,    // ✅ Đã inject
  private readonly n8nService: N8nService,           // ✅ Đã inject
) {}
```

### 6.3. Cơ chế Fallback (Không có API Key vẫn chạy được)

`GeminiService` đã tích hợp sẵn cơ chế fallback:
- Nếu `GEMINI_API_KEY` chưa được cấu hình trong `.env` → `geminiService.isAvailable()` trả về `false`.
- Hàm `generateText()` sẽ trả về chuỗi: `"Dịch vụ Trí tuệ nhân tạo Gemini hiện chưa được cấu hình API Key."` thay vì crash.

**Khuyến nghị:** Trong `chatWithCopilot()`, kiểm tra trước:
```typescript
if (!this.geminiService.isAvailable()) {
  return {
    reply: 'Trợ lý AI hiện chưa được kích hoạt. Vui lòng liên hệ Admin để cấu hình API Key.',
    sourceDocuments: [],
  };
}
```

---

## 7. LỘ TRÌNH TRIỂN KHAI TỪNG BƯỚC

### Bước 0: Chuẩn bị môi trường

```bash
# 0.1. Tạo nhánh riêng từ main
git checkout main
git pull origin main
git checkout -b feature/onboarding-copilot

# 0.2. Khởi động MySQL (Docker phải đang chạy)
docker compose up -d mysql

# 0.3. Cài đặt và chạy Backend
cd backend
npm install
npm run start:dev
# Chờ log: "🚀 HR Enterprise Backend đang chạy tại: http://localhost:3001/api"

# 0.4. Cài đặt và chạy Frontend (Terminal mới)
cd frontend
npm install
npm run dev
# Mở http://localhost:5173
```

### Bước 1: Hoàn thiện Backend — `recordMood()` + Burnout Detection (Sprint 3a)

**File sửa:** `backend/src/modules/onboarding/onboarding.service.ts`

**Checklist:**
- [ ] Triển khai `recordMood()`: Tạo bản ghi mood, đếm ngày stress liên tiếp, đánh cờ `isBurnoutRisk`.
- [ ] Gọi `this.n8nService.triggerBurnoutAlert()` khi phát hiện burnout.
- [ ] Triển khai `getBurnoutAlerts()`: Query `isBurnoutRisk = true, isResolved = false` kèm relation `user`.
- [ ] Triển khai `resolveBurnout()`: Cập nhật `isResolved`, `resolvedById`, `resolvedNote`.

### Bước 2: Hoàn thiện Backend — `toggleTask()` + `getTasks()` (Sprint 3b)

**File sửa:** `backend/src/modules/onboarding/onboarding.service.ts`

**Checklist:**
- [ ] Triển khai `getTasks()`: Query task theo `userId`, tính `progressPercent`.
- [ ] Triển khai `toggleTask()`: Flip `isCompleted`, cập nhật `completedAt`.
- [ ] (Tùy chọn) Viết logic seed 5 task mẫu cho tài khoản `employee@company.com` (tương tự cách Trưởng nhóm seed 4 tài khoản trong `UsersService`).

### Bước 3: Hoàn thiện Frontend — `<MoodCheckIn />` + `<OnboardingChecklist />` (Sprint 3c)

**File sửa:** `frontend/src/pages/EmployeeWorkspacePage.tsx`

**Checklist:**
- [ ] Thay thế khung dashed border bằng component `<MoodCheckIn />` thật.
- [ ] Thay thế khung dashed border bằng component `<OnboardingChecklist />` thật.
- [ ] Kết nối `onboardingApi.checkInMood()` và `onboardingApi.getTasks()`.
- [ ] Thanh `<ProgressBar />` phản ứng realtime khi tích/bỏ tích task.

### Bước 4: Hoàn thiện Frontend — `<TeamMoodDashboard />` cho Manager (Sprint 3d)

**File sửa:** `frontend/src/pages/EmployeeWorkspacePage.tsx`

**Checklist:**
- [ ] Thay thế khung dashed border bằng bảng giám sát cảm xúc đội ngũ.
- [ ] Kết nối `onboardingApi.getBurnoutAlerts()`.
- [ ] Nút "Hẹn 1-on-1 Gỡ Rối" → Confirm dialog → `onboardingApi.resolveBurnout()`.
- [ ] Badge `🔴 BURNOUT RISK` / `🟢 BÌNH THƯỜNG`.

### Bước 5: Hoàn thiện Frontend — `<CopilotChat />` (Sprint 4)

**File sửa:** `frontend/src/pages/EmployeeWorkspacePage.tsx`

**Checklist:**
- [ ] Thay thế khung dashed border bằng chatbox thật.
- [ ] Kết nối `onboardingApi.chatWithCopilot()`.
- [ ] Typing indicator "AI đang suy nghĩ...".
- [ ] Hiển thị `sourceDocuments` dưới câu trả lời.

### Bước 6: Hoàn thiện Backend — `chatWithCopilot()` + RAG context (Sprint 4)

**File sửa:** `backend/src/modules/onboarding/onboarding.service.ts`

**Checklist:**
- [ ] Query bảng `documents` để lấy nội dung quy chế làm context.
- [ ] Xây dựng `systemInstruction` cho Gemini.
- [ ] Gọi `this.geminiService.generateText()`.
- [ ] Kiểm tra `this.geminiService.isAvailable()` trước khi gọi (fallback message).

---

## 8. KỊCH BẢN KIỂM THỬ (TEST PLAYBOOK)

### Test Case 1: Check-in cảm xúc (Happy Path)
| Bước | Hành động | Kết quả mong đợi |
|------|-----------|-------------------|
| 1 | Đăng nhập `employee@company.com` / `admin123` | Vào trang `/employee/workspace`, thấy widget Mood |
| 2 | Bấm 😊 Tuyệt Vời | Nút được highlight, có thể nhập ghi chú |
| 3 | Bấm "Gửi Check-in" | Hiển thị "Cảm ơn!", widget disable cho hôm nay |
| 4 | Kiểm tra DB: `SELECT * FROM employee_moods ORDER BY id DESC LIMIT 1` | `mood = 'GREAT'`, `is_burnout_risk = false` |

### Test Case 2: Burnout Detection & Telegram Alert
| Bước | Hành động | Kết quả mong đợi |
|------|-----------|-------------------|
| 1 | Đăng nhập `employee@company.com` | Vào workspace |
| 2 | Check-in 😫 Căng Thẳng — Ngày 1 | Lưu thành công, `is_burnout_risk = false` |
| 3 | Check-in 😫 Căng Thẳng — Ngày 2 | Lưu thành công, `is_burnout_risk = false` |
| 4 | Check-in 😫 Căng Thẳng — Ngày 3 | `is_burnout_risk = true`; Backend log: `[n8n Dispatcher] Bắn webhook [Cảnh báo nguy cơ kiệt sức]` |
| 5 | Chuyển sang `manager@company.com` → Workspace | Thấy thẻ đỏ "BURNOUT RISK" của Phạm Hồng Quân |
| 6 | Bấm "Hẹn 1-on-1 Gỡ Rối" | Nhập ghi chú → API resolve → Thẻ đỏ biến mất |

### Test Case 3: Checklist Toggle
| Bước | Hành động | Kết quả mong đợi |
|------|-----------|-------------------|
| 1 | Đăng nhập `employee@company.com` | Thấy danh sách task, thanh tiến độ `0%` |
| 2 | Tích checkbox task đầu tiên | Thanh nhảy lên (VD: `20%`), checkbox ✅, `completed_at` có giá trị |
| 3 | Bỏ tích checkbox task đó | Thanh giảm xuống `0%`, `completed_at = null` |

### Test Case 4: AI Copilot Chat
| Bước | Hành động | Kết quả mong đợi |
|------|-----------|-------------------|
| 1 | Đăng nhập `employee@company.com` | Thấy khung chat Copilot bên phải |
| 2 | Gõ "Thử việc có được nghỉ phép không?" | Hiện "AI đang suy nghĩ...", sau 1-3s trả lời |
| 3 | Xem phần nguồn tài liệu | Hiện danh sách tên file PDF đã tham chiếu |
| 4 | (Fallback) Nếu chưa cấu hình GEMINI_API_KEY | Hiện "Trợ lý AI hiện chưa được kích hoạt..." |

---

## 9. DANH MỤC FILE PHỤ TRÁCH

### ✏️ File bạn CẦN SỬA (triển khai logic bên trong)

| # | File | Nội dung sửa |
|---|------|-------------|
| 1 | `backend/src/modules/onboarding/onboarding.service.ts` | Hoàn thiện 6 hàm TODO: `getTasks`, `toggleTask`, `recordMood`, `getBurnoutAlerts`, `resolveBurnout`, `chatWithCopilot` |
| 2 | `frontend/src/pages/EmployeeWorkspacePage.tsx` | Thay thế 4 khung dashed border bằng component thật, kết nối API |

### 📖 File bạn CHỈ ĐỌC (đã hoàn thiện, không sửa)

| # | File | Lý do |
|---|------|-------|
| 1 | `backend/src/entities/onboarding-task.entity.ts` | Schema bảng `onboarding_tasks` — chỉ đọc để hiểu cấu trúc |
| 2 | `backend/src/entities/employee-mood.entity.ts` | Schema bảng `employee_moods` — chỉ đọc để hiểu cấu trúc |
| 3 | `backend/src/modules/onboarding/onboarding.controller.ts` | Controller đã viết sẵn 6 route — chỉ đọc, không sửa |
| 4 | `backend/src/modules/onboarding/onboarding.module.ts` | Module config — chỉ đọc |
| 5 | `backend/src/modules/onboarding/dto/*.ts` | 3 DTO validation — chỉ đọc |
| 6 | `backend/src/modules/core/ai/gemini.service.ts` | Service AI — chỉ gọi `generateText()` |
| 7 | `backend/src/modules/core/automation/n8n.service.ts` | Service n8n — chỉ gọi `triggerBurnoutAlert()` |
| 8 | `frontend/src/api/onboarding.api.ts` | API client — chỉ import và gọi |
| 9 | `frontend/src/api/client.ts` | Axios instance — **TUYỆT ĐỐI KHÔNG SỬA** |
| 10 | `frontend/src/context/AuthContext.tsx` | Auth state — **TUYỆT ĐỐI KHÔNG SỬA** |
| 11 | `frontend/src/types/index.ts` | TypeScript interfaces — chỉ đọc |

---

## 10. QUY TẮC KỸ THUẬT BẮT BUỘC

### 10.1. Git Convention
```bash
# Luôn làm việc trên nhánh riêng
git checkout feature/onboarding-copilot

# Commit message chuẩn Conventional Commits
git commit -m "feat(onboarding): implement daily mood check-in with burnout detection"
git commit -m "feat(onboarding): add team mood dashboard for manager view"
git commit -m "feat(onboarding): integrate AI copilot RAG chatbox"
git commit -m "fix(onboarding): fix progress bar not updating on task toggle"

# Push nhánh riêng, KHÔNG BAO GIỜ push thẳng lên main
git push -u origin feature/onboarding-copilot

# Khi hoàn thành → Tạo Pull Request trên GitHub để Trưởng nhóm review
```

### 10.2. Frontend Convention
- **Gọi API:** Luôn dùng `onboardingApi` từ `src/api/onboarding.api.ts`. Tuyệt đối **KHÔNG dùng `fetch()` thô** hoặc tạo mới instance `axios`.
- **UI Components:** Ưu tiên sử dụng lại `Button`, `Card`, `Badge`, `Modal` từ `src/components/common/`.
- **State Management:** Dùng `useState` + `useEffect` cục bộ trong component. Nếu cần user hiện tại → `const { user } = useAuth()`.
- **Styling:** Tailwind CSS utility classes. Không viết CSS file riêng.

### 10.3. Backend Convention
- **Guards:** Mọi endpoint yêu cầu đăng nhập phải có `@UseGuards(JwtAuthGuard)`. Phân quyền thêm `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.
- **Lấy userId:** Dùng `@CurrentUser('id')` — KHÔNG lấy từ request body.
- **Error Handling:** Throw `NotFoundException` hoặc `BadRequestException` từ `@nestjs/common`. Global filter sẽ tự bắt và format response lỗi.
- **Validation:** DTO + `class-validator` decorators đã cấu hình sẵn qua `ValidationPipe` global.

---

> **Ghi chú cuối:** Tài liệu này là bản đặc tả kỹ thuật đầy đủ dành riêng cho Thành viên 3. Mọi thay đổi về schema, thêm cột DB mới hoặc thêm endpoint mới cần trao đổi với Trưởng nhóm trước khi triển khai để đảm bảo không ảnh hưởng tới các phân hệ khác.
