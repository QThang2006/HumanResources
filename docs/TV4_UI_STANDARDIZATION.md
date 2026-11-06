# TV4 — Chuẩn hóa giao diện theo báo cáo TV1–TV4

Ghi chú phạm vi: báo cáo này mô tả riêng đợt chuẩn hóa UI. Sau đó người dùng đã yêu cầu bổ sung tính năng chỉnh sửa khóa học; phần frontend/API/backend và kiểm thử tương ứng được mô tả trong `TV4_TRAINING_CATALOG.md`, không thuộc tuyên bố UI-only dưới đây. Working tree hiện chứa cả hai phần, cần phân biệt khi review/commit.

Ngày thực hiện: 06/11/2026. Nhánh làm việc: `feature/admin-system-settings`.

Nền đối chiếu: commit `6056250`, đã tích hợp `main` ở `47bfe12`.

## Phân tích yêu cầu

Tài liệu `BAO_CAO_CHUAN_HOA_UI_TOAN_HE_THONG_TV1_TV4.md` yêu cầu đồng nhất phần trình bày, không xây lại luồng thao tác. Code trên nhánh hiện tại là căn cứ về tính năng. Các nội dung mô tả cũ khác code không được dùng để thêm chức năng.

Phạm vi TV4 gồm quản trị tài khoản/phòng ban, tích hợp, Kho tri thức, đào tạo, danh sách người học, các hộp xác nhận và CSS riêng. `TrainingCourseCatalog.tsx` cùng CSS danh mục là component con hiện tại của `TrainingPanel`; đợt này chỉ cần sửa CSS của component này.

Các điểm lệch chính trước sửa:

- `tv4-ui.css` đã Blue nhưng `tv4-workspace.css` vẫn định nghĩa accent đỏ rượu trên cùng phần tử và ghi đè token chung.
- TSX vẫn dùng nhiều màu hex riêng cho nút, input, tiêu đề, thông báo và trạng thái. Chỉ đổi token gốc không đủ đồng nhất màu hiển thị.
- Màu và kiểu nhãn khóa học khác nhau giữa danh mục, bảng tiến độ và widget nhân viên.
- Card/modal/nút có nhiều mức bo góc; widget còn gradient Indigo và nền kính.
- Nhãn thống kê widget bị rút gọn ở màn hẹp, khó đọc hết thông tin.

Nút mô phỏng sự cố 500 đã được người dùng yêu cầu xóa trước đợt này. Giữ nguyên trạng thái hiện tại, không thêm lại theo mô tả trong báo cáo.

## Những gì đã thay đổi

| Vùng | Hiệu chỉnh hình thức |
|---|---|
| Quản trị và cấu hình | Blue cho hành động chính/focus; Slate cho chữ, viền và nền; Rose cho lỗi/xóa; Emerald cho thành công; giữ nguyên bảng và toàn bộ cột |
| Kho tri thức | Chuẩn hóa upload, danh sách, câu trả lời, evidence, thông báo và hộp xác nhận; giữ nguyên nội dung và câu giới thiệu đã được chốt |
| Đào tạo | Đồng nhất form, nút AI, tiến độ, tab hiện có, cảnh báo và nhãn; không sửa cách tính hoặc ngưỡng |
| Danh mục và người học | Dùng token TV4; giữ bảng desktop, cách xếp ở mobile, hộp chi tiết hiện tại và danh sách người học |
| Gỡ/xóa vĩnh viễn | Rose cho hành động nguy hiểm; giữ riêng hai hộp xác nhận và nội dung bảo toàn lịch sử |
| Widget nhân viên | Bỏ gradient/nền kính; Blue/Slate thống nhất; nhãn thống kê xuống dòng rõ ở mobile; giữ bộ lọc và cập nhật tiến độ |
| CSS scoped | Bỏ accent đỏ rượu ghi đè; đồng nhất token, góc 8px cho control và 12px cho card; input mobile dễ đọc; giữ vùng cuộn bảng |

Nhãn loại khóa học: bắt buộc dùng Amber, AI đề xuất dùng Blue, kỹ năng mềm dùng Slate. Trạng thái hoàn thành dùng Emerald, đang học dùng Amber, chưa bắt đầu dùng Slate. Không thêm rule hoặc ngưỡng mới để chọn trạng thái.

## Giới hạn file và hành vi

Đợt chuẩn hóa và hiệu chỉnh màn tiến độ sửa 7 file TSX của TV4 và 4 file CSS riêng:

- `frontend/src/pages/AdminSettingsPage.tsx`
- `frontend/src/components/KnowledgeBasePanel.tsx`
- `frontend/src/components/TrainingPanel.tsx`
- `frontend/src/components/CourseLearnersPanel.tsx`
- `frontend/src/components/CourseRemoveDialog.tsx`
- `frontend/src/components/CoursePermanentDeleteDialog.tsx`
- `frontend/src/components/EmployeeTrainingsWidget.tsx`
- `frontend/src/styles/tv4-ui.css`
- `frontend/src/pages/tv4-workspace.css`
- `frontend/src/components/training-course-catalog.css`
- `frontend/src/components/training-progress.css`

Widget chỉ sửa bên trong file đào tạo; không sửa layout Workspace của TV3. Phần phân công giao nhau này cần được lead đối chiếu khi review PR.

Không đổi JSX structure, handlers, effects, timers, điều kiện hiển thị, quyền, giá trị nhập, disabled, refs, validation, API, dữ liệu mặc định hoặc helpers nghiệp vụ. Backend, workflow, auth/router, common components, Navbar, Tailwind, dependencies và môi trường không được sửa trong đợt này. Chưa stage/commit/push/deploy.

## Bằng chứng kiểm tra

- Build frontend production: đạt; Vite vẫn cảnh báo bundle lớn hơn 500 kB như trước.
- Các test hiện hữu `training-catalog`, `training-ai`, `training-date`, `calendar-date`: đạt.
- Đối chiếu AST trước/sau của 7 file TSX sau khi bỏ phần className và literal chứa utility CSS: khớp. Đây là kiểm tra giữ nguyên cấu trúc và mã xử lý, không thay thế kiểm thử runtime đầy đủ.
- Bộ kiểm tra Impeccable trên 10 file: không báo phát hiện.
- `git diff --check`: đạt.
- Bản xem trước dùng component thật, dữ liệu giả và API client giả, tách khỏi ứng dụng thật. Không đăng nhập, không gọi API/email/Telegram/AI thật.
- Đã xem quản trị và cấu hình desktop 1440px; danh mục desktop/mobile; hộp người học mobile; Kho tri thức và câu trả lời mobile; góc nhìn HR 768px; widget nhân viên 375px; trạng thái lỗi/rỗng của bảng quản trị.
- Màn 375px danh mục/widget và màn 768px HR không làm document tràn ngang; bảng tiến độ giữ vùng cuộn riêng.
- Hộp chi tiết người học đóng bằng Escape và trả focus về nút mở.

Ảnh trước/sau được lưu trong thư mục bằng chứng local `tv4-ui-review` ở khu vực artifacts của phiên làm việc, không đưa dữ liệu thật vào ảnh.

## Chưa nghiệm thu / vấn đề ngoài phạm vi

- Chưa chạy lại tất cả CRUD, upload/xóa PDF, AI thật hoặc gửi thông báo trên backend/host. Build và preview giả không chứng minh các tích hợp trên host thành công.
- Chưa nghiệm thu toàn bộ loading/busy trên mọi màn bằng trình duyệt, screen reader hoặc thiết bị mobile vật lý.
- Bộ đếm “Cần chú ý” hiện lọc theo hạn/tiến độ trong frontend, trong khi nhãn nói “Khóa bắt buộc”; cần review nghiệp vụ riêng nếu danh sách có khóa không bắt buộc. Giữ nguyên điều kiện trong PR UI.
- Vấn đề secret cố định của workflow backup TV1 đã ghi nhận từ đợt tích hợp main trước; không sửa trong đợt UI TV4.
- Lead cần xác nhận đồng bộ với các module khác và phân công widget trước khi merge/deploy. Không xem tài liệu này là xác nhận nghiệm thu của lead.

## Hiệu chỉnh bổ sung: Theo dõi tiến độ cùng phong cách danh mục

Theo yêu cầu tiếp theo của người dùng, tách tiêu đề và toolbar tiến độ theo bố cục danh mục; đồng nhất tìm kiếm, bộ lọc, icon khóa/người học, nhãn trạng thái, ô hạn và thanh tiến độ. Desktop giữ bảng 6 cột, cuộn riêng nếu cần; ở màn hẹp các ô xếp thành khối theo lượt học, giữ đủ thông tin và thao tác.

Phạm vi lần hiệu chỉnh này là JSX trình bày trong `TrainingPanel.tsx` và CSS scoped mới `training-progress.css`. Đối chiếu với bản ngay trước lần sửa: 14 khai báo xử lý/lọc, 94 binding JSX quan trọng và 54 lời gọi hook giữ nguyên. Không đổi ngưỡng, dữ liệu, API hoặc backend.

Build frontend và ba bộ kiểm thử `training-catalog`, `training-ai`, `training-date` đạt. Preview với dữ liệu giả đã kiểm tra desktop 1440px và mobile 375px, không tràn document; kiểm tra bàn phím đổi hạn hiện Lưu/Hủy, Hủy trả về ngày cũ; tìm không khớp hiện trạng thái rỗng và Xóa bộ lọc phục hồi danh sách. Không gọi API thật hoặc thay dữ liệu nghiệp vụ.

## Hiệu chỉnh bổ sung: Thông báo cập nhật đào tạo

Bỏ nhãn “Trạng thái” phía trên bộ lọc, giữ tên truy cập cho trình đọc màn hình và thu gọn khoảng cách từ tiêu đề đến toolbar. Các thông báo chung của `TrainingPanel` chuyển sang thông báo nổi cố định ở giữa phía trên màn hình, có nút đóng; thông báo thành công tự ẩn sau 5 giây, thông báo khác sau 8 giây. Rê chuột hoặc đặt focus vào thông báo sẽ tạm dừng tự ẩn. Lỗi theo từng ô và lỗi biểu mẫu vẫn hiển thị tại chỗ.

Lần bổ sung này có thay đổi state và timer cho thông báo, đồng thời thêm thông báo thành công sau khi cập nhật tiến độ; không thuộc kiểm tra giữ nguyên hook của các đợt UI trước. Không đổi API hoặc backend. Preview dữ liệu giả đã xác nhận cập nhật tiến độ hiển thị thông báo và thông báo tự biến mất; build frontend và ba bộ kiểm thử đào tạo đạt. Chưa kiểm tra thông báo với API host thật.
