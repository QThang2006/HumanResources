import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 🧠 Dịch vụ Tập Trung Google Gemini 1.5 Flash (Shared AI Engine)
 * Phục vụ chung cho: Sinh JD, Bóc tách CV, Gợi ý câu hỏi phỏng vấn, RAG Copilot, Phân tích Burnout
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });
        this.logger.log('✅ Google Gemini AI Provider đã được kết nối thành công.');
      } catch (err: any) {
        this.logger.error(`❌ Khởi tạo Gemini AI thất bại: ${err.message}`);
      }
    } else {
      this.logger.warn('⚠️ Chưa cấu hình GEMINI_API_KEY trong file .env (Chạy chế độ Fallback).');
    }
  }

  isAvailable(): boolean {
    return !!this.model;
  }

  /**
   * Gọi Gemini AI với đầu ra ép buộc định dạng JSON thuần túy
   */
  async generateJson<T>(prompt: string, systemInstruction?: string): Promise<T | null> {
    if (!this.model) {
      this.logger.warn('Gemini AI chưa sẵn sàng. Trả về fallback.');
      return null;
    }

    try {
      const chatModel = this.genAI!.getGenerativeModel({
        model: 'gemini-1.5-flash',
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
      this.logger.error(`Lỗi khi gọi Gemini generateJson: ${error.message}`);
      return null;
    }
  }

  /**
   * Gọi Gemini AI với đầu ra dạng văn bản tự nhiên (Dùng cho Copilot RAG)
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.model) {
      return 'Dịch vụ Trí tuệ nhân tạo Gemini hiện chưa được cấu hình API Key.';
    }

    try {
      const chatModel = this.genAI!.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.3,
        },
        systemInstruction: systemInstruction || undefined,
      });

      const response = await chatModel.generateContent(prompt);
      return response.response.text();
    } catch (error: any) {
      this.logger.error(`Lỗi khi gọi Gemini generateText: ${error.message}`);
      return 'Xin lỗi, trợ lý AI đang gặp sự cố kết nối tạm thời. Vui lòng thử lại sau.';
    }
  }
}
