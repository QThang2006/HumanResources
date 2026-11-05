# BÁO CÁO HIỆU CHỈNH CHUẨN HÓA UI TOÀN HỆ THỐNG TALENTHUNT ATS

**Đối tượng:** Trưởng nhóm và toàn bộ TV1, TV2, TV3, TV4.

**Phạm vi thống nhất:** Chỉ sửa giao diện. Không thay đổi chức năng, backend, n8n hoặc hợp đồng API.

**Mã nguồn đối chiếu:** `QThang2006/HumanResources`, nhánh `main`, commit `47bfe12` — “feat(ui): add common Input component and harmonize TV4 accent tokens with primary Blue”.

**Căn cứ hiệu chỉnh:** Yêu cầu lead được thành viên truyền đạt lại và báo cáo `BAO_CAO_CHUAN_HOA_GIAO_DIEN_TOAN_HE_THONG_ATS.md`. Bản này là đề xuất thay thế nội dung phạm vi/phân công UI trong tài liệu cũ, để lead rà soát và ban hành; không tự xác nhận đã được phê duyệt.

**Trạng thái:** Đã phân tích mã nguồn; chưa sửa mã ứng dụng, chưa nghiệm thu trên trình duyệt, chưa triển khai. Các nhận định về hành vi dưới đây dựa trên code, không phải cam kết tất cả chức năng đang chạy thành công trên VPS.

## 1. Mục tiêu và giới hạn chung

Mục tiêu là đồng nhất màu sắc, kiểu chữ, khoảng cách, viền, bo góc và phân cấp thông tin của những chức năng đang có. Mã nguồn hiện tại là căn cứ về hành vi; không dùng hình mẫu hoặc tài liệu cũ để phát sinh tính năng mới.

### 1.1. Được thay đổi

- Class CSS/Tailwind, màu, font size/weight, spacing, border, radius, shadow.
- Bố trí các nhãn, giá trị, icon và nội dung hiện hữu để dễ đọc hơn.
- Responsive bằng CSS, xuống dòng, độ rộng và vùng cuộn, miễn không mất trường hoặc hành động.
- Hình thức trạng thái loading, empty, error, busy, disabled, hover và focus đã có.
- Tái sử dụng component chung nếu giữ nguyên props, ref, handler, loại nút, id/label và hành vi.
- TV1 chuẩn hóa token và CSS toàn cục trong phạm vi trình bày; các thành viên khác dùng token đã thống nhất.

### 1.2. Không thay đổi

- Route, role/guard, quyền xem/sửa, điều kiện hiển thị và enabled/disabled.
- Handler nghiệp vụ, state nghiệp vụ, effect, timer/polling, debounce, validation, dữ liệu mặc định và bước xác nhận.
- Endpoint, HTTP method, payload, response, types/enums, cơ chế xác thực và lưu phiên.
- Backend, database, migration, worker/queue, AI model/prompt, n8n, email template, credentials và biến môi trường.
- Số cột/cách nhóm trạng thái Kanban, modal thành drawer, widget thành drawer hoặc thêm tab để thay đổi luồng sử dụng.
- Thêm nút, form, trường dữ liệu, số liệu mẫu, biểu đồ hoặc chức năng chưa có.
- Cài thư viện mới, nâng dependency hoặc đổi pipeline/deploy để phục vụ đợt sửa UI.

Lỗi chức năng phát hiện trong quá trình kiểm thử phải được lập danh sách riêng. Không sửa lẫn vào PR UI, không che lỗi bằng việc xóa thông báo.

## 2. Những điểm báo cáo cũ cần sửa

| Nội dung cũ | Hiệu chỉnh theo code và phạm vi |
|---|---|
| Role ADMIN và điều hướng khái quát theo mẫu | Giữ `SUPERADMIN`, `HR`, `MANAGER`, `EMPLOYEE` và route/guard hiện có |
| Nút tài khoản mẫu chỉ tự điền form | `LoginPage` hiện tự điền rồi gọi đăng nhập; giữ nguyên |
| Logo tự chuyển trang tùy role | Navbar hiện liên kết tới `/`; không đổi điều hướng |
| Workspace `/workspace` | Route đang là `/employee/workspace` |
| Job `/jobs/:id`, offer `/offer/:id` | Giữ `/careers/:id` và `/offers/:token` |
| Kanban 4 cột, có Screening | Code có 3 cột bình thường; giữ nguyên mapping |
| CandidateDetail dạng drawer | Hiện dùng Dialog; chỉ chỉnh hình thức modal |
| E-sign, ESOP, trọng số AI, tính Gross/Net | Không thuộc tính năng hiện có trong các form được đối chiếu; không bổ sung |
| Countdown 48 giờ | Giữ mốc hết hạn đang hiển thị; không thêm timer |
| Lịch chỉ có tuần | Giữ cả tuần/tháng và lịch/danh sách |
| Copilot là chat drawer | Hiện là `CopilotChatWidget` trong Workspace; giữ widget |
| Mood gửi `{rating, note}` | API hiện dùng `{mood, feedbackText}`; không sửa API theo tài liệu |
| “Hẹn 1-on-1” mặc định tạo sự kiện lịch | Luồng hiện gọi resolve burnout với ghi chú; không biến thành tích hợp Calendar mới |
| Training chỉ là lưới khóa học và xóa | Giữ cả tạo, gán, AI gợi ý, tiến độ, hạn, khôi phục và các dialog hiện có |
| Chỉ tìm/xóa class Indigo là đủ | TV3 có gradient tím; TV4 có màu hex riêng và CSS scoped; cần kiểm tra màu thực tế toàn bộ phạm vi |
| Lịch triển khai cố định trong tài liệu cũ | Lead chốt lịch mới sau khi kiểm tra phạm vi; không coi ngày cũ là cam kết |

## 3. Chuẩn hình thức dùng chung

| Thành phần | Chuẩn đề xuất |
|---|---|
| Nền trang / card | Slate-50 / White |
| Màu chính | `primary-600` hoặc Blue-600 theo component đang dùng; hover Blue-700 |
| Tiêu đề / nội dung / phụ đề | Slate-900 / Slate-700 / Slate-500 |
| Viền | Slate-200; input Slate-300 |
| Thành công, lương | Emerald |
| Chờ xử lý, hạn phản hồi | Amber |
| Lỗi nguy hiểm, từ chối, xóa | Rose |
| Card và modal | Hướng tới `rounded-xl`, border, shadow phù hợp |
| Button/input | `rounded-lg`, nút thông thường h-10; không áp h-10 cho textarea |
| Badge | `rounded-full`, text-xs, padding nhất quán |
| Spacing | Bội số 4px; ưu tiên gap-4/gap-6 và p-4/p-6 |

Dùng font stack hiện có, không thêm font dependency. Giữ focus rõ, tương phản đọc được và trạng thái disabled. Không gán ngưỡng AI mới hoặc đổi ngưỡng burnout/tiến độ để chọn màu. Với trạng thái có rule hiện hữu, giữ rule và chỉ thay màu tương ứng.

Token `primary` đã có dải Blue trong `tailwind.config.js`; `Input` chung đã có. Tuy nhiên `Modal` chung và `Dialog` tuyển dụng vẫn còn `rounded-2xl`: TV1 xử lý đồng nhất hình thức, giữ nguyên hành vi mở/đóng, Escape, backdrop, scroll và focus. Các component này không được thay thế qua lại chỉ vì cùng là hộp thoại.

## 4. Phân công và ranh giới sở hữu

Lead/TV1 chịu trách nhiệm duyệt cuối cho mọi phần. R là người sửa trực tiếp; C là người phối hợp; I là người nhận bàn giao kiểm thử.

| R | Phạm vi trực tiếp | C | I |
|---|---|---|---|
| TV1 | Token, common UI, Navbar, Login, CSS/layout chung | TV2–TV4 | Cả nhóm |
| TV2 | 8 màn/panel tuyển dụng ở mục 6 | TV1 | TV3, TV4 |
| TV3 | Workspace, onboarding, mood, Copilot và component con ở mục 7 | TV1, TV4 cho widget đào tạo nhúng | TV2, TV4 |
| TV4 | Quản trị, cấu hình, RAG, đào tạo và component con ở mục 8 | TV1, TV3 | TV2, TV3 |

**Điểm giao nhau cần chốt:** `EmployeeTrainingsWidget.tsx` nằm trong Workspace nhưng thuộc nghiệp vụ đào tạo. Đề xuất TV4 sửa hình thức bên trong widget; TV3 chỉ sửa bố trí bao ngoài và cùng kiểm thử. Đây là bổ sung phân công để lead chốt, không khẳng định tài liệu cũ đã giao file này cho TV4.

Nhánh TV2: `feature/recruitment-ats`. Tài liệu cũ ghi TV3 `feature/onboarding-copilot`, TV4 `feature/admin-system-settings`; xác minh nhánh làm việc thực tế trước khi sửa, không tự tạo nhánh khác. TV1 dùng nhánh lead đang quản lý.

## 5. TV1 — Nền tảng và giao diện dùng chung

### 5.1. Tokens, Common UI, layout và style chung

**File:** `frontend/tailwind.config.js`, `frontend/src/components/common/{Button,Input,Card,Badge,Modal,EmptyState}.tsx`, `frontend/src/features/recruitment/ui.tsx`. Rà soát thêm style/layout gốc đang áp dụng trước khi sửa toàn cục.

**Hiện có:** Primary Blue, nhiều variant component, Input chung, hai cơ chế hộp thoại khác nhau. `ui.tsx` còn chứa Field, Alert, Pagination và Dialog có logic riêng.

**Sửa UI:** Chốt token, padding, radius, kiểu chữ, màu hover/focus/disabled; thống nhất hình thức variant. Không xóa variant mà module khác dùng.

**Giữ nguyên:** Props, ref, button type, cloneElement/id-label, callback, focus, Escape, scroll lock và pagination. Không sửa component guard/AuthContext hoặc cấu hình router. Nếu chỉnh CSS toàn cục, kiểm tra cả TV2–TV4 để tránh ảnh hưởng ngoài ý muốn.

### 5.2. Navbar — `frontend/src/components/Navbar.tsx`

**Hiện có:** Menu theo từng role, logo tới `/`, tên/tài khoản, đăng nhập/đăng xuất. Các role không có cùng tập liên kết.

**Sửa UI:** Căn logo, nhãn role, kích thước menu và icon, màu active/hover, spacing và khả năng đọc trên màn hẹp.

**Giữ nguyên:** Menu và điều kiện role hiện tại, route, thao tác logout. Không thêm chuông, search, đổi ngôn ngữ hoặc menu mới. Nếu phát hiện thiếu điều hướng mobile, ghi thành vấn đề riêng thay vì tự thêm hamburger có state mới trong đợt này.

### 5.3. Login — `frontend/src/pages/LoginPage.tsx`

**Hiện có:** Form đăng nhập, đăng nhập nhanh theo role, trạng thái phiên đã đăng nhập và nút vào hệ thống/đăng xuất. Đăng nhập nhanh gọi đăng nhập thực sự.

**Sửa UI:** Card, nhãn, input, nút, lỗi và trạng thái chờ thống nhất.

**Giữ nguyên:** Tài khoản mẫu và logic xác thực; EMPLOYEE tới `/employee/workspace`, SUPERADMIN tới `/admin/settings`, các role còn lại theo nhánh hiện có tới `/admin/recruitment`. Không thêm OTP, social login, forgot-password hoặc đổi preset thành chỉ điền form.

## 6. TV2 — Tuyển dụng và trải nghiệm ứng viên

Tất cả các dòng trong bảng đều phải bảo toàn handlers, request, validation, busy và quyền hiện tại.

| File | Hiện có cần bảo toàn | Chỉnh hình thức |
|---|---|---|
| `frontend/src/pages/CareersPage.tsx` | Tìm kiếm debounce, lọc phòng ban/địa điểm từ API, 6 mục/trang, lưới 1/2 cột, retry, link chi tiết | Header, thẻ trắng, lương Emerald, bỏ Indigo, form/filter và pagination đồng nhất |
| `frontend/src/pages/JobDetailPage.tsx` | Hai cột `1.3fr/1fr`, các trường ứng tuyển, chọn/kéo CV, PDF/PNG/JPG/WEBP tối đa 5 MiB, receipt | Typography JD, dropzone, viền/góc/khoảng cách, responsive; không ép tỷ lệ mới |
| `frontend/src/pages/RecruitmentAdminPage.tsx` | 3 cột, bộ lọc từ chối, lọc job/ứng viên/điểm, tab lịch, kéo thả mở bước phù hợp | Cột Slate, card trắng, nhãn số lượng, điểm, toolbar và trạng thái chọn |
| `frontend/src/features/recruitment/JobEditor.tsx` | Modal, tạo/sửa job, salaryRange chuỗi, phòng ban/manager, AI preview rồi áp bản nháp | Nhóm form, vùng AI Blue nhạt, nút và typography |
| `frontend/src/features/recruitment/CandidateDetail.tsx` | Dialog, tải CV, điểm/summary/skills, polling, lịch/vòng/kết quả/câu hỏi, offer, tuyển/từ chối có xác nhận | Giữ modal; nhóm thông tin, khung điểm Blue, nhãn trạng thái, nội dung dài dễ đọc |
| `frontend/src/features/recruitment/InterviewSchedule.tsx` | Tuần/tháng, lịch/danh sách, bộ lọc, modal chi tiết, ngày giờ và link Meet | Toolbar, ô ngày/sự kiện, bảng danh sách, màu và viền |
| `frontend/src/features/recruitment/OfferPanel.tsx` | roleTitle/salary/startDate, điều kiện phát hành, retry, cập nhật thủ công, trạng thái gửi | Form/card, badge 48 giờ và nhãn gửi; không diễn giải workflow nhận là thư đã gửi |
| `frontend/src/pages/OfferResponsePage.tsx` | Token, mốc hết hạn, chấp nhận/từ chối và bước xác nhận, referrer policy | Card thư mời, cặp nhãn/giá trị, thời hạn Amber, nút đồng ý Emerald/từ chối Rose |

**Mapping Kanban giữ nguyên:** Mới nộp (`APPLIED`); Đang phỏng vấn / Đề xuất (`INTERVIEWING`, `OFFERED`); Đã nhận việc (`HIRED`). Bộ lọc từ chối hiển thị `REJECTED` riêng. Không thêm Screening, không tách Offer, không đổi kéo thả thành cập nhật trạng thái trực tiếp.

**Không thêm:** Drawer, timer countdown, e-sign, salaryMin/Max, trọng số AI, ESOP, phụ cấp, thưởng, phân tích strengths/risks không có trường dữ liệu. Giữ `/careers/:id` và `/offers/:token`. Không sửa worker tự chấm CV, n8n hoặc AI để phục vụ đổi UI.

## 7. TV3 — Workspace, Onboarding và Mood

### 7.1. Workspace nhân viên — `frontend/src/pages/EmployeeWorkspacePage.tsx`

**Hiện có:** Check-in mood và feedback; trạng thái hôm nay; lịch sử 7 ngày; checklist onboarding và bộ lọc; thao tác tạo nhiệm vụ mẫu khi được hiển thị; Copilot; widget đào tạo nhúng. Góc nhìn quản lý có các tab riêng và widget team.

**Sửa UI:** Bỏ gradient Indigo/Purple trang trí, giảm bo góc lớn và nền kính không thống nhất; chuẩn hóa thẻ, chữ, progress bar, checkbox, khu vực chọn mood, label và các tab.

**Giữ nguyên:** Ba lựa chọn mood, feedback, điều kiện check-in, gửi/check lỗi, dữ liệu lịch sử, tính tiến độ và task completion. Không hardcode lại số nhiệm vụ hoặc thay cách tính “30 ngày”. Không đổi payload `{mood, feedbackText}`. Không tự chạy seed, không thêm mood option, không thêm Mentor/Buddy nếu chưa có dữ liệu hiển thị.

### 7.2. Team Mood — `frontend/src/features/team-mood/ManagerTeamMoodWidget.tsx`

**Component con thuộc cùng phạm vi:** `components/TeamMoodHeader.tsx`, `TeamMoodMetrics.tsx`, `AttentionQueue.tsx`, `TeamOverviewTable.tsx`, `MoodBadge.tsx`, `TeamMoodStates.tsx`, `InterventionModal.tsx`, `WeeklyMoodAnalyticsWidget.tsx`.

**Hiện có:** Chọn phòng ban theo quyền/dữ liệu; tổng quan team; cảnh báo cần chú ý; bảng thành viên; refresh/retry; modal can thiệp với ghi chú; phân tích tuần; xử lý response cũ và toast.

**Sửa UI:** Header, thẻ chỉ số, bảng, badge, cảnh báo Rose, modal và phần phân tích tuần đồng nhất. Giữ số liệu thật và nhãn hiện tại.

**Giữ nguyên:** Quyền đổi phòng ban; normalization, request fencing, refresh, toast timing; cách xác định cảnh báo và resolve burnout. Không tạo ngưỡng burnout mới, không thêm metric/biểu đồ; không biến nút can thiệp thành tạo lịch Google Calendar/Meet. Không sửa `utils.ts`, `types.ts` hoặc API.

### 7.3. Team Onboarding — `frontend/src/features/team-onboarding/ManagerTeamOnboardingWidget.tsx`

**Hiện có:** Tổng quan tiến độ đội ngũ, danh sách nhân sự/nhiệm vụ và dữ liệu phòng ban theo API.

**Sửa UI:** Header, lựa chọn phòng ban, thẻ/bảng nhân sự, thanh tiến độ, khu vực chi tiết và các trạng thái tải/lỗi/rỗng.

**Giữ nguyên:** Cách chọn/lọc dữ liệu, quyền, phần trăm tiến độ, cấu trúc nhiệm vụ và hành vi mở chi tiết. Không thêm nhắc nhở mới hoặc sửa trạng thái nhiệm vụ từ màn quản lý nếu luồng hiện tại không hỗ trợ.

### 7.4. Copilot trong Workspace

**File:** Các component `CopilotChatWidget`, `CopilotMessageBubble`, `CopilotTypingIndicator` nằm trong `EmployeeWorkspacePage.tsx`.

**Hiện có:** Widget hội thoại, câu hỏi gợi ý, gửi câu hỏi, trạng thái chờ, trả lời và retry.

**Sửa UI:** Bong bóng người dùng Blue, phía trả lời Slate, font/spacing, ô nhập và nút gửi; giữ vị trí widget. Trình bày nguồn hoặc trạng thái trả lời đúng dữ liệu đã render.

**Giữ nguyên:** Request `/onboarding/chat`, nội dung message, timeout, chống gửi lặp, retry, history và xử lý trạng thái. Không chuyển thành drawer, không tự thêm citation hoặc nguồn giả, không thêm nút tài liệu nếu chưa có.

### 7.5. Widget đào tạo nhúng

`frontend/src/components/EmployeeTrainingsWidget.tsx` có tải danh sách, lọc và cập nhật tiến độ khóa học. Đề xuất TV4 sở hữu UI bên trong, TV3 phối hợp layout Workspace. Không hai người cùng sửa file; giữ callbacks, filter và cập nhật tiến độ. Lead xác nhận người sửa trước khi triển khai.

## 8. TV4 — Quản trị, hạ tầng, tri thức và đào tạo

### 8.1. RBAC — `frontend/src/pages/AdminSettingsPage.tsx`

**Hiện có:** Tạo tài khoản/phòng ban, tìm kiếm/lọc role, bảng nhân sự, chỉnh chức danh/role và thao tác quản lý theo điều kiện hiện có. SUPERADMIN có các tab quản trị; HR có giao diện khóa học/RAG riêng; MANAGER/EMPLOYEE không được biến thành người quản trị bởi thay đổi UI.

**Sửa UI:** Table, form/modal, label, badge role, toolbar, nút và thông báo; giữ vùng cuộn ngang khi cần bảo toàn cột dữ liệu.

**Giữ nguyên:** Role SUPERADMIN/HR/MANAGER/EMPLOYEE, guards, điều kiện tự sửa/xóa, validation, form và các xác nhận hiện tại. Không đổi role ADMIN theo tài liệu cũ, không gộp hai góc nhìn HR/SUPERADMIN, không bỏ cột chỉ để bảng gọn.

### 8.2. Cấu hình hạ tầng — phần cấu hình trong `AdminSettingsPage.tsx`

**Hiện có:** Cấu hình Gemini/n8n, thao tác lưu, kiểm tra Gemini/n8n và thao tác test crash hiện hữu.

**Sửa UI:** Khối cấu hình, nhãn, ô nhập, thông báo trạng thái, nút test/lưu; chuẩn hóa Blue/Slate.

**Giữ nguyên:** Cách che/giữ secret, quy tắc nhập và lưu, quyền, handler test, request và thông báo. Không thêm test mới, tự động ping khi render, làm lộ key hoặc thay cấu hình thật trong lúc kiểm tra màu. Test có tác động như test crash chỉ thực hiện trên môi trường thử theo kế hoạch lead; không tự gọi trên hệ thống đang dùng.

### 8.3. Kho tri thức — `frontend/src/components/KnowledgeBasePanel.tsx`

**Hiện có:** Danh sách tài liệu, chọn/upload PDF, tìm tài liệu, xóa có xác nhận, reload; truy vấn qua workflow, kết quả trả lời và phần evidence.

**Sửa UI:** Upload panel, danh sách/card tài liệu, badge trạng thái, ô hỏi, câu trả lời, evidence và dialog xóa.

**Giữ nguyên:** Kiểm tra file, upload/delete, search workflow, polling/cơ chế chờ hiện tại nếu có, nội dung nguồn và cách diễn giải kết quả. Không thêm “đồng bộ Vector DB” nếu chưa có thao tác đó, không đổi truy vấn sang SQL LIKE, không thêm chỉ số cosine hoặc chunk giả.

### 8.4. Đào tạo — `frontend/src/components/TrainingPanel.tsx`

**Hiện có:** Các khu vực thiết lập/danh mục/tiến độ; tạo khóa học; gán khóa; gợi ý AI và kiểm tra readiness; danh sách người học; cập nhật tiến độ/hạn; gỡ, khôi phục, xóa vĩnh viễn.

**Sửa UI:** Các tab/khu vực hiện hữu, form tạo/gán, thẻ/bảng khóa học, nhãn, tiến độ và nút. Không rút gọn thành một lưới 3 cột làm mất chức năng quản lý.

**Giữ nguyên:** Các bộ lọc, course scope, request/AbortController, readiness, assignment, progress/due date, ảnh hưởng của gỡ/khôi phục/xóa, busy và xác nhận. Không tự gán khóa học sau AI gợi ý; không thêm tính năng phát video hoặc chứng chỉ.

### 8.5. Component đào tạo và style liên quan

- `CourseLearnersPanel.tsx`: chỉnh bảng/danh sách và chi tiết người học; giữ tải dữ liệu và điều hướng.
- `CourseRemoveDialog.tsx`: chỉnh cảnh báo, bố cục nút; giữ ý nghĩa gỡ và xác nhận.
- `CoursePermanentDeleteDialog.tsx`: chỉnh hình thức cảnh báo; giữ các điều kiện xác nhận/xóa hiện tại, không nhập chung với gỡ.
- `EmployeeTrainingsWidget.tsx`: theo phân công đề xuất ở mục 7.5; giữ hiển thị và cập nhật tiến độ.
- `frontend/src/styles/tv4-ui.css`: TV4 chuẩn hóa CSS scoped; không thêm selector tràn sang module khác.

TV4 hiện còn nhiều màu hex trực tiếp trong TSX dù biến `--tv4-accent` đã Blue. Cần rà soát màu hiển thị cuối cùng và cascade; thay màu theo vai trò semantic, không thay toàn bộ chuỗi hex một cách máy móc.

## 9. Quy tắc phối hợp Git và thứ tự thực hiện

1. Kiểm tra working tree, lấy main mới nhất trước khi sửa; bảo toàn thay đổi chưa commit. Ghi commit nền trong PR.
2. TV1 chốt token và hình thức component chung. TV2–TV4 lập checklist hiện trạng và sửa các màn thuộc mình.
3. Chỉ một người sở hữu mỗi file. Thay đổi shared component qua TV1; widget đào tạo nhúng cần lead chốt người sửa.
4. Mỗi thành viên commit phạm vi UI riêng; không reformat toàn bộ file nếu làm diff khó review, không lẫn refactor logic.
5. Push nhánh đã thống nhất và mở PR; ghi rõ UI-only, file sửa, ảnh trước/sau, kiểm thử và phần chưa kiểm tra.
6. Lead review/merge. Triển khai do lead thực hiện sau nghiệm thu; thành viên không tự cập nhật VPS hoặc workflow.

**Các giai đoạn không gắn ngày cứng:** chốt nền tảng → sửa module → kiểm thử chéo → merge/triển khai. Lead phân lịch sau khi xác nhận khối lượng và phân công giao nhau.

## 10. Checklist nghiệm thu toàn nhóm

### 10.1. Hình thức

- Màu Blue/Slate nhất quán; kiểm tra cả Indigo, Purple, gradient và màu hex cũ theo từng module.
- Không đổi màu mang ý nghĩa trạng thái một cách sai lệch; không thêm ngưỡng đánh giá mới.
- Card, button, input, badge và modal thống nhất theo chuẩn chung; textarea có chiều cao phù hợp.
- Kiểm tra desktop, tablet và mobile; nội dung dài không tràn, che nút hoặc mất cột dữ liệu.
- Hover/focus/disabled rõ; tab order, label, focus return và Escape không bị thay đổi do JSX/CSS mới.
- Loading/empty/error hiện đúng điều kiện cũ; không biến lỗi thành thông báo thành công.

### 10.2. Hồi quy theo thành viên

| Người phụ trách | Các luồng phải so sánh trước/sau |
|---|---|
| TV1 | Navbar cho khách và từng role; login thường/nhanh; điều hướng; logout; modal/input/button dùng chung trên các module |
| TV2 | Tìm/lọc/phân trang job; nộp CV hợp lệ/không hợp lệ; tạo/sửa JD; 3 cột và kéo thả; AI status; phỏng vấn; phát hành/retry và phản hồi offer |
| TV3 | Check-in mood; lịch sử; task toggle/seed theo quyền; Copilot send/retry; team mood và resolve; phân tích tuần; team onboarding; các tab quản lý |
| TV4 | Góc nhìn HR/SUPERADMIN; CRUD quản trị theo quyền; form cấu hình; PDF upload/search/delete; tạo/gán/AI readiness; tiến độ/hạn; gỡ/khôi phục/xóa; learner panel và widget nhân viên |

Dùng tài khoản và dữ liệu thử. Hành động gửi email, tạo lịch, can thiệp, xóa tài liệu hoặc test crash không được chạy trên dữ liệu sản xuất để nghiệm thu hình thức. Kiểm tra request trước/sau: giữ URL, method, payload và tần suất gọi tương ứng thao tác; không tạo request mới do render.

### 10.3. Kiểm tra kỹ thuật và diff

- `npm run build` trong `frontend/` đạt; chạy các test hiện hữu liên quan phần bị tác động.
- Không thay `backend/**`, `workflows/**`, môi trường, DB, API client/contract, types/enums, auth/guard/router, helpers tính toán nghiệp vụ hoặc package/lockfile.
- Ngoại lệ file cấu hình hình thức: TV1 được chỉnh Tailwind/style/layout dùng chung; TV4 chỉnh CSS scoped. Không sửa cấu hình build/deploy.
- Review diff handlers/effects/dependency arrays và các props `type`, `disabled`, `value`, `onChange`, `onClick`, `onSubmit`, `name`, `required`, `min/max`, `ref`: phải giữ đúng hành vi.
- Kiểm tra việc bọc JSX không làm remount component dẫn tới gọi API lại hoặc reset state.
- Lỗi chức năng không liên quan: ghi issue riêng, không âm thầm sửa cùng PR UI.

## 11. Hồ sơ bàn giao và tiêu chí hoàn thành

Mỗi thành viên bàn giao:

1. Danh sách màn/component và commit nền.
2. Diff chỉ về hình thức; mô tả rõ những vùng giao diện thay đổi.
3. Ảnh trước/sau các trạng thái chính, cả màn rộng và hẹp.
4. Kết quả build và checklist hồi quy: đạt, chưa đạt hoặc chưa kiểm tra; không coi build thành công là đủ xác nhận nghiệp vụ.
5. PR cho lead review; vấn đề tồn tại và đề xuất ngoài phạm vi được tách riêng.

**Hoàn thành đợt chuẩn hóa** khi lead xác nhận hình thức đồng bộ và các chức năng giữ nguyên. Không dùng việc thiếu e-sign, countdown, drawer hoặc một tính năng được mô tả nhầm trong báo cáo cũ để đánh giá thành viên chưa hoàn thành.

## 12. Hướng dẫn ngắn cho trợ lý AI của từng thành viên

> Đối chiếu code đang có và chỉ chỉnh phần trình bày trong các file được giao. Giữ nguyên tính năng, dữ liệu, handlers, effects, validation, quyền, route và API. Không sửa BE/n8n, không bổ sung tính năng từ mô tả cũ. Nếu phát hiện thiếu hoặc sai nghiệp vụ, ghi nhận riêng. Dùng token chung đã thống nhất, bảo toàn component interaction, kiểm tra diff và build. Không tự đổi branch hoặc triển khai VPS. Báo cáo đúng những gì đã kiểm tra, không khẳng định thành công runtime chỉ từ đọc code.

---

**Giới hạn phân tích:** Báo cáo dựa trên snapshot `47bfe12` và các file đã đối chiếu. Phân công bổ sung cho widget đào tạo nhúng cần lead xác nhận. Trước khi triển khai, lấy main mới và rà lại phần thay đổi; tài liệu này không thay thế kết quả kiểm thử thực tế.
