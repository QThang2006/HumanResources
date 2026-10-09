# TV2 demo: một job có ba CV ứng tuyển

Seed này tạo một job tuyển dụng TV2 và ba hồ sơ ứng tuyển có CV PDF tổng hợp. Dữ liệu được đánh dấu bằng tiêu đề `[TV2 DEMO]` và email `tv2.threecv.*@example.test`, nên có thể chạy lại mà không tạo bản ghi trùng.

## Chạy

```bash
cd backend
npm run build
npm run seed:tv2-three-cv
```

Có thể xem trước mà không ghi dữ liệu:

```bash
npm run seed:tv2-three-cv -- --dry-run
```

Seed lấy HR và phòng ban đầu tiên đang hoạt động. Khi cần chỉ rõ dữ liệu:

```bash
npm run seed:tv2-three-cv -- --creator-id=1 --department-id=1
```

CV được tạo lúc chạy và lưu vào thư mục riêng `ATS_UPLOAD_DIR`; không đưa CV riêng tư, mật khẩu, API key hoặc dữ liệu Gmail vào Git.
