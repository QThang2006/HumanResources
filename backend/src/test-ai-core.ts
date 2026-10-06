import { ConfigService } from '@nestjs/config';
import { GeminiService } from './modules/core/ai/gemini.service';
import { VectorService } from './modules/core/ai/vector.service';

async function runTest() {
  console.log('====================================================');
  console.log('🚀 KIỂM THỬ TOÀN DIỆN AI CORE & VECTOR DATABASE (RAG)');
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
  console.log('\n');

  // 4. TEST VECTOR DATABASE & RAG (VECTOR SERVICE + COSINE SIMILARITY + SEMANTIC SEARCH)
  console.log('----------------------------------------------------');
  console.log('4. TEST: VectorService (Chunking + 768-dim Embedding + Cosine Similarity + RAG)');
  console.log('----------------------------------------------------');
  const vectorService = new VectorService(configService);
  console.log(`📌 Trạng thái Vector Engine: ${vectorService.isAvailable() ? '🟢 Sẵn sàng với text-embedding-004' : '🟡 Chế độ Deterministic Semantic Mock Vector (768 chiều)'}`);

  // 4A. Text Chunking
  const sampleHandbookText = `
CHƯƠNG 1: THỜI GIAN LÀM VIỆC VÀ MÔ HÌNH LÀM VIỆC LINH HOẠT (HYBRID WORK)
Thời gian làm việc tiêu chuẩn: Từ Thứ Hai đến Thứ Sáu, từ 08:30 đến 17:30 (nghỉ trưa 1 tiếng từ 12:00 đến 13:00).
Chính sách Hybrid Work: Nhân viên sau khi hoàn thành 02 tháng thử việc được quyền đăng ký làm việc từ xa (Work from Home - WFH) tối đa 02 ngày/tuần với sự chấp thuận của Line Manager.
Giờ làm việc linh hoạt (Flexitime): Check-in từ 08:00 đến 09:30 sáng và đảm bảo đủ 8 tiếng/ngày.

CHƯƠNG 2: CHẾ ĐỘ NGHỈ PHÉP VÀ NGHỈ LỄ TẾT
Nghỉ phép năm có hưởng lương: Nhân viên chính thức được hưởng 14 ngày nghỉ phép có hưởng nguyên lương mỗi năm.
Thâm niên công tác: Cứ mỗi 03 năm làm việc liên tục tại công ty, nhân viên được cộng thêm 01 ngày nghỉ phép năm (tối đa 20 ngày).
Nghỉ ốm đau: Hỗ trợ 03 ngày nghỉ ốm nguyên lương mỗi năm không cần giấy bệnh viện tuyến huyện.

CHƯƠNG 3: BẢO HIỂM SỨC KHỎE CAO CẤP VÀ PHÚC LỢI NỘI TRÚ
Bảo hiểm sức khỏe cao cấp PVI HealthCare cung cấp miễn phí cho toàn bộ nhân viên chính thức ngay sau khi ký hợp đồng.
Hạn mức bảo hiểm nội trú lên tới 120.000.000 VNĐ/năm, điều trị ngoại trú lên tới 15.000.000 VNĐ/năm, bao gồm cả chăm sóc nha khoa 3.000.000 VNĐ/năm.
Ngân sách học tập cá nhân (L&D): Mỗi nhân viên được cấp 10.000.000 VNĐ/năm để thi chứng chỉ quốc tế AWS, Google Cloud, PMP.
  `.trim();

  const chunks = vectorService.chunkText(sampleHandbookText, 350, 60);
  console.log(`\n✂️ Kết quả Text Chunking: Tạo thành ${chunks.length} phân đoạn (chunks):`);
  chunks.forEach((c, idx) => {
    console.log(`  [Chunk #${idx + 1}] (${c.length} ký tự): "${c.slice(0, 70)}..."`);
  });

  // 4B. Sinh Vector Embeddings (768 chiều)
  console.log('\n🧠 Đang tính toán Vector Embeddings (768 chiều) cho từng phân đoạn...');
  const indexedChunks: { id: number; chunkIndex: number; content: string; embedding: number[] }[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const emb = await vectorService.generateEmbedding(chunks[i]);
    indexedChunks.push({
      id: i + 1,
      chunkIndex: i,
      content: chunks[i],
      embedding: emb,
    });
  }
  console.log(`✅ Đã vector hóa ${indexedChunks.length} chunks. Chiều vector: ${indexedChunks[0].embedding.length} dimensions.`);

  // 4C. Tìm kiếm ngữ nghĩa (Semantic Search via Cosine Similarity)
  const testQuery = 'Tôi muốn làm việc từ xa ở nhà (WFH) thì quy định công ty thế nào?';
  console.log(`\n🔍 Câu hỏi kiểm thử: "${testQuery}"`);
  const queryEmbedding = await vectorService.generateEmbedding(testQuery);

  const matchedResults = vectorService.findSimilar(queryEmbedding, indexedChunks, 2);
  console.log(`🎯 Top ${matchedResults.length} phân đoạn khớp ngữ nghĩa nhất:`);
  matchedResults.forEach((r, idx) => {
    console.log(`  Top #${idx + 1} (Cosine Similarity: ${(r.similarity * 100).toFixed(2)}%):`);
    console.log(`  Nội dung trích đoạn: "${r.chunk.content.replace(/\n/g, ' ')}"`);
  });

  // 4D. Thử nghiệm Copilot RAG Response
  if (matchedResults.length > 0) {
    const bestChunk = matchedResults[0].chunk;
    const ragPrompt = `
Dựa vào chính sách công ty sau:
"${bestChunk.content}"
Hãy trả lời ngắn gọn câu hỏi: "${testQuery}"
    `.trim();

    const ragAnswer = await geminiService.generateText(ragPrompt);
    console.log('\n🤖 Câu trả lời từ AI Copilot (RAG):');
    console.log(`"${ragAnswer.trim()}"`);
  }
  console.log('\n');

  // 5. TEST: PHÂN TÍCH CẢM XÚC & NGUY CƠ KIỆT SỨC (analyzeMoodSentiment)
  console.log('----------------------------------------------------');
  console.log('5. TEST: analyzeMoodSentiment() [Engagement & Burnout Agent]');
  console.log('----------------------------------------------------');
  const stressFeedback = 'Dạo này sprint dồn dập quá, mình liên tục phải OT đến 21h đêm và cảm thấy rất mệt mỏi, kiệt sức, deadline đè nặng không kịp thở.';
  console.log(`Lời nhắn nhân viên: "${stressFeedback}"`);
  const moodResult = await geminiService.analyzeMoodSentiment(stressFeedback, 'STRESSED', {
    consecutiveStressDays: 3,
    employeeName: 'Trần Văn Hoàng',
    departmentName: 'Kỹ Thuật Phần Mềm',
  });
  console.log('Cảm xúc nhận diện:', moodResult.sentimentLabel);
  console.log('Điểm cảm xúc (0.0 - 1.0):', moodResult.sentimentScore);
  console.log('Nguy cơ kiệt sức (Burnout Risk):', moodResult.isBurnoutRisk ? '🚨 CÓ NGUY CƠ CAO' : '🟢 Bình thường');
  console.log('Mức độ nghiêm trọng:', moodResult.burnoutSeverity);
  console.log('Điểm số Burnout:', moodResult.burnoutScore + '/100');
  console.log('Từ khóa cảm xúc bắt được:', moodResult.emotionalKeywords);
  console.log('Nguyên nhân cốt lõi:', moodResult.keyStressFactors);
  console.log('Khuyến nghị cho Quản lý / HR (Top 2):', moodResult.actionableRecommendations.slice(0, 2));
  console.log('Lời nhắn thấu cảm:', moodResult.empathyNote);
  console.log('Nguồn:', moodResult.aiGenerated ? `✅ ${geminiService.getModelName()}` : '⚡ Fallback Mock Engine');
  console.log('\n');

  // 6. TEST: TRỢ LÝ HỎI ĐÁP QUY CHẾ 24/7 (chatCopilot)
  console.log('----------------------------------------------------');
  console.log('6. TEST: chatCopilot() [RAG Employee Copilot 24/7]');
  console.log('----------------------------------------------------');
  const copilotQuery = 'Năm nay tôi có bao nhiêu ngày nghỉ phép năm và nếu ốm đột xuất thì sao?';
  console.log(`Câu hỏi của nhân viên: "${copilotQuery}"`);
  const copilotResult = await geminiService.chatCopilot(copilotQuery, [sampleHandbookText]);
  console.log('\nCâu trả lời từ Copilot:');
  console.log(copilotResult.reply);
  console.log('\nTài liệu trích dẫn:', copilotResult.citedSources);
  console.log('Gợi ý câu hỏi tiếp theo:');
  copilotResult.suggestedFollowUpQuestions.forEach((q, idx) => console.log(`  👉 [${idx + 1}] ${q}`));
  console.log('Cần chuyên viên HR hỗ trợ trực tiếp:', copilotResult.requiresHrIntervention ? 'CÓ' : 'KHÔNG');
  console.log('Nguồn:', copilotResult.aiGenerated ? `✅ ${geminiService.getModelName()}` : '⚡ Fallback Mock Engine');
  console.log('\n');

  // 7. TEST: ĐỀ XUẤT KHÓA HỌC BÙ ĐẮP KỸ NĂNG (recommendSkillGapCourse)
  console.log('----------------------------------------------------');
  console.log('7. TEST: recommendSkillGapCourse() [L&D Training Agent]');
  console.log('----------------------------------------------------');
  const missingSkills = ['Message Queue (Apache Kafka / RabbitMQ)', 'Tối ưu hóa Indexing MySQL', 'Docker & Kubernetes'];
  console.log('Kỹ năng thiếu hụt:', missingSkills);

  const availableSampleCourses = [
    {
      id: 101,
      title: 'Xây dựng Hệ thống Phân tán & Message Queue với Apache Kafka',
      skillsProvided: ['Message Queue', 'Kafka', 'Microservices'],
      durationHours: 16,
      courseUrl: 'https://learning.enterprise.vn/courses/kafka-101',
    },
    {
      id: 102,
      title: 'Tối ưu hóa Truy vấn & Thiết kế Lập Chỉ Mục MySQL Chuyên Sâu',
      skillsProvided: ['MySQL', 'Database Indexing', 'SQL Optimization'],
      durationHours: 12,
      courseUrl: 'https://learning.enterprise.vn/courses/mysql-perf',
    },
  ];

  const courseResult = await geminiService.recommendSkillGapCourse(
    missingSkills,
    availableSampleCourses,
    'Junior Backend Developer',
    'Middle Backend Engineer',
  );
  console.log('Tóm tắt đánh giá:', courseResult.summary);
  console.log('Điểm sẵn sàng nghề nghiệp:', courseResult.readinessScore + '%');
  console.log(`Lộ trình đề xuất: ${courseResult.recommendedCourses.length} khóa học:`);
  courseResult.recommendedCourses.forEach((c) => {
    console.log(`\n  [Khóa ${c.learningPathOrder}] ${c.courseTitle} (Ưu tiên: ${c.priority})`);
    console.log(`  ⏱️ Thời lượng: ${c.estimatedTimeToComplete}`);
    console.log(`  🎯 Bù đắp kỹ năng: ${c.matchedMissingSkills.join(', ')}`);
    console.log(`  💡 Lý do: ${c.whyRecommended}`);
  });
  console.log('\nLời khuyên lộ trình:', courseResult.careerAdvice);
  console.log('Nguồn:', courseResult.aiGenerated ? `✅ ${geminiService.getModelName()}` : '⚡ Fallback Mock Engine');

  console.log('\n====================================================');
  console.log('🎉 HOÀN TẤT KIỂM THỬ TOÀN DIỆN CẢ 7 TÍNH NĂNG AI CORE & RAG!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('Lỗi khi chạy test:', err);
  process.exit(1);
});
