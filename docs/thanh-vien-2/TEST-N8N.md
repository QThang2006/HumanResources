# Test n8n của thành viên 2 — 07/10/2026

Trạng thái công bố E024: **code TV2, workflow mẫu và helper đã push `67624af` lên `feature/recruitment-ats`**, SHA remote đã xác nhận; regression99/99 và build đạt. Các workflow/config/ảnh chứa credential references hoặc Gmail thực ở `.temp` giữ private. Việc push không đóng gate Gemini vận hành, recovery lịch/thư, welcome-mail LIVE hoặc TV3 handoff.

## Lượt người dùng tự test thư thật đang chuẩn bị

Theo yêu cầu tự thao tác gửi thư mời/Google Meet, đã mở riêng http://localhost:5175/admin/recruitment → API3007/MySQL13321/control3016. Bản demo mô phỏng5173 và runtime lịch sử3011 được giữ. HR fixture đã đăng nhập; hồ sơ **TV2 - Ung vien test Gmail cua toi**, Manager **Manager TV2 - Test thu moi**, lịch điền sẵn **14:00 ngày08/10/2026 (giờ Việt Nam)**. Người dùng có thể đổi giờ tương lai trước khi lưu.

Workflow local **hrTv2UserTrial01 — TV2 - Tu test Gmail va Google Meet** đã Publish, webhook riêng `hr-tv2-user-trial/interview-schedule`; dùng credential references Calendar/SMTP đã kết nối. Chỉ nhận hồ sơ thử đúng ID/tên, vòng1, thời gian tương lai và sender/recipient/interviewer đều là chính Gmail đã xác nhận. Callback/claim theo vòng có xác thực; không Telegram, không nhánh employee-hired/burnout. File private, PID và configuration ở `.temp/user-interview-test/`, Git ignore.

Người dùng bấm **Lưu lịch phỏng vấn** sẽ chạy Google Calendar/Meet và SMTP thật, rồi ghi link/trạng thái về ATS. Không cần Execute trong n8n khi workflow này Published. Kiểm Gmail Inbox/Spam, subject **[TV2 TU TEST] Thu moi phong van va Google Meet**, và link trên hồ sơ; máy chủ SMTP chấp nhận chưa tự chứng minh Inbox.

Tại thời điểm bàn giao form: **APPLIED,0 interview,0 dispatch**; chưa tạo Calendar hoặc gửi thư trong lượt này. Chưa coi lượt tự test đã PASS. Browser login và preflight CORS5175 đã đạt; harness cho phép truyền origins riêng, mặc định5173 giữ nguyên. Các bài LIVE E017–E019 bên dưới là bằng chứng lịch sử.

Nếu có lỗi/timeout, kiểm execution và trạng thái hồ sơ trước khi gửi lại; không tạo vòng2 để lặp lượt chưa biết kết quả. Workflow này chỉ nhận vòng1 để giới hạn bài thử. Đừng dùng các ứng viên synthetic của demo5173 vì chúng không có Gmail thật và vẫn dùng dispatcher stub.

Trang Assistant hỏi API key Anthropic là chức năng trợ lý của n8n. Đóng hộp thoại, chọn Overview để làm việc với workflow; bài test dưới đây không cần API key đó.

## Chạy lại bài test cục bộ đã đạt

1. Mở http://localhost:5678/workflow/hrTv2LocalTest01 — `TV2 - LOCAL TEST - Interview (no external delivery)`.
2. Bấm **Execute workflow**. Chờ dòng **Waiting for you to call the Test URL**.
3. Mở PowerShell tại thư mục repository HumanResources rồi chạy:

   ```powershell
   .\scripts\test-n8n-local.ps1
   ```

4. PowerShell phải trả `success: true`, `mode: LOCAL_TEST`, `delivery: NOT_SENT`.
5. n8n phải hiện **Workflow executed successfully** và các node có dấu tích xanh. Hai node cuối trả `result: PASS`, `delivery: NOT_SENT`; có nội dung thư mời và Telegram mẫu.

Mỗi lần test phải bấm Execute workflow lại trước khi gửi. HTTP200 chỉ xác nhận webhook tiếp nhận; kiểm tra toàn bộ execution mới biết các bước tiếp theo hoàn tất.

Đã kiểm thực tế: webhook nhận dữ liệu và Code xử lý thành công trong n8n2.42.3. Google Meet là link mẫu `https://example.invalid/meet/local-test`; email/Telegram không gửi ra ngoài. Bài cục bộ này không chứng minh provider LIVE; bằng chứng Calendar/Meet/SMTP/website thật nằm ở E017–E019 bên dưới. Gemini vận hành và Telegram còn mở.

## Chạy workflow thật sau khi có cấu hình

- Theo yêu cầu mới, chỉ test phần TV2: workflow riêng `HR Pro: Automated Interview Scheduling & Google Meet` với webhook `interview-schedule`. Master đã được nhập nhưng để inactive; không chạy hai nhánh employee-hired/burnout-alert.
- Trong workflow phỏng vấn, gắn Google Calendar OAuth vào node tạo lịch, SMTP vào node Email mời ứng viên, Telegram Bot vào node thông báo lịch; kiểm tra calendar, địa chỉ người nhận và chatId.
- Activate/Publish workflow phỏng vấn khi đã có cấu hình và quyền gửi thử; giữ master inactive để tránh trùng webhook và mở luồng ngoài TV2.
- Backend cần `N8N_WEBHOOK_URL=http://localhost:5678/webhook` trong `.env`, rồi khởi động lại backend.
- Sau khi có người nhận và quyền gửi thử, xếp lịch từ website. Kiểm event/link Meet thật, thư đến đúng người nhận và execution của từng node; không lấy HTTP200 làm bằng chứng giao thư.
- AI JD/chấm CV/câu hỏi cần Gemini key/model riêng ở backend. API key của n8n Assistant không thay thế cấu hình Gemini.

Code đã công bố theo yêu cầu người dùng E024. Không báo nghiệm thu LIVE toàn bộ cho đến khi các gate còn mở trong [LIVE-ACCEPTANCE.md](LIVE-ACCEPTANCE.md) đạt.

## Tài khoản test người dùng đã chọn: Gmail cá nhân

Người dùng chọn dùng Gmail của mình để test phỏng vấn TV2. Ngày07/10/2026, OAuth Calendar báo **Account connected / Saved**, SMTP **Connection tested successfully**. E017/E018 kiểm provider/website; E019 đã ghi Meet và trạng thái SMTP ngược về ATS, website tự cập nhật/reload đúng, thư test vào Gmail. Telegram không chạy. Hướng dẫn mới: [INTERVIEW-READBACK.md](INTERVIEW-READBACK.md).

Đã kiểm GitHub lead sau fetch: main và các nhánh remote hiện có không có OAuth Client ID/Secret Google hoặc credential references trong workflow. Hướng dẫn tạo từng bước: [GOOGLE-CALENDAR-SETUP.md](GOOGLE-CALENDAR-SETUP.md).

1. Trong node Google Calendar, bấm **Connect to Google Calendar**. Hộp thoại cần OAuth **Client ID** và **Client Secret**, khác với GEMINI_API_KEY.
2. Nếu chưa có OAuth client: vào Google Cloud Console, chọn/tạo project, bật Google Calendar API; cấu hình Google Auth Platform/OAuth consent cho ứng dụng thử nghiệm và thêm Gmail của người dùng vào Test users nếu Audience ở trạng thái Testing.
3. Tạo OAuth client loại **Web application**. Authorized redirect URI phải khớp chính xác `http://localhost:5678/rest/oauth2-credential/callback` (đã xác minh trên form n8n).
4. Người dùng nhập Client ID/Secret trực tiếp trong n8n, lưu và tự hoàn thành đăng nhập/cấp quyền Google Calendar. Chỉ coi kết nối xong khi credential báo connected/test thành công.
5. Sau Calendar, cấu hình SMTP gửi thư: Host `smtp.gmail.com`, Port `465`, **SSL/TLS bật**, User là Gmail và Password là **Google App Password**. Người dùng đã tự nhập/lưu; kết nối SMTP thành công. Cấu hình thay thế hợp lệ là Port587 với STARTTLS và SSL/TLS trực tiếp tắt. App Password có thể cần bật xác minh2 bước và phụ thuộc chính sách tài khoản.
6. Xác định email người nhận thử và quyền gửi trước khi kích hoạt/gọi webhook thật. Ưu tiên dữ liệu ứng viên giả, gửi về tài khoản thử đã xác nhận. Không chạy script chung của lead chứa người nhận hard-code.

Chưa có Telegram bot thì ghi rõ phần thông báo Telegram chưa nghiệm thu; không thay kết quả preview thành gửi thật. Các nhánh onboarding/burnout không thuộc bài test này.

## Bài test Calendar/Meet/Gmail thật đã đạt ngày07/10/2026

- Workflow riêng: `hrTv2LiveSelf01` — **TV2 - LIVE TEST - Calendar and Gmail self-only**, chưa publish; không có node Telegram hoặc dữ liệu ghim. Workflow gốc và master tiếp tục inactive.
- Payload dùng ứng viên giả, sender/recipient/interviewer cùng Gmail SMTP của người dùng; guard từ chối địa chỉ khác và reference khác. Thời gian10:00–10:45 ngày08/10/2026, timezone Asia/Ho_Chi_Minh. Calendar event không có attendees, không gửi thư mời Calendar tự động.
- Chuỗi thực: webhook → kiểm payload → tạo Calendar/Meet → GET đọc lại event → kiểm id/time/title/Meet thật → tạo thư → kiểm người nhận/link → SMTP → kiểm một recipient accepted, không rejected → trả kết quả cuối.
- Kết quả `TV2-LIVE-20261007-muxgxcun`: Calendar readback **VERIFIED**, conference status **success**, SMTP **ACCEPTED**. Mở thư trong Gmail, nhãn **Hộp thư đến** hiện trên đúng subject, nội dung thời gian và href của nút tham gia khớp Meet được Google tạo: **Inbox VERIFIED**.
- JSON kết quả, bằng chứng Inbox và ảnh lưu local trong `.temp/n8n-import/tv2-live-self-test-*`, `tv2-live-inbox.jpg`, `tv2-live-calendar-mail.jpg`; thư mục này được Git ignore. Không ghi Gmail, Client Secret, App Password hoặc link Meet thật vào tài liệu công bố.
- Helper `scripts/prepare-tv2-live-test.cjs` tạo bản test từ export cấu hình local, chỉ sao chép credential references. `scripts/test-tv2-live-self.ps1` gửi đúng payload đã chuẩn bị tới Test URL. Không chạy lại cùng payload đã thành công; eventId xác định theo reference để chặn tạo trùng. Lần test mới cần reference mới và thời gian tương lai, xem execution trước khi quyết định gửi lại sau lỗi/timeout.
- Phát hiện title/description trong template Calendar nằm ngoài additionalFields và bị n8n bỏ qua. Đã sửa `workflows/interview-schedule.json` và cấu hình local của workflow gốc vào đúng additionalFields, giữ credential references. Bài test thật đã xác minh Google nhận title trong additionalFields; chưa chạy lại luồng website/API gốc.

## Bài test từ website đã đạt — E018

Chuỗi đã kiểm: **website → API/Auth thật → MySQL riêng → N8nService của lead → n8n → Google Calendar/Meet → Gmail Inbox**. Không dùng provider stub trong bài này.

- Website: http://localhost:5173/admin/recruitment. Tài khoản test: `hr@example.test` / `Test-only-password-2026`, chỉ dùng trong DB fixture local.
- Backend test3011, MySQL9.6 test13316, control3012; tất cả bind localhost. Chỉ tải module tuyển dụng; không dùng DB nhóm. `scripts/start-tv2-web-test.ps1` khởi động runtime và tái sử dụng nếu đã sẵn sàng; cần backend đã build, dependencies và private self-test config được chuẩn bị trước.
- Job **TV2 WEB TEST - Backend Engineer**, ứng viên **TV2 WEB TEST - Ung vien gia**, Manager **TV2 WEB TEST - Manager**. HR chọn Manager cùng phòng và lưu11:00 ngày08/10/2026, timezone Asia/Saigon. Event kéo dài45 phút.
- `scripts/prepare-tv2-live-test.cjs --web` tạo bản import riêng từ configured export local và config fixture; workflow **hrTv2WebLive01 — TV2 - WEB TEST - Recruitment Calendar and Gmail**. Test webhook `hr-tv2-web-test/interview-schedule` khớp URL của backend test. Workflow inactive, không ghim dữ liệu, không Telegram. Guard chỉ nhận đúng hồ sơ/round/time và Gmail đã xác định.
- Trước khi lưu form đã bấm **Execute workflow** và xác minh **Waiting for you to call the Test URL**. Website gửi đúng một request thành công: application/interview ID1, Manager ID2, round1, INTERVIEWING; DB lưu04:00Z tương ứng11:00 Việt Nam. Đã reload website/mở lại ứng viên để kiểm dữ liệu vẫn tồn tại.
- Workflow hoàn tất với Calendar GET readback đúng id/title/time/conference success, SMTP accepted đúng một Gmail và không rejected. Kết quả trả IDs khớp API/DB. Đã mở thư có subject **[TV2 WEB TEST] TV2-WEB-20261007-b901aab615**; nhãn **Hộp thư đến**, thời gian11:00 và CTA href khớp Meet thật.
- Replay cùng request qua API trả201/NOT_RETRIED, vẫn1 Interview/1 dispatch; Manager khác phòng403. Chưa kiểm retry sau lỗi/timeout hoặc callback lặp có xác thực.
- JSON result/DB/replay/Inbox và ảnh `tv2-web-*` lưu trong `.temp/n8n-import`, được Git ignore; private config/credential export không đưa lên Git.

E018 là evidence lịch sử11:00. Runtime hiện giữ lượt E01912:00 để xem, form là **Xếp lịch vòng2** trong khi guard test chỉ nhận vòng1 đã chuẩn bị. Lượt mới cần runtime fixture/reference/thời gian mới, import lại và bật lắng nghe trước. Script khởi động mặc định ngày mai12:00 theo timezone máy, có tham số `-ScheduledAt` ISO chứa timezone; tái sử dụng runtime đang chạy không tự tạo fixture mới.

Tại E018, ATS meetingLink=null do chưa có callback. E019 dưới đây đã sửa phần persist/readback này và code đã công bố E024. Q23 vẫn còn recovery/đối soát và review vận hành. Q24 Hire/User/5task đã tích hợp E023 và công bố E024, còn welcome-mail LIVE/recovery/TV3; Gemini vận hành chưa kiểm lại trong E024.

## Bài test readback đã đạt — E019

- Workflow **hrTv2Readback01 — TV2 - WEB TEST - Meet and email saved to ATS**, unpublished, Test URL riêng `hr-tv2-readback-test/interview-schedule`. Helper `node scripts/prepare-tv2-live-test.cjs --web --readback` tạo import private từ config fixture/export credentials local; không đưa output vào Git.
- Runtime `scripts/start-tv2-web-test.ps1 -ScheduledAt '2026-10-08T12:00:00+07:00'` dùng API3011/MySQL13316 riêng, callback base127.0.0.1:3011/api và Gmail sender process-only. Môi trường cũ đã dừng đúng process và dọn DB/CV fixture trước khi tạo mới; n8n profile/evidence giữ nguyên.
- HR lưu một lịch12:00–12:45. Claim thật nhận snapshot đã lưu; Calendar tạo/Get/verify, callback Save Meet, SMTP accepted, callback Save email hoàn tất. API/DB automation=COMPLETED/CONFIRMED/SMTP_ACCEPTED, meetingLink có giá trị; website tự hiện link/trạng thái, reload vẫn đúng.
- Gmail subject **[TV2 READBACK TEST] TV2-WEB-20261007-0e587ea839** có nhãn Hộp thư đến,12:00 ngày08/10 và href khớp link trong ATS. Không gửi Telegram hoặc người khác.
- **73/73** regression HTTP/MySQL thật đạt ở E019; provider lỗi được kiểm bằng contract fixture. Config/auth/schema/claim/callback/replay/expiry/UNKNOWN/partial email và rollback đạt. Tại E019 code còn local; E024 đã công bố67624af và chạy lại99/99 regression tích hợp. Hướng dẫn/schema/contract/các giới hạn Q23: [INTERVIEW-READBACK.md](INTERVIEW-READBACK.md).
