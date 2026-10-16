# 🎤 KỊCH BẢN THUYẾT TRÌNH & DEMO LIVE - THÀNH VIÊN 1
## HẠ TẦNG CỐT LÕI, BẢO MẬT & VẬN HÀNH HỆ THỐNG ĐA TÁC NHÂN
*Dành cho: Thành viên 1 (Trưởng nhóm / Lead Architect)*

---

## ⏱️ PHÂN BỔ THỜI GIAN THUYẾT TRÌNH (3 - 4 PHÚT)

* **Phút 0:00 - 1:00:** Mở đầu, giới thiệu vai trò Trưởng nhóm và ranh giới kiến trúc (Backend Core vs n8n Orchestration).
* **Phút 1:00 - 2:30:** Trực tiếp Demo 3 luồng n8n trên màn hình (Mỗi luồng 12 nodes sáng đèn xanh).
* **Phút 2:30 - 3:30:** Trả lời các câu hỏi phản biện then chốt của Thầy/Cô.

---

## 🎬 LỜI THOẠI THUYẾT TRÌNH CHI TIẾT (WORD-BY-WORD)

### 1. Phần Mở Đầu: Khẳng định vai trò Kiến trúc sư (1 Phút)
> *"Kính thưa Thầy/Cô và các bạn,
> 
> Trong đồ án Hệ sinh thái Quản trị Nhân sự Đa Tác nhân AI này, em phụ trách **Thành viên 1 - Đóng vai trò Trưởng nhóm và Kiến trúc sư hệ thống**.
> 
> Nhiệm vụ của em bao gồm 2 phần trọng tâm:
> 1. **Về tầng Backend Core:** Em thiết kế toàn bộ kiến trúc nền tảng gồm CSDL chuẩn 3NF (11 bảng thực thể), cơ chế xác thực JWT kết hợp phân quyền RBAC 4 vai trò (SuperAdmin, HR, Manager, Employee), và hệ thống Singleton gọi Google Gemini AI cùng thuật toán Vector Cosine Similarity tự phát triển.
> 2. **Về tầng Tự động hóa n8n:** Để đảm bảo Backend không bị nghẽn hiệu năng (Non-blocking) và đạt chuẩn phân tầng của doanh nghiệp, em phụ trách xây dựng **3 quy trình tự động hóa độc lập bên ngoài**, mỗi quy trình đạt chuẩn **12 nodes**, giải quyết các bài toán sống còn về **An ninh bảo mật, Sức khỏe CSDL và Cứu hộ sự cố tự động** mà Backend không thể tự làm được.
> 
> Sau đây em xin phép mở trực tiếp giao diện n8n để Demo 3 quy trình này..."*

---

### 2. Phần Demo Live Trên Giao Diện n8n (1.5 Phút)

#### 🔹 Luồng 1: Giám sát Brute-force & Tự động Khóa IP Đa tầng (`WF-01`)
*(Thao tác: Mở workflow `WF-01: Brute-Force Defense`, chỉ vào các cụm node)*
> *"Quy trình đầu tiên là **WF-01 gồm đúng 12 nodes**:
> - Khi kẻ xấu cố tình thử mật khẩu sai liên tục vào tài khoản Quản trị, Backend chỉ cần bắn một Webhook sang node số 1.
> - Tại node số 2 và 3, n8n bóc tách IP, đếm số lần thất bại trong 15 phút.
> - Khi vượt ngưỡng 5 lần tại node số 4, hệ thống kích hoạt tính toán thời gian khóa (node 5) và gọi ngược API Backend tại node số 6 để đưa IP vào danh sách đen (Blacklist).
> - Đặc biệt, tại node số 7 và 8, em ứng dụng Gemini AI phân loại mức độ đe dọa. Nếu nhắm vào tài khoản SUPERADMIN/HR, n8n lập tức bắn báo động đỏ qua **Telegram DevSecOps** (node 9), gửi email cảnh báo cho người dùng (node 10) và lưu vết kiểm toán vào MySQL (node 11). Toàn bộ diễn ra trong 0.2 giây mà không làm nghẽn CPU của Backend."*

#### 🔹 Luồng 2: Kiểm tra Sức khỏe CSDL & Tự động Sao lưu 02:00 Sáng (`WF-02`)
*(Thao tác: Chuyển sang workflow `WF-02: Database Health & Backup`)*
> *"Quy trình thứ hai là **WF-02 gồm đúng 12 nodes** phục vụ bài toán Disaster Recovery:
> - Cứ đúng 02:00 sáng hàng ngày, Schedule Trigger (node 1) kích hoạt.
> - n8n gọi API kiểm tra Backend còn online không (node 2 & 3), sau đó kết nối trực tiếp vào MySQL tại node 4 để đo lường dung lượng các bảng.
> - Node 5 tính toán tỷ lệ đĩa sử dụng. Nếu vượt quá 80% tại node 6, hệ thống bật cờ cảnh báo.
> - Node 7 kích hoạt tiến trình tạo file sao lưu nén `.sql.gz`.
> - Node 8 định dạng bản báo cáo HTML chuyên nghiệp, node 9 bắn tóm tắt về Telegram của Tech Lead, node 10 gửi email báo cáo chi tiết dung lượng và node 11 tự động dọn dẹp các session log cũ hơn 90 ngày để tối ưu CSDL."*

#### 🔹 Luồng 3: Thu thập Crash Log 500 & Trợ lý Chẩn đoán AI Debugger (`WF-03`)
*(Thao tác: Chuyển sang workflow `WF-03: System Incident & AI Debugger`)*
> *"Quy trình thứ ba là **WF-03 gồm đúng 12 nodes** - Đóng vai trò là 'Trạm cấp cứu sự cố độc lập':
> - Khi Backend gặp lỗi 500 Uncaught Exception, chính Backend đang bị sập nên không thể tự cứu mình. Bộ lọc `HttpExceptionFilter` sẽ ném stack trace sang node số 1 của n8n.
> - Node 2 dùng Regex bóc tách chính xác tên tệp tin và số dòng code bị lỗi (ví dụ: dòng 142 file `training.service.ts`).
> - Node 3 và 4 thực hiện lọc trùng (Deduplication) để tránh bão tin nhắn spam nếu người dùng F5 nhiều lần.
> - Tại node 5, Gemini AI đóng vai trò Senior Architect chẩn đoán nguyên nhân gốc rễ và đề xuất đoạn mã sửa lỗi.
> - Node 7 rẽ nhánh thông minh: Nếu là lỗi CSDL thì bắn tag `@DBA_Lead` (node 8); nếu là lỗi logic code thì bắn tag `@Backend_Dev` kèm đoạn code AI gợi ý sửa (node 9), đồng thời ghi log kiểm toán vào MySQL (node 10) và gửi email cho Ban Quản trị (node 11)."*

---

### 3. Phản Biện Sắc Bén Trước Các Câu Hỏi Của Hội Đồng (1 Phút)

> **Hỏi 1: Tại sao em không viết luôn tính năng chặn Brute-force vào Backend NestJS mà phải đẩy qua n8n?**
> - **Trả lời:** *"Dạ thưa Thầy/Cô, việc giải mã bcrypt và kiểm tra tần suất IP nếu viết trong Backend sẽ rất dễ bị tấn công DoS làm nghẽn Event Loop của NodeJS. Đẩy sang n8n giúp tách biệt tầng Tường lửa (WAF) độc lập với tầng Nghiệp vụ, Backend chỉ làm việc xác thực tài khoản, còn việc đếm tần suất, khóa IP tạm thời và gửi tin nhắn cảnh báo đa kênh Telegram/Email do n8n xử lý bất đồng bộ, giúp máy chủ luôn mượt mà."*

> **Hỏi 2: Các luồng n8n này có bị trùng lặp với những gì AI Service trong Backend đã làm không?**
> - **Trả lời:** *"Dạ hoàn toàn không ạ. AI Service của Backend nhóm em chỉ làm nhiệm vụ Tính toán lõi (Compute: chấm điểm CV, sinh JD, RAG Copilot hỏi đáp). Còn n8n của em làm nhiệm vụ Điều phối ngoại vi (Action: giám sát an ninh, hẹn giờ sao lưu CSDL lúc 02h00 sáng, bắt log crash khi server sập và tương tác với Telegram/Gmail/MySQL). Hai tầng này phối hợp với nhau theo đúng chuẩn Microservices của doanh nghiệp ạ."*
