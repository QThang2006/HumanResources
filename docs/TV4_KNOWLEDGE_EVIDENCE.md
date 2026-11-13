# TV4 — Câu trả lời và trích đoạn Kho tri thức

## Hiển thị

- Câu trả lời gồm đoạn dẫn nhập và các ý, không chèn nhãn `[Nguồn: tên file]` vào từng ý. Các số tham chiếu thông thường như `[12]` được giữ nguyên.
- Nguồn tham khảo liệt kê mỗi tài liệu một lần.
- “Xem trích đoạn gốc” thu gọn mặc định, mở bằng chuột hoặc bàn phím. Tra cứu lại sẽ tạo kết quả thu gọn mới.
- Chỉ hiện nguồn được trả trong `sources`, không đưa mọi kết quả tìm kiếm trong `results` ra làm bằng chứng.
- Gom theo tài liệu, loại đoạn trùng, xếp các đoạn theo thứ tự trong tài liệu; không hiển thị phần trăm liên quan.
- Đoạn lược bớt có dấu … và giải thích. Nếu dữ liệu đã lưu không còn câu hoàn chỉnh, báo rõ để kiểm tra tài liệu gốc.

## Backend

Giữ nguyên endpoint, quyền, nguồn dữ liệu, ID và cấu trúc tìm kiếm hiện có. Bổ sung tùy chọn `chunkIndex`, `excerpt`, `excerptIsPartial` trong mỗi nguồn. `excerpt` lấy từ những câu hoàn chỉnh của văn bản truy xuất; không dùng lời AI viết lại làm trích dẫn. Ở nhánh trả lời trích xuất, chỉ đưa các câu được dùng trả lời vào excerpt.

Prompt yêu cầu câu trả lời liền mạch và khai báo nguồn riêng bằng `citedChunkIds`. Loại nhãn nguồn cũ ở đầu ra AI/n8n và khi hiển thị để tương thích. Workflow JSON không thay đổi: workflow hiện có chuyển nguyên mảng `sources` từ endpoint rag-answer.

Frontend vẫn nhận được API cũ không có excerpt: chỉ dùng nội dung đúng cặp documentId/chunkId đã trích dẫn và đánh dấu đoạn có thể thiếu phần trước/sau. Không tự phục hồi hay viết thêm chữ bị thiếu trong PDF cũ, không xóa/nạp lại tài liệu, không sinh lại embedding.

## Xác minh

- TypeScript backend được biên dịch vào `/tmp` để không đụng `backend/dist` trong khi NestJS watch đang chạy.
- Bộ kiểm thử documents kiểm tra bỏ nhãn nguồn, giữ nguồn hợp lệ, không trích mảnh câu bị cắt, trích nguyên câu từ dữ liệu và chỉ dùng các câu của nhánh fallback.
- Frontend kiểm tra gom nguồn, bỏ kết quả không được dẫn, chống lấy nhầm tài liệu, tương thích API cũ, thứ tự đoạn, thu gọn mặc định và bố cục đoạn văn/danh sách.
- Preview localhost dùng component thật, API giả; không đăng nhập, không gọi AI/n8n/email/Telegram thật.

Thay đổi local, chưa stage/commit/push/deploy.
