# Tự chấm CV qua backend

Hồ sơ mới từ website hoặc intake được lưu cùng trạng thái PENDING và lịch chạy trong MySQL. Worker backend lấy một hồ sơ mỗi lượt, gọi RecruitmentAiService hiện có và lưu kết quả LIVE. FE tự tải lại trong lúc PENDING/PROCESSING. Nút chấm lại dùng cùng hàng đợi; không gọi n8n để chấm CV nữa. N8N_AI_ENABLED vẫn áp dụng cho các tính năng khác như gợi ý câu hỏi.

Worker thử tối đa 3 lần với lỗi AI tạm thời, đợi 60 rồi 120 giây. Lease 10 phút giúp phục hồi sau khi tiến trình dừng; token riêng ngăn kết quả muộn ghi đè yêu cầu mới. Một process chạy tối đa một lượt chấm; nhiều process có thể chấm các hồ sơ khác nhau. MySQL cần hỗ trợ SKIP LOCKED (MySQL 8). Không bảo đảm nhà cung cấp AI chỉ nhận đúng một request khi process gặp sự cố.

## Triển khai sau khi nhóm trưởng merge

- Build backend và frontend từ cùng commit.
- Bổ sung `applications.ai_score_attempts INT NOT NULL DEFAULT 0`, `ai_score_available_at DATETIME NULL` và index cho cột thời gian trước khi worker chạy. Dự án hiện bật TypeORM synchronize; môi trường tắt synchronize cần migration tương ứng. Không đưa hồ sơ cũ vào hàng đợi hàng loạt.
- Kiểm tra cấu hình Gemini backend và quota còn dùng được.
- Cập nhật workflow đang tiếp nhận CV theo `workflows/candidate-intake-ai.json`: giữ webhook/credential và nhánh email; bỏ nhánh AI-* cũ. Export đã bỏ nhánh chấm Gemini. Không chạy hai workflow intake trùng webhook. Endpoint callback chấm CV cũ từ n8n bị từ chối khi hồ sơ thuộc worker BE.
- Khởi động backend và phục vụ bản FE mới. Nhóm trưởng thực hiện trên VPS; thay đổi này chưa triển khai VPS.

## Kiểm tra

Build backend; chạy `node --test backend/test/cv-score-queue.test.cjs` từ gốc repo. Test dùng một CV tổng hợp, repository và AI giả lập; kiểm tra hoàn tất, chống ghi đè kết quả muộn, retry có giới hạn, phục hồi lease, file CV và chống click trùng. Đây không phải test MySQL hoặc Gemini thực.

Build/typecheck FE đã qua. Test end-to-end MySQL + Gemini chưa chạy do máy thực hiện không có quyền Docker. Trước khi merge cần nộp một CV kiểm thử trên môi trường thử nghiệm và xác nhận PENDING → PROCESSING → COMPLETED, điểm giữ nguyên sau tải lại trang, không có nhánh AI n8n chạy trùng. Với quota lỗi phải không lưu điểm giả. Không dùng CV thật của ứng viên cho bài kiểm thử này.
