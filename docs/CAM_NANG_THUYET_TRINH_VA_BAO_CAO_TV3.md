# CẨM NANG BÁO CÁO & THUYẾT TRÌNH HỆ THỐNG TỰ ĐỘNG HÓA N8N (TV3)
**Dành cho buổi bảo vệ đồ án / Báo cáo Giảng viên & Hội đồng chuyên môn**  
*Mã phân hệ: TV3 · Tự động hóa Onboarding, Sức khỏe tinh thần & Phân tích tâm lý doanh nghiệp*

---

## 1. TỔNG QUAN KIẾN TRÚC TỰ ĐỘNG HÓA (TV3)

Hệ thống tự động hóa n8n của phân hệ **TV3** được thiết kế theo mô hình **Core-Satellite (Cốt lõi & Vệ tinh)** gồm:
* **4 Luồng nghiệp vụ cốt lõi (Core Business Workflows):** Đảm nhiệm trọn vẹn vòng đời trải nghiệm của nhân sự từ ngày đầu nhận việc đến duy trì sức khỏe tinh thần.
* **4 Luồng vệ tinh kỹ thuật (Operational Satellite Workflows):** Đảm bảo tính sẵn sàng cao, tự phục hồi lỗi, chống thất lạc dữ liệu và leo thang trách nhiệm xử lý theo SLA chuẩn doanh nghiệp.
* **1 Luồng mở rộng tương tác hai chiều (WF-00):** Sẵn sàng cho nút bấm Telegram hai chiều khi triển khai HTTPS Domain.

```
                    ┌─────────────────────────────────────────────────────────┐
                    │               HỆ THỐNG TỰ ĐỘNG HÓA TV3                  │
                    └─────────────────────────────────────────────────────────┘
                                                 │
         ┌───────────────────────────────────────┴───────────────────────────────────────┐
         ▼                                                                               ▼
┌─────────────────────────────────┐                             ┌─────────────────────────────────┐
│     4 LUỒNG NGHIỆP VỤ CHÍNH     │                             │      4 LUỒNG VỆ TINH HỖ TRỢ     │
├─────────────────────────────────┤                             ├─────────────────────────────────┤
│ WF-01: Burnout Crisis Alert     │ ◄─── (Outbox Retry) ─────── │ WF-01c: Outbox Retry            │
│ WF-02: Daily Mood Omnichannel   │ ◄─── (Nhắc bù 14:00) ────── │ WF-02b: Second Reminder         │
│ WF-03: Onboarding SLA Guardian  │                             │ WF-01b: Case SLA Sweeper        │
│ WF-04: Weekly Morale Digest     │ ◄─── (Giám sát lỗi chung) ──│ WF-E: Centralized Error Handler │
└─────────────────────────────────┘                             └─────────────────────────────────┘
```

---

## 2. CHI TIẾT 4 LUỒNG NGHIỆP VỤ CỐT LÕI

### 1. `[V5] WF-01`: Cảnh báo Kiệt sức & Leo thang Đa tầng (Burnout Crisis Escalation)
* **Trigger:** Nhận Webhook từ Backend NestJS khi phát hiện nhân viên có chuỗi $\ge 3$ ngày liên tiếp căng thẳng hoặc phản hồi có từ khóa khủng hoảng tâm lý.
* **Bảo mật:** Bắt buộc Header Auth (`X-Webhook-Secret`), ngăn chặn kẻ xấu bắn phá dữ liệu giả.
* **Nghiệp vụ xử lý:**
  1. Kiểm tra tính hợp lệ dữ liệu (trả lỗi HTTP 400 nếu dữ liệu sai thay vì lỗi 500 mơ hồ).
  2. Khử trùng trong 24 giờ: Nếu cùng một người có tín hiệu stress trong ngày mà không tăng mức độ thì bỏ qua, chống spam HR.
  3. Mở hồ sơ ca theo dõi trong cơ sở dữ liệu (`hr_cases`) với hạn xử lý SLA (4 giờ với mức CRITICAL, 24 giờ với WARNING).
  4. Sử dụng Gemini AI phân tích nguyên nhân gốc rễ và gợi ý bộ 3 câu hỏi cho buổi trò chuyện 1-on-1.
  5. **Bảo vệ quyền riêng tư:** Ẩn câu chữ nhạy cảm khỏi tin nhắn Telegram/Email, chỉ gửi thông báo mức độ và hướng dẫn Quản lý vào hệ thống nội bộ xem chi tiết.

### 2. `[V5] WF-02`: Nhắc nhở Chia sẻ Cảm xúc Đầu ngày Đa kênh (Daily Mood Omnichannel)
* **Trigger:** Lịch trình tự động (Cron: `0 9 * * 1-5`) lúc 09:00 sáng từ thứ Hai đến thứ Sáu.
* **Nghiệp vụ xử lý:**
  1. Quét danh sách nhân viên đang hoạt động nhưng chưa check-in tâm trạng hôm nay.
  2. Kiểm tra bảng `notification_log` để đảm bảo mỗi nhân sự chỉ nhận đúng 1 tin nhắc vào buổi sáng (Idempotency).
  3. Sử dụng Gemini AI tạo lời chào ấm áp, tích cực theo ngày trong tuần.
  4. **Gửi tin nhắn riêng biệt (Omnichannel):** Gửi tới tài khoản Telegram riêng của từng nhân viên (qua bảng `user_channels`). Nếu gửi Telegram thất bại, tự động chuyển hướng sang gửi Email thông báo (Fallback mechanism).

### 3. `[V5] WF-03`: Giám sát Tiến độ Thử việc & Thư Chúc mừng 30 Ngày (Onboarding SLA Guardian)
* **Trigger:** Lịch trình tự động (Cron: `30 8 * * 1`) lúc 08:30 sáng thứ Hai hằng tuần.
* **Nghiệp vụ xử lý:**
  1. Quét toàn bộ nhân viên mới gia nhập dưới 35 ngày và danh sách nhiệm vụ được giao.
  2. **Nhánh Cảnh báo Quá hạn:** Nếu phát hiện nhiệm vụ onboarding bị trễ $\ge 7$ ngày, hệ thống gửi email cảnh báo chi tiết tới nhân viên và CC cho Mentor phụ trách.
  3. **Nhánh Tốt nghiệp Thử việc:** Nếu nhân viên hoàn thành 100% nhiệm vụ và thâm niên đạt $\ge 28$ ngày, Gemini AI sẽ tự động soạn Thư chúc mừng tốt nghiệp thử việc gửi trực tiếp qua Email cá nhân và chúc mừng trên kênh chung.
  4. **Chống trùng tuyệt đối:** Ghi nhận trạng thái `GRADUATION` vào `notification_log` để nhân sự chỉ nhận thư chúc mừng 1 lần duy nhất trong đời.

### 4. `[V5] WF-04`: Bản tin Chiến lược & Xu hướng Tinh thần Toàn công ty (Weekly Morale Digest)
* **Trigger:** Lịch trình tự động (Cron: `0 17 * * 5`) lúc 17:00 chiều thứ Sáu hằng tuần.
* **Nghiệp vụ xử lý:**
  1. Tổng hợp toàn bộ dữ liệu check-in cảm xúc và số lượng task quá hạn trong tuần.
  2. **Bảo vệ toàn vẹn dữ liệu:** Nếu tuần không có ai check-in hoặc không đủ số người tối thiểu, hệ thống gửi thông báo *"Chưa đủ dữ liệu thống kê"*, tuyệt đối không tự bịa số liệu ảo.
  3. **Chuẩn k-Anonymity:** Thống kê theo số lượng **người thực tế** (`COUNT(DISTINCT user_id)`). Phòng ban nào có dưới 3 người check-in sẽ được ẩn chi tiết để bảo vệ quyền riêng tư cá nhân.
  4. **Phân tích xu hướng 4 tuần:** Đối chiếu với 4 tuần gần nhất trong bảng `morale_reports`, tự động phát hiện độ lệch bất thường (Anomaly Detection).
  5. Gemini AI đóng vai trò Cố vấn chiến lược nhân sự, tóm tắt hiện trạng và đề xuất 2 hành động cụ thể cho tuần tiếp theo gửi tới Giám đốc Nhân sự.

---

## 3. CHI TIẾT 4 LUỒNG VỆ TINH VẬN HÀNH (ĐIỂM NHẤN KỸ THUẬT ĂN ĐIỂM)

Khi báo cáo với Thầy, đây là phần chứng minh trình độ kỹ thuật phần mềm vượt trội:

| Luồng Vệ tinh | File Workflow | Vai trò & Giá trị kỹ thuật |
| :--- | :--- | :--- |
| **WF-E: Centralized Error Handler** | `00_error_handler.json` | **Bắt lỗi toàn cục:** Bất kỳ workflow nào bị lỗi (sập mạng, lỗi token), WF-E lập tức bắt lấy sự kiện, ghi nhật ký lỗi vào bảng `workflow_runs` với trạng thái `FAILED` và gửi tin nhắn cảnh báo khẩn cấp tới Telegram của Quản trị viên. |
| **WF-01b: Case SLA Sweeper** | `01b_case_sla_sweeper.json` | **Quét hạn xử lý ca:** Chạy ngầm mỗi 15 phút, rà soát bảng `hr_cases`. Nếu ca kiệt sức sau 4 giờ (với CRITICAL) hoặc 24 giờ (với WARNING) mà Quản lý chưa xác nhận tiếp nhận, hệ thống tự động leo thang cảnh báo lên Trưởng phòng Nhân sự và Ban Giám đốc. |
| **WF-01c: Outbox Retry Engine** | `01c_outbox_retry.json` | **Chống mất dữ liệu (Outbox Pattern):** Khi n8n bị tắt hoặc khởi động lại đúng lúc Backend bắn webhook burnout, Backend lưu sự kiện vào bảng `pending_webhooks`. Khi n8n hoạt động trở lại, WF-01c tự động quét mỗi 5 phút để gửi lại (tối đa 5 lần), bảo đảm không bao giờ thất lạc tín hiệu cấp cứu của nhân viên. |
| **WF-02b: Second Reminder** | `02b_second_reminder.json` | **Nhắc nhở lần hai:** Tự động chạy lúc 14:00 chiều các ngày làm việc, chỉ quét và gửi lời nhắc nhẹ nhàng tới những nhân sự đã nhận tin sáng nhưng bận việc quên chưa check-in. |

---

## 4. BẢNG ĐỐI CHIẾU SỰ KHÁC BIỆT: BẢN GỐC (V4) VS. BẢN MỚI (V5/V6)

Bảng này giúp bạn tự tin trả lời khi Thầy hỏi: *"Em đã tối ưu hay cải tiến những gì so với phiên bản ban đầu?"*:

| Tiêu chuẩn | Bản cũ (V4 - Prototype) | Bản mới (V5/V6 - Production-Ready) |
| :--- | :--- | :--- |
| **Bảo mật Webhook** | Mở hoàn toàn (`REQUIRE_SECRET: false`), ai biết URL đều gọi được. | Bắt buộc **Header Auth** (`X-Webhook-Secret`), từ chối 401 ngay lập tức. |
| **Toàn vẹn số liệu** | Tự bịa số liệu mẫu (`10/4/1`, điểm `72`, task giả) ghi vào Database khi thiếu dữ liệu. | **Xóa 100% dữ liệu giả**. Thiếu dữ liệu thì xuất cờ `hasEnoughData: false` và báo chưa đủ dữ liệu. |
| **Chống gửi lặp** | Không có cơ chế, dễ bị gửi trùng thư chúc mừng tốt nghiệp và spam cảnh báo. | Quản lý bằng bảng **`notification_log`**, khử trùng trong 24 giờ và hạn chế 1 lần/tuần. |
| **Bảo vệ riêng tư** | Bắn nguyên văn tâm lý nhạy cảm của nhân viên lên Telegram. | Ẩn nguyên văn khỏi Telegram; k-anonymity đếm theo **số người thực tế** thay vì số lượt. |
| **Cấu hình tham số** | Ghim cứng (Hardcode) Chat ID, Email, số ngày trong Node Code. | Tách 100% vào bảng cấu hình trung tâm **`workflow_config`**. |
| **Quản lý vòng đời** | Bắn thông báo rồi bỏ quên (Fire-and-forget). | Quản lý trạng thái ca qua bảng **`hr_cases`**, có **SLA Sweeper** quét quá hạn. |
| **Độ tin cậy sự kiện** | Backend gọi `fetch` không `await`, n8n tắt là mất vĩnh viễn sự kiện. | Ứng dụng **Transactional Outbox**, tự động thử lại khi n8n khởi động lại. |

---

## 5. KỊCH BẢN THUYẾT MINH MẪU TRONG 3 PHÚT

> **Kính thưa Quý Thầy/Cô trong Hội đồng:**
> 
> Trong đồ án Quản trị Nhân sự Doanh nghiệp, em đảm nhận xây dựng **Hệ sinh thái Tự động hóa Quy trình Nhân sự (Phân hệ TV3)** sử dụng n8n kết hợp Google Gemini AI và NestJS.
> 
> Phân hệ của em giải quyết 3 bài toán then chốt trong doanh nghiệp: **Hội nhập nhân sự mới (Onboarding)**, **Ngăn chặn tình trạng kiệt sức (Burnout Crisis)** và **Báo cáo nhịp đập văn hóa (Morale Analytics)**.
> 
> Hệ thống được em chia làm 2 tầng rõ rệt:
> 1. **Tầng Nghiệp vụ cốt lõi:** Gồm 4 luồng chính (WF-01 đến WF-04) tự động hóa toàn bộ việc phát hiện kiệt sức, nhắc nhở check-in cảm xúc đa kênh, giám sát hạn chót thử việc 30 ngày và tổng hợp báo cáo tinh thần cuối tuần.
> 2. **Tầng Vận hành & Chịu lỗi chuẩn Doanh nghiệp:** Thay vì dừng lại ở mức kéo-thả luồng cơ bản (Prototype), em đã nâng cấp kiến trúc lên chuẩn Production với:
>    * Cơ chế **Header Auth** bảo vệ mọi Webhook.
>    * Quản lý trạng thái và SLA ca xử lý qua bảng `hr_cases`, có luồng **SLA Sweeper (WF-01b)** tự động leo thang trách nhiệm khi quản lý bỏ quên ca.
>    * Ứng dụng mẫu thiết kế **Transactional Outbox (WF-01c)** giúp không bao giờ bị mất cảnh báo kiệt sức kể cả khi server n8n gặp sự cố gián đoạn.
>    * Luồng **Error Handler tập trung (WF-E)** tự động cảnh báo cho Quản trị viên ngay khi có lỗi phát sinh.
> 
> Mọi thông số cấu hình, nhật ký kiểm toán và bảo vệ quyền riêng tư đều được tách biệt chặt chẽ trong cơ sở dữ liệu MySQL, sẵn sàng cho việc mở rộng quy mô thực tế.
> 
> Em xin phép được demo trực tiếp các luồng trên hệ thống ạ!
