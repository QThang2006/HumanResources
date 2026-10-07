# Kết nối Google Calendar cho bài test phỏng vấn TV2

Cập nhật07/10/2026, E024. Hướng dẫn cấu hình Calendar/SMTP cho phần phỏng vấn TV2; người dùng chọn Gmail cá nhân. **OAuth/SMTP và Calendar/Meet/Gmail LIVE đã được kiểm E017–E019**, gồm readback về ATS. Template/helper đã push trong code `67624af` lên `feature/recruitment-ats`; credentials và dữ liệu cá nhân giữ local. Lượt người dùng tự bấm gửi trên5175 đang được chuẩn bị riêng, xem [TEST-N8N.md](TEST-N8N.md).

## 1. Kết quả kiểm tra GitHub của lead

Đã fetch origin và kiểm code trên main9733233, core-ai-automation1f4d5d5 cùng các nhánh remote hiện có. Không tìm thấy cấu hình OAuth Client ID/Client Secret Google; các workflow JSON không có credential references. File backend/.env.example chỉ chứa mẫu cấu hình Gemini, webhook và SMTP. Thông tin OAuth Calendar cần tạo riêng trong Google Cloud và nhập vào credential n8n.

Nguồn hướng dẫn: https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/ . n8n Cloud hỗ trợ Managed OAuth; bản chạy localhost hiện tại dùng Custom OAuth, cần Client ID/Secret.

## 2. Chọn hoặc tạo project Google Cloud

1. Mở https://console.cloud.google.com/ và đăng nhập bằng Gmail sẽ dùng tạo lịch.
2. Chọn project ở thanh trên cùng. Ưu tiên dùng project Google Cloud đã có mà Gmail của bạn có quyền cấu hình, ví dụ project chứa API key Gemini. Một project có thể dùng nhiều API; OAuth Calendar là credential riêng với key Gemini.
3. Nếu tạo mới, chọn **New project**, nhập tên và bấm **Create**. Sau đó chọn project này ở thanh trên cùng.

Các bước đăng nhập, chấp nhận điều khoản và tạo thông tin xác thực do người dùng thực hiện trong Google.

### Khi gặp You have reached the project limit

Thông báo giới hạn việc tạo project mới. Tiếp tục bằng project có sẵn:

1. Bấm ô chọn project ở thanh trên cùng Google Cloud Console; mở tab **All** nếu danh sách Recent chưa có project phù hợp.
2. Chọn project đang hoạt động mà Gmail của bạn có quyền bật API/tạo OAuth client. Có thể kiểm tên project của key Gemini tại Google AI Studio nếu chưa biết project nào.
3. Giữ project đó được chọn, rồi tiếp tục bước3 bên dưới: bật Google Calendar API, cấu hình Google Auth Platform và tạo OAuth client **trong project này**.
4. Nếu thiếu quyền với project nhóm, dùng project cá nhân có quyền hoặc nhờ chủ project cấp quyền phù hợp. Nếu thực sự không có project dùng được, cần chủ tài khoản yêu cầu tăng hạn mức; không tự xóa project để giải quyết bài test.

Lượt xử lý lỗi quota này chỉ bổ sung hướng dẫn; chưa chọn/sửa/xóa project Google Cloud hoặc tạo credential.

## 3. Bật Google Calendar API

1. Trong project đúng, mở **APIs & Services → Library**.
2. Tìm **Google Calendar API**, mở kết quả này rồi bấm **Enable**.
3. Nếu trang đã có **Manage** thay cho Enable, API đã được bật.

## 4. Cấu hình màn hình OAuth

1. Mở **APIs & Services → OAuth consent screen**. Giao diện mới có thể chuyển sang **Google Auth Platform**.
2. Nếu chưa thiết lập, tại **Overview** chọn **Get started**.
3. **App name**: ví dụ `HR TV2 n8n`; **User support email**: Gmail đang dùng.
4. **Audience**: chọn **External** cho Gmail cá nhân.
5. **Contact information/Email addresses**: Gmail của bạn. Tự đọc và hoàn tất các yêu cầu chính sách/điều khoản của Google.
6. Mở **Audience → Test users → Add users**, thêm đúng Gmail sẽ đăng nhập từ n8n, rồi lưu.
7. Để ứng dụng ở trạng thái **Testing** cho bài thử hiện tại.

## 5. Tạo OAuth client

1. Mở **Google Auth Platform → Clients → Create client**, hoặc **APIs & Services → Credentials → Create credentials → OAuth client ID** tùy giao diện.
2. **Application type**: chọn **Web application**.
3. **Name**: ví dụ `n8n TV2 localhost`.
4. Trong **Authorized redirect URIs**, bấm **Add URI** và điền chính xác:

   ```text
   http://localhost:5678/rest/oauth2-credential/callback
   ```

5. Bấm **Create**. Google hiển thị Client ID và Client Secret; giữ hai giá trị để nhập vào n8n. Chỉ cần redirect localhost cho môi trường phát triển này.

## 6. Hoàn thành credential trong n8n

**Lưu ý khi bấm trực tiếp link callback:** `http://localhost:5678/rest/oauth2-credential/callback` là địa chỉ Google redirect về, không phải trang để bắt đầu đăng nhập. Mở tay sẽ báo `Insufficient parameters for OAuth2 callback` vì thiếu code/state. Bước5.4 là dán URL này vào **Authorized redirect URIs** trên Google Cloud rồi lưu; sau đó làm các bước n8n dưới đây để Google tạo callback hợp lệ.

1. Quay lại http://localhost:5678/workflow/hrTv2Interview01.
2. Mở node **Tự Động Tạo Lịch & Sinh Google Meet**, chọn **Connect to Google Calendar**.
3. Nhập **Client ID** và **Client Secret** từ bước5 trực tiếp vào hai ô cùng tên. Đây không phải GEMINI_API_KEY.
4. Chọn **Sign in with Google**, hoặc lưu trước nếu phiên bản giao diện yêu cầu. Người dùng tự đăng nhập đúng Gmail ở Test users và xem/cấp quyền Calendar.
5. Lưu credential sau khi kết nối thành công. Chọn credential này trong node Calendar.
6. Chọn Calendar phù hợp, thường là **primary** của Gmail đã kết nối. Kiểm lựa chọn Conference Data là Google Meet trước khi test.

Chỉ thông báo hoàn tất OAuth sau khi credential báo đã kết nối. Client Secret lưu trong credential n8n; không đưa vào workflow JSON hoặc commit Git.

### Lệnh chạy lại runtime n8n hiện tại

Tại PowerShell trong root repository:

```powershell
.\scripts\start-n8n-local.ps1
```

Script tái sử dụng runtime/profile đã cài trong Temp, kiểm readiness và chỉ khởi động khi chưa sẵn sàng; in link workflow TV2. Có tùy chọn `-CheckOnly` để chỉ kiểm. Việc đăng nhập Google vẫn bắt đầu bằng Sign in with Google trên form n8n.

Repo đã có service n8n trong docker-compose.yml, map5678 và volume n8n_data. Ngày07/10 Docker Engine chưa chạy; runtime hiện tại chạy bằng Node, dữ liệu ở profile Temp riêng. Bài xử lý callback này không khởi động thêm Docker, không chuyển/xóa dữ liệu và không thay runtime giữa lúc cấu hình OAuth.

## 7. Sau Calendar: SMTP cho thư mời TV2

Trong node **Gửi Email Mời Ứng Viên**, bấm **Connect to SMTP**. Cấu hình hiện tại được chuẩn bị với Host `smtp.gmail.com`, Port `465`, **SSL/TLS bật**; User là Gmail, Password là Google App Password. Người dùng tự nhập User/Password và bấm Save. Có thể dùng cấu hình thay thế Port587/STARTTLS với SSL/TLS trực tiếp tắt. Google App Password thường yêu cầu xác minh2 bước và có thể bị giới hạn bởi chính sách tài khoản. Mở https://myaccount.google.com/apppasswords để tạo; đặt tên ứng dụng dễ nhận biết như `HR TV2 n8n` và nhập mật khẩu được tạo trực tiếp trong n8n.

Trạng thái07/10/2026: OAuth Calendar Connected/Saved, SMTP Connection tested successfully. E017 tạo event/Meet thật, GET đọc lại đúng id/time/title/link và xác minh thư trong Inbox. E018 kiểm luồng website/API; E019 kiểm callback lưu link/trạng thái vào ATS và reload. Xem [TEST-N8N.md](TEST-N8N.md) và [INTERVIEW-READBACK.md](INTERVIEW-READBACK.md). Telegram, recovery sau crash/mất callback và nghiệm thu vận hành toàn bộ còn mở.

Xác định sender/recipient thử và quyền gửi trước khi gọi webhook thật. Dùng dữ liệu ứng viên giả. Chưa cấu hình Telegram thì ghi rõ nhánh Telegram chưa nghiệm thu; chỉ thử phần đã chuẩn bị, không báo toàn bộ workflow gửi thành công.

## 8. Lỗi thường gặp

- `redirect_uri_mismatch`: URI trên Google phải khớp chính xác URI trên form n8n, gồm http, localhost, port5678 và đường dẫn callback; không thêm dấu / cuối.
- `access_denied`/app chưa xác minh: kiểm tra app ở Testing và Gmail đăng nhập đã nằm trong Test users. Nếu Google hiện cảnh báo xác minh, người dùng tự xem và quyết định; không tự động vượt cảnh báo.
- `invalid_client`: nhập lại đúng Client ID/Secret của OAuth client Web application trong project đã bật Calendar API.
- Kết nối hết hạn sau vài ngày: ứng dụng External/Testing có thể cần kết nối lại sau7 ngày theo hướng dẫn n8n.
- Key Gemini chạy được nhưng Calendar chưa kết nối: đây là hai cơ chế xác thực riêng.

Sau khi cấu hình Calendar/SMTP, bài test mới cần người nhận đã được phép gửi và thời gian tương lai; kiểm event/link Meet thật, email đến người nhận và readback hồ sơ. HTTP200 tiếp nhận webhook không chứng minh các bước gửi đã hoàn tất. Master/onboarding/burnout vẫn ngoài phạm vi bài test.
