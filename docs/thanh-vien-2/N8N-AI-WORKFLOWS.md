# Workflow 2.1 / 2.2 có AI qua n8n

Hai file chứa nhánh AI đã sửa và kiểm thử ngày 20/10/2026. 2.1 lấy từ bản live; 2.2 có thêm backoff đã thử trên copy inactive, chưa publish live:

- `workflows/candidate-intake-ai.json` — `hrTv2IntakeAiV3`, 27 node.
- `workflows/interview-schedule-ai.json` — `hrTv2InterviewAiV3`, 34 node.

Files để `active=false`, không có staticData, pinData, API key hoặc dữ liệu execution. Không thay các workflow TV1/TV3/TV4 và các bundle legacy đang có trên main. Hai bản AI dùng Gmail native/OAuth như bản live đã kiểm thử; bản intake IMAP legacy vẫn giữ riêng. Chỉ bật một bản intake và một bản lịch, tránh poll/webhook trùng.

## Thay đổi

Website apply tự gửi yêu cầu chấm điểm; Gmail/Form đi từ node 07 sang gửi xác nhận và AI song song. BE cung cấp context và nhận callback có `x-n8n-ai-key`; n8n gọi Gemini. FE đọc trạng thái PROCESSING/COMPLETED/FAILED và cập nhật điểm/danh sách tự động.

2.1 giữ HTTP Request để truyền PDF/ảnh inlineData. AI-06 dựng object `geminiRequest`; AI-07 chỉ đọc trường này. AI-09 dựng `callbackResult` để callback không gặp lỗi expression lồng nhau. Parse hỗ trợ object, mergedResponse, content.parts, candidates và JSON fence. ID/requestId giữ theo từng item, không dùng item đầu cho cả batch. Form dùng anyUpdate để không bỏ sót phản hồi chèn trước hàng test cuối Sheet.

2.2 dùng node native `@n8n/n8n-nodes-langchain.googleGemini` 1.2, text/message, model gemini-3.6-flash, JSON, temperature 0.35, maxOutputTokens 4096. Q02 chuẩn hóa cả nguồn lịch 04 và webhook Q01; Q04/Q08 không phụ thuộc webhook chưa chạy. Đường Calendar/Meet/email nối đúng; callback từ Docker đổi localhost sang host.docker.internal. Lỗi AI đi Q12/AI-12 để gỡ PROCESSING khi BE còn hoạt động.

Bản 2.2 mới có retry có giới hạn: Q05 → QR01 (giữ context và đếm lần gọi) → Gemini Q07 → QR02 (phân loại lỗi) → QR03. Nếu lỗi tạm thời 429/502/503/504 hoặc timeout, QR03 đi QR04 Wait rồi quay QR01; chờ lần lượt 15/30/60 giây, tối đa 4 lần gọi tổng cộng. Q07 tắt retry tích hợp để vòng điều phối kiểm soát chính xác tổng số lần gọi. Thành công hoặc lỗi không retry được đi Q08 → Q10 → callback như cũ. 400/401/403/404 và JSON không hợp lệ kết thúc ngay; hết ngân sách retry callback FAILED. RequestId giữ nguyên xuyên suốt. Các node/connection lịch, Meet và email 01–18 không đổi.

Lỗi `invalid syntax` ở execution 219 xảy ra trước HTTP: dấu `}}` trong object lồng nhau khiến parser expression kết thúc sớm. Đã tái hiện bằng parser n8n 2.42.3: expression cũ lỗi, JavaScript chuẩn hợp lệ; chỉ tách dấu đóng bằng khoảng trắng thì chạy được, kể cả khi giữ spread. Bản sửa dùng object dựng trong Code, tránh phụ thuộc chi tiết parser này.

## Cấu hình trước khi import/bật

1. BE: đặt `N8N_AI_ENABLED=true`, `N8N_AI_KEY` là secret ngẫu nhiên, `N8N_WEBHOOK_URL` tới `/webhook`. Với local TypeORM synchronize, entity tự thêm các trường trạng thái AI nullable; môi trường tắt synchronize cần migration tương ứng trước triển khai.
2. n8n: tạo/chọn Header Auth `HR AI Backend Key`, header `x-n8n-ai-key`, cùng giá trị với BE. Dùng credential đó cho AI webhook và HTTP context/callback. Intake vẫn dùng credential `x-intake-key` riêng.
3. Tạo/chọn Header Auth `HR Gemini API Key`, header `x-goog-api-key`, cho AI-07; tạo Google Gemini (PaLM) API (`googlePalmApi`) cho Q07. Không ghi key vào workflow/code/URL.
4. Chọn lại Gmail, Drive, Sheets, Calendar và SMTP credentials phù hợp máy triển khai. Kiểm tra Form/Sheet/Calendar IDs và `host.docker.internal:3001` trỏ đúng BE. Các credential IDs trong file là tham chiếu, không chứa credential data.
5. Tắt bản intake/lịch legacy trước khi bật V3. PR/import file không tự publish; lead kiểm tra credential và payload trên môi trường đích trước khi activate.

## Kiểm thử

Chạy offline (58 ca): `node scripts/test-tv2-ai-workflows.cjs`. Test kiểm tra graph, nhánh song song, chuẩn hóa hai nguồn, parse/schema, lỗi thiếu field, JSON fence và giữ inlineData. Không gọi provider hay ghi database.

Kiểm thử thật ngày 20/10/2026 trên Docker n8n 2.42.3:

| Ca | Execution | Kết quả |
|---|---|---|
| Website CV | 273 | ATS COMPLETED, 90/100 |
| Google Form → Drive → ATS → xác nhận | 279 | SMTP_ACCEPTED, AI 95/100 |
| Gmail → ATS → xác nhận → mark read | 282 | SMTP_ACCEPTED, AI 90/100 |
| PDF file-only, rawCvText ban đầu rỗng | 288 | inlineData thật, AI 95/100 |
| Lịch/Meet/thư mời | 275 | Calendar CONFIRMED, SMTP_ACCEPTED; câu hỏi gặp 503 |
| Webhook câu hỏi độc lập | 283 | Gemini unavailable; Q10 false → Q12 → FAILED |
| Native Gemini thành công trước đó | 258 | mergedResponse string bằng content.parts[0].text; Q08 valid, Q11 lưu 5 câu hỏi |
| Retry tích hợp x4 trước bản backoff | 292 | Vẫn unavailable; Q12 lưu FAILED |
| Backoff mới, Gemini THẬT | 299 | Lần đầu unavailable → chờ 15s → lần 2 thành công; ATS phỏng vấn 101 COMPLETED, 5 câu |
| Backoff mới, Gemini THẬT lần độc lập | 303 | 503/429 kéo dài → đủ 4 lần → ATS phỏng vấn 106 FAILED; 0 câu mới |
| Injected fault: 2 lần lỗi rồi kết quả giả lập hợp lệ | 298 | Vòng thử thứ 3, callback COMPLETED; chỉ kiểm tra cơ chế, KHÔNG tính là Gemini thật |
| Injected fault: luôn 503 / 401 / JSON sai | 300 / 301 / 302 | FAILED sau 4 / 1 / 1 lần, không kẹt PROCESSING |

PDF file-only là PDF hợp lệ 1 trang, 705 byte, nội dung CV tổng hợp do script sinh; request inlineData có cùng SHA-256 với file lưu. Gemini/ATS gọi thật, không mock response. Chưa kiểm chứng OCR ảnh/PDF scan.

2.1 giữ retry tích hợp true/x3/5000 ms, onError=continueRegularOutput. 2.2 dùng vòng backoff x4 nói trên; native Q07 retryOnFail=false, onError=continueRegularOutput. Đây là bản đã kiểm tra trên inactive copy, chưa publish live. Runtime 2.42.3 giới hạn waitBetweenTries tích hợp tối đa 5000 ms, nên chờ dài hơn được thực hiện bằng node Wait.

Gemini có thể trả 503 do nhu cầu cao. Backoff không bảo đảm dịch vụ luôn sẵn sàng; nó giới hạn số lần gọi và kết thúc FAILED đúng khi lỗi kéo dài. Execution success có thể chỉ là callback FAILED hoàn tất. Không dùng câu hỏi cũ làm kết quả thành công mới. Các ca injected fault được ghi rõ là giả lập, không tính là provider thật. Chưa chờ 48h thật hoặc ép lỗi SMTP/Calendar trong lượt retest này.

Bằng chứng chi tiết trong `AI-BACKOFF-TEST-2026-10-20.json`. Hai ca provider thật có cả phục hồi thành công và hết retry vẫn lỗi; vì vậy PR đang draft trong lúc xem xét khả năng dùng model dự phòng. Không tự đổi model hoặc publish.
