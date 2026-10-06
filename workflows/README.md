# ⚡ HƯỚNG DẪN TRIỂN KHAI VÀ VẬN HÀNH n8n AUTOMATION ENGINE

Tài liệu này hướng dẫn chi tiết cách kích hoạt và liên kết **n8n Automation Engine** với hệ thống Backend NestJS của dự án Enterprise HR & ATS Multi-Agent Ecosystem.

---

## 🎯 1. Vai trò của n8n trong Kiến Trúc Đồ Án
Trong hệ sinh thái Multi-Agent, **n8n** đóng vai trò là **Điều phối viên Quy trình Tự động hóa Không đồng bộ (Asynchronous Workflow Orchestrator)**:
- Backend NestJS không cần phải chờ đợi hay xử lý trực tiếp việc kết nối Google Meet API, SMTP Gmail, hoặc Telegram Bot.
- Thay vào đó, NestJS chỉ cần bắn một **Webhook (HTTP POST)** sang n8n với độ trễ < 5ms (Non-blocking).
- n8n tự động tiếp nhận dữ liệu, hiển thị trực quan dạng sơ đồ khối (Visual Workflow), thực thi các tác vụ tích hợp bên thứ ba, ghi log lịch sử và hỗ trợ cơ chế tự động thử lại (Retry) khi có lỗi mạng.

---

## 🚀 2. Cách Khởi Chạy n8n (Chọn 1 trong 2 cách)

### Cách 1: Chạy trực tiếp qua NPX (Khuyên dùng - Nhanh nhất & Không cần bật Docker)
Do máy tính đã cài đặt sẵn Node.js (v20+), bạn có thể chạy n8n trực tiếp từ Terminal mà không cần bật Docker Desktop:

```bash
# Mở một cửa sổ PowerShell mới và gõ:
npx n8n
```
> Khi màn hình hiện `Editor is now accessible via: http://localhost:5678/`, bạn mở trình duyệt vào địa chỉ trên.

### Cách 2: Chạy qua Docker Compose
Nếu muốn chạy dưới dạng Container nền độc lập:
1. Khởi động ứng dụng **Docker Desktop**.
2. Tại thư mục gốc của dự án (`Human_Resources`), mở terminal và gõ:
   ```bash
   docker compose up -d n8n
   ```
3. Truy cập vào giao diện web: `http://localhost:5678`.

---

## 📥 3. Cài Đặt 3 Workflow Mẫu Sẵn Có

Sau khi vào giao diện `http://localhost:5678`:
1. Đăng ký tài khoản Admin nội bộ đầu tiên (hoàn toàn miễn phí, lưu trữ local trên máy).
2. Tại menu bên trái, chọn **Workflows** -> Nhấn nút **Add Workflow** (hoặc dấu `+`).
3. Nhấn vào biểu tượng **`...` (góc trên bên phải)** -> Chọn **Import from file...**.
4. Chọn lần lượt 3 file workflow mẫu trong thư mục `workflows/`:

| Tên File | Webhook Path | Hành động Tự Động Hóa |
|---|---|---|
| `interview-schedule.json` | `/webhook/interview-schedule` | Tự động sinh đường dẫn **Google Meet**, định dạng nội dung thư và gửi email xác nhận lịch phỏng vấn cho ứng viên và người phỏng vấn. |
| `employee-hired.json` | `/webhook/employee-hired` | Kích hoạt khi HR bấm **1-Click Tuyển dụng**: Tự động gửi thư mời nhận việc (Offer Letter) và thông tin tài khoản đăng nhập HR Portal. |
| `burnout-alert.json` | `/webhook/burnout-alert` | Nhận diện nhân viên kiệt sức/stress kéo dài: Bắn thông báo khẩn cấp (🚨) tới kênh Telegram Bot / Slack của HR Lead để can thiệp 1-on-1. |

5. **QUAN TRỌNG:** Gạt công tắc từ **Inactive** sang **Active** (góc trên bên phải của từng Workflow) để n8n bắt đầu lắng nghe Webhook thực tế từ NestJS!

---

## 🔗 4. Kiểm Tra Kết Nối (Integration Test)

Cấu hình URL webhook trong file `backend/.env`:
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

### Thử nghiệm bắn dữ liệu từ Postman hoặc Curl:
Bạn có thể test trực tiếp Webhook bằng cách gửi lệnh curl sau:

```bash
# Test Webhook xếp lịch phỏng vấn:
curl -X POST http://localhost:5678/webhook/interview-schedule \
  -H "Content-Type: application/json" \
  -d '{"candidateName":"Nguyễn Văn A","candidateEmail":"candidate@example.com","interviewerName":"Trưởng Phòng Kỹ Thuật","scheduledAt":"2026-10-15T09:00:00Z","round":1}'
```

Khi lệnh bắn thành công, bạn sẽ thấy ngay trên giao diện n8n:
- Khối Webhook sáng đèn xanh.
- Toàn bộ dữ liệu được truyền xuyên suốt qua các khối Code và Email/Notification.
