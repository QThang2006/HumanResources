# TV4 — Chọn ngày kiểm tra và chạy lại thủ công

Áp dụng cho WF-02 nhắc đào tạo và WF-03 nhắc KPI. Cần cập nhật backend cùng hai workflow, giữ nguyên cấu hình kết nối và credential của instance. Đây là thay đổi source; Git không tự cập nhật n8n đang chạy trên local hoặc host.

Trong **Load Workflow Configuration**, đặt **manualRunDate** theo `YYYY-MM-DD`, ví dụ `2026-11-07`, rồi chọn **Execute workflow**. Mốc kiểm tra là 08:00 theo Việt Nam của ngày đã chọn. Để trống dùng thời điểm hiện tại. Ngày sai bị từ chối trước bước gửi.

- Chạy thủ công: bỏ qua khoảng 20 giờ chống nhắc lại đào tạo và bản ghi SENT chống nhắc lại KPI. Có thể Execute nhiều lần ở cùng mốc ngày.
- Chạy tự động: bỏ qua manualRunDate, dùng ngày thật và tiếp tục chống trùng. Không cần xóa giá trị ngày thủ công sau khi thử để lịch tự động hoạt động đúng.
- Đào tạo vẫn phải là khóa bắt buộc, nhân viên hoạt động, chưa hoàn thành, tiến độ dưới 50%, hạn quá hạn hoặc trong ba ngày tính từ mốc kiểm tra.
- KPI dùng tháng của ngày đã chọn, phải trùng ngày mở kỳ hoặc ngày nhắc lần hai của lịch tháng đó. Tháng chưa cấu hình dùng 25/28. Nhân viên đã có đánh giá không được đưa vào danh sách. Chọn ngày bất kỳ ngoài lịch không làm phát sinh gửi.
- Mỗi execution mới có runId riêng. Callback trùng runId vẫn được chống ghi hai lần. Không xóa dữ liệu cũ để mở khóa gửi lại; callback tiếp tục cập nhật bộ đếm hoặc kết quả kỳ theo cơ chế hiện tại. Thời điểm ghi nhận gửi là thời điểm thực hiện thật, không giả thành thời gian trong quá khứ.
- Nếu chạy lại execution lỗi bằng chức năng Retry của n8n, đây không phải Execute thủ công theo điều kiện `$execution.mode === 'test'`; cơ chế lặp trong tài liệu này chỉ áp dụng khi khởi chạy Execute mới.
- Execute có thể gửi email/Telegram thật theo cấu hình nhận hiện có; không dùng pinned data để chứng minh dữ liệu backend đã thay đổi.

Automation API thêm query `repeat=true|false`, được bảo vệ bằng AutomationSecretGuard hiện có; giá trị khác boolean bị từ chối. Không đưa khóa tự động hóa ra frontend. Workflow tự đặt repeat=true chỉ ở chế độ manual; không cần người dùng sửa query.

WF-01 Kho tri thức và WF-04 thôi việc không thay đổi trong đợt này. Thôi việc được kích hoạt theo hồ sơ đã duyệt, không theo ngày kiểm tra của hai luồng trên.

Chế độ expression được đối chiếu theo [tài liệu chính thức n8n](https://github.com/n8n-io/n8n-docs/blob/main/docs/build/code-in-n8n/use-built-in-shortcuts/n8n-metadata.md): Execute thủ công dùng test, chạy tự động dùng production. Không nhầm với tên mode nội bộ manual của API/CLI.
