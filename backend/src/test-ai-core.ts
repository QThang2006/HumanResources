import { ConfigService } from '@nestjs/config';
import { GeminiService } from './modules/core/ai/gemini.service';

async function runTest() {
  console.log('====================================================');
  console.log('🚀 KIỂM THỬ 3 TÍNH NĂNG AI CORE (GEMINI SERVICE)');
  console.log('====================================================\n');

  const configService = new ConfigService();
  const geminiService = new GeminiService(configService);

  console.log(`📌 Trạng thái Gemini AI: ${geminiService.isAvailable() ? '🟢 Sẵn sàng với API Key' : '🟡 Chế độ Fallback Mock thông minh'}\n`);

  // 1. TEST SINH JD CHUẨN JSON
  console.log('----------------------------------------------------');
  console.log('1. TEST: generateJobDescription()');
  console.log('----------------------------------------------------');
  const jdResult = await geminiService.generateJobDescription(
    'Senior Backend Engineer (NestJS & MySQL)',
    'Kỹ Thuật Phần Mềm',
    'Senior',
  );
  console.log('Tiêu đề:', jdResult.title);
  console.log('Cấp bậc:', jdResult.level);
  console.log('Lương đề xuất:', jdResult.suggestedSalaryRange);
  console.log('Tóm tắt:', jdResult.summary);
  console.log('Trách nhiệm (Top 2):', jdResult.responsibilities.slice(0, 2));
  console.log('Yêu cầu (Top 2):', jdResult.requirements.slice(0, 2));
  console.log('Nguồn:', jdResult.aiGenerated ? `✅ ${geminiService.getModelName()}` : '⚡ Fallback Mock Engine');
  console.log('\n');

  // 2. TEST CHẤM ĐIỂM CV & AI MATCHER %
  console.log('----------------------------------------------------');
  console.log('2. TEST: scoreResume()');
  console.log('----------------------------------------------------');
  const sampleCV = `
  Họ và tên: Nguyễn Văn Nam
  Email: nam.nguyen@gmail.com
  Kỹ năng: TypeScript, NodeJS, NestJS, MySQL, Docker, RESTful API, TypeORM, Git Flow.
  Kinh nghiệm: 3 năm Backend Developer tại công ty công nghệ FinTech. Thiết kế hệ thống API cho 50.000 người dùng hàng ngày.
  `;
  const sampleJob = `
  Vị trí: Senior Backend Engineer (NestJS & MySQL)
  Yêu cầu: Thành thạo TypeScript, NestJS, tối ưu hóa truy vấn MySQL, hiểu biết về Docker và kiến trúc Microservices.
  `;
  const scoreResult = await geminiService.scoreResume(sampleCV, sampleJob);
  console.log('Điểm số phù hợp (Match Score):', scoreResult.matchScore + '%');
  console.log('Đánh giá:', scoreResult.recommendation);
  console.log('Kỹ năng khớp:', scoreResult.matchedSkills);
  console.log('Kỹ năng còn thiếu:', scoreResult.missingSkills);
  console.log('Tóm tắt:', scoreResult.summary);
  console.log('Khuyến nghị:', scoreResult.recommendationNote);
  console.log('Nguồn:', scoreResult.aiGenerated ? `✅ ${geminiService.getModelName()}` : '⚡ Fallback Mock Engine');
  console.log('\n');

  // 2B. TEST ĐA PHƯƠNG THỨC: BÓC TÁCH FILE CV (PDF/ẢNH) & TỰ ĐỘNG LƯU raw_cv_text
  console.log('----------------------------------------------------');
  console.log('2B. TEST: scoreResumeFile() [Đa phương thức: PDF / Ảnh]');
  console.log('----------------------------------------------------');
  const dummyFileBuffer = Buffer.from(
    '%PDF-1.4 Mock resume file for Nguyen Van Nam with skills: TypeScript, NestJS, MySQL, Docker',
  );
  const fileScoreResult = await geminiService.scoreResumeFile(
    dummyFileBuffer,
    'application/pdf',
    sampleJob,
  );
  console.log('Bóc tách toàn bộ Text (Lưu vào cột raw_cv_text):');
  console.log(' > ' + fileScoreResult.extractedText.split('\n')[0]);
  console.log('Điểm số phù hợp (Match Score):', fileScoreResult.matchScore + '%');
  console.log('Tên ứng viên tự nhận diện:', fileScoreResult.candidateName);
  console.log('Email ứng viên:', fileScoreResult.candidateEmail);
  console.log('Kỹ năng khớp:', fileScoreResult.matchedSkills);
  console.log('Nguồn:', fileScoreResult.aiGenerated ? `✅ ${geminiService.getModelName()}` : '⚡ Fallback Mock Engine');
  console.log('\n');

  // 3. TEST GỢI Ý CÂU HỎI PHỎNG VẤN KỸ THUẬT
  console.log('----------------------------------------------------');
  console.log('3. TEST: generateInterviewQuestions()');
  console.log('----------------------------------------------------');
  const questionsResult = await geminiService.generateInterviewQuestions(sampleCV, sampleJob);
  console.log('Tóm tắt ứng viên:', questionsResult.candidateSummary);
  console.log('Thời lượng phỏng vấn đề xuất:', questionsResult.suggestedDurationMinutes + ' phút');
  console.log(`Số câu hỏi sinh ra: ${questionsResult.questions.length} câu:`);
  questionsResult.questions.forEach((q, idx) => {
    console.log(`\n  [Câu ${idx + 1}] (${q.difficulty} - ${q.category}):`);
    console.log(`  ❓ Câu hỏi: ${q.question}`);
    console.log(`  🎯 Mục đích: ${q.purpose}`);
    console.log(`  📋 Tiêu chí đánh giá (Top 1): ${q.expectedAnswerCriteria[0]}`);
  });
  console.log('\nNguồn:', questionsResult.aiGenerated ? `✅ ${geminiService.getModelName()}` : '⚡ Fallback Mock Engine');
  console.log('\n====================================================');
  console.log('🎉 HOÀN TẤT KIỂM THỬ 3 TÍNH NĂNG AI CORE THÀNH CÔNG!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('Lỗi khi chạy test:', err);
  process.exit(1);
});
