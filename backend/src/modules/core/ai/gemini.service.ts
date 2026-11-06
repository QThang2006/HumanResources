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

export interface JobDescriptionContext {
  skills?: string;
  experienceYears?: string;
  employmentType?: string;
  location?: string;
  salaryRange?: string;
  specialNotes?: string;
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

// =========================================================================
// 4. INTERFACES CHO PHÂN TÍCH CẢM XÚC & NGUY CƠ KIỆT SỨC (BURNOUT RISK)
// =========================================================================
export interface MoodSentimentResult {
  sentimentLabel: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sentimentScore: number; // 0.0 (rất tiêu cực) đến 1.0 (rất tích cực)
  isBurnoutRisk: boolean;
  burnoutSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  burnoutScore: number; // 0 - 100
  keyStressFactors: string[];
  emotionalKeywords: string[];
  actionableRecommendations: string[];
  empathyNote: string;
  aiGenerated: boolean;
}

// =========================================================================
// 5. INTERFACES CHO TRỢ LÝ HỎI ĐÁP QUY CHẾ 24/7 (RAG COPILOT)
// =========================================================================
export interface CopilotChatResult {
  query: string;
  reply: string;
  citedSources: string[];
  suggestedFollowUpQuestions: string[];
  requiresHrIntervention: boolean;
  aiGenerated: boolean;
}

// =========================================================================
// 6. INTERFACES CHO ĐỀ XUẤT KHÓA HỌC BÙ ĐẮP KỸ NĂNG (SKILL GAP COURSE)
// =========================================================================
export interface CourseRecommendationItem {
  courseId?: number;
  courseTitle: string;
  matchedMissingSkills: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedTimeToComplete: string;
  whyRecommended: string;
  learningPathOrder: number;
}

export interface SkillGapCourseResult {
  summary: string;
  skillGapsIdentified: string[];
  readinessScore: number; // 0 - 100%
  recommendedCourses: CourseRecommendationItem[];
  careerAdvice: string;
  aiGenerated: boolean;
}

export interface GeminiJsonOptions {
  /** Total time allowed across candidate models for this operation. */
  timeoutMs: number;
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
  private strictLive: boolean = false;

  constructor(private readonly configService: ConfigService) {
    this.refreshConfiguration();
  }

  refreshConfiguration() {
    this.genAI = null;
    this.model = null;
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.selectedModel = this.configService.get<string>('GEMINI_MODEL', 'gemini-3.6-flash');
    this.strictLive = this.configService.get<string>('GEMINI_STRICT_LIVE') === 'true';

    if (apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.trim() !== '' && !/^https?:\/\//i.test(apiKey.trim())) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: this.selectedModel,
        });
        this.logger.log(`✅ Google Gemini AI Provider [${this.selectedModel}] (Strict Live: ${this.strictLive}) đã được kết nối thành công.`);
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
   * 🔄 Cơ chế Exponential Backoff Retry chống sập khi dính Rate Limit (HTTP 429) hoặc mạng chập chờn
   */
  private async retryOperation<T>(
    fn: () => Promise<T>,
    operationName: string,
    maxRetries = 3,
    initialDelayMs = 1000,
  ): Promise<T> {
    let delay = initialDelayMs;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        const isRateLimit =
          error.message?.includes('429') ||
          error.status === 429 ||
          error.message?.includes('Resource has been exhausted') ||
          error.message?.includes('Quota exceeded');
        const isTransient =
          isRateLimit ||
          error.message?.includes('503') ||
          error.message?.includes('fetch failed') ||
          error.message?.includes('ECONNRESET');

        if (attempt < maxRetries && isTransient) {
          this.logger.warn(
            `[Gemini Retry] Thử lại [${operationName}] (lần ${attempt}/${maxRetries}) sau ${delay}ms do: ${error.message}`,
          );
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2; // 1s -> 2s -> 4s
        } else {
          throw error;
        }
      }
    }
    throw new Error(`[Gemini Retry] Vượt quá số lần thử lại tối đa cho ${operationName}`);
  }

  /**
   * Danh sách candidate models theo thứ tự ưu tiên:
   * 1. gemini-flash-lite-latest  (~664ms) ← Nhanh nhất, dùng cho câu trả lời đơn giản
   * 2. gemini-3.1-flash-lite     (~838ms) ← Dự phòng lite
   * 3. gemini-3.5-flash          (~6.5s)  ← Mạnh hơn, dùng khi lite không đủ
   * 4. Model chính từ .env       (fallback cuối)
   */
  private getCandidateModels(): string[] {
    const fastModels = [
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
    ];
    // Thêm model chính (từ .env) vào cuối nếu chưa có trong danh sách
    return Array.from(new Set([...fastModels, this.selectedModel]));
  }

  /**
   * Gọi Gemini AI với đầu ra ép buộc định dạng JSON thuần túy
   */
  async generateJson<T>(prompt: string, systemInstruction?: string, options?: GeminiJsonOptions): Promise<T | null> {
    if (!this.genAI) {
      if (this.strictLive) {
        throw new Error(`[STRICT LIVE ERROR] Gemini AI chưa được khởi tạo. Vui lòng cấu hình GEMINI_API_KEY.`);
      }
      return null;
    }

    const candidateModels = this.getCandidateModels();
    let lastError: any = null;
    const deadline = options ? Date.now() + options.timeoutMs : null;

    for (const modelName of candidateModels) {
      const remaining = deadline === null ? undefined : deadline - Date.now();
      if (remaining !== undefined && remaining <= 0) break;
      try {
        const chatModel = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
          systemInstruction: systemInstruction || undefined,
        });

        const response = await chatModel.generateContent(prompt, remaining === undefined ? undefined : { timeout: remaining });
        const rawText = response.response.text();
        return JSON.parse(rawText) as T;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Gemini generateJson [${modelName}] gặp lỗi (${error.message?.substring(0, 80)}...). Thử model kế tiếp...`);
      }
    }

    this.logger.error(`Lỗi khi gọi Gemini generateJson qua tất cả candidate models: ${lastError?.message}`);
    if (this.strictLive) {
      throw new Error(`[STRICT LIVE ERROR] Gọi Gemini AI thất bại: ${lastError?.message}`);
    }
    return null;
  }

  /**
   * Gọi Gemini AI với đầu vào đa phương thức (Multimodal Part: PDF / Image)
   */
  async generateJsonWithPart<T>(
    prompt: string,
    part: { inlineData: { data: string; mimeType: string } },
    systemInstruction?: string,
  ): Promise<T | null> {
    if (!this.genAI) {
      if (this.strictLive) {
        throw new Error(`[STRICT LIVE ERROR] Gemini AI chưa được khởi tạo. Vui lòng cấu hình GEMINI_API_KEY.`);
      }
      return null;
    }

    const candidateModels = this.getCandidateModels();
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const chatModel = this.genAI.getGenerativeModel({
          model: modelName,
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
        lastError = error;
        this.logger.warn(`Gemini generateJsonWithPart [${modelName}] gặp lỗi (${error.message?.substring(0, 80)}...). Thử model kế tiếp...`);
      }
    }

    this.logger.error(`Lỗi khi gọi Gemini generateJsonWithPart qua tất cả candidate models: ${lastError?.message}`);
    if (this.strictLive) {
      throw new Error(`[STRICT LIVE ERROR] Gọi Gemini AI thất bại: ${lastError?.message}`);
    }
    return null;
  }

  /**
   * Gọi Gemini AI với đầu ra dạng văn bản tự nhiên (Dùng cho Copilot RAG)
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.genAI) {
      if (this.strictLive) {
        throw new Error(`[STRICT LIVE ERROR] Gemini AI chưa được khởi tạo. Vui lòng cấu hình GEMINI_API_KEY.`);
      }
      return 'Dịch vụ Trí tuệ nhân tạo Gemini hiện chưa được cấu hình API Key. Đang hoạt động ở chế độ mô phỏng.';
    }

    const candidateModels = this.getCandidateModels();
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const chatModel = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3,
          },
          systemInstruction: systemInstruction || undefined,
        });

        const response = await chatModel.generateContent(prompt);
        const replyText = response.response.text();
        if (replyText && replyText.trim().length > 0) {
          return replyText;
        }
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Gemini generateText [${modelName}] gặp lỗi (${error.message?.substring(0, 80)}...). Thử model kế tiếp...`);
      }
    }

    this.logger.error(`Lỗi khi gọi Gemini generateText qua tất cả candidate models: ${lastError?.message}`);
    if (this.strictLive) {
      throw new Error(`[STRICT LIVE ERROR] Gọi Gemini AI thất bại: ${lastError?.message}`);
    }
    return '';
  }

  // =========================================================================
  // 1. TỰ ĐỘNG SINH MÔ TẢ CÔNG VIỆC CHUẨN JSON (generateJobDescription)
  // =========================================================================
  async generateJobDescription(
    title: string,
    departmentName: string = 'Kỹ Thuật Phần Mềm',
    level: string = 'Middle - Senior',
    context?: JobDescriptionContext,
  ): Promise<JobDescriptionResult> {
    this.logger.log(`🤖 AI [${this.selectedModel}] đang sinh mô tả công việc: ${title} (${level} - ${departmentName})`);

    const contextLines: string[] = [];
    if (context?.skills?.trim()) {
      contextLines.push(`- Kỹ năng & Công nghệ trọng tâm (Tech Stack bắt buộc): ${context.skills.trim()}`);
    }
    if (context?.experienceYears?.trim()) {
      contextLines.push(`- Số năm kinh nghiệm yêu cầu: ${context.experienceYears.trim()}`);
    }
    if (context?.employmentType?.trim()) {
      contextLines.push(`- Hình thức làm việc: ${context.employmentType.trim()}`);
    }
    if (context?.location?.trim()) {
      contextLines.push(`- Địa điểm làm việc: ${context.location.trim()}`);
    }
    if (context?.salaryRange?.trim()) {
      contextLines.push(`- Mức thu nhập / Lương dự kiến: ${context.salaryRange.trim()}`);
    }
    if (context?.specialNotes?.trim()) {
      contextLines.push(`- Yêu cầu đặc thù & Ngữ cảnh dự án bổ sung: ${context.specialNotes.trim()}`);
    }

    const contextBlock = contextLines.length > 0
      ? `\nCÁC THÔNG SỐ NGỮ CẢNH TUYỂN DỤNG CẦN BÁM SÁT TUYỆT ĐỐI:\n${contextLines.join('\n')}\n`
      : '';

    const prompt = `
Bạn là Giám đốc Thu hút Nhân tài & Chuyên gia Tư vấn Tuyển dụng Công nghệ Cấp cao (Executive Talent Acquisition Partner & HR Director).
Nhiệm vụ của bạn là xây dựng một bản Mô tả Công việc (Job Description - JD) đạt chuẩn tuyển dụng quốc tế, chuyên nghiệp, sắc bén và có sức hút mạnh mẽ đối với các nhân tài hàng đầu:
- Chức danh (Job Title): ${title}
- Phòng ban (Department): ${departmentName}
- Cấp bậc (Seniority Level): ${level}
${contextBlock}
Bản JD cần tuân thủ các nguyên tắc:
1. Tổng quan vai trò (summary): Nêu bật sứ mệnh cốt lõi, tầm ảnh hưởng chiến lược của vị trí này đối với mục tiêu sản phẩm và công nghệ của doanh nghiệp.${context?.specialNotes?.trim() ? ` Lồng ghép sâu sắc ngữ cảnh đặc thù: "${context.specialNotes.trim()}".` : ''}
2. Trách nhiệm chính (responsibilities): Chia thành 5-6 gạch đầu dòng rõ ràng, bao quát từ kiến trúc hệ thống, phát triển tính năng, tối ưu hiệu năng (performance tuning), chuẩn hóa quy trình kỹ thuật (CI/CD, Clean Code) đến phối hợp liên phòng ban.${context?.skills?.trim() ? ` Phải bám sát các công việc trực tiếp sử dụng Tech Stack: ${context.skills.trim()}.` : ''}
3. Yêu cầu công việc (requirements): Định lượng cụ thể ${context?.experienceYears?.trim() ? `số năm kinh nghiệm (${context.experienceYears.trim()})` : 'số năm kinh nghiệm'}, các kỹ năng công nghệ cốt lõi (${context?.skills?.trim() ? context.skills.trim() : 'Core Stack'}), tư duy kiến trúc, cơ sở dữ liệu và kỹ năng giải quyết bài toán quy mô lớn.
4. Điểm cộng ưu tiên (niceToHave): Kỹ năng mở rộng, kinh nghiệm với Microservices, Cloud (AWS/GCP), DevOps, hoặc đóng góp mã nguồn mở.
5. Chế độ đãi ngộ & Phúc lợi (benefits): Gói đãi ngộ cạnh tranh${context?.salaryRange?.trim() ? ` (theo mức đề xuất ${context.salaryRange.trim()})` : ''}, thưởng OKRs/KPIs, bảo hiểm sức khỏe cao cấp, tài trợ học tập và thiết bị làm việc hiện đại.${context?.employmentType?.trim() || context?.location?.trim() ? ` Phù hợp với hình thức ${context?.employmentType?.trim() || 'làm việc'} tại ${context?.location?.trim() || 'trụ sở'}.` : ''}
6. Mức lương đề xuất (suggestedSalaryRange): ${context?.salaryRange?.trim() ? context.salaryRange.trim() : `Đưa ra dải lương thị trường sát với thực tế tại Việt Nam theo cấp bậc ${level}.`}
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
    return this.getFallbackJobDescription(title, departmentName, level, context);
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
    context?: JobDescriptionContext,
  ): JobDescriptionResult {
    const isBackend = title.toLowerCase().includes('backend') || title.toLowerCase().includes('nest') || title.toLowerCase().includes('node');
    const isFrontend = title.toLowerCase().includes('frontend') || title.toLowerCase().includes('react') || title.toLowerCase().includes('ui');

    const expText = context?.experienceYears?.trim()
      ? `Có từ ${context.experienceYears.trim()} kinh nghiệm làm việc thực chiến trong lĩnh vực chuyên môn.`
      : (isBackend ? 'Có từ 2-4 năm kinh nghiệm làm việc với NodeJS / TypeScript (ưu tiên thành thạo NestJS).' : 'Có từ 2-3 năm kinh nghiệm lập trình giao diện với React, TypeScript và Tailwind CSS.');

    const skillsList = context?.skills?.trim()
      ? context.skills.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
      : [];

    const requirements = [
      expText,
      skillsList.length > 0
        ? `Thành thạo các công nghệ và kỹ năng trọng tâm: ${skillsList.join(', ')}.`
        : (isBackend ? 'Nắm vững kiến trúc cơ sở dữ liệu quan hệ (MySQL / PostgreSQL), hiểu sâu về 3NF, Transaction, Indexing.' : 'Hiểu sâu về React Lifecycle, Hooks, State Management và tối ưu hiệu năng render.'),
      'Nắm vững quy trình phát triển phần mềm chuẩn mực (Git Flow, Clean Code, Code Review, CI/CD).',
      'Tư duy giải quyết vấn đề tốt, trách nhiệm cao và khả năng làm việc nhóm hiệu quả.',
    ];

    if (context?.specialNotes?.trim()) {
      requirements.push(`Yêu cầu đặc thù: ${context.specialNotes.trim()}`);
    }

    const responsibilities = isBackend
      ? [
        `Thiết kế, xây dựng và tối ưu hóa hệ thống Backend RESTful API và Microservices${skillsList.length > 0 ? ` sử dụng ${skillsList.slice(0, 3).join(', ')}` : ' trên nền tảng NestJS / NodeJS'}.`,
        'Thiết kế và chuẩn hóa cơ sở dữ liệu MySQL, tối ưu truy vấn Indexing và đảm bảo toàn vẹn dữ liệu.',
        'Tích hợp các dịch vụ bên thứ ba (Google AI Gemini, n8n Automation Engine, Webhooks).',
        'Tham gia rà soát mã nguồn (Code Review), xây dựng chuẩn kỹ thuật và tài liệu hóa kiến trúc.',
        'Giám sát hiệu năng hệ thống, phát hiện và xử lý sự cố kỹ thuật kịp thời.',
      ]
      : isFrontend
        ? [
          `Phát triển giao diện ứng dụng web hiện đại, chuẩn Responsive${skillsList.length > 0 ? ` với ${skillsList.slice(0, 3).join(', ')}` : ' bằng React 18, TypeScript và Tailwind CSS'}.`,
          'Tối ưu hóa trải nghiệm người dùng (UX/UI), tốc độ tải trang và độ mượt mà của các thành phần tương tác.',
          'Kết nối trơn tru với hệ thống Backend API thông qua Axios Interceptor và quản lý trạng thái an toàn.',
          'Tham gia định hình Design System và xây dựng các UI Atoms tái sử dụng trong toàn bộ hệ thống.',
        ]
        : [
          `Chịu trách nhiệm thực hiện các mục tiêu nghiệp vụ chính của vị trí ${title}.`,
          'Phối hợp nhịp nhàng giữa các phòng ban để đảm bảo tiến độ và chất lượng dự án.',
          'Chủ động đề xuất các giải pháp tự động hóa và ứng dụng AI nhằm nâng cao năng suất công việc.',
        ];

    const benefits = [
      `Thu nhập cạnh tranh (${context?.salaryRange?.trim() || (level.toLowerCase().includes('senior') ? '30 - 45 Triệu VNĐ' : '20 - 32 Triệu VNĐ')}), đánh giá tăng lương định kỳ 2 lần/năm.`,
      'Thưởng tháng lương thứ 13, thưởng hiệu quả kinh doanh và thưởng dự án xuất sắc.',
      `Môi trường làm việc hiện đại (${context?.employmentType || 'Toàn thời gian'} tại ${context?.location || 'Trụ sở chính'}), khuyến khích sáng tạo và ứng dụng công nghệ AI tiên phong.`,
      'Gói bảo hiểm sức khỏe toàn diện cao cấp và phụ cấp thiết bị làm việc.',
    ];

    return {
      title,
      level,
      department: departmentName,
      summary: `Chúng tôi đang tìm kiếm vị trí ${title} (${level}) xuất sắc gia nhập ${departmentName} để trực tiếp xây dựng và mở rộng hệ thống phần mềm cốt lõi của công ty.${context?.specialNotes ? ` Định hướng dự án: ${context.specialNotes.trim()}.` : ''}`,
      responsibilities,
      requirements,
      niceToHave: [
        'Có hiểu biết hoặc kinh nghiệm thực tế về AI LLM (Gemini, OpenAI) hoặc các công cụ tự động hóa quy trình (n8n).',
        'Có kinh nghiệm làm việc trong môi trường Agile/Scrum và kiến trúc Microservices.',
      ],
      benefits,
      suggestedSalaryRange: context?.salaryRange?.trim() || (level.toLowerCase().includes('senior') ? '30 - 45 Triệu VNĐ' : '20 - 32 Triệu VNĐ'),
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

  // =========================================================================
  // 4. PHÂN TÍCH CẢM XÚC & NGUY CƠ KIỆT SỨC (analyzeMoodSentiment)
  // =========================================================================
  async analyzeMoodSentiment(
    feedbackText: string,
    moodType: string = 'STRESSED',
    context?: { consecutiveStressDays?: number; employeeName?: string; departmentName?: string },
  ): Promise<MoodSentimentResult> {
    this.logger.log(`🤖 AI [${this.selectedModel}] đang phân tích cảm xúc & rủi ro Burnout: "${feedbackText?.slice(0, 50)}..."`);

    const consecutiveDays = context?.consecutiveStressDays || 1;
    const department = context?.departmentName || 'Bộ phận nội bộ';
    const employeeName = context?.employeeName || 'Nhân sự';

    const prompt = `
Bạn là Giám đốc Hạnh phúc Doanh nghiệp (Chief People & Happiness Officer) kiêm Chuyên gia Tâm lý Học Lao động Cấp cao.
Nhiệm vụ của bạn là phân tích sâu sắc phản hồi của nhân viên để đánh giá trạng thái tâm lý, nguy cơ quá tải tinh thần và kiệt sức (Burnout Risk theo chuẩn WHO ICD-11):
- Tên nhân viên: ${employeeName}
- Phòng ban: ${department}
- Trạng thái tự chọn: ${moodType}
- Số ngày stress liên tiếp ghi nhận: ${consecutiveDays} ngày
- Nội dung phản hồi (feedback): "${feedbackText || '(Không có lời nhắn đi kèm)'}"

Tiêu chí đánh giá chuyên sâu:
1. sentimentLabel: "POSITIVE" | "NEUTRAL" | "NEGATIVE"
2. sentimentScore: Số thực từ 0.0 (rất tiêu cực/trầm cảm) đến 1.0 (rất tích cực/nhiệt huyết)
3. isBurnoutRisk: true nếu phát hiện dấu hiệu kiệt sức/quá tải công việc/áp lực kéo dài, false nếu ổn
4. burnoutSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
5. burnoutScore: Thang điểm 0 - 100 đo lường mức độ kiệt sức
6. keyStressFactors: Mảng 2-4 yếu tố gây stress cốt lõi (Ví dụ: "Khối lượng công việc quá tải", "Áp lực deadline liên tục", "Thiếu sự ghi nhận", "Bất đồng quan điểm")
7. emotionalKeywords: Các từ khóa cảm xúc nhận diện được từ phản hồi
8. actionableRecommendations: 2-3 hành động thiết thực cho Quản lý / HR (Ví dụ: "Lên lịch trò chuyện 1-1 lắng nghe", "Rà soát điều chỉnh khối lượng task trong Sprint", "Gợi ý nghỉ phép nạp năng lượng")
9. empathyNote: 1-2 câu nhắn gửi ấm áp, chân thành, thấu hiểu và khích lệ nhân viên từ phía công ty

BẮT BUỘC TRẢ VỀ THEO ĐÚNG ĐỊNH DẠNG JSON SAU (không kèm markdown ngoài JSON):
{
  "sentimentLabel": "NEGATIVE",
  "sentimentScore": 0.2,
  "isBurnoutRisk": true,
  "burnoutSeverity": "HIGH",
  "burnoutScore": 75,
  "keyStressFactors": ["Khối lượng công việc vượt tải", "Áp lực deadline dồn dập"],
  "emotionalKeywords": ["mệt mỏi", "quá tải", "áp lực"],
  "actionableRecommendations": [
    "Quản lý trực tiếp hẹn buổi 1-on-1 trong vòng 24h để lắng nghe khó khăn",
    "Rà soát và san sẻ bớt các đầu việc tồn đọng cho đồng đội trong nhóm"
  ],
  "empathyNote": "Công ty rất hiểu và trân trọng sự nỗ lực của bạn trong giai đoạn này. Sức khỏe và tinh thần của bạn luôn là ưu tiên hàng đầu, hãy chia sẻ cùng quản lý để tìm giải pháp nhé!"
}
    `.trim();

    const systemInstruction = 'Bạn là Chuyên gia Tâm lý Tổ chức & Nhân sự Doanh nghiệp. Phân tích công tâm, thấu cảm, sắc sảo và đưa ra giải pháp bảo vệ sức khỏe tinh thần nhân viên. Trả về JSON hợp lệ 100%.';

    const aiResult = await this.generateJson<MoodSentimentResult>(prompt, systemInstruction);

    if (aiResult && aiResult.sentimentLabel && aiResult.burnoutScore !== undefined) {
      return {
        ...aiResult,
        aiGenerated: true,
      };
    }

    this.logger.warn(`Sử dụng Fallback Mock Mood Sentiment Analysis cho phản hồi.`);
    return this.getFallbackMoodSentiment(feedbackText, moodType, context);
  }

  // =========================================================================
  // 5. TRỢ LÝ HỎI ĐÁP QUY CHẾ, NGÀY PHÉP 24/7 (chatCopilot)
  // =========================================================================
  async chatCopilot(
    query: string,
    contextDocuments: string[] | { title: string; content: string }[] = [],
  ): Promise<CopilotChatResult> {
    this.logger.log(`🤖 AI [${this.selectedModel}] Copilot nhận câu hỏi: "${query}"`);

    // Chuẩn hóa tài liệu ngữ cảnh
    let formattedContext = '';
    if (Array.isArray(contextDocuments) && contextDocuments.length > 0) {
      formattedContext = contextDocuments
        .map((doc, idx) => {
          if (typeof doc === 'string') {
            return `[Tài liệu ${idx + 1}]:\n${doc}`;
          }
          return `[Tài liệu: ${doc.title}]:\n${doc.content}`;
        })
        .join('\n\n---\n\n');
    } else {
      formattedContext = 'Không có trích đoạn tài liệu cụ thể được cung cấp kèm theo.';
    }

    const prompt = `
Bạn là Trợ lý HR AI Copilot thông minh, tận tâm và chuyên nghiệp của Doanh nghiệp.
Dưới đây là các tài liệu chính sách, quy chế và sổ tay nhân viên nội bộ:
--------------------------------------------------------------------------------
${formattedContext}
--------------------------------------------------------------------------------

Câu hỏi của nhân viên: "${query}"

Nguyên tắc giải đáp:
1. Trả lời trực tiếp, rõ ràng, ân cần, định dạng Markdown gạch đầu dòng chuyên nghiệp.
2. Dẫn chứng chính xác các điều khoản, con số cụ thể trong quy chế nội bộ (ngày phép, WFH, bảo hiểm, trợ cấp, quy trình thử việc...).
3. Gợi ý 2-3 câu hỏi tiếp theo nhân viên có thể quan tâm (suggestedFollowUpQuestions).
4. Đánh giá xem câu hỏi có chứa vấn đề nhạy cảm/khiếu nại cần chuyên viên HR trực tiếp can thiệp không (requiresHrIntervention).
5. Trích dẫn danh sách tài liệu nguồn đã tham chiếu (citedSources).

BẮT BUỘC TRẢ VỀ THEO ĐỊNH DẠNG JSON SAU (không kèm markdown ngoài JSON):
{
  "reply": "Nội dung câu trả lời hoàn chỉnh, chi tiết và ân cần...",
  "citedSources": ["Sổ tay Nhân viên 2026 - Chương 2: Chế độ Nghỉ Phép"],
  "suggestedFollowUpQuestions": [
    "Quy trình tạo đơn xin nghỉ phép trên cổng HR Portal như thế nào?",
    "Số ngày phép chưa dùng hết trong năm có được cộng dồn không?"
  ],
  "requiresHrIntervention": false
}
    `.trim();

    const systemInstruction = 'Bạn là Trợ lý HR AI Copilot nội bộ. Luôn trung thực với tài liệu chính sách, lịch thiệp, dễ hiểu và hỗ trợ nhân viên hết mình. Trả về JSON hợp lệ 100%.';

    const aiResult = await this.generateJson<CopilotChatResult>(prompt, systemInstruction);

    if (aiResult && aiResult.reply) {
      return {
        query,
        reply: aiResult.reply,
        citedSources: aiResult.citedSources || [],
        suggestedFollowUpQuestions: aiResult.suggestedFollowUpQuestions || [],
        requiresHrIntervention: !!aiResult.requiresHrIntervention,
        aiGenerated: true,
      };
    }

    this.logger.warn(`Sử dụng Fallback Mock Copilot Chat.`);
    return this.getFallbackCopilotChat(query, contextDocuments);
  }

  // =========================================================================
  // 6. ĐỀ XUẤT KHÓA HỌC BÙ ĐẮP KỸ NĂNG THIẾU HỤT (recommendSkillGapCourse)
  // =========================================================================
  async recommendSkillGapCourse(
    missingSkills: string[],
    availableCourses?: { id: number; title: string; skillsProvided: string[]; durationHours?: number; courseUrl?: string }[],
    currentRole: string = 'Nhân viên mới / Thử việc',
    targetRole: string = 'Nhân viên chính thức / Nâng chuẩn Senior',
    options?: GeminiJsonOptions,
  ): Promise<SkillGapCourseResult> {
    this.logger.log(`🤖 AI [${this.selectedModel}] đang phân tích Skill Gap & đề xuất khóa học cho ${missingSkills.length} kỹ năng...`);

    const prompt = `
Bạn là Giám đốc Đào tạo & Phát triển Năng lực (L&D Director) kiêm Chuyên gia Khai vấn Nghề nghiệp Công nghệ (Technical Career Coach).
Nhiệm vụ của bạn là phân tích các khoảng cách kỹ năng (Skill Gaps) và thiết kế lộ trình đào tạo bù đắp cá nhân hóa:
- Danh sách kỹ năng còn thiếu: ${JSON.stringify(missingSkills)}
- Vai trò hiện tại: ${currentRole}
- Mục tiêu năng lực: ${targetRole}
- Danh mục khóa học hiện có của công ty: ${JSON.stringify(availableCourses || [])}

Tiêu chuẩn đầu ra:
1. summary: Đánh giá tổng quan về khoảng cách kỹ năng và tiềm năng phát triển của nhân sự.
2. skillGapsIdentified: Chuẩn hóa lại danh sách các lỗ hổng kỹ năng cần bù đắp.
3. readinessScore: Điểm độ sẵn sàng nghề nghiệp hiện tại (0 - 100%).
4. recommendedCourses: Lộ trình 2-4 khóa học thiết thực sắp xếp theo thứ tự học tập tối ưu:
   - courseId: ID khóa học (nếu khớp với danh mục hiện có)
   - courseTitle: Tên khóa học chuyên môn
   - matchedMissingSkills: Danh sách các kỹ năng thiếu được giải quyết bởi khóa học này
   - priority: "HIGH" (kỹ năng cốt lõi bắt buộc) | "MEDIUM" (nâng cao) | "LOW" (bổ trợ)
   - estimatedTimeToComplete: Thời gian hoàn thành dự kiến (ví dụ: "2 tuần (10 giờ học)")
   - whyRecommended: Lý do vì sao khóa học này giúp bù đắp kỹ năng thiếu
   - learningPathOrder: Thứ tự học tập (1, 2, 3...)
5. careerAdvice: Lời khuyên định hướng học tập và áp dụng kiến thức vào công việc thực tế.

BẮT BUỘC TRẢ VỀ THEO ĐÚNG ĐỊNH DẠNG JSON SAU (không kèm markdown ngoài JSON):
{
  "summary": "Nhân viên có nền tảng tốt nhưng cần bổ sung các kỹ năng kiến trúc chuyên sâu...",
  "skillGapsIdentified": ${JSON.stringify(missingSkills)},
  "readinessScore": 75,
  "recommendedCourses": [
    {
      "courseId": 1,
      "courseTitle": "Kiến trúc Microservices & Message Queue chuyên sâu",
      "matchedMissingSkills": ["Message Queue"],
      "priority": "HIGH",
      "estimatedTimeToComplete": "2 tuần (12 giờ học)",
      "whyRecommended": "Cung cấp kiến thức toàn diện về kiến trúc phân tán phục vụ dự án",
      "learningPathOrder": 1
    }
  ],
  "careerAdvice": "Nên dành 30 phút mỗi ngày vào đầu giờ sáng để hoàn thành các bài học..."
}
    `.trim();

    const systemInstruction = 'Bạn là Giám đốc Đào tạo & Phát triển Doanh nghiệp. Thiết kế lộ trình khoa học, thực tế, bám sát năng lực công nghệ hiện đại. Trả về JSON hợp lệ 100%.';

    const aiResult = await this.generateJson<SkillGapCourseResult>(prompt, systemInstruction, options);

    if (aiResult && aiResult.recommendedCourses && aiResult.recommendedCourses.length > 0) {
      return {
        ...aiResult,
        aiGenerated: true,
      };
    }

    this.logger.warn(`Sử dụng Fallback Mock Skill Gap Recommender.`);
    return this.getFallbackSkillGapCourse(missingSkills, availableCourses, currentRole, targetRole);
  }

  // =========================================================================
  // CÁC HÀM FALLBACK MOCK THÔNG MINH DÀNH CHO 3 TÍNH NĂNG TRÊN
  // =========================================================================
  private getFallbackMoodSentiment(
    feedbackText: string,
    moodType: string = 'STRESSED',
    context?: { consecutiveStressDays?: number; employeeName?: string; departmentName?: string },
  ): MoodSentimentResult {
    const text = (feedbackText || '').toLowerCase();
    const consecutiveDays = context?.consecutiveStressDays || 1;

    const stressWords = ['mệt', 'áp lực', 'stress', 'quá tải', 'chán', 'kiệt sức', 'overtime', 'ot', 'nghỉ việc', 'bất mãn', 'bế tắc', 'deadline'];
    const positiveWords = ['tuyệt', 'vui', 'hào hứng', 'hài lòng', 'tốt', 'thích', 'động lực', 'thoải mái', 'tuyệt vời', 'ổn'];

    const matchedStress = stressWords.filter((w) => text.includes(w));
    const matchedPositive = positiveWords.filter((w) => text.includes(w));

    const isNegative = matchedStress.length > 0 || moodType === 'STRESSED';
    const isPositive = matchedPositive.length > 0 && moodType === 'GREAT';

    if (isNegative) {
      const severity = consecutiveDays >= 3 || matchedStress.length >= 2 ? 'HIGH' : 'MEDIUM';
      const burnoutScore = Math.min(65 + consecutiveDays * 8 + matchedStress.length * 5, 95);

      return {
        sentimentLabel: 'NEGATIVE',
        sentimentScore: 0.2,
        isBurnoutRisk: true,
        burnoutSeverity: severity,
        burnoutScore,
        keyStressFactors: [
          'Khối lượng công việc dồn dập vượt ngưỡng tiếp nhận',
          'Áp lực deadline và tiến độ dự án căng thẳng',
          'Thời gian phục hồi và nghỉ ngơi chưa đảm bảo',
        ],
        emotionalKeywords: matchedStress.length > 0 ? matchedStress : ['căng thẳng', 'áp lực'],
        actionableRecommendations: [
          'Quản lý trực tiếp hẹn buổi gặp gỡ 1-on-1 trong vòng 24h để lắng nghe tâm tư và khó khăn thực tế',
          'Rà soát lại phân bổ công việc trong Sprint hiện tại, san sẻ bớt task tồn đọng sang thành viên khác',
          'Khuyến khích nhân viên sử dụng 01 ngày nghỉ phép phục hồi (Mental Health Day) để tái tạo năng lượng',
        ],
        empathyNote:
          'Chúng tôi rất trân trọng mọi nỗ lực và sự cống hiến của bạn. Hãy nhớ rằng sức khỏe thể chất và tinh thần của bạn luôn là ưu tiên số một. Đừng ngần ngại chia sẻ với Lead để được hỗ trợ kịp thời nhé!',
        aiGenerated: false,
      };
    }

    if (isPositive) {
      return {
        sentimentLabel: 'POSITIVE',
        sentimentScore: 0.9,
        isBurnoutRisk: false,
        burnoutSeverity: 'LOW',
        burnoutScore: 12,
        keyStressFactors: [],
        emotionalKeywords: matchedPositive.length > 0 ? matchedPositive : ['hài lòng', 'động lực'],
        actionableRecommendations: [
          'Ghi nhận tinh thần làm việc tích cực trong cuộc họp toàn đội',
          'Tạo cơ hội để nhân viên chia sẻ kinh nghiệm và năng lượng tích cực tới đồng nghiệp',
        ],
        empathyNote:
          'Thật tuyệt vời khi thấy bạn tràn đầy năng lượng và nhiệt huyết với công việc! Chúc bạn tiếp tục có thêm nhiều thành công rực rỡ.',
        aiGenerated: false,
      };
    }

    return {
      sentimentLabel: 'NEUTRAL',
      sentimentScore: 0.55,
      isBurnoutRisk: false,
      burnoutSeverity: 'LOW',
      burnoutScore: 28,
      keyStressFactors: ['Nhịp độ làm việc duy trì ở mức bình thường'],
      emotionalKeywords: ['ổn định', 'bình thường'],
      actionableRecommendations: [
        'Duy trì các buổi trao đổi định kỳ hàng tuần để theo sát tiến độ và hỗ trợ khi cần',
      ],
      empathyNote:
        'Cảm ơn bạn đã check-in cảm xúc hôm nay. Chúc bạn có một ngày làm việc hiệu quả và thuận lợi!',
      aiGenerated: false,
    };
  }

  private getFallbackCopilotChat(
    query: string,
    contextDocuments: any = [],
  ): CopilotChatResult {
    const q = (query || '').toLowerCase();

    if (q.includes('nghỉ phép') || q.includes('phép năm') || q.includes('nghỉ ốm')) {
      return {
        query,
        reply: `### 📋 Quy Định Chế Độ Nghỉ Phép Doanh Nghiệp 2026:
- **Nghỉ phép năm có lương:** Nhân viên chính thức được hưởng **14 ngày phép/năm**.
- **Thâm niên công tác:** Cứ mỗi **03 năm** làm việc liên tục, bạn được cộng thêm **01 ngày phép năm** (tối đa không quá 20 ngày/năm).
- **Nghỉ ốm đau:** Công ty hỗ trợ thêm **03 ngày nghỉ ốm nguyên lương mỗi năm** không yêu cầu giấy viện tuyến huyện.
- **Cách đăng ký:** Tạo đơn xin nghỉ trước tối thiểu 24h trên HR Portal để Quản lý trực tiếp phê duyệt.`,
        citedSources: ['Sổ tay Nhân viên 2026 - Chương 2: Chế độ Nghỉ Phép & Lễ Tết'],
        suggestedFollowUpQuestions: [
          'Quy trình tạo đơn xin nghỉ phép trên HR Portal thực hiện như thế nào?',
          'Ngày phép năm chưa dùng hết có được chuyển sang năm sau không?',
          'Chế độ nghỉ phép kết hôn và việc hiếu hỷ được quy định ra sao?',
        ],
        requiresHrIntervention: false,
        aiGenerated: false,
      };
    }

    if (q.includes('wfh') || q.includes('từ xa') || q.includes('ở nhà') || q.includes('hybrid') || q.includes('giờ làm')) {
      return {
        query,
        reply: `### 🏠 Chính Sách Làm Việc Linh Hoạt (Hybrid Work) & Giờ Giấc:
- **Giờ làm việc tiêu chuẩn:** Thứ Hai đến Thứ Sáu, từ **08:30 đến 17:30** (nghỉ trưa từ 12:00 - 13:00).
- **Giờ linh hoạt (Flexitime):** Cho phép check-in linh hoạt trong khung giờ **08:00 - 09:30 sáng**, chỉ cần đảm bảo đủ 8 tiếng làm việc thực tế.
- **Chính sách WFH:** Sau khi hoàn thành **02 tháng thử việc**, bạn được quyền đăng ký WFH tối đa **02 ngày/tuần** với sự phê duyệt của Line Manager qua hệ thống.`,
        citedSources: ['Sổ tay Nhân viên 2026 - Chương 1: Thời Gian Làm Việc & Hybrid Work'],
        suggestedFollowUpQuestions: [
          'Đăng ký lịch làm việc WFH hàng tuần ở đâu trên hệ thống?',
          'Làm thêm giờ (Overtime) được tính phụ cấp như thế nào?',
        ],
        requiresHrIntervention: false,
        aiGenerated: false,
      };
    }

    if (q.includes('bảo hiểm') || q.includes('pvi') || q.includes('khám') || q.includes('sức khỏe') || q.includes('nha khoa')) {
      return {
        query,
        reply: `### 🏥 Chế Độ Chăm Sóc Sức Khỏe & Bảo Hiểm Cao Cấp:
- **Bảo hiểm Xã hội:** Đóng đầy đủ 100% BHXH, BHYT, BHTN theo mức lương thực nhận.
- **Thẻ Bảo hiểm Sức khỏe PVI HealthCare:** Cấp miễn phí cho nhân viên chính thức với hạn mức nội trú **120.000.000 VNĐ/năm**, ngoại trú **15.000.000 VNĐ/năm**, chăm sóc nha khoa **3.000.000 VNĐ/năm**.
- **Ưu đãi người thân:** Mua thẻ bảo hiểm cho bố mẹ, vợ/chồng, con cái với chiết khấu doanh nghiệp **40%**.
- **Khám sức khỏe định kỳ:** Tổ chức vào Quý 3 hàng năm tại Vinmec / Thu Cúc.`,
        citedSources: ['Sổ tay Nhân viên 2026 - Chương 3: Chế Độ Bảo Hiểm & Chăm Sóc Sức Khỏe'],
        suggestedFollowUpQuestions: [
          'Hồ sơ thanh toán viện phí bảo hiểm PVI nộp ở đâu?',
          'Quy trình đăng ký mua thêm gói bảo hiểm cho người thân như thế nào?',
        ],
        requiresHrIntervention: false,
        aiGenerated: false,
      };
    }

    if (q.includes('đào tạo') || q.includes('học') || q.includes('chứng chỉ') || q.includes('l&d') || q.includes('ngân sách')) {
      return {
        query,
        reply: `### 🎓 Chính Sách Đào Tạo & Phát Triển Năng Lực (L&D):
- **Ngân sách học tập cá nhân:** Mỗi nhân viên được cấp **10.000.000 VNĐ/năm** để tham gia các khóa học chuyên môn, mua sách hoặc thi chứng chỉ quốc tế (AWS, GCP, PMP, Scrum Master...).
- **Tài trợ lệ phí thi:** Hoàn trả **100% lệ phí thi** cho các chứng chỉ công nghệ trọng điểm khi thi đỗ lần đầu.
- **Tech Sharing:** Diễn ra vào chiều Thứ Sáu tuần thứ 2 và thứ 4 hàng tháng (15:00 - 17:00).`,
        citedSources: ['Sổ tay Nhân viên 2026 - Chương 4: Chính Sách Đào Tạo & Học Tập L&D'],
        suggestedFollowUpQuestions: [
          'Thủ tục hoàn tiền hóa đơn khóa học và lệ phí thi chứng chỉ như thế nào?',
          'Danh mục các chứng chỉ công nghệ được công ty hoàn trả 100% lệ phí?',
        ],
        requiresHrIntervention: false,
        aiGenerated: false,
      };
    }

    return {
      query,
      reply: `Xin chào! Tôi là **Trợ lý HR AI Copilot 24/7**. Tôi có thể hỗ trợ bạn tra cứu mọi thông tin về **Chính sách ngày phép, chế độ Hybrid WFH, Bảo hiểm sức khỏe PVI, Ngân sách đào tạo L&D, Quy chế thử việc và Phúc lợi doanh nghiệp**.\n\nĐối với câu hỏi "${query}", bạn có thể tra cứu chi tiết trong Sổ tay Nhân viên hoặc liên hệ trực tiếp Bộ phận HR qua email \`hr@enterprise-corp.vn\` để được hỗ trợ cụ thể nhé!`,
      citedSources: ['Sổ tay Nhân viên & Quy chế Phúc lợi Doanh nghiệp 2026'],
      suggestedFollowUpQuestions: [
        'Công ty có những chế độ phúc lợi nào cho nhân viên chính thức?',
        'Thời gian thử việc và tiêu chí đánh giá hoàn thành thử việc?',
        'Chính sách làm việc từ xa (WFH) được áp dụng như thế nào?',
      ],
      requiresHrIntervention: false,
      aiGenerated: false,
    };
  }

  private getFallbackSkillGapCourse(
    missingSkills: string[],
    availableCourses?: { id: number; title: string; skillsProvided: string[]; durationHours?: number; courseUrl?: string }[],
    currentRole: string = 'Nhân viên mới / Thử việc',
    targetRole: string = 'Nhân viên chính thức / Nâng chuẩn Senior',
  ): SkillGapCourseResult {
    const identified = missingSkills.length > 0 ? missingSkills : ['Kiến trúc Microservices', 'Message Queue (Kafka/RabbitMQ)'];
    const courses: CourseRecommendationItem[] = [];

    // Nếu có danh mục khóa học truyền vào -> so khớp
    if (availableCourses && availableCourses.length > 0) {
      availableCourses.forEach((c, idx) => {
        const matched = (c.skillsProvided || []).filter((s) =>
          identified.some((m) => m.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(m.toLowerCase())),
        );
        if (matched.length > 0) {
          courses.push({
            courseId: c.id,
            courseTitle: c.title,
            matchedMissingSkills: matched,
            priority: idx === 0 ? 'HIGH' : 'MEDIUM',
            estimatedTimeToComplete: `${c.durationHours || 12} giờ học (${Math.ceil((c.durationHours || 12) / 6)} tuần)`,
            whyRecommended: `Trực tiếp cung cấp kỹ năng thực chiến về ${matched.join(', ')} cần thiết cho vị trí công việc.`,
            learningPathOrder: courses.length + 1,
          });
        }
      });
    }

    // Nếu chưa đủ khóa học -> bổ sung các khóa đào tạo chuẩn hóa công nghệ
    if (courses.length === 0) {
      identified.forEach((skill, idx) => {
        let title = `Khóa học Nâng cao Năng lực: ${skill}`;
        let duration = '12 giờ học (2 tuần)';
        let priority: 'HIGH' | 'MEDIUM' | 'LOW' = idx === 0 ? 'HIGH' : 'MEDIUM';

        if (skill.toLowerCase().includes('queue') || skill.toLowerCase().includes('kafka') || skill.toLowerCase().includes('rabbitmq')) {
          title = 'Kiến Trúc Event-Driven & Xử Lý Tác Vụ Bất Đồng Bộ với Message Queue';
          duration = '15 giờ học (2-3 tuần)';
        } else if (skill.toLowerCase().includes('docker') || skill.toLowerCase().includes('kubernetes') || skill.toLowerCase().includes('devops')) {
          title = 'Containerization & Triển Khai Hệ Thống Phân Tán với Docker & K8s';
          duration = '18 giờ học (3 tuần)';
        } else if (skill.toLowerCase().includes('sql') || skill.toLowerCase().includes('database') || skill.toLowerCase().includes('typeorm')) {
          title = 'Tối Ưu Hóa Truy Vấn Cơ Sở Dữ Liệu MySQL & Thiết Kế Lập Chỉ Mục (Indexing)';
          duration = '10 giờ học (2 tuần)';
        }

        courses.push({
          courseTitle: title,
          matchedMissingSkills: [skill],
          priority,
          estimatedTimeToComplete: duration,
          whyRecommended: `Giải quyết triệt để lỗ hổng về ${skill}, hỗ trợ nhân sự đạt 100% năng lực kỳ vọng tại vị trí ${targetRole}.`,
          learningPathOrder: courses.length + 1,
        });
      });
    }

    return {
      summary: `Hệ thống AI đã phân tích ${identified.length} kỹ năng còn thiếu hụt so với chuẩn năng lực của vị trí ${targetRole}. Đã thiết lập lộ trình gồm ${courses.length} khóa học đào tạo trọng điểm giúp nhân sự nhanh chóng thu hẹp khoảng cách.`,
      skillGapsIdentified: identified,
      readinessScore: Math.max(85 - identified.length * 8, 45),
      recommendedCourses: courses.slice(0, 3),
      careerAdvice:
        'Khuyến nghị phân bổ 45 phút học tập mỗi ngày vào đầu giờ sáng hoặc chiều Thứ Sáu. Vận dụng trực tiếp bài tập vào các task thực tế trong sprint để tối ưu hóa hiệu quả tiếp thu.',
      aiGenerated: false,
    };
  }
}

