import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GeminiService } from '../core/ai/gemini.service';

type Method = 'generateJobDescription' | 'scoreResume' | 'generateInterviewQuestions';
type Sdk = Partial<Record<Method, (...args: string[]) => Promise<unknown>>>;
export type AiResult<T> = { mode: 'LIVE' | 'MOCK'; data: T };
export interface ScoreData {
  matchScore: number;
  summary: string;
  skillsDetected: string[];
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadGatewayException('SDK AI trả về dữ liệu không hợp lệ.');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 20000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new BadGatewayException('Nội dung AI không đúng hợp đồng.');
  return value.trim();
}
function lines(value: unknown): string {
  if (!Array.isArray(value) || value.length > 100)
    throw new BadGatewayException('Danh sách AI không đúng hợp đồng.');
  return value.map((item) => '- ' + text(item, 2000)).join('\n');
}
@Injectable()
export class RecruitmentAiService {
  constructor(private readonly gemini: GeminiService) {}

  capabilities() {
    const sdk = this.gemini as unknown as Sdk;
    return {
      jd: typeof sdk.generateJobDescription === 'function',
      score: typeof sdk.scoreResume === 'function',
      questions: typeof sdk.generateInterviewQuestions === 'function',
      hire: true,
      notice:
        'Tuyển ứng viên tạo tài khoản và 5 nhiệm vụ onboarding sau vòng phỏng vấn đạt. Kết quả AI mô phỏng chỉ dùng xem trước, không lưu điểm hoặc câu hỏi.',
    };
  }

  private async call(method: Method, args: string[]): Promise<AiResult<Record<string, unknown>>> {
    const fn = (this.gemini as unknown as Sdk)[method];
    if (typeof fn !== 'function')
      throw new ServiceUnavailableException(
        `Lead chưa bàn giao SDK ${method}. Không có kết quả AI giả.`,
      );
    let timer: ReturnType<typeof setTimeout>;
    try {
      const raw = await Promise.race([
        fn.apply(this.gemini, args),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(new ServiceUnavailableException('AI quá thời gian chờ. Hồ sơ vẫn được giữ.')),
            45000,
          );
        }),
      ]);
      const result = object(raw);
      // Lead main 9733233 uses aiGenerated, structured JD and question objects.
      // Never infer LIVE from API-key availability: the SDK can fall back per call.
      if (typeof result.aiGenerated === 'boolean' && result.ok === undefined) {
        const mode = result.aiGenerated ? 'LIVE' : 'MOCK';
        let data: Record<string, unknown>;
        if (method === 'generateJobDescription') {
          data = {
            description: text(result.summary) + '\n\n' + lines(result.responsibilities),
            requirements: lines(result.requirements),
            benefits: lines(result.benefits),
          };
        } else if (method === 'scoreResume') {
          data = {
            matchScore: result.matchScore,
            summary: result.summary,
            skillsDetected: result.matchedSkills,
          };
        } else {
          if (!Array.isArray(result.questions))
            throw new BadGatewayException('Câu hỏi AI không đúng hợp đồng.');
          data = { questions: result.questions.map((item) => object(item).question) };
        }
        return { mode, data };
      }
      if (result.ok !== true || !['LIVE', 'MOCK'].includes(String(result.mode)))
        throw new BadGatewayException('SDK cần khai báo ok, mode LIVE/MOCK và data theo hợp đồng.');
      return { mode: result.mode as 'LIVE' | 'MOCK', data: object(result.data) };
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ServiceUnavailableException)
        throw error;
      throw new BadGatewayException('Không nhận được kết quả từ SDK AI. Hãy thử lại sau.');
    } finally {
      clearTimeout(timer);
    }
  }

  async jd(title: string, dept: string, level: string) {
    const result = await this.call('generateJobDescription', [title, dept, level]);
    return {
      mode: result.mode,
      data: {
        description: text(result.data.description),
        requirements: text(result.data.requirements),
        benefits: result.data.benefits ? text(result.data.benefits) : '',
      },
    };
  }

  async score(cv: string, jd: string): Promise<AiResult<ScoreData>> {
    const result = await this.call('scoreResume', [cv, jd]);
    const score = result.data.matchScore;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100)
      throw new BadGatewayException('Điểm AI phải là số từ 0 đến 100.');
    const skills = result.data.skillsDetected ?? [];
    if (
      !Array.isArray(skills) ||
      skills.length > 100 ||
      skills.some((s) => typeof s !== 'string' || s.length > 150)
    )
      throw new BadGatewayException('Kỹ năng AI trả về không hợp lệ.');
    return {
      mode: result.mode,
      data: {
        matchScore: score,
        summary: text(result.data.summary, 10000),
        skillsDetected: skills as string[],
      },
    };
  }

  async questions(cv: string, requirements: string) {
    const result = await this.call('generateInterviewQuestions', [cv, requirements]);
    const questions = result.data.questions;
    if (!Array.isArray(questions) || questions.length < 3 || questions.length > 5)
      throw new BadGatewayException('SDK phải trả 3–5 câu hỏi.');
    return { mode: result.mode, data: questions.map((q) => text(q, 2000)) };
  }
}
