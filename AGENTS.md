# QUY TẮC PHÁT TRIỂN & CHUẨN HÓA UI/UX PHÂN HỆ TV3

Tài liệu căn cứ: `docs/BAO_CAO_CHUAN_HOA_UI_TOAN_HE_THONG_TV1_TV4.md`

## 1. Ranh giới an toàn (Strict Scope Boundary)
- **UI-Only:** Chỉ tinh chỉnh CSS / Tailwind classes, layout, typography, màu sắc, border radius, padding/gap.
- **Không sửa Backend & n8n:** Tuyệt đối không chỉnh sửa bất kỳ file nào trong `backend/**`, `workflows/**`, database hoặc n8n.
- **Bảo toàn 100% Logic & State:** Giữ nguyên toàn bộ React state, effects, API clients, validation, error handling và prop types.
- **Đúng định dạng Payload API:** Check-in cảm xúc bắt buộc giữ nguyên payload `{ mood: 'GREAT' | 'NORMAL' | 'STRESSED', feedbackText?: string }`.

## 2. Hệ Thống Design Tokens Chuẩn (Enterprise ATS Blue)
- **Màu thương hiệu chính (Primary):** `blue-600` (hover: `blue-700`). Xóa bỏ hoàn toàn màu tím/chàm `indigo-*`, `purple-*`.
- **Nền & Viền:** Nền trang `bg-slate-50`, card `bg-white border border-slate-200`. Loại bỏ nền kính mờ glassmorphism.
- **Chữ (Typography):** Tiêu đề `text-slate-900`, nội dung `text-slate-700`, chú thích `text-slate-500`.
- **Bo góc (Border Radius):** Card/Modal dùng `rounded-xl`, Nút/Input dùng `rounded-lg`.
- **Màu trạng thái (Semantic):**
  - Thành công: `emerald-600` (`bg-emerald-50`, `border-emerald-200`)
  - Chờ / Bình thường: `amber-500` / `amber-600` (`bg-amber-50`)
  - Cảnh báo / Stress: `rose-600` (`bg-rose-50`, `border-rose-200`)

## 3. Quy trình Kiểm thử bắt buộc
Sau mỗi lượt chỉnh sửa frontend, bắt buộc kiểm tra biên dịch bằng lệnh:
```bash
cd frontend && npm run build
```
Chỉ hoàn thành khi `npm run build` kết thúc với mã thoát 0 (0 errors).
