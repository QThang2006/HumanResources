# Đồng bộ mã vị trí vào Google Form

Workflow `hrTv2JobSyncV2` nhận webhook `POST /webhook/jobs-changed` mỗi khi HR/Admin tạo, sửa hoặc đóng/mở tin tuyển dụng.

Backend là nguồn mã duy nhất. n8n gọi `GET /api/jobs`, chỉ lấy job `OPEN`, tạo lựa chọn dạng `JOB-0001 – Tên công việc`, rồi gọi Apps Script để cập nhật câu hỏi dropdown `Mã vị trí ứng tuyển`.

## Cấu hình Apps Script một lần

1. Mở Google Form → dấu ba chấm → **Trình chỉnh sửa tập lệnh** (hoặc mở `script.google.com` và tạo project mới).
2. Dán nội dung `scripts/google-form-job-sync.gs`.
3. Đổi `REPLACE_WITH_LONG_RANDOM_TOKEN` trong hàm `setSyncToken`, chạy hàm này một lần và cấp quyền cho Google Form/Drive.
4. Chọn **Deploy → New deployment → Web app**.
5. Chọn **Execute as me** và quyền truy cập **Anyone with the link**, sau đó sao chép URL `/exec`.
6. Đặt hai biến trong `backend/.env`:

```dotenv
GOOGLE_FORM_SYNC_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
GOOGLE_FORM_SYNC_TOKEN=cùng-token-đã-đặt-trong-Apps-Script
```

7. Chạy `scripts/import-tv2-local.ps1` để nhập workflow và credential. Script lấy URL từ cấu hình và lưu token bằng Custom Auth của n8n (body `token`), không ghi token vào file workflow trong Git. Script xóa file credential tạm sau khi nhập. Sau đó Publish các workflow cần dùng. Import lại sẽ đưa workflow về trạng thái chưa Publish.

Máy hiện tại đã triển khai Apps Script và kết nối credential; không cần tạo lại project Google.

Khi tạo job mới, Backend trả về thành công trước; webhook đồng bộ chạy bất đồng bộ nên lỗi Google Form không làm hỏng thao tác đăng tuyển.

## Hành vi

- Tạo job: thêm lựa chọn với mã lấy từ ID Backend (ví dụ ID 2 → `JOB-0002`). Mã hiển thị không cần thêm cột cơ sở dữ liệu.
- Sửa tên: cập nhật tên trong dropdown, giữ nguyên mã.
- Đóng job: loại khỏi danh sách lựa chọn. Mở lại: đưa vào danh sách.
- Không có job đang mở: hiển thị `Hiện chưa có vị trí đang mở`; đây không phải mã hợp lệ để nộp hồ sơ. Backend vẫn chặn ứng tuyển vào job đã đóng.
- Workflow có 14 node, gồm lịch đồng bộ dự phòng mỗi 5 phút và thử lại khi gọi Google gặp lỗi. Backend/UI/n8n cần đang chạy; ứng viên đã mở Form trước đó cần tải lại để thấy danh sách mới.
- Luồng nhận CV chấp nhận `JOB-0001 – Tên công việc`, dạng cũ `1 – Tên công việc` và mã số, rồi gửi `jobId` dạng số về Backend.

## Kiểm tra đã thực hiện

- Backend biên dịch thành công; 7 bài kiểm thử TV2 đạt, gồm sự kiện tạo/sửa/đóng/mở job và chống cập nhật bằng phiên bản cũ.
- Webhook thật trả HTTP 200, `success: true`, `updatedJobIds: [1]`.
- Lưu job từ giao diện HR tạo execution `UPDATED` thành công trong n8n.
- Google Form công khai hiển thị `JOB-0001 – Backend Engineer (NestJS / TypeScript)`.
