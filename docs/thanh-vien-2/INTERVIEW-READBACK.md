# TV2 — Lưu Google Meet và trạng thái thư mời về hồ sơ

Cập nhật07/10/2026, evidence E019/E024. Website→API/MySQL→SDK n8n→Calendar/Meet→SMTP→callback về ATS đã chạy thật trên dữ liệu giả gửi về chính Gmail test. Code/SQL/workflow/helper/test đã push `67624af` lên `feature/recruitment-ats`, remote SHA xác nhận. Website tự cập nhật, tải lại giữ link/trạng thái; chưa triển khai DB nhóm, recovery vận hành còn REVIEW.

## Hành vi

- Lưu lịch tạo Interview và bản ghi `interview_deliveries` trong cùng transaction. Boolean của SDK vẫn chỉ là UNVERIFIED.
- n8n phải claim đúng vòng trước khi gọi Google/SMTP. Claim chỉ thành công một lần; chạy workflow lặp bị409 trước provider. Backend trả snapshot người nhận/thời gian đã lưu, không dùng contact bị thay trên payload webhook.
- Calendar GET xác nhận đúng event/time/conference/Meet rồi callback lưu `Interview.meetingLink` và `googleCalendarEventId`. Website hiện **Mở phòng phỏng vấn** và **Google Meet: Đã tạo và xác nhận lịch**.
- SMTP accepted đúng recipient, không rejected và có messageId rồi callback lưu emailStatus=SMTP_ACCEPTED. Website ghi **Máy chủ email đã chấp nhận gửi**; không tự coi đó là Inbox delivery. Inbox đã kiểm độc lập trong Gmail ở E019.
- Poll hồ sơ3 giây khi đang chờ; đóng hộp thoại hoặc đủ kết quả thì dừng. Delivery không đổi revision của form chấm điểm Manager, tránh reset phần nhận xét đang nhập.
- Lịch cũ chưa có tracking vẫn UNVERIFIED; không tự gắn link hoặc biến email cũ thành đã gửi.

## Cấu hình cho bản ứng dụng

Chỉ bật khi đã chọn workflow mới và gắn credentials của tài khoản test. Backend `.env` của người dùng hiện không được thay bởi bài test.

```dotenv
N8N_WEBHOOK_URL=http://localhost:5678/webhook
RECRUITMENT_CALLBACK_BASE_URL=http://localhost:3001/api
MAIL_FROM=your_email@gmail.com
```

`RECRUITMENT_CALLBACK_BASE_URL` là API base n8n truy cập được, không phải URL của n8n. Giá trị phải khớp chính xác `const base` trong node **Validate delivery envelope** của workflow, gồm hostname/port/prefix. Local dùng HTTP loopback; môi trường khác dùng HTTPS. Không đặt token/query/credentials trong URL. Bỏ biến này để dùng caller/UNVERIFIED cũ; `.env.example` để biến ở dạng comment.

1. Backend build. Dev hiện dùng TypeORM synchronize và tự tạo bảng mới. Nếu deployment đã tắt synchronize, review/apply SQL bổ sung `backend/sql/interview-deliveries.sql` bằng quy trình migration của nhóm trước khi chạy code mới; không reset DB.
2. Import `workflows/interview-schedule-readback.json` — **TV2 - Interview scheduling with authenticated ATS readback**. File không chứa credentials, tokens hoặc pinData; gắn Google Calendar OAuth vào cả Create và Get, SMTP vào Email. Calendar primary; lịch45 phút, không Calendar attendees; workflow này không Telegram.
3. Đổi API base ở node guard nếu cần. `scripts/build-interview-readback-workflow.cjs` tái sinh template mặc định localhost3001; đừng chạy lại helper rồi làm mất cấu hình môi trường đã chỉnh.
4. Chỉ publish một workflow cho webhook `interview-schedule`; giữ master và workflow cũ inactive để không trùng route. Manual test dùng Test URL và Execute workflow trước, production webhook cần workflow đã publish.
5. Khởi động lại backend sau cấu hình. Xếp lịch bằng HR trên website, kiểm node Save Meet/Save email và hồ sơ sau reload. Sender phải là MAIL_FROM/GMAIL_USER hợp lệ; thiếu/sai callback base hoặc sender thì503 và rollback lịch mới trước dispatch.

CLI import local cầnid ổn định: `node scripts/prepare-n8n-import.cjs` chuẩn bị `.temp/n8n-import/interview-schedule-readback.json`, idhrTv2Delivery01, inactive. Import đúng file mới bằng CLI n8n đang dùng/profile hiện tại; không export credentials giải mã ra Git.

## Contract máy với máy

SDK `triggerInterviewScheduled` giữ nguyên implementation/signature của lead. Consumer TV2 thêm metadata `delivery` vào payload; SDK đã spread payload vào webhook nên không cần đổi core.

| Endpoint dưới `/api` | Xác thực | Input/Kết quả |
| --- | --- | --- |
| POST /applications/interviews/:id/delivery/claim | Header x-interview-callback-token | requestId UUIDv4;201 trả claimed + snapshot chuẩn + eventId; claim lặp409 |
| POST /applications/interviews/:id/delivery | Cùng header/token/vòng | requestId, applicationId, event và field theo loại;201 recorded/duplicate + trạng thái |

Token ngẫu nhiên256 bit theo từng vòng, DB chỉ giữ SHA256, hiệu lực48 giờ; không dùng JWT của HR cho n8n. Token/hash/snapshot không trả trong browser DTO, không đưa vào URL/log/báo cáo. Execution n8n chứa metadata máy với máy, nên giữ private và không công bố/export output có token.

| event | Field bắt buộc thêm | Kiểm tra |
| --- | --- | --- |
| CALENDAR_CONFIRMED | eventId, meetingLink, scheduledAt | eventId định trước từ requestId, time đúng Interview; Meet URL dạng google.com/xxx-xxxx-xxx |
| SMTP_ACCEPTED | eventId, recipient, messageId | Calendar đã confirmed, recipient khớp snapshot; ghi SMTP acceptance |
| FAILED | stage CALENDAR/EMAIL, code CALENDAR_ERROR/MEET_NOT_READY/SMTP_ERROR | Không hạ kết quả đã confirmed/completed; lỗi email giữ Meet và emailStatus UNKNOWN |

Callback lặp giống nhau là no-op; nội dung khác409, token/requestId sai hoặc hết hạn401, field/schema/link sai400. Row lock chống callback/claim concurrent. UI/readback vẫn giữ role/scope của Applications.

## Lỗi và giới hạn còn lại của Q23

- Calendar/SMTP không auto retry. Callback lưu kết quả có thể retry tối đa3 lần vì backend nhận idempotent; claim không retry khi response chưa biết kết quả.
- Sau10 phút chưa có đủ callback, GET hồ sơ trả UNKNOWN; website yêu cầu kiểm execution/Calendar/Gmail trước gửi lại. UNKNOWN không đồng nghĩa email thất bại.
- Đã có durable trạng thái, claim dedupe và callback replay; **chưa có outbox/queue hoặc công cụ đối soát/recovery tự động sau crash/mất callback**. Không dùng nút xếp vòng mới để thử gửi lại thư của vòng cũ. B03/Q23 còn phần recovery và lead review trước triển khai nhóm.
- Các nhánh lỗi workflow có callback sanitized. Test lỗi/callback bằng contract fixture; chưa cố tình gây Google/SMTP outage thật. Q24 Hire/User/5 task và Gemini JD không thuộc thay đổi này.

## Test đã thực hiện

- `node scripts/test-tv2-readback.cjs`: E01973/73; E020 **74/74 PASS**, MySQL9.6/JWT/password/HTTP thật; provider contract fixture. Bổ sung1 bài workflow chứa12 tình huống chạy Code-node từ JSON; không gọi provider. Script tạo/dọn MySQL riêng tại13317 và dùng cwd Temp ASCII tránh lỗi Windows267, không dùng DB nhóm.
- Backend TypeScript build, frontend TypeScript/Vite build và lint CandidateDetail đạt.
- LIVE: runtime website5173/API3011/MySQL13316; workflow riêng **hrTv2Readback01**, Test URL `hr-tv2-readback-test/interview-schedule`, unpublished. HR lưu12:00–12:45 ngày08/10/2026; một vòng/một dispatch; Calendar/SMTP callbacks persist, website tự hiện link, reload vẫn giữ. Gmail Inbox12:00/href đúng.
- Result/DB/replay/Inbox/ảnh nằm trong `.temp/n8n-import/tv2-readback-*`, Git ignore. Không có recipient của lead, Telegram/onboarding/burnout hoặc thay đổi backend `.env` trong bài test này.
- E020 đã xác nhận Meet/trạng thái thư giữ nguyên sau Manager chấm91/PASSED, HR OFFERED và tải lại hồ sơ. Báo cáo các phần còn lại: [REMAINING-TESTS.md](REMAINING-TESTS.md).
