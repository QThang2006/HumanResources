# TV2: xác thực webhook xếp lịch và Offer

Backend gửi `POST /webhook/interview-schedule` và `POST /webhook/offer-issued` với header `x-n8n-ai-key`. Giá trị mặc định lấy từ `N8N_AI_KEY`; nếu credential của từng workflow khác nhau, đặt `N8N_INTERVIEW_WEBHOOK_KEY` hoặc `N8N_OFFER_WEBHOOK_KEY` trong môi trường Backend. Hai khóa ghi đè chỉ áp dụng cho hai webhook này. Không in khóa hoặc token Offer ra log/PR.

Trước khi triển khai, kiểm tra **workflow đang Publish** trên n8n: đúng Production URL, chỉ một workflow dùng mỗi path, Webhook node chọn Header Auth với tên header `x-n8n-ai-key`, credential có cùng giá trị với Backend. Bản JSON trong repository không chứa credential và có thể khác cấu hình của workflow đang chạy. Nếu workflow 04 dùng tên header khác, cần thống nhất cấu hình n8n với Backend trước khi gửi lại Offer. Workflow `employee-hired` không nằm trong thay đổi này.

Sau khi merge, build Backend, cập nhật cấu hình môi trường nếu cần và khởi động lại PM2 với `--update-env`. Chỉ kiểm tra rằng biến tồn tại trong tiến trình; không xuất giá trị ra terminal, log hoặc ảnh chụp. Kiểm tra log dispatcher không còn HTTP 403. HTTP 200 từ webhook chỉ xác nhận n8n nhận yêu cầu, chưa xác nhận Google Meet hoặc SMTP.

Dùng ứng viên/hộp thư thử được kiểm soát để xác nhận:

1. Lịch mới có `calendarStatus=CONFIRMED`, link `https://meet.google.com/...` hợp lệ và `emailStatus=SMTP_ACCEPTED`; reload hồ sơ vẫn giữ trạng thái. Kiểm tra execution n8n và hộp thư thử.
2. Offer mới có `deliveryStatus=SMTP_ACCEPTED` và `sentAt`; link trong email mở được trang phản hồi. Kiểm tra phản hồi bằng dữ liệu thử riêng. Không chờ 24/48 giờ trên môi trường thật để kiểm tra nhắc hạn; dùng test thời gian giả lập.
3. Nếu 04 vẫn `DISPATCH_FAILED`, xem HTTP status và execution của riêng `offer-issued` trước khi bấm gửi lại. Nút gửi lại xoay token; kiểm tra execution để tránh thư trùng.

Bản vá không tự gửi lại những lịch cũ đang `failureStage=DISPATCH`. Không tạo vòng phỏng vấn mới để thay việc gửi lại; cần một cơ chế retry có khóa hàng, xoay callback token và giữ nguyên interview trước khi phục hồi các bản ghi cũ.
