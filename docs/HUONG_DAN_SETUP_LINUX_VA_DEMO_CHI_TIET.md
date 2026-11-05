# 🚀 CẨM NANG HƯỚNG DẪN SETUP LINUX & DEMO HỆ THỐNG TRỌN GÓI (A - Z)
**Dành cho:** Thành viên 3 (TV3) - Demo & Bảo vệ Đồ án trước Hội đồng / Giảng viên  
**Trạng thái chuẩn bị:** **ĐÃ HOÀN THIỆN 100% - KHÔNG THIẾU BẤT CỨ MẮT XÍCH NÀO**

---

## I. KIỂM TRA TOÀN BỘ MẮT XÍCH TRƯỚC KHI RỜI WINDOWS (AUDIT CHECKLIST)

Mọi tài nguyên cần thiết cho hệ thống đã được kiểm tra và nằm sẵn sàng tại ổ đĩa dùng chung `F:\HumanResources`:

- [x] **File cài đặt Host Cloudflare:** `F:\HumanResources\cloudflared-linux-amd64.deb` (19.8 MB - Đã tải sẵn, sang Linux không cần mạng tìm kiếm).
- [x] **Cơ sở dữ liệu MySQL:** `F:\HumanResources\sql_linux_ready\hr_enterprise_db_ready.sql` (66.7 KB - Đã khử trùng email sạch, đủ các case mẫu).
- [x] **Dữ liệu n8n Ultra:** `F:\HumanResources\n8n_linux_backup\database.sqlite` (6.4 MB - Chứa 9 luồng V5 Ultra đã kích hoạt và test xanh 100%).
- [x] **Bộ Não Antigravity:** `F:\HumanResources\gemini_config_backup\antigravity\` (Chứa đầy đủ 8 cuộc hội thoại lịch sử của dự án, 10 artifacts, skills và rules).
- [x] **Script tự động 1-chạm:** `F:\HumanResources\scripts\setup-linux-demo.sh` (Đã cấp quyền, tích hợp vòng lặp kiểm tra sẵn sàng MySQL/n8n).
- [x] **Script phát link Host:** `F:\HumanResources\scripts\start-host-tunnel.sh` (Cấp phát 3 domain HTTPS công khai cho Thầy).

---

## II. QUY TRÌNH SETUP TỪNG BƯỚC TRÊN UBUNTU LINUX (CHI TIẾT 100%)

### ⚠️ LƯU Ý BẮT BUỘC TRÊN WINDOWS:
> **BẤM "RESTART" (Khởi động lại) — TUYỆT ĐỐI KHÔNG BẤM "SHUT DOWN".**  
> *(Bấm Restart giúp Windows giải phóng hoàn toàn khóa phân vùng NTFS, đảm bảo sang Linux đọc/ghi mượt mà không bị lỗi Read-Only).*

---

### BƯỚC 1: KHỞI ĐỘNG VÀO UBUNTU LINUX
1. Khi máy khởi động lại, menu màn hình tím **GNU GRUB** xuất hiện.
2. Dùng phím mũi tên chọn **`Ubuntu`** $\to$ Bấm **Enter**.  
   *(Nếu máy tự nhảy vào Windows, bấm Restart lại và nhấn liên tục phím `F12` khi vừa sáng logo Lenovo $\to$ Chọn `ubuntu`).*
3. Đăng nhập vào Ubuntu bằng mật khẩu máy của bạn.

---

### BƯỚC 2: MOUNT Ổ ĐĨA WINDOWS & COPY DỰ ÁN VỀ THƯ MỤC HOME
1. Nhìn thanh Dock bên trái, bấm vào ứng dụng **Files** (biểu tượng thư mục).
2. Ở thanh điều hướng bên trái, bấm vào ổ đĩa **`New Volume`** (dung lượng ~197 GB - ổ F: bên Windows). Khi click vào, Ubuntu sẽ tự động Mount ổ đĩa này!
3. Nhấn tổ hợp phím: **`Ctrl + Alt + T`** để mở cửa sổ Terminal màu đen.
4. Gõ chính xác 3 lệnh sau để copy dự án về thư mục Home chuẩn Linux:
   ```bash
   # 1. Copy toàn bộ dự án từ ổ F: sang thư mục Home (ext4)
   cp -r /media/$USER/*/HumanResources ~/HumanResources

   # 2. Chuyển vào thư mục vừa copy
   cd ~/HumanResources

   # 3. Kích hoạt script cài đặt tự động 1-chạm
   bash scripts/setup-linux-demo.sh
   ```

---

### BƯỚC 3: QUÁ TRÌNH SETUP TỰ ĐỘNG DIỄN RA (BẠN CHỈ CẦN NGỒI XEM)
Khi chạy lệnh trên, script sẽ tự động thực hiện từ đầu đến cuối:
1. Nhập mật khẩu máy Ubuntu của bạn (nếu terminal hỏi `[sudo] password for...`).
2. Tự động cài `curl`, `git`, `Docker`, `Docker Compose`, `Node.js 20 LTS`, `VS Code` và `Cloudflared`.
3. Tự động khôi phục trọn vẹn **8 bộ não & lịch sử Antigravity** vào `~/.gemini/`.
4. Tự động khởi chạy cụm container Docker:
   - **MySQL 8.0 (Port 3306):** Nạp sạch database doanh nghiệp.
   - **n8n Engine (Port 5678):** Nạp trọn vẹn 9 workflows V5 Ultra.
5. Tự động build Backend NestJS và cài đặt thư viện Frontend.
6. Màn hình báo dòng chữ xanh: **`✅ TOÀN BỘ HỆ THỐNG ĐÃ ĐƯỢC SETUP VÀ SẴN SÀNG DEMO VỚI THẦY!`**

---

## III. HƯỚNG DẪN CHẠY DEMO TRƯỚC THẦY CÔ

Sau khi script chạy xong, bạn mở **3 tab Terminal** để kích hoạt toàn bộ hệ sinh thái:

### 🖥️ Tab Terminal 1: Chạy Backend NestJS
```bash
cd ~/HumanResources/backend
npm run start:dev
```
*(Backend sẽ chạy tại cổng `http://localhost:3001/api`)*

### 🖥️ Tab Terminal 2: Chạy Frontend Dashboard
```bash
cd ~/HumanResources/frontend
npm run dev
```
*(Frontend giao diện nhân sự sẽ chạy tại `http://localhost:5173`)*

### 🌐 Tab Terminal 3: KÍCH HOẠT HOST ONLINE (CÔNG KHAI CHO THẦY BẤM)
```bash
cd ~/HumanResources
bash scripts/start-host-tunnel.sh
```
Màn hình sẽ hiển thị ngay 3 đường link HTTPS màu xanh lá:
- **Link 1 (Frontend):** Cho Thầy mở trên điện thoại/laptop của Thầy để bấm trải nghiệm.
- **Link 2 (n8n Workflows):** Để Thầy soi trực tiếp 9 luồng AI tự động chạy theo thời gian thực.
- **Link 3 (Backend API):** Xem tài liệu API.  
*(Các link này cũng tự động lưu vào file `HOST_PUBLIC_LINKS.txt` trong thư mục dự án).*

---

## IV. KỊCH BẢN THUYẾT TRÌNH DEMO "GHI ĐIỂM TUYỆT ĐỐI"

1. **Mở đầu:**  
   "Dạ thưa Thầy/Cô, toàn bộ hệ sinh thái HR Copilot & Automation Engine hôm nay được em triển khai hoàn toàn trên môi trường **Ubuntu Linux** thông qua cụm **Docker Microservices** và tự động hóa CI/CD."
2. **Khoe luồng n8n V5 Ultra (Mở `http://localhost:5678/workflows`):**  
   - Giới thiệu mô hình **Satellite Pattern**: 4 luồng chính + 4 luồng vệ tinh.
   - Bấm vào mục **Executions**: Cho Thầy thấy các lượt chạy đã test thành công 100% với Google Gemini AI (nhận diện stress, chẩn đoán nguy cơ kiệt sức, tự động viết thư tốt nghiệp thử việc).
3. **Khoe tính năng Host Công Khai:**  
   - "Đồng thời, em đã cấu hình **Cloudflare Tunnel** đưa hệ thống lên mạng công khai. Em xin phép gửi link `https://...trycloudflare.com` để Thầy có thể mở ngay trên điện thoại của Thầy để tương tác trực tiếp ạ!"
