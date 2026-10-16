import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ⚡ Dịch vụ Điều Phối Webhook n8n Automation Engine (Non-blocking Asynchronous)
 * Tự động kích hoạt quy trình: Lịch Google Meet, Email chúc mừng Hired, Cảnh báo Telegram
 */
@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private webhookBaseUrl: string;
  private defaultSenderEmail: string;
  private defaultHrEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookBaseUrl =
      this.configService.get<string>('N8N_WEBHOOK_URL') ||
      'http://localhost:5678/webhook';
    this.defaultSenderEmail =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('GMAIL_USER') ||
      'quocthangngo2006@gmail.com';
    this.defaultHrEmail =
      this.configService.get<string>('HR_EMAIL') ||
      'quocthangngo2006@gmail.com';
  }

  /**
   * Bắn Webhook khi HR xếp lịch phỏng vấn (Tạo Google Meet + Gửi Email)
   */
  async triggerInterviewScheduled(payload: {
    interviewId: number;
    applicationId: number;
    candidateName: string;
    candidateEmail: string;
    interviewerName: string;
    interviewerEmail: string;
    scheduledAt: string;
    round: number;
    fromEmail?: string;
    telegramChatId?: string;
  }): Promise<boolean> {
    const url = `${this.webhookBaseUrl}/interview-schedule`;
    const fullPayload = {
      fromEmail: payload.fromEmail || this.defaultSenderEmail,
      ...payload,
    };
    return this.postWebhook(url, fullPayload, 'Xếp lịch phỏng vấn');
  }

  /**
   * Bắn Webhook khi HR bấm 1-Click Tuyển dụng (Gửi thư trúng tuyển & tài khoản)
   */
  async triggerEmployeeHired(payload: {
    userId: number;
    fullName: string;
    email: string;
    jobTitle: string;
    departmentName: string;
    tempPassword?: string;
    fromEmail?: string;
    telegramChatId?: string;
  }): Promise<boolean> {
    const url = `${this.webhookBaseUrl}/employee-hired`;
    const fullPayload = {
      fromEmail: payload.fromEmail || this.defaultSenderEmail,
      ...payload,
    };
    return this.postWebhook(url, fullPayload, 'Tuyển dụng nhân sự mới');
  }

  /**
   * Bắn Webhook cảnh báo kiệt sức (Telegram / Slack / Email HR)
   */
  async triggerBurnoutAlert(payload: {
    userId: number;
    employeeName: string;
    departmentName: string;
    stressDays: number;
    latestFeedback?: string;
    hrEmail?: string;
    fromEmail?: string;
    telegramChatId?: string;
  }): Promise<boolean> {
    const url = `${this.webhookBaseUrl}/burnout-alert`;
    const fullPayload = {
      fromEmail: payload.fromEmail || this.defaultSenderEmail,
      hrEmail: payload.hrEmail || this.defaultHrEmail,
      ...payload,
    };
    return this.postWebhook(url, fullPayload, 'Cảnh báo nguy cơ kiệt sức');
  }

  /**
   * Kích hoạt quy trình thôi việc liên phòng ban sau khi HR đã duyệt.
   */
  async triggerOffboardingApproved(payload: { caseId: number }): Promise<boolean> {
    const url = `${this.webhookBaseUrl}/tv4-offboarding`;
    const automationSecret = this.configService
      .get<string>('N8N_AUTOMATION_SECRET')
      ?.trim();
    return this.postWebhook(
      url,
      payload,
      'Điều phối thôi việc liên phòng ban',
      automationSecret
        ? { 'X-Automation-Secret': automationSecret }
        : undefined,
    );
  }

  private async postWebhook(
    url: string,
    data: any,
    actionName: string,
    extraHeaders?: Record<string, string>,
  ): Promise<boolean> {
    try {
      this.logger.log(`[n8n Dispatcher] Bắn webhook [${actionName}] tới: ${url}`);
      // Gọi fetch bất đồng bộ, không làm nghẽn luồng xử lý chính của người dùng
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          event: actionName,
          timestamp: new Date().toISOString(),
          ...data,
          data,
        }),
      }).catch((err) => {
        this.logger.warn(`[n8n Dispatcher] Không thể kết nối tới server n8n (${url}): ${err.message}`);
      });

      return true;
    } catch (err: any) {
      this.logger.error(`[n8n Dispatcher] Lỗi ngoại lệ: ${err.message}`);
      return false;
    }
  }
}
