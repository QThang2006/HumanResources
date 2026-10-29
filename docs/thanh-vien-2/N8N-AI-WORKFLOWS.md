# Workflow AI tuyển dụng qua n8n

Hai file là bản inactive để review/test, chưa publish model lite lên live:

| File | ID | Node |
|---|---|---:|
| workflows/candidate-intake-ai.json | hrTv2IntakeAiV3 | 31 |
| workflows/interview-schedule-ai.json | hrTv2InterviewAiV3 | 34 |

Live local vẫn có đúng 4 workflow 2.0/2.1/2.2/2.3; 2.1/2.2 live là bản 27/30 node dùng model 3.6. Chỉ import/publish sau khi được phép. Không thêm workflow test vào database live.

## Phân công

- Website nộp CV/bấm chấm lại: FE → BE lưu/xác thực → webhook AI-01 → n8n lấy CV/JD, gọi Gemini, kiểm tra và callback ATS.
- Gmail/Form: n8n nhận email hoặc Sheet phản hồi, tải CV Drive, lưu ATS; node 07 tách song song gửi xác nhận và chấm AI. Duplicate được bỏ qua.
- Xếp lịch: FE → BE lưu lịch → webhook 01. n8n tạo Calendar/Meet, xác minh event, gửi email/ICS hai bên và callback. Node 04 còn kích hoạt AI; Q01 là webhook câu hỏi độc lập.
- FE đọc trạng thái/điểm/câu hỏi từ ATS. BE giữ dữ liệu, quyền truy cập và chống callback cũ; n8n điều phối dịch vụ ngoài.

Tất cả node/connections Gmail/Form/email 01–13 của 2.1 và lịch/Meet/email 01–18 của 2.2 giữ nguyên. Không thay legacy của thành viên khác.

## Gọi Gemini và phục hồi

Cả hai nhánh dùng tối đa 4 lần tổng cộng: lần 1–2 gemini-3.5-flash-lite; nếu vẫn lỗi tạm thời, lần 3–4 gemini-3-flash-preview. Chờ 15/30/60 giây; tắt retry tích hợp provider để không nhân số lần gọi. QR/R01 giữ context và chọn model cố định; QR/R02 phân loại lỗi; QR/R03 rẽ nhánh; QR/R04 Wait. Không gọi lại cả luồng nhập hồ sơ, Calendar hay gửi email.

Thử lại HTTP 429/500/502/503/504, timeout, connection reset/closed, socket hang up. HTTP 400/401/403/404, credential sai và JSON/schema sai đi FAILED. Key luôn ở credential.

2.1 giữ HTTP Request để truyền PDF/ảnh inlineData, temperature 0.2, JSON, maxOutputTokens 4096, timeout HTTP 60 giây/lần. AI-05 giữ requestId từ AI-02 vì API context không có field này. AI-06 dựng geminiRequest; AI-08 giữ identity/model/số lần gọi qua AI-09/callback. Score phải 0–100, summary ≥10 ký tự, skillsDetected là mảng tối đa 30 chuỗi.

2.2 giữ Gemini native 1.2, text/message, JSON/mergedResponse, temperature 0.35, maxOutputTokens 4096. Parser đọc mergedResponse/text/output/response/content.parts/candidates và JSON fence; chấp nhận 3–10 câu độc nhất dài ≥20 ký tự như hành vi cũ. alwaysOutputData giúp candidate rỗng vẫn tới validation/FAILED.

True AI-10/Q10 → callback COMPLETED; false → FAILED. Lỗi sớm qua E01/QE01 → FAILED. RequestId giữ qua retry, callback cũ không ghi đè request mới. Nếu BE/callback cũng ngừng hoạt động thì vẫn có thể không ghi được FAILED, cần kiểm tra execution.

## Kiểm thử

Lệnh: node scripts/test-tv2-ai-workflows.cjs — 76 ca offline. Gồm graph, nhánh song song, schema/fence, full chain context → prompt → retry → parser → callback, requestId, inlineData, ngân sách retry, HTTP 500/nested cause và lỗi mạng.

Test hiện tại chạy n8n 2.42.3 trên SQLite snapshot cô lập, credential hiện có, Gemini và API context/callback thật; bản ghi ATS tổng hợp riêng, không gửi Calendar/email. Xem GEMINI-DEMO-TEST-2026-10-21.json. Execution test thuộc database cô lập. Ca injected được ghi rõ, không tính là provider thật. n8n success chỉ có nghĩa execution kết thúc; phải kiểm tra ATS COMPLETED để kết luận AI thành công.

Bằng chứng lịch sử: website/Gmail/Form/PDF chấm thật (273/279/282/288), Meet/email (275), native lite tạo 5 câu (417). Model 2.5-flash/2.5-flash-lite trả 404 với credential hiện tại. Các ca 320/321 từng dùng fallback 3.8; không coi là bằng chứng fallback 3-flash-preview hiện tại.

## Triển khai sau khi được phép

1. Backup workflow/database; giữ profile/credential và execution Offer đang Wait. Không restore snapshot test vào live.
2. BE cần N8N_AI_ENABLED, N8N_AI_KEY, N8N_WEBHOOK_URL và schema AI. Môi trường tắt TypeORM synchronize cần migration.
3. Chọn Header Auth x-n8n-ai-key cùng BE cho context/callback/AI webhook, x-goog-api-key cho AI-07, googlePalmApi cho Q07; kiểm tra Google/SMTP credential và host.docker.internal:3001.
4. Import đè đúng ID 2.1/2.2 rồi kiểm tra trước publish; mỗi webhook/poller chỉ có một chủ sở hữu. Không đổi 2.0/2.3.
5. Retest FE: CV text/PDF → điểm; lịch PENDING → Meet/email/câu hỏi. Đợi AI hoàn tất trước khi nhập kết quả phỏng vấn để tránh lỗi 409 do chính test.

## Giới hạn

- Hai model có thể cùng chịu quota/outage; không bảo đảm demo thành công 100%. Native operation hiện không có timeout HTTP tùy chỉnh và có thể phản hồi chậm.
- PDF file-only đã thử là PDF thật có CV tổng hợp, chưa chứng minh OCR ảnh scan hay tài liệu dài vượt output 4096 token.
- Câu hỏi dựa vào rawCvText/JD: cvFileUrl được đưa vào prompt không đồng nghĩa native text node đã đọc file. CV chưa trích được text cần xử lý bổ sung trước khi coi câu hỏi bám sát CV.
- Lượt sửa Gemini không chạy lại timer Offer 24/48 giờ hoặc ép lỗi SMTP/Calendar; các nhánh đó giữ nguyên.

Bổ sung kiểm tra hiện tại: model dự phòng 3.1-flash-lite gặp 503 ở cả hai lần gọi thật (ca 441 trong SQLite test), nên bản cuối đổi sang gemini-3-flash-preview. Model thay thế đã trả JSON 5 câu hai lần trực tiếp, khoảng 10–12 giây/lần. Xem ca native fallback cuối trong GEMINI-DEMO-TEST-2026-10-21.json. Đây là model preview: có thể thay đổi khả dụng, cần probe lại trước demo.
