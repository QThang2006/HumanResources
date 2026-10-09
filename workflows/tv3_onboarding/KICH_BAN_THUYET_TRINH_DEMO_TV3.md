# 🎤 KỊCH BẢN THUYẾT TRÌNH & LIVE DEMO — THÀNH VIÊN 3 (TV3)
> **Phân hệ phụ trách:** Giữ chân nhân tài, Sức khỏe tinh thần (Employee Well-being, Team Mood) & Tự động hóa luồng làm việc với n8n (Automation Engine).  
> **Tài liệu tham chiếu kèm theo:** `GIAI_THICH_CHI_TIET_CAC_NODE_N8N.md`, `RUNBOOK.md`  
> **Thời lượng đề xuất:** 4 – 5 phút

---

## 📌 BẢNG THÔNG TIN TÀI KHOẢN LIVE DEMO NHANH

| Vai trò | Email đăng nhập | Mật khẩu | Mục đích demo |
| :--- | :--- | :---: | :--- |
| **Nhân viên (Employee)** | `quan.pham@company.com` | `password123` | Demo Check-in cảm xúc, Feedback tâm tư, Lịch sử 7 ngày, Checklist & Khóa học L&D |
| **Quản lý (Manager)** | `quoc.ngo@company.com` | `password123` | Demo Bảng điều khiển Team Mood, Lọc theo phòng ban, Hàng đợi cảnh báo can thiệp |
| **HR / SuperAdmin** | `admin@company.com` | `password123` | Quản trị toàn hệ thống, tạo khóa học L&D, giám sát toàn diện |

---

## 📑 PHẦN 1: MỞ ĐẦU & ĐẶT VẤN ĐỀ (Khoảng 20 giây — Ngắn gọn, súc tích)

> **Lời thoại thuyết trình:**
> 
> *"Kính thưa Thầy/Cô, là **Thành viên 3**, em phụ trách phân hệ **Giữ chân nhân tài, Sức khỏe tinh thần (Team Mood)** kết hợp **Tự động hóa n8n**. 
> Phân hệ này giúp giải quyết bài toán: **Theo dõi nhịp cảm xúc nhân viên mỗi ngày**, **phát hiện sớm nguy cơ kiệt sức (Burnout)** và **tự động kích hoạt thông báo khẩn qua Telegram/Email** để Quản lý kịp thời can thiệp, giữ chân nhân tài.
> Sau đây, em xin phép demo trực tiếp luồng hoạt động."*

---

## 🎬 PHẦN 2: KỊCH BẢN LIVE DEMO CHI TIẾT TỪNG BƯỚC (Khoảng 2.5 phút)

### 🔹 BƯỚC 1: Góc nhìn Nhân viên — Check-in cảm xúc & Xem lịch sử cá nhân
* **Tài khoản:** `quan.pham@company.com` | `password123`
* **Màn hình:** Không gian làm việc cá nhân (`http://localhost:5173/workspace`)
* **Thao tác thực hiện:**
  1. Đăng nhập vào hệ thống, mở trang Workspace.
  2. Chỉ vào lời chào cá nhân hóa: *"Chào buổi sáng/buổi chiều, Quân 👋"*.
  3. Chọn tâm trạng: Bấm vào nút **"Căng thẳng" (STRESSED)** (màu đỏ hồng).
  4. Nhập vào ô phản hồi: *"Dự án tuần này deadline gấp quá, mình đang bị quá tải task."*
  5. Bấm nút **"Gửi chia sẻ"**.
* **Lời thoại thuyết trình:**
  > *"Trước hết, ở góc nhìn nhân viên khi bắt đầu ngày làm việc. Tại trang Workspace, hệ thống chào đón bằng lời chào cá nhân hóa theo thời gian thực.
  > Ngay góc trên là widget **Mood Check-in**. Nhân viên chỉ mất đúng 5 giây để chọn 1 trong 3 trạng thái: **Tuyệt vời**, **Bình thường** hoặc **Căng thẳng**, kèm theo một dòng chia sẻ tâm tư nếu muốn.
  > Ngay khi gửi, thẻ chuyển sang trạng thái đã ghi nhận và hiển thị **Dải chấm nhịp cảm xúc 7 ngày gần nhất**. Điều này giúp nhân viên tự quan sát được trạng thái tinh thần của chính mình theo thời gian."*

---

### 🔹 BƯỚC 2: Góc nhìn Quản lý — Giám sát Team Mood & Can thiệp Burnout
* **Tài khoản:** `quoc.ngo@company.com` | `password123`
* **Màn hình:** Bảng điều khiển Team Mood (Hiển thị ngay trên trang Quản lý)
* **Thao tác thực hiện:**
  1. Đăng xuất tài khoản Employee, đăng nhập vào tài khoản Manager (`quoc.ngo@company.com`).
  2. Bấm vào Dropdown **"Phòng ban"** (icon tòa nhà) ➔ Chuyển đổi giữa các ban để thấy số liệu thay đổi theo từng ban.
  3. Chỉ vào khu vực **Hàng đợi cần chú ý (Attention Queue)**:
     - **Thẻ màu vàng "Tín hiệu căng thẳng trong ngày":** Thấy ngay tên bạn *Phạm Hồng Quân* vừa check-in lúc nãy kèm đoạn chia sẻ quá tải task.
     - **Thẻ màu đỏ "Nguy cơ kiệt sức (Burnout Risk >= 3 ngày)":** Đối với những nhân sự có chuỗi căng thẳng liên tục từ 3 ngày trở lên.
  4. Bấm nút **"Đã can thiệp"** (Resolve) trên một cảnh báo ➔ Nhập ghi chú: *"Đã hẹn uống cafe 1-on-1 và san sẻ bớt task"* ➔ Bấm xác nhận.
* **Lời thoại thuyết trình:**
  > *"Bây giờ, em chuyển sang góc nhìn của Quản lý trực tiếp. Quản lý sẽ nhìn thấy Bảng điều khiển **Team Mood**:
  > - **Thứ nhất - Lọc theo từng phòng ban:** Sếp có thể theo dõi nhịp năng lượng riêng của từng ban (Kỹ thuật, Nhân sự, Kinh doanh). Hệ thống tự động loại trừ tài khoản Quản lý ra khỏi danh sách để số liệu hoàn toàn khách quan.
  > - **Thứ hai - Cảnh báo sớm trong ngày (Early Warning):** Sếp nhìn thấy ngay bạn Quân vừa check-in căng thẳng sáng nay để chủ động nhắn tin hỏi thăm sớm.
  > - **Thứ ba - Cảnh báo Nguy cơ kiệt sức:** Nếu có nhân sự bị stress liên tục từ 3 ngày trở lên, hệ thống sẽ đưa vào diện đỏ cần can thiệp khẩn cấp. Quản lý sau khi gặp mặt 1-on-1 có thể bấm nút **'Đã can thiệp'** kèm ghi chú giải pháp để đóng cảnh báo và lưu vào lịch sử."*

---

### 🔹 BƯỚC 3: Góc nhìn Tự động hóa — 4 Kịch bản n8n Workflows
* **Màn hình:** Mở giao diện n8n tại `http://localhost:5678` (hoặc trình chiếu sơ đồ kiến trúc các Node)
* **Thao tác thực hiện:** Mở lần lượt các workflow trong thư mục `workflows/tv3_onboarding/`.
* **Lời thoại thuyết trình:**
  > *"Để hệ thống không phụ thuộc vào việc con người phải túc trực trên website, em đã xây dựng **4 kịch bản tự động hóa Production trên n8n Engine**:
  > 1. **Workflow 01 - Burnout Crisis Escalation:** Khi phát hiện nhân viên stress liên tục $\ge 3$ ngày, backend NestJS lập tức bắn webhook sang n8n để tự động gửi cảnh báo khẩn qua **Telegram Bot** và **Email** cho HR & Manager trong vòng 24 giờ.
  > 2. **Workflow 02 - Daily Mood Omnichannel:** Tự động gửi tin nhắn Telegram nhắc nhân viên check-in mỗi sáng và tiếp nhận phản hồi qua đa kênh đồng bộ vào MySQL.
  > 3. **Workflow 03 - Onboarding SLA Guardian:** Giám sát thời hạn thử việc 30 ngày, cảnh báo khi nhân viên bị chậm tiến độ hoàn thành các mốc quan trọng.
  > 4. **Workflow 04 - Weekly Morale Digest:** Định kỳ 17h thứ Sáu hàng tuần, tự động chạy truy vấn SQL tổng hợp báo cáo nhịp năng lượng toàn công ty gửi thẳng về hòm thư Ban Giám đốc."*

---

## 💡 PHẦN 3: ĐIỂM SÁNG KỸ THUẬT NỔI BẬT (Khoảng 1 phút)

> **Lời thoại thuyết trình:**
> 
> *"Về mặt kỹ thuật, trong phân hệ này em áp dụng 3 giải pháp chuẩn mực kỹ sư phần mềm:
> 1. **Thuật toán ngăn chặn Báo động giả (False Positive Defense):** Thuật toán tính chuỗi stress liên tục dựa trên ngày làm việc thực tế (`diffDays <= 3`). Nếu nhân viên nghỉ phép dài ngày hoặc qua kỳ nghỉ lễ rồi mới check-in tiếp, chuỗi stress sẽ bị ngắt quãng, không kích hoạt cảnh báo sai.
> 2. **Kiến trúc Giao diện Bento Grid chuẩn SaaS:** Đã khắc phục triệt để lỗi méo mó layout khi danh sách nhiệm vụ mở rộng, bằng cơ chế **Fixed Container (h-[540px]) + Thanh cuộn nội bộ độc lập (Internal Scrolling)**, giúp các widget kế bên luôn cân đối và cố định vùng nhập liệu ở tầm mắt.
> 3. **Cơ chế Webhook Bất đồng bộ (Non-blocking Webhook):** Backend giao tiếp với n8n qua HTTP POST bất đồng bộ, trả kết quả tức thì cho người dùng dưới 50ms mà không làm nghẽn luồng xử lý chính."*

---

## 🎯 PHẦN 4: KẾT LUẬN & BÀN GIAO (Khoảng 20 giây)

> **Lời thoại thuyết trình:**
> 
> *"Phân hệ Giữ chân nhân tài & Tự động hóa của em đã hoàn thành 100%, kết nối thông suốt từ UI, Database cho đến n8n. 
> Sau đây, em xin phép nhường phần trình bày lại cho Thành viên 4 để giới thiệu chi tiết về Lộ trình Onboarding 30 ngày và Trợ lý AI Copilot. 
> Em xin chân thành cảm ơn Thầy/Cô và các bạn đã chú ý lắng nghe!"*

---

## 🛡️ BÍ KÍP TRẢ LỜI CÂU HỎI HỘI ĐỒNG (Q&A DEFENSE PLAYBOOK)

### ❓ Câu 1: "Tại sao lại chọn mốc 3 ngày liên tiếp để cảnh báo Burnout mà không phải 1 hay 2 ngày?"
* **Trả lời:**  
  *"Dạ thưa Thầy/Cô, trong tâm lý học lao động, một người có thể bị stress 1-2 ngày do sự cố đột xuất hoặc công việc cao điểm ngắn hạn. Nếu cảnh báo ngay sau ngày đầu tiên sẽ gây ra tình trạng **'Nhiễu cảnh báo' (Alert Fatigue)** cho Quản lý. Mốc 3 ngày liên tiếp phản ánh một vấn đề bế tắc kéo dài cần sự hỗ trợ của tổ chức, đây là chỉ số chuẩn mực được tham khảo từ các hệ thống HR SaaS như Lattice và Culture Amp."*

### ❓ Câu 2: "Hệ thống n8n giao tiếp với Backend NestJS như thế nào?"
* **Trả lời:**  
  *"Dạ, Backend NestJS giao tiếp với n8n thông qua cơ chế **Non-blocking Asynchronous Webhook**. Khi có sự kiện kích hoạt (như phát hiện Burnout), Backend bắn một HTTP POST request chứa payload JSON sang endpoint của n8n và trả response ngay cho người dùng mà không cần chờ n8n xử lý xong, đảm bảo API luôn phản hồi nhanh dưới 50ms."*

### ❓ Câu 3: "Dữ liệu cảm xúc của nhân viên có sợ bị lộ ra ngoài không?"
* **Trả lời:**  
  *"Dạ, dữ liệu được bảo vệ 2 lớp: Ở tầng Database, các bảng được bảo vệ bằng JWT Token và Roles Guard. Ở tầng Giao diện, nhân viên chỉ thấy dữ liệu cá nhân của chính mình. Chỉ có Quản lý trực tiếp thuộc đúng phòng ban hoặc HR/SuperAdmin mới được phép xem bảng tổng hợp Team Mood."*

### ❓ Câu 4: "Nếu nhân viên nghỉ T7, CN thì thứ 2 check-in có bị đứt chuỗi stress không?"
* **Trả lời:**  
  *"Dạ hoàn toàn không. Thuật toán kiểm tra điều kiện `diffDays >= 1 && diffDays <= 3`. Khi nghỉ T7 và CN (cách 2-3 ngày), hệ thống vẫn hiểu là hai ngày làm việc kế tiếp nhau và tiếp tục duy trì chuỗi để cảnh báo chính xác."*
