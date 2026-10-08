/**
 * 🧠 SCRIPT CẤP NÃO CHO AI COPILOT (RAG KNOWLEDGE BASE SEEDER - GLOBAL EDITION 2026)
 * Hệ thống: Enterprise HR Multi-Agent Platform
 * Tiêu chuẩn: Chuẩn hóa theo mô hình văn hóa và chính sách của Google, Netflix, GitLab, Spotify & Microsoft.
 * 
 * Cách chạy:
 *   cd backend
 *   npm run seed:knowledge
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const KNOWLEDGE_DOCUMENTS = [
  {
    title: 'So_tay_nhan_vien_toan_cau_2026.pdf',
    fileUrl: '/uploads/docs/So_tay_nhan_vien_toan_cau_2026.pdf',
    fileType: 'application/pdf',
    uploadedBy: 1, // SuperAdmin
    chunks: [
      {
        index: 1,
        content: `[ĐIỀU 1: VĂN HÓA DOANH NGHIỆP & TRIẾT LÝ LÀM VIỆC - CHUẨN NETFLIX & GITLAB]
- Triết lý Tự do và Trách nhiệm (Freedom & Responsibility): Công ty vận hành dựa trên niềm tin vào tính tự giác và tinh thần trách nhiệm cá nhân, không kiểm soát bằng các thủ tục giấy tờ rườm rà.
- Nguyên tắc hành động: "Act in Company's Best Interest" (Luôn hành động vì lợi ích cao nhất của tổ chức).
- Giao tiếp thẳng thắn xây dựng (Radical Candor): Khuyến khích phản biện đa chiều trực tiếp, minh bạch và tập trung vào giải pháp cho sản phẩm.
- Văn hóa Handbook-First (GitLab Standard): Mọi quy trình, chính sách, kiến trúc kỹ thuật đều được văn bản hóa công khai trên hệ thống Portal.
- Làm việc Bất đồng bộ (Asynchronous Communication): Tôn trọng thời gian tập trung sâu (Deep Work), không bắt buộc phải trả lời tin nhắn tức thì ngoài giờ làm việc.
- Quyền ngắt kết nối (Right to Disconnect): Nhân viên có quyền tắt thông báo công việc sau giờ làm, cuối tuần và các ngày nghỉ phép.`
      },
      {
        index: 2,
        content: `[ĐIỀU 2: THỜI GIAN LÀM VIỆC, HYBRID & TRỢ CẤP GÓC LÀM VIỆC TẠI NHÀ]
- Thời gian làm việc tiêu chuẩn: Thứ 2 – Thứ 6, từ 08:30 đến 17:30 (nghỉ trưa 12:00 – 13:00). Thứ 7 và Chủ Nhật nghỉ.
- Khung giờ làm việc cốt lõi (Core Hours): Bắt buộc online/có mặt từ 09:30 đến 16:30. Nhân viên được linh hoạt check-in từ 08:00 – 09:30 và về từ 17:00 – 18:30 miễn đảm bảo đủ 8 tiếng/ngày.
- Chính sách Hybrid Work: Nhân viên chính thức được đăng ký làm việc tại nhà (Work from Home - WFH) tối đa 02 ngày/tuần qua HR Portal.
- Trợ cấp Setup góc làm việc tại nhà (Remote Work Allowance): Sau khi hoàn thành thử việc, nhân sự khối công nghệ được hỗ trợ một lần khoản ngân sách 20.000.000 VNĐ để trang bị bàn nâng hạ, ghế công thái học (Ergonomic) hoặc thiết bị phụ trợ làm việc tại nhà.`
      },
      {
        index: 3,
        content: `[ĐIỀU 3: LỘ TRÌNH 30 NGÀY HỘI NHẬP & CƠ CHẾ BUDDY - CHUẨN GOOGLE NOOGLER]
- Cơ chế Buddy (Người bạn đồng hành): Mỗi nhân sự mới trong ngày đầu tiên sẽ được chỉ định 1 Buddy (đồng nghiệp thân thiết cùng phòng ban) và 1 Mentor (chuyên gia kỹ thuật cấp cao) hỗ trợ 1-on-1 suốt 60 ngày đầu tiên.
- Lộ trình 30 ngày Onboarding 4 Cột mốc:
  + Day 1 (Paperwork & Tooling): Hoàn tất hồ sơ nhân sự điện tử, nhận bàn giao máy tính MacBook Pro / Dell Precision, kích hoạt 2FA và tài khoản công vụ.
  + Week 1 (Orientation & Setup): Cài đặt môi trường phát triển (Dev Environment), đọc tài liệu kiến trúc, ăn trưa kết nối cùng Buddy và Team.
  + Week 2-3 (First PR & Culture): Thực hiện đóng góp mã nguồn đầu tiên (First Pull Request), hoàn thành các bài học quy chế và văn hóa trên hệ thống L&D.
  + Day 30 (Milestone Review): Họp đánh giá tiến độ 30 ngày với Manager, rà soát tỷ lệ hoàn thành checklist trên cổng Onboarding Portal.
- Tiêu chuẩn vượt qua thử việc: Hoàn thành >= 80% Onboarding Checklist và nhận đánh giá Đạt từ Quản lý trực tiếp. Thời gian thử việc 02 tháng, mức lương nhận từ 85% đến 100% lương chính thức theo thỏa thuận Offer.`
      },
      {
        index: 4,
        content: `[ĐIỀU 4: CHÍNH SÁCH NGHỈ PHÉP TOÀN DIỆN & SỨC KHỎE TINH THẦN - CHUẨN SPOTIFY]
- Nghỉ phép năm (Annual Leave): Nhân viên chính thức hưởng 12 ngày phép năm/năm (hưởng 100% lương). Nhân viên mới qua thử việc được cộng phép theo tỷ lệ số tháng làm việc trong năm.
- Chế độ thâm niên (Loyalty Bonus): Cứ mỗi 03 năm cống hiến, nhân viên được cộng thêm 01 ngày phép năm (tối đa lên đến 20 ngày phép/năm).
- Chuyển giao phép: Phép năm cũ chưa sử dụng hết được tự động bảo lưu và cộng dồn sang năm sau, hạn chót sử dụng là ngày 31/03.
- Ngày sức khỏe tinh thần (Mental Health Day): 01 ngày nghỉ mỗi quý (tổng 4 ngày/năm, hưởng 100% lương) để xả stress, phục hồi năng lượng tinh thần. Được kích hoạt nhanh khi hệ thống Daily Mood Check-in ghi nhận trạng thái căng thẳng (STRESSED) hoặc do Quản lý đề xuất.
- Nghỉ sinh nhật (Birthday Leave): 01 ngày nghỉ hưởng nguyên lương trong tháng sinh nhật của nhân viên.
- Nghỉ ốm linh hoạt: Ngoài bảo hiểm y tế nhà nước, công ty cấp thêm 05 ngày nghỉ ốm có lương/năm không cần giấy viện cho các trường hợp cảm sốt, mệt mỏi thông thường.`
      }
    ]
  },
  {
    title: 'Quy_che_dai_ngo_va_phat_trien_su_nghiep_2026.pdf',
    fileUrl: '/uploads/docs/Quy_che_dai_ngo_va_phat_trien_su_nghiep_2026.pdf',
    fileType: 'application/pdf',
    uploadedBy: 1,
    chunks: [
      {
        index: 1,
        content: `[ĐIỀU 5: CHÍNH SÁCH LƯƠNG, THƯỞNG & ĐÁNH GIÁ HIỆU SUẤT OKRS]
- Ngày chi trả lương: Ngày 05 hàng tháng qua tài khoản ngân hàng Techcombank / Vietcombank. Tự động chi trả trước nếu ngày 05 rơi vào cuối tuần hoặc ngày lễ.
- Đánh giá hiệu suất & Điều chỉnh thu nhập (Performance Review): Định kỳ 06 tháng/lần (Tháng 6 và Tháng 12) theo khung mục tiêu OKRs và đánh giá đồng cấp 360 độ (360-Degree Feedback).
- Thưởng tháng 13: 01 tháng lương thực nhận cho nhân viên làm việc đủ 12 tháng (tính theo tỷ lệ số tháng làm việc thực tế).
- Thưởng hiệu suất (Performance Bonus): Dựa trên kết quả hoàn thành OKRs (từ 0.5 đến 3 tháng lương).
- Cổ phiếu thưởng (ESOP / Equity Grant): Dành cho các nhân sự nòng cốt, kỹ sư chủ chốt có đóng góp kỹ thuật đột phá theo lộ trình phân bổ 4 năm (Vesting Schedule 1-year cliff).`
      },
      {
        index: 2,
        content: `[ĐIỀU 6: LỘ TRÌNH PHÁT TRIỂN KÉP - DUAL CAREER LADDER (CHUẨN SPOTIFY & META)]
- Hai nhánh thăng tiến bình đẳng: Công ty tôn trọng chuyên môn kỹ thuật sâu, nhân viên không bắt buộc phải làm Quản lý (Management) mới có thu nhập cao và quyền quyết định.
  + Nhánh Quản lý (Management Track): Team Lead -> Engineering Manager -> Director of Engineering -> VP of Engineering.
  + Nhánh Chuyên môn Kỹ thuật (Individual Contributor - IC Track): Junior -> Middle -> Senior Engineer -> Staff Engineer -> Principal Engineer -> Distinguished Fellow.
- Cấp bậc tương đương: Vị trí Staff Engineer hoặc Principal Engineer có dải lương, phúc lợi và tầm ảnh hưởng kiến trúc ngang hàng với Engineering Manager và Director.`
      },
      {
        index: 3,
        content: `[ĐIỀU 7: NGÂN SÁCH HỌC TẬP (L&D) & ĐỔI MỚI SÁNG TẠO 10% - CHUẨN GOOGLE]
- Ngân sách đào tạo cá nhân (Learning & Development Budget): Hỗ trợ 15.000.000 VNĐ/năm/nhân viên để thi các chứng chỉ quốc tế (AWS Certified Solutions Architect, Google Cloud Professional, CKA, PMP, Scrum Master...) hoặc tham gia các khóa học chuyên ngành cấp cao.
- Ngày đổi mới sáng tạo (Innovation Day / 10% Time - Chuẩn Google 20% Rule): Nhân viên kỹ thuật được dành 01 ngày mỗi tháng để nghiên cứu các công nghệ AI mới, thử nghiệm mã nguồn mở hoặc xây dựng các sản phẩm nội bộ tự do sáng tạo.
- Thưởng Bằng sáng chế & Bài báo quốc tế: Thưởng nóng từ 20.000.000 đến 50.000.000 VNĐ cho mỗi bằng sáng chế công nghệ hoặc công bố khoa học quốc tế được chấp thuận.`
      },
      {
        index: 4,
        content: `[ĐIỀU 8: THIẾT BỊ FLAGSHIP, BẢO HIỂM CAO CẤP & TIỆN ÍCH VĂN PHÒNG]
- Gói thiết bị Flagship: Cấp phát mới 100% dòng máy MacBook Pro M-Series (16/32GB RAM) hoặc Dell Precision Workstation theo lựa chọn của kỹ sư + Màn hình đồ họa rời 27 inch 4K Ultra HD tại văn phòng.
- Bảo hiểm sức khỏe cao cấp quốc tế (PVI / Bảo Việt Care): Hạn mức chi trả lên đến 150.000.000 VNĐ/năm (nội trú, ngoại trú, nha khoa, tai nạn 24/7). Công ty tài trợ 100% phí bảo hiểm cho nhân viên và trợ giá 50% cho người thân (vợ/chồng, con cái).
- Khám sức khỏe định kỳ hàng năm tại các bệnh viện quốc tế hàng đầu (Vinmec, FV, Raffles Medical).
- Tiện ích Pantry & Đời sống: Miễn phí gửi xe tại tòa nhà; Quầy Pantry không giới hạn cà phê hạt pha máy, trà thảo mộc, sữa tươi, ngũ cốc, hoa quả tươi và đồ ăn nhẹ hàng ngày.`
      }
    ]
  },
  {
    title: 'Quy_chuan_bao_mat_va_dao_duc_ai_2026.pdf',
    fileUrl: '/uploads/docs/Quy_chuan_bao_mat_va_dao_duc_ai_2026.pdf',
    fileType: 'application/pdf',
    uploadedBy: 1,
    chunks: [
      {
        index: 1,
        content: `[ĐIỀU 9: TỰ CHỦ CHI TIÊU CÔNG VỤ & NGUYÊN TẮC QUẢN LÝ TÀI CHÍNH - MÔ HÌNH NETFLIX]
- Chính sách tự chủ chi tiêu "Act in Company's Best Interest": Đối với các khoản chi dưới 5.000.000 VNĐ phục vụ trực tiếp cho công việc (mua sách kỹ thuật, công cụ SaaS, tài khoản AI, linh kiện phụ trợ), nhân viên được quyền chủ động thanh toán trước và gửi hóa đơn hoàn ứng qua HR Portal mà không cần phê duyệt qua nhiều cấp.
- Trách nhiệm minh bạch: Mọi khoản chi tiêu phải có hóa đơn hợp lệ (VAT/Receipt) và phục vụ mục tiêu nâng cao năng suất làm việc của dự án.`
      },
      {
        index: 2,
        content: `[ĐIỀU 10: QUY CHUẨN BẢO MẬT ZERO-TRUST & SỬ DỤNG AI CÓ TRÁCH NHIỆM (RESPONSIBLE AI)]
- Sử dụng AI gia tăng năng suất: Nhân viên được khuyến khích áp dụng các công cụ AI (GitHub Copilot, Gemini, ChatGPT) để tăng tốc viết mã, tối ưu tài liệu và thiết kế kiến trúc.
- Quy tắc bảo mật dữ liệu tuyệt đối (Zero-Trust Data Protection):
  + Nghiêm cấm đưa mã nguồn chứa bí mật thuật toán lõi, khóa bảo mật (API Keys, Private Keys, Passwords, Database Credentials) lên các nền tảng AI công cộng không có thỏa thuận bảo mật doanh nghiệp.
  + Không chia sẻ thông tin định danh cá nhân (PII) của khách hàng, ứng viên hoặc nhân sự nội bộ lên các mô hình AI ngoài hạ tầng kiểm soát.
  + Mọi dữ liệu tri thức nội bộ được mã hóa và bảo vệ trong hạ tầng kiểm soát của Enterprise HR Tech Platform.`
      }
    ]
  }
];

async function run() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
  const dbUser = process.env.DB_USERNAME || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbDatabase = process.env.DB_DATABASE || 'hr_enterprise_db';

  console.log(`🔌 Kết nối tới CSDL MySQL [${dbDatabase}] tại ${dbHost}:${dbPort}...`);
  const conn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbDatabase,
  });

  try {
    for (const doc of KNOWLEDGE_DOCUMENTS) {
      console.log(`\n📄 Đang nạp tài liệu: ${doc.title}...`);
      
      // Xóa bản ghi cũ nếu có để tránh trùng lặp
      const [existing] = await conn.query('SELECT id FROM documents WHERE title = ?', [doc.title]);
      if (existing.length > 0) {
        for (const row of existing) {
          await conn.query('DELETE FROM document_chunks WHERE document_id = ?', [row.id]);
          await conn.query('DELETE FROM documents WHERE id = ?', [row.id]);
        }
        console.log(`   ↪ Đã làm sạch bản ghi cũ.`);
      }

      // Thêm tài liệu mới
      const [docRes] = await conn.query(
        `INSERT INTO documents (uploaded_by, title, file_url, file_type, status) VALUES (?, ?, ?, ?, 'READY')`,
        [doc.uploadedBy, doc.title, doc.fileUrl, doc.fileType]
      );
      const docId = docRes.insertId;

      // Nạp các đoạn Chunks
      for (const chunk of doc.chunks) {
        await conn.query(
          `INSERT INTO document_chunks (document_id, chunk_index, content, embedding) VALUES (?, ?, ?, '[]')`,
          [docId, chunk.index, chunk.content]
        );
        console.log(`   ✅ Đã nạp Chunk #${chunk.index} (${chunk.content.substring(0, 42)}...)`);
      }
    }

    console.log('\n🎉 ========================================================');
    console.log('🧠 CẤP NÃO THÀNH CÔNG CHO AI COPILOT (GLOBAL BENCHMARK 2026)!');
    console.log('Đã bổ sung: Văn hóa Netflix (Radical Candor, Tự do & Trách nhiệm), GitLab (Async, Right to Disconnect, WFH 20tr),');
    console.log('Google (Buddy Noogler, Innovation 10%, L&D 15tr), Spotify (Dual Career Ladder, Mental Health Day),');
    console.log('Microsoft & Meta (Bảo mật Zero-Trust, Responsible AI, Thưởng bằng sáng chế).');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Lỗi khi cấp não:', error.message);
  } finally {
    await conn.end();
  }
}

run();
