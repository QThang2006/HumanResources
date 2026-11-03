# Sửa mẫu thư xác nhận và kiểm thử bốn workflow — 22/10/2026

Thư cũ của hồ sơ 133 dùng HTML tối giản ở node 09 của workflow 2.1. Node này đã được thay bằng mẫu chung HR ATS: nền xanh, thẻ thông tin và footer như thư phỏng vấn/offer. Email đã gửi trước đây không tự đổi giao diện.

Chỉ sửa nội dung Code của node `09. Soạn thư xác nhận đã nhận hồ sơ`; giữ input/output, routing, subject, credential, connections và cấu hình Gemini. Backup trước sửa nằm trong `.temp/email-style-retest-20261021/` (dữ liệu riêng tư, không commit). Bản 2.1 live dùng version `1dfc87f2-a1f7-4787-ae78-e44ce004b985`. Trong đợt retest 22/10, definitions của cả bốn luồng không đổi.

## Kết quả chạy thật

| Workflow | Ca kiểm tra | Kết quả và execution |
|---|---|---|
| 2.0 | Tạo hai vị trí TEST; đóng/mở lại vị trí 24; cập nhật Google Form thật | Google trả success; đóng bỏ vị trí 24 (21 lựa chọn), mở thêm lại (22). 447, 449, 454, 456, 457, 458 |
| 2.1 | Website, Gmail, response Sheet → Drive → ATS, gửi xác nhận, Gemini và callback | Hồ sơ 143/144: COMPLETED 95/100. Hồ sơ 145: xác nhận gửi thành công; AI FAILED do rate limit cả sau retry. Executions 448, 451, 452, 455 |
| 2.2 | Xếp lịch, Calendar, Meet, thư mời và native Gemini | Phỏng vấn 122: Calendar/email thành công, Meet được tạo, AI lưu 5 câu hỏi mới. Execution 450 |
| 2.3 | Phát hành Offer và phản hồi | Offer 6 SMTP_ACCEPTED, phản hồi test ACCEPTED. Execution 453 đang waiting theo thiết kế; không đồng nghĩa lỗi |

Không kết luận bốn workflow đã ổn định hoàn toàn: chấm điểm hồ sơ 145 còn lỗi giới hạn lượt gọi Gemini. Nhánh FAILED đã lưu ATS, không kẹt PROCESSING; email xác nhận không bị lỗi AI chặn. Chính sách model/backoff của PR chưa được publish lên live trong đợt này.

## Chứng cứ thư xác nhận

- Execution 451 / hồ sơ 144: Gmail intake gửi thư thật; tìm được email theo đúng Message-ID trong cả Sent và Inbox của hộp thư tuyển dụng do người dùng kiểm soát. HTML có tiêu đề và thương hiệu mới.
- Execution 452 / hồ sơ 145: SMTP accepted đúng địa chỉ kiểm thử đã được người dùng cho phép; tìm được bản đã gửi trong Gmail, HTML đúng mẫu. Chưa kiểm tra Inbox của địa chỉ trường.
- Xem trực quan HTML thực tế của thư xác nhận, thư phỏng vấn và offer trong trình duyệt; mẫu tiêu đề xanh/thẻ thông tin/footer khớp nhau. Ảnh và HTML nằm trong thư mục `.temp/email-style-retest-20261022/`, không đưa dữ liệu người nhận hay response token lên Git.
- Ba kiểm tra offline về mẫu, giữ routing và escape HTML đạt.

## Offer: nhắc và hết hạn

Ba ca chạy bằng SMTP thật trên snapshot SQLite riêng, workflow copy inactive và MySQL dùng một lần: PENDING gửi/nhắc/EXPIRED/báo hết hạn; ACCEPTED và DECLINED không nhắc/hết hạn; mọi ca đều chặn nhắc sớm. Tất cả đạt. Chỉ rút ngắn deadline trong DB test; chưa chờ 24/48 giờ thực tế. DB test đã dọn, không thêm workflow vào live.

## Phạm vi và độ phủ

- Các thao tác tạo hồ sơ/xếp lịch/offer dùng đúng endpoint BE mà FE sử dụng; đây không phải đợt clickthrough toàn bộ màn hình FE.
- Đã đăng nhập FE qua nút demo và đọc kết quả: hồ sơ 143/144 hiển thị 95/100; chi tiết 143 có 5 câu hỏi mới, Meet đã xác nhận, email được chấp nhận và Offer đã đồng ý; hồ sơ 145 hiển thị “Chưa chấm” cùng thông báo thử lại, không kẹt đang xử lý. Ảnh đối chiếu lưu riêng trong thư mục bằng chứng.
- Nhánh Form dùng dòng response Sheet thật và tải CV Drive thật. Không gửi Google Form bằng UI trong lần này.
- CV là file PDF tổng hợp dành cho kiểm thử, không dùng CV ứng viên thật. Chỉ chuẩn bị kết quả PASSED cho phỏng vấn TEST để vào nhánh Offer; không thực hiện quyết định tuyển dụng thật.
- Node IF được tính đã chạy khi thực thi; điều đó không chứng minh cả hai nhánh đều đã chạy. Các node lỗi Calendar/SMTP chưa được ép lỗi trên live.
- Live vẫn đúng bốn workflow, đều active; JSON/connections hợp lệ và definitions không đổi so với snapshot trước retest.

| Workflow | Tổng node | Node đã chạy live | Node chưa chạy live trong đợt này |
|---|---:|---:|---|
| hrTv2JobSyncV2 | 14 | 12 | 12. Tổng hợp lỗi đồng bộ; 13. Phản hồi đồng bộ thất bại |
| hrTv2IntakeAiV3 | 27 | 26 | AI-E01. Chuẩn hóa lỗi để gỡ trạng thái AI |
| hrTv2InterviewAiV3 | 30 | 23 | 14. Tổng hợp lỗi tạo lịch phỏng vấn; 16. Tổng hợp lỗi gửi thư mời; 15. Lưu lỗi tạo lịch vào ATS; 17. Lưu lỗi gửi thư vào ATS; AI-Q01. Nhận yêu cầu tạo câu hỏi; AI-Q12. Callback lỗi tạo câu hỏi; AI-QE01. Chuẩn hóa lỗi để gỡ trạng thái AI |
| hrTv2OfferV2 | 15 | 6 | 07. Kiểm tra phản hồi ứng viên sau 24 giờ; 08. Kiểm tra có cần gửi thư nhắc; 09. Gửi thư nhắc ứng viên và thông báo HR; 10. Lưu kết quả gửi thư nhắc; 11. Chờ đến hạn 48 giờ; 12. Kiểm tra và đóng thư mời đã hết hạn; 13. Kiểm tra thư mời hết hạn cần báo HR; 14. Thông báo HR về thư mời hết hạn; 15. Lưu kết quả thông báo hết hạn |

## Hồ sơ ATS

| ID | Nguồn | Xác nhận | Điểm | Trạng thái AI |
|---|---|---|---:|---|
| 143 | Website | Không thuộc nhánh thư intake | 95.00 | COMPLETED |
| 144 | GMAIL | SMTP_ACCEPTED | 95.00 | COMPLETED |
| 145 | GOOGLE_FORM | SMTP_ACCEPTED | — | FAILED |

Bằng chứng chi tiết đã lọc trường nhạy cảm: `EMAIL-STYLE-RETEST-2026-10-22.json`. Raw execution, credential, recipient, token, snapshot SQLite và HTML offer không được commit.