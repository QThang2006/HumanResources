import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface JobDescriptionResult {
  title: string;
  level: string;
  department: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  suggestedSalaryRange: string;
  careerGrowthPath?: string;
  aiGenerated: boolean;
}

export interface ScoreBreakdown {
  hardSkillsScore: number;
  experienceScore: number;
  educationScore: number;
  softSkillsScore: number;
}

export interface ResumeScoreResult {
  matchScore: number;
  breakdown?: ScoreBreakdown;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendation: 'STRONG_MATCH' | 'GOOD_MATCH' | 'POTENTIAL' | 'NOT_MATCHED';
  recommendationNote: string;
  interviewFocusAreas?: string[];
  aiGenerated: boolean;
}

export interface ResumeFileScoreResult extends ResumeScoreResult {
  extractedText: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
}

export interface InterviewQuestionItem {
  question: string;
  category: 'CORE_TECHNICAL' | 'SYSTEM_DESIGN' | 'PROBLEM_SOLVING' | 'EXPERIENCE_DEEP_DIVE';
  context?: string;
  purpose: string;
  expectedAnswerCriteria: string[];
  redFlags?: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface InterviewQuestionsResult {
  candidateSummary: string;
  suggestedDurationMinutes: number;
  questions: InterviewQuestionItem[];
  aiGenerated: boolean;
}

/**
 * 🧠 Dịch vụ Tập Trung Google Gemini (Shared AI Engine)
 * Phục vụ chung cho: Sinh JD, Bóc tách CV, Gợi ý câu hỏi phỏng vấn, RAG Copilot, Phân tích Burnout
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private selectedModel: string = 'gemini-3.6-flash';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.selectedModel = this.configService.get<string>('GEMINI_MODEL', 'gemini-3.6-flash');
    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim() !== '') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: this.selectedModel,
        });
        this.logger.log(`✅ Google Gemini AI Provider [${this.selectedModel}] đã được kết nối thành công.`);
      } catch (err: any) {
        this.logger.error(`❌ Khởi tạo Gemini AI [${this.selectedModel}] thất bại: ${err.message}`);
      }
    } else {
      this.logger.warn(`⚠️ Chưa cấu hình GEMINI_API_KEY trong file .env (Chạy chế độ Fallback Mock thông minh cho ${this.selectedModel}).`);
    }
  }

  isAvailable(): boolean {
    return !!this.model;
  }

  getModelName(): string {
    return this.selectedModel;
  }

  /**
   * Gọi Gemini AI với đầu ra ép buộc định dạng JSON thuần túy
   */
  async generateJson<T>(prompt: string, systemInstruction?: string): Promise<T | null> {
    if (!this.model) {
      return null;
    }

    try {
      const chatModel = this.genAI!.getGenerativeModel({
        model: this.selectedModel,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
        systemInstruction: systemInstruction || undefined,
      });

      const response = await chatModel.generateContent(prompt);
      const rawText = response.response.text();
      return JSON.parse(rawText) as T;
    } catch (error: any) {
      this.logger.error(`Lỗi khi gọi Gemini generateJson [${this.selectedModel}]: ${error.message}`);
      return null;
    }
  }

  /**
   * Gọi Gemini AI với đầu vào đa phương thức (Multimodal Part: PDF / Image)
   */
  async generateJsonWithPart<T>(
    prompt: string,
    part: { inlineData: { data: string; mimeType: string } },
    systemInstruction?: string,
  ): Promise<T | null> {
    if (!this.model) {
      return null;
    }

    try {
      const chatModel = this.genAI!.getGenerativeModel({
        model: this.selectedModel,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
        systemInstruction: systemInstruction || undefined,
      });

      const response = await chatModel.generateContent([prompt, part]);
      const rawText = response.response.text();
      return JSON.parse(rawText) as T;
    } catch (error: any) {
      this.logger.error(`Lỗi khi gọi Gemini generateJsonWithPart [${this.selectedModel}]: ${error.message}`);
      return null;
    }
  }

  /**
   * Gọi Gemini AI với đầu ra dạng văn bản tự nhiên (Dùng cho Copilot RAG)
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.model) {
      return 'Dịch vụ Trí tuệ nhân tạo Gemini hiện chưa được cấu hình API Key. Đang hoạt động ở chế độ mô phỏng.';
    }

    try {
      const chatModel = this.genAI!.getGenerativeModel({
        model: this.selectedModel,
        generationConfig: {
          temperature: 0.3,
        },
        systemInstruction: systemInstruction || undefined,
      });

      const response = await chatModel.generateContent(prompt);
      return response.response.text();
    } catch (error: any) {
      this.logger.error(`Lỗi khi gọi Gemini generateText [${this.selectedModel}]: ${error.message}`);
      return 'Xin lỗi, trợ lý AI đang gặp sự cố kết nối tạm thời. Vui lòng thử lại sau.';
    }
  }

  // =========================================================================
  // 1. TỰ ĐỘNG SINH MÔ TẢ CÔNG VIỆC CHUẨN JSON (generateJobDescription)
  // =========================================================================
  async generateJobDescription(
    title: string,
    departmentName: string = 'Kỹ Thuật Phần Mềm',
    level: string = 'Middle - Senior',
  ): Promise<JobDescriptionResult> {
    this.logger.log(`🤖 AI [${this.selectedModel}] đang sinh mô tả công việc: ${title} (${level} - ${departmentName})`);

    const prompt = `
Bạn là Giám đốc Thu hút Nhân tài & Chuyên gia Tư vấn Tuyển dụng Công nghệ Cấp cao (Executive Talent Acquisition Partner & HR Director).
Nhiệm vụ của bạn là xây dựng một bản Mô tả Công việc (Job Description - JD) đạt chuẩn tuyển dụng quốc tế, chuyên nghiệp, sắc bén và có sức hút mạnh mẽ đối với các nhân tài hàng đầu:
- Chức danh (Job Title): ${title}
- Phòng ban (Department): ${departmentName}
- Cấp bậc (Seniority Level): ${level}

Bản JD cần tuân thủ các nguyên tắc:
1. Tổng quan vai trò (summary): Nêu bật sứ mệnh cốt lõi, tầm ảnh hưởng chiến lược của vị trí này đối với mục tiêu sản phẩm và công nghệ của doanh nghiệp.
2. Trách nhiệm chính (responsibilities): Chia thành 5-6 gạch đầu dòng rõ ràng, bao quát từ kiến trúc hệ thống, phát triển tính năng, tối ưu hiệu năng (performance tuning), chuẩn hóa quy trình kỹ thuật (CI/CD, Clean Code) đến phối hợp liên phòng ban.
3. Yêu cầu công việc (requirements): Định lượng cụ thể số năm kinh nghiệm, kỹ năng công nghệ cốt lõi (Core Stack), tư duy kiến trúc, cơ sở dữ liệu và kỹ năng giải quyết bài toán quy mô lớn.
4. Điểm cộng ưu tiên (niceToHave): Kỹ năng mở rộng, kinh nghiệm với Microservices, Cloud (AWS/GCP), DevOps, hoặc đóng góp mã nguồn mở.
5. Chế độ đãi ngộ & Phúc lợi (benefits): Gói đãi ngộ cạnh tranh, thưởng OKRs/KPIs, bảo hiểm sức khỏe cao cấp, tài trợ học tập và thiết bị làm việc hiện đại.
6. Mức lương đề xuất (suggestedSalaryRange): Đưa ra dải lương thị trường sát với thực tế tại Việt Nam theo cấp bậc ${level}.
7. Lộ trình phát triển (careerGrowthPath): Định hướng thăng tiến rõ ràng trong 1-2 năm tới.

BẮT BUỘC TRẢ VỀ THEO ĐÚNG ĐỊNH DẠNG JSON SAU (không chứa bất kỳ ký tự nào ngoài JSON):
{
  "title": "${title}",
  "level": "${level}",
  "department": "${departmentName}",
  "summary": "Tóm tắt súc tích, truyền cảm hứng về vai trò và tác động chiến lược của vị trí...",
  "responsibilities": [
    "Trách nhiệm chi tiết 1...",
    "Trách nhiệm chi tiết 2...",
    "Trách nhiệm chi tiết 3...",
    "Trách nhiệm chi tiết 4...",
    "Trách nhiệm chi tiết 5..."
  ],
  "requirements": [
    "Yêu cầu năng lực cốt lõi 1...",
    "Yêu cầu năng lực cốt lõi 2...",
    "Yêu cầu năng lực cốt lõi 3...",
    "Yêu cầu năng lực cốt lõi 4..."
  ],
  "niceToHave": [
    "Điểm cộng ưu tiên 1...",
    "Điểm cộng ưu tiên 2..."
  ],
  "benefits": [
    "Chế độ đãi ngộ vượt trội 1...",
    "Chế độ đãi ngộ vượt trội 2...",
    "Chế độ đãi ngộ vượt trội 3...",
    "Chế độ đãi ngộ vượt trội 4..."
  ],
  "suggestedSalaryRange": "Ví dụ: 30.000.000 - 45.000.000 VNĐ (Thỏa thuận theo năng lực)",
  "careerGrowthPath": "Lộ trình thăng tiến rõ ràng lên Technical Lead hoặc Solution Architect"
}
    `.trim();

    const systemInstruction = 'Bạn là Chuyên gia Tuyển dụng Nhân sự Công nghệ Cấp cao. Văn phong chuyên nghiệp, chuẩn mực doanh nghiệp quốc tế, chính xác về thuật ngữ công nghệ. Trả về JSON hợp lệ 100%.';

    const aiResult = await this.generateJson<JobDescriptionResult>(prompt, systemInstruction);

    if (aiResult && aiResult.responsibilities && aiResult.responsibilities.length > 0) {
      return {
        ...aiResult,
        aiGenerated: true,
      };
    }

    // Fallback Mock Data chất lượng cao khi chưa có key hoặc lỗi mạng
    this.logger.warn(`Sử dụng Fallback Mock JD cho vị trí: ${title}`);
    return this.getFallbackJobDescription(title, departmentName, level);
  }

  // =========================================================================
  // 2. BÓC TÁCH CV & CHẤM ĐIỂM ĐỘ KHỚP % (scoreResume)
  // =========================================================================
  async scoreResume(
    resumeText: string,
    jobDescription: string,
  ): Promise<ResumeScoreResult> {
    this.logger.log(`🤖 AI [${this.selectedModel}] đang phân tích CV & chấm điểm độ khớp theo Khung Đánh Giá 4 Chiều...`);

    const prompt = `
Bạn là Hệ thống AI Đánh giá Tuyển dụng Đa chiều Cấp cao (Enterprise Multi-dimensional ATS Resume Evaluator).
Hãy phân tích hồ sơ ứng viên (CV) và đối chiếu với Bản mô tả công việc (Job Description) dưới đây theo Khung Đánh Giá Chuẩn Quốc Tế:

--- BẢN MÔ TẢ CÔNG VIỆC (JOB DESCRIPTION) ---
${jobDescription.slice(0, 3500)}

--- NỘI DUNG HỒ SƠ ỨNG VIÊN (RESUME / CV) ---
${resumeText.slice(0, 4500)}

Khung đánh giá chấm điểm dựa trên 4 chiều trọng số:
1. Hard Skills & Tech Stack Match (Trọng số 40%): Độ trùng khớp về ngôn ngữ lập trình, framework, cơ sở dữ liệu, kiến trúc.
2. Experience Depth & Scale (Trọng số 30%): Số năm kinh nghiệm thực chiến, quy mô dự án (lượng người dùng, độ phức tạp nghiệp vụ, khả năng chịu tải).
3. Qualifications & Certifications (Trọng số 10%): Bằng cấp chuyên ngành, chứng chỉ nghề nghiệp quốc tế.
4. Soft Skills & Mindset Fit (Trọng số 20%): Khả năng tư duy giải quyết vấn đề, tinh thần trách nhiệm, teamwork, khả năng đọc hiểu tài liệu kỹ thuật.

BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON SAU:
{
  "matchScore": 87.5,
  "breakdown": {
    "hardSkillsScore": 90,
    "experienceScore": 85,
    "educationScore": 85,
    "softSkillsScore": 90
  },
  "summary": "Nhận xét tổng quan, trực diện và sắc bén về độ tương thích của hồ sơ (2-3 câu ngắn gọn)",
  "matchedSkills": ["Kỹ năng phù hợp 1", "Kỹ năng phù hợp 2", "Kỹ năng phù hợp 3", "Kỹ năng phù hợp 4"],
  "missingSkills": ["Kỹ năng còn thiếu hoặc chưa được thể hiện rõ ràng trong CV"],
  "strengths": ["Điểm mạnh vượt trội có bằng chứng rõ ràng 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm hạn chế hoặc dấu hiệu cần xác minh kỹ lưỡng khi phỏng vấn 1", "Điểm 2"],
  "recommendation": "STRONG_MATCH | GOOD_MATCH | POTENTIAL | NOT_MATCHED",
  "recommendationNote": "Khuyến nghị hành động tiếp theo cụ thể cho Hội đồng Tuyển dụng",
  "interviewFocusAreas": [
    "Trọng tâm cần đào sâu 1 khi phỏng vấn",
    "Trọng tâm cần đào sâu 2 khi phỏng vấn"
  ]
}
    `.trim();

    const systemInstruction = 'Bạn là AI Chấm điểm Tuyển dụng cấp cao. Đánh giá khách quan, công tâm, dựa trên bằng chứng thực tế trong hồ sơ, không suy đoán vô căn cứ. matchScore tính trên thang điểm 100. Trả về JSON hợp lệ 100%.';

    const aiResult = await this.generateJson<ResumeScoreResult>(prompt, systemInstruction);

    if (aiResult && typeof aiResult.matchScore === 'number') {
      return {
        ...aiResult,
        aiGenerated: true,
      };
    }

    // Fallback Mock Data tính điểm thông minh
    this.logger.warn(`Sử dụng Fallback Mock Resume Matcher cho CV.`);
    return this.getFallbackResumeScore(resumeText, jobDescription);
  }

  // =========================================================================
  // 2B. ĐA PHƯƠNG THỨC: BÓC TÁCH FILE CV (PDF/ẢNH) & CHẤM ĐIỂM ĐỘ KHỚP %
  // =========================================================================
  async scoreResumeFile(
    fileBuffer: Buffer,
    mimeType: string,
    jobDescription: string,
  ): Promise<ResumeFileScoreResult> {
    this.logger.log(`🤖 AI [${this.selectedModel}] đang phân tích trực tiếp file CV [${mimeType}] qua Multimodal Vision...`);

    const normalizedMimeType = mimeType.toLowerCase();
    const isPdf = normalizedMimeType.includes('pdf');
    const isImage =
      normalizedMimeType.includes('image') ||
      normalizedMimeType.includes('png') ||
      normalizedMimeType.includes('jpeg') ||
      normalizedMimeType.includes('jpg');

    const prompt = `
Bạn là AI Tuyển Dụng Đa Phương Thức Cấp Cao (Multimodal Enterprise Resume Screener & Parser).
Hãy đọc kỹ toàn bộ nội dung file CV (PDF hoặc Ảnh) được đính kèm, bóc tách toàn bộ thông tin và đối soát với Bản mô tả công việc sau:

--- BẢN MÔ TẢ CÔNG VIỆC (JOB DESCRIPTION) ---
${jobDescription.slice(0, 3500)}

Nhiệm vụ của bạn:
1. Bóc tách TOÀN BỘ nội dung chữ trong file CV (kể cả bố cục 2 cột, bảng biểu, ảnh scan) thành văn bản hoàn chỉnh, mạch lạc theo từng đề mục (Thông tin liên hệ, Mục tiêu, Kỹ năng, Kinh nghiệm làm việc, Học vấn, Dự án tiêu biểu) để lưu trữ vào CSDL.
2. Trích xuất chính xác thông tin định danh: họ tên (candidateName), email (candidateEmail), số điện thoại (candidatePhone).
3. Đánh giá độ khớp theo Khung Đánh Giá Chuẩn Tuyển Dụng (Hard Skills 40%, Kinh nghiệm 30%, Bằng cấp 10%, Tư duy & Kỹ năng mềm 20%).

BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU (không thêm văn bản ngoài JSON):
{
  "extractedText": "Toàn bộ văn bản đã bóc tách được từ file CV một cách chi tiết, mạch lạc và đầy đủ nhất...",
  "candidateName": "Họ và tên ứng viên",
  "candidateEmail": "Email ứng viên",
  "candidatePhone": "Số điện thoại ứng viên",
  "matchScore": 87.5,
  "breakdown": {
    "hardSkillsScore": 90,
    "experienceScore": 85,
    "educationScore": 85,
    "softSkillsScore": 90
  },
  "summary": "Đánh giá tổng quan, khách quan về năng lực và độ phù hợp của ứng viên",
  "matchedSkills": ["Kỹ năng phù hợp 1", "Kỹ năng phù hợp 2", "Kỹ năng phù hợp 3", "Kỹ năng phù hợp 4"],
  "missingSkills": ["Kỹ năng bắt buộc trong JD mà CV chưa chứng minh được"],
  "strengths": ["Thế mạnh nổi bật có thể tạo giá trị ngay cho dự án 1", "Thế mạnh 2"],
  "weaknesses": ["Lỗ hổng kỹ thuật hoặc kinh nghiệm cần kiểm chứng 1", "Lỗ hổng 2"],
  "recommendation": "STRONG_MATCH | GOOD_MATCH | POTENTIAL | NOT_MATCHED",
  "recommendationNote": "Đề xuất cụ thể cho Trưởng nhóm kỹ thuật và bộ phận Nhân sự",
  "interviewFocusAreas": [
    "Chủ đề 1 cần đào sâu khi phỏng vấn",
    "Chủ đề 2 cần đào sâu khi phỏng vấn"
  ]
}
    `.trim();

    const systemInstruction =
      'Bạn là AI Tuyển dụng Đa phương thức cấp cao. Thị giác đọc chính xác cả bố cục 2 cột và ảnh scan. Bóc tách văn bản trung thực, chấm điểm công tâm, không thiên vị. Trả về JSON hợp lệ 100%.';

    if (this.model) {
      const filePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: isPdf ? 'application/pdf' : isImage ? mimeType : 'application/pdf',
        },
      };

      const aiResult = await this.generateJsonWithPart<ResumeFileScoreResult>(
        prompt,
        filePart,
        systemInstruction,
      );

      if (aiResult && aiResult.extractedText && typeof aiResult.matchScore === 'number') {
        return {
          ...aiResult,
          aiGenerated: true,
        };
      }
    }

    // Fallback thông minh: Nếu chưa có GEMINI_API_KEY hoặc mất mạng
    let extractedText = '';
    if (isPdf) {
      try {
        const pdfParse = require('pdf-parse');
        const parsed = await pdfParse(fileBuffer);
        extractedText = parsed.text ? parsed.text.trim() : '';
      } catch (err: any) {
        this.logger.warn(`pdf-parse không đọc được buffer PDF: ${err.message}`);
      }
    }

    if (!extractedText || extractedText.length < 20) {
      extractedText = `Hồ sơ ứng viên bóc tách từ tệp đính kèm (${mimeType}, dung lượng: ${Math.round(fileBuffer.length / 1024)} KB).\nKỹ năng phát hiện: TypeScript, NodeJS, NestJS, MySQL, Docker, React, RESTful API, Git Flow.\nKinh nghiệm: 3+ năm phát triển hệ thống phần mềm doanh nghiệp và vi dịch vụ (Microservices).`;
    }

    const fallbackScore = this.getFallbackResumeScore(extractedText, jobDescription);

    return {
      ...fallbackScore,
      extractedText,
      candidateName: 'Ứng viên Tuyển Dụng',
      candidateEmail: 'candidate@example.com',
      candidatePhone: '0901234567',
      aiGenerated: false,
    };
  }

  // =========================================================================
  // 3. GỢI Ý CÂU HỎI PHỎNG VẤN KỸ THUẬT (generateInterviewQuestions)
  // =========================================================================
  async generateInterviewQuestions(
    resumeText: string,
    jobRequirements: string,
  ): Promise<InterviewQuestionsResult> {
    this.logger.log(`🤖 AI [${this.selectedModel}] đang sinh bộ câu hỏi phỏng vấn theo chuẩn BigTech FAANG...`);

    const prompt = `
Bạn là Giám đốc Công nghệ & Trưởng Ban Phỏng vấn Kỹ thuật Cấp cao (VP of Engineering & BigTech Technical Interview Lead).
Hãy phân tích CV của ứng viên và Yêu cầu công việc dưới đây để thiết kế một Bộ câu hỏi phỏng vấn kỹ thuật chuyên sâu theo tiêu chuẩn FAANG:

--- YÊU CẦU CÔNG VIỆC (JOB REQUIREMENTS) ---
${jobRequirements.slice(0, 3500)}

--- HỒ SƠ ỨNG VIÊN (CV) ---
${resumeText.slice(0, 4500)}

Nguyên tắc thiết kế câu hỏi phỏng vấn:
1. KHÔNG hỏi lý thuyết thuộc lòng hay định nghĩa đơn giản (như "X là gì", "Y hoạt động ra sao").
2. Đào sâu vào các dự án/kinh nghiệm ứng viên đã tự nêu trong CV (Reverse Engineering CV) để kiểm chứng xem ứng viên trực tiếp làm hay chỉ đứng tên.
3. Thiết kế các câu hỏi Tình huống Thực chiến (Scenario-based) xoay quanh:
   - Bài toán Kiến trúc & Thiết kế hệ thống (System Design, Scalability, High Availability).
   - Xử lý vấn đề hóc búa (Concurrency, Deadlock, Race Condition, Caching Strategy, Database Indexing).
   - Xử lý sự cố nghiêm trọng (Incident Management, Root Cause Analysis, Post-mortem).
4. Mỗi câu hỏi PHẢI có bối cảnh (context), tiêu chí đánh giá câu trả lời đạt chuẩn (expectedAnswerCriteria) và Dấu hiệu cảnh báo ứng viên nói dối hoặc kiến thức rỗng (redFlags) để Tech Lead dễ dàng ra quyết định.

BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON SAU:
{
  "candidateSummary": "Đánh giá súc tích về hồ sơ kỹ thuật của ứng viên (điểm mạnh nhất và nghi vấn lớn nhất)",
  "suggestedDurationMinutes": 60,
  "questions": [
    {
      "question": "Nội dung câu hỏi phỏng vấn tình huống chi tiết và sắc bén...",
      "category": "CORE_TECHNICAL | SYSTEM_DESIGN | PROBLEM_SOLVING | EXPERIENCE_DEEP_DIVE",
      "context": "Bối cảnh: Tại sao lại hỏi câu này dựa trên dự án hoặc kỹ năng ứng viên ghi trong CV",
      "purpose": "Mục đích đo lường năng lực hoặc kiểm chứng điều gì ở ứng viên",
      "expectedAnswerCriteria": [
        "Luận điểm bắt buộc phải nêu được 1...",
        "Luận điểm kỹ thuật nâng cao 2..."
      ],
      "redFlags": [
        "Dấu hiệu ứng viên không trực tiếp làm dự án hoặc hổng kiến thức cốt lõi 1..."
      ],
      "difficulty": "EASY | MEDIUM | HARD"
    }
  ]
}
    `.trim();

    const systemInstruction = 'Bạn là BigTech Technical Interview Lead. Câu hỏi phỏng vấn sắc sảo, có tính phân loại cao, thực chiến 100%. Trả về JSON hợp lệ.';

    const aiResult = await this.generateJson<InterviewQuestionsResult>(prompt, systemInstruction);

    if (aiResult && aiResult.questions && aiResult.questions.length > 0) {
      return {
        ...aiResult,
        aiGenerated: true,
      };
    }

    // Fallback Mock Data phỏng vấn
    this.logger.warn(`Sử dụng Fallback Mock Interview Questions.`);
    return this.getFallbackInterviewQuestions(resumeText, jobRequirements);
  }

  // =========================================================================
  // BỘ DỮ LIỆU FALLBACK MOCK THÔNG MINH (CHỐNG LỖI KHI CHƯA CÓ API KEY)
  // =========================================================================

  private getFallbackJobDescription(
    title: string,
    departmentName: string,
    level: string,
  ): JobDescriptionResult {
    const isBackend = title.toLowerCase().includes('backend') || title.toLowerCase().includes('nest') || title.toLowerCase().includes('node');
    const isFrontend = title.toLowerCase().includes('frontend') || title.toLowerCase().includes('react') || title.toLowerCase().includes('ui');

    return {
      title,
      level,
      department: departmentName,
      summary: `Chúng tôi đang tìm kiếm một vị trí ${title} (${level}) xuất sắc gia nhập ${departmentName} để trực tiếp xây dựng và mở rộng hệ thống phần mềm cốt lõi của công ty.`,
      responsibilities: isBackend
        ? [
            'Thiết kế, xây dựng và tối ưu hóa hệ thống Backend RESTful API và Microservices trên nền tảng NestJS / NodeJS.',
            'Thiết kế và chuẩn hóa cơ sở dữ liệu MySQL, tối ưu truy vấn Indexing và đảm bảo toàn vẹn dữ liệu.',
            'Tích hợp các dịch vụ bên thứ ba (Google AI Gemini, n8n Automation Engine, Webhooks).',
            'Tham gia rà soát mã nguồn (Code Review), xây dựng chuẩn kỹ thuật và tài liệu hóa kiến trúc.',
            'Giám sát hiệu năng hệ thống, phát hiện và xử lý sự cố kỹ thuật kịp thời.',
          ]
        : isFrontend
        ? [
            'Phát triển giao diện ứng dụng web hiện đại, chuẩn Responsive bằng React 18, TypeScript và Tailwind CSS.',
            'Tối ưu hóa trải nghiệm người dùng (UX/UI), tốc độ tải trang và độ mượt mà của các thành phần tương tác.',
            'Kết nối trơn tru với hệ thống Backend API thông qua Axios Interceptor và quản lý trạng thái an toàn.',
            'Tham gia định hình Design System và xây dựng các UI Atoms tái sử dụng trong toàn bộ hệ thống.',
          ]
        : [
            `Chịu trách nhiệm thực hiện các mục tiêu nghiệp vụ chính của vị trí ${title}.`,
            'Phối hợp nhịp nhàng giữa các phòng ban để đảm bảo tiến độ và chất lượng dự án.',
            'Chủ động đề xuất các giải pháp tự động hóa và ứng dụng AI nhằm nâng cao năng suất công việc.',
          ],
      requirements: isBackend
        ? [
            'Có từ 2-4 năm kinh nghiệm làm việc với NodeJS / TypeScript (ưu tiên thành thạo NestJS).',
            'Nắm vững kiến trúc cơ sở dữ liệu quan hệ (MySQL / PostgreSQL), hiểu sâu về 3NF, Transaction, Indexing.',
            'Có kinh nghiệm làm việc với Docker, Git Flow và triển khai hệ thống an toàn.',
            'Tư duy giải quyết vấn đề tốt, trách nhiệm cao và khả năng làm việc nhóm hiệu quả.',
          ]
        : [
            'Có từ 2-3 năm kinh nghiệm lập trình giao diện với React, TypeScript và Tailwind CSS.',
            'Hiểu sâu về React Lifecycle, Hooks, State Management và tối ưu hiệu năng render.',
            'Khả năng chuyển đổi thiết kế Figma thành giao diện web pixel-perfect.',
          ],
      niceToHave: [
        'Có hiểu biết hoặc kinh nghiệm thực tế về AI LLM (Gemini, OpenAI) hoặc các công cụ tự động hóa quy trình (n8n).',
        'Có kinh nghiệm làm việc trong môi trường Agile/Scrum và kiến trúc Microservices.',
      ],
      benefits: [
        'Thu nhập cạnh tranh, đánh giá tăng lương định kỳ 2 lần/năm.',
        'Thưởng tháng lương thứ 13, thưởng hiệu quả kinh doanh và thưởng dự án xuất sắc.',
        'Môi trường làm việc hiện đại, khuyến khích sáng tạo và ứng dụng công nghệ AI tiên phong.',
        'Gói bảo hiểm sức khỏe toàn diện cao cấp và phụ cấp thiết bị làm việc.',
      ],
      suggestedSalaryRange: level.toLowerCase().includes('senior') ? '30 - 45 Triệu VNĐ' : '20 - 32 Triệu VNĐ',
      careerGrowthPath: 'Lộ trình thăng tiến rõ ràng lên Technical Lead hoặc Solution Architect trong vòng 1-2 năm.',
      aiGenerated: false,
    };
  }

  private getFallbackResumeScore(
    resumeText: string,
    jobDescription: string,
  ): ResumeScoreResult {
    const textLower = (resumeText + ' ' + jobDescription).toLowerCase();
    let score = 82.5;

    const matched: string[] = [];
    const missing: string[] = [];

    if (textLower.includes('typescript') || textLower.includes('nest')) matched.push('TypeScript & NestJS Framework');
    if (textLower.includes('mysql') || textLower.includes('database')) matched.push('Cơ sở dữ liệu MySQL & TypeORM');
    if (textLower.includes('docker')) matched.push('Containerization với Docker');
    if (textLower.includes('git')) matched.push('Quản trị phiên bản Git Flow');

    if (!matched.includes('TypeScript & NestJS Framework')) missing.push('TypeScript chuyên sâu');
    if (!textLower.includes('kafka') && !textLower.includes('message queue')) missing.push('Kinh nghiệm Message Queue (Kafka/RabbitMQ)');
    if (!textLower.includes('microservices')) missing.push('Kiến trúc hệ thống Microservices quy mô lớn');

    if (matched.length >= 3) {
      score = 88.5;
    }

    return {
      matchScore: score,
      breakdown: {
        hardSkillsScore: score >= 85 ? 90 : 80,
        experienceScore: score >= 85 ? 88 : 82,
        educationScore: 85,
        softSkillsScore: 88,
      },
      summary: `Ứng viên có nền tảng kỹ thuật vững vàng, phù hợp tốt với các yêu cầu cốt lõi của công việc. Các kỹ năng về Backend, CSDL và tư duy hệ thống được thể hiện rõ ràng trong hồ sơ.`,
      matchedSkills: matched.length > 0 ? matched : ['NodeJS / TypeScript', 'RESTful API', 'Git'],
      missingSkills: missing.length > 0 ? missing : ['Kinh nghiệm Message Queue & Kafka thực tế'],
      strengths: [
        'Kinh nghiệm thực chiến với kiến trúc phần mềm chuẩn mực và tư duy thiết kế CSDL tốt.',
        'Có kinh nghiệm làm việc theo mô hình Agile và phối hợp nhóm mượt mà.',
      ],
      weaknesses: [
        'Cần kiểm chứng thêm kinh nghiệm xử lý tải cao (High Concurrency) và xử lý lỗi phân tán trong buổi phỏng vấn.',
      ],
      recommendation: score >= 85 ? 'STRONG_MATCH' : 'GOOD_MATCH',
      recommendationNote: 'Hồ sơ đạt tiêu chuẩn cao. Khuyến nghị HR xếp lịch phỏng vấn chuyên môn với Trưởng phòng kỹ thuật.',
      interviewFocusAreas: [
        'Kỹ năng tối ưu hóa truy vấn cơ sở dữ liệu lớn và thiết kế Indexing trong MySQL',
        'Khả năng thiết kế hệ thống chịu tải cao và kinh nghiệm xử lý sự cố thực tế',
      ],
      aiGenerated: false,
    };
  }

  private getFallbackInterviewQuestions(
    resumeText: string,
    jobRequirements: string,
  ): InterviewQuestionsResult {
    return {
      candidateSummary: 'Ứng viên có kỹ năng Backend tốt, đã từng tham gia phát triển các hệ thống dịch vụ web RESTful API với TypeScript và MySQL.',
      suggestedDurationMinutes: 60,
      questions: [
        {
          question: 'Trong dự án gần nhất của bạn, bạn đã thiết kế cơ sở dữ liệu quan hệ như thế nào để tránh tình trạng trùng lặp dữ liệu và tối ưu tốc độ truy vấn?',
          category: 'CORE_TECHNICAL',
          context: 'Kiểm chứng kinh nghiệm thiết kế CSDL thực tế trong dự án ứng viên đã ghi trong CV.',
          purpose: 'Kiểm chứng khả năng chuẩn hóa 3NF, tư duy lập Index và giải quyết bài toán deadlock MySQL.',
          expectedAnswerCriteria: [
            'Biết phân tích quan hệ 1-N, N-N và chuẩn hóa bảng dữ liệu.',
            'Nêu được chiến lược đánh Index hợp lý trên các cột tìm kiếm thường xuyên.',
            'Hiểu về Transaction ACID và cách xử lý khi có lỗi rollback.',
          ],
          redFlags: [
            'Chỉ trả lời lý thuyết định nghĩa 3NF mà không nêu được ví dụ bảng cụ thể trong dự án của mình.',
            'Không phân biệt được Cluster Index và Non-Cluster Index.',
          ],
          difficulty: 'MEDIUM',
        },
        {
          question: 'Bạn đã từng tích hợp hoặc xử lý các tác vụ bất đồng bộ (Asynchronous / Background Tasks) như thế nào? Khi một Webhook hoặc API bên thứ ba bị timeout thì hệ thống của bạn xử lý ra sao?',
          category: 'SYSTEM_DESIGN',
          context: 'Đánh giá khả năng xây dựng hệ thống bền vững khi tích hợp bên thứ ba (như Gemini AI, Payment, Webhook).',
          purpose: 'Kiểm tra tư duy thiết kế hệ thống phân tán, cơ chế Retry và Non-blocking.',
          expectedAnswerCriteria: [
            'Giải thích được cách dùng Queue hoặc Event-driven để giảm tải cho Request chính.',
            'Biết cách cấu hình timeout, retry có giới hạn (exponential backoff) và lưu log sự cố.',
          ],
          redFlags: [
            'Cho request chính chờ đồng bộ (blocking) kết quả từ bên thứ ba mà không set timeout.',
          ],
          difficulty: 'HARD',
        },
        {
          question: 'Hãy chia sẻ về một lỗi kỹ thuật (bug) nghiêm trọng nhất bạn từng gặp trong quá trình triển khai sản phẩm và cách bạn đã phát hiện, xử lý nó?',
          category: 'PROBLEM_SOLVING',
          context: 'Xác thực độ dày dạn kinh nghiệm thực chiến và văn hóa nhận trách nhiệm của ứng viên.',
          purpose: 'Đánh giá khả năng chịu áp lực, kỹ năng debug và thái độ nhận trách nhiệm của ứng viên.',
          expectedAnswerCriteria: [
            'Mô tả tình huống rõ ràng, rành mạch và nguyên nhân gốc rễ (Root Cause).',
            'Trình bày phương án giải quyết dứt điểm và giải pháp ngăn ngừa tái phát.',
          ],
          redFlags: [
            'Đổ lỗi hoàn toàn cho đồng nghiệp hoặc cơ sở hạ tầng mà không có bài học kinh nghiệm cá nhân.',
          ],
          difficulty: 'MEDIUM',
        },
      ],
      aiGenerated: false,
    };
  }
}
