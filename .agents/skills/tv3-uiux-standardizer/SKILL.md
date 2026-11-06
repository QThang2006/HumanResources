---
name: tv3-uiux-standardizer
description: >-
  Chuẩn hóa giao diện UI/UX cho Phân hệ TV3 (Employee Workspace, Daily Mood, Onboarding 30 ngày,
  Team Mood Manager, Copilot AI) tuân thủ nghiêm ngặt tài liệu BAO_CAO_CHUAN_HOA_UI_TOAN_HE_THONG_TV1_TV4.md.
  Đảm bảo áp dụng bộ token màu Primary Blue/Slate, bảo toàn 100% logic nghiệp vụ, handlers, API,
  không can thiệp Backend/n8n và tự động kiểm tra biên dịch frontend.
---

# 🎨 HƯỚNG DẪN CHUẨN HÓA UI/UX PHÂN HỆ THÀNH VIÊN 3 (TV3)

Căn cứ tài liệu: `docs/BAO_CAO_CHUAN_HOA_UI_TOAN_HE_THONG_TV1_TV4.md` (Đối chiếu commit `47bfe12`).

---

## 1. NGUYÊN TẮC BẤT DI BẤT DỊCH (NON-NEGOTIABLES)

1. **CHỈ SỬA TRÌNH BÀY (UI-ONLY):**
   - Được sửa: CSS/Tailwind classes, màu sắc, font, spacing, bo góc (`rounded-*`), viền (`border-*`), đổ bóng (`shadow-*`), responsive layout, trạng thái hover/focus/active/disabled.
   - Tái sử dụng components dùng chung: `@/components/common` (`Button`, `Input`, `Badge`, `Card`, `Modal`, `EmptyState`).
2. **TUYỆT ĐỐI KHÔNG SỬA LOGIC (ZERO BUSINESS REGRESSION):**
   - Giữ nguyên 100% Handler (`onClick`, `onChange`, `onSubmit`), React State (`useState`), Effects (`useEffect`), Timer, Debounce.
   - Giữ nguyên điều kiện kiểm tra quyền, role, hiển thị form, validation.
   - Giữ nguyên tất cả các trường dữ liệu và payload gửi lên server:
     * Mood Check-in payload bắt buộc là: `{ mood: 'GREAT' | 'NORMAL' | 'STRESSED', feedbackText?: string }` (KHÔNG ĐƯỢC đổi thành rating hay note).
     * Request `/onboarding/chat` của Copilot.
     * Task toggle completion của onboarding.
     * Resolve burnout note của Manager (không biến thành tạo sự kiện Google Meet).
3. **KHÔNG CHẠM VÀO HẠ TẦNG:**
   - Tuyệt đối KHÔNG sửa bất kỳ file nào trong `backend/**`, `workflows/**`, migration, DB hay n8n.
   - Không cài thêm thư viện npm mới.

---

## 2. BẢNG MÃ MÀU & TOKEN THIẾT KẾ CHUẨN (ENTERPRISE ATS BLUE)

| Thành phần | Class Tailwind chuẩn | Ghi chú |
| :--- | :--- | :--- |
| **Nền trang chính** | `bg-slate-50` | Nền sáng, sạch, dịu mắt |
| **Nền Card / Container** | `bg-white border border-slate-200` | Thay thế toàn bộ nền kính mờ (glassmorphism) |
| **Màu thương hiệu chính (Primary)** | `blue-600` (hover: `blue-700`, ring: `blue-500/20`) | **Xóa sạch màu `indigo-*`, `purple-*`** |
| **Tiêu đề chính (H1, H2, H3)** | `text-slate-900 font-bold` hoặc `font-semibold` | Rõ ràng, tương phản cao |
| **Nội dung / Nhãn (Body Text)** | `text-slate-700` hoặc `text-slate-800` | Dễ đọc |
| **Phụ đề / Gợi ý / Meta** | `text-slate-500 text-sm` | |
| **Viền (Border)** | `border-slate-200` (với input/select: `border-slate-300`) | |
| **Thành công / Hoàn thành (Success)** | `emerald-600` (bg: `bg-emerald-50`, border: `border-emerald-200`) | Dùng cho Great Mood, task done, tiến độ 100% |
| **Cảnh báo / Đang chờ (Warning/Pending)** | `amber-500` / `amber-600` (bg: `bg-amber-50`) | Dùng cho Normal Mood, task pending |
| **Nguy cấp / Kiệt sức (Danger/Critical)** | `rose-600` (bg: `bg-rose-50`, border: `border-rose-200`) | Dùng cho Stressed Mood, cờ Burnout, Điểm nóng |
| **Bo góc (Border Radius)** | Thẻ Card/Modal: `rounded-xl` \| Nút bấm/Input: `rounded-lg` | Giảm các góc bo quá lớn (`rounded-3xl`, `rounded-2xl`) |
| **Khoảng cách (Spacing)** | Chuẩn bội số 4px: `p-4`, `p-6`, `gap-4`, `gap-6`, `space-y-4` | |

---

## 3. CHECKLIST CỤ THỂ THEO TỪNG FILE PHÂN HỆ TV3

### 📁 File 1: `frontend/src/pages/EmployeeWorkspacePage.tsx`
- [ ] **Mood Options Card:**
  - Giữ 3 nút: `GREAT` (Emerald), `NORMAL` (Amber), `STRESSED` (Rose).
  - Loại bỏ các gradient sặc sỡ, thay bằng card viền nhẹ, active state rõ ràng với ring chuẩn.
- [ ] **Feedback Textarea & Submit Button:**
  - Dùng `border-slate-300 focus:border-blue-500 focus:ring-blue-500/20`.
  - Nút gửi dùng `bg-blue-600 hover:bg-blue-700 text-white rounded-lg`.
- [ ] **Today Mood Status Card:**
  - Card bo góc `rounded-xl`, viền `border-slate-200`, hiển thị lịch sự trạng thái check-in hôm nay.
- [ ] **Lịch sử 7 ngày (7-Day Mood History):**
  - Hiển thị gọn gàng, typography Slate, icon đồng nhất.
- [ ] **Lộ trình Onboarding 30 ngày (Task Checklist):**
  - Thanh tiến độ (Progress bar): Nền `bg-slate-100`, thanh chạy `bg-blue-600` (hoặc `bg-emerald-500` khi đạt 100%).
  - Tabs lọc danh mục / ngày: Dùng phong cách Tab phẳng hiện đại (active: `bg-white text-blue-700 shadow-sm font-medium`).
  - Task item card: `border border-slate-200 hover:border-slate-300 bg-white rounded-lg p-3`.
  - Checkbox: `rounded text-blue-600 focus:ring-blue-500`.
- [ ] **Copilot AI Chat Widget:**
  - Bong bóng tin nhắn người dùng: `bg-blue-600 text-white rounded-2xl rounded-tr-sm`.
  - Bong bóng tin nhắn AI: `bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm border border-slate-200/60`.
  - Câu hỏi gợi ý: Pill button `bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-full text-xs`.
  - Input & Nút gửi: Đồng bộ thanh thoát, không giật lag.

---

### 📁 File 2: Phân hệ Team Mood (`frontend/src/features/team-mood/`)
- [ ] `ManagerTeamMoodWidget.tsx`: Header chọn phòng ban thanh thoát, các tab rõ ràng.
- [ ] `components/TeamMoodMetrics.tsx`: Thẻ chỉ số `bg-white border border-slate-200 rounded-xl p-4`.
- [ ] `components/AttentionQueue.tsx`: Danh sách nhân viên cần chú ý dùng thẻ viền `border-rose-200 bg-rose-50/50`.
- [ ] `components/InterventionModal.tsx`: Popup chuẩn `rounded-xl`, textarea nhập note gỡ rối rõ ràng, nút xác nhận `bg-blue-600`.
- [ ] `components/TeamOverviewTable.tsx`: Bảng thành viên phẳng chuẩn Enterprise, header `bg-slate-50 text-slate-700 uppercase text-xs`.

---

### 📁 File 3: Phân hệ Team Onboarding (`frontend/src/features/team-onboarding/`)
- [ ] `ManagerTeamOnboardingWidget.tsx`: Thẻ tiến độ đội ngũ, thanh progress bar mượt mà, phân cấp thông tin trực quan.

---

## 4. QUY TRÌNH KIỂM THỬ & XÁC NHẬN (VERIFICATION PROTOCOL)

Sau khi chỉnh sửa bất kỳ file nào:
1. **Kiểm tra cú pháp & TypeScript:**
   ```bash
   cd frontend && npm run build
   ```
   *Bắt buộc phải biên dịch thành công `0 errors`.*
2. **Kiểm tra hồi quy giao diện:**
   - Đăng nhập `employee@company.com` (Pass: `admin123`): Xem Check-in mood, Onboarding checklist, Copilot chat.
   - Đăng nhập `manager@company.com` (Pass: `admin123`): Xem tab Team Mood và Team Onboarding.
3. **Kiểm tra tính toàn vẹn Git:**
   - Chạy `git diff` để đảm bảo không có file nào ngoài `frontend/` bị sửa đổi.
