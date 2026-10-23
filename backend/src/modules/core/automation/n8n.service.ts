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
  private defaultTelegramChatId: string;

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
    this.defaultTelegramChatId =
      this.configService.get<string>('TELEGRAM_CHAT_ID') ||
      '8928574834';
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
      telegramChatId: payload.telegramChatId || this.defaultTelegramChatId,
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
      telegramChatId: payload.telegramChatId || this.defaultTelegramChatId,
      ...payload,
    };
    return this.postWebhook(url, fullPayload, 'Tuyển dụng nhân sự mới');
  }

  async triggerOfferIssued(payload: { offerId: number; token: string; responseToken: string }): Promise<boolean> {
    return this.postWebhook(this.webhookBaseUrl + '/offer-issued', payload, 'Phát hành Offer Letter');
  }

  /**
   * Bắn webhook khi danh sách tin tuyển dụng thay đổi để đồng bộ dropdown Google Form.
   * Backend vẫn là nguồn mã vị trí duy nhất; n8n chỉ chuyển danh sách job đang mở sang Form.
   */
  async triggerJobsChanged(payload: {
    action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED';
    job: Record<string, unknown>;
  }): Promise<boolean> {
    return this.postWebhook(this.webhookBaseUrl + '/jobs-changed', payload, 'Đồng bộ danh sách vị trí Google Form');
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
      telegramChatId: payload.telegramChatId || this.defaultTelegramChatId,
      ...payload,
    };
    return this.postWebhook(url, fullPayload, 'Cảnh báo nguy cơ kiệt sức');
  }

  /**
   * Kích hoạt quy trình thôi việc liên phòng ban sau khi HR đã duyệt.
   */
  async triggerOffboardingApproved(payload: { caseId: number }): Promise<boolean> {
    const url = this.buildTv4WebhookUrl('tv4-offboarding');
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

  /**
   * Chuẩn hóa riêng URL workflow TV4 để cấu hình cũ có thêm đường dẫn thử nghiệm
   * (ví dụ /webhook/hr-admin-test) không tạo thành một webhook không tồn tại.
   */
  private buildTv4WebhookUrl(workflowPath: string): string {
    const configuredUrl = this.webhookBaseUrl.trim().replace(/\/+$/, '');

    try {
      const parsedUrl = new URL(configuredUrl);
      const webhookMarker = '/webhook';
      const markerIndex = parsedUrl.pathname.indexOf(webhookMarker);

      if (markerIndex >= 0) {
        parsedUrl.pathname = `${parsedUrl.pathname.slice(
          0,
          markerIndex + webhookMarker.length,
        )}/${workflowPath}`;
        parsedUrl.search = '';
        parsedUrl.hash = '';
        return parsedUrl.toString().replace(/\/$/, '');
      }
    } catch {
      // postWebhook sẽ ghi log lỗi kết nối nếu URL cấu hình không hợp lệ.
    }

    return `${configuredUrl}/${workflowPath}`;
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
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          event: actionName,
          timestamp: new Date().toISOString(),
          ...data,
          data,
        }),
      });
      if (!response.ok) this.logger.warn('Webhook rejected: HTTP ' + response.status);
      return response.ok;
    } catch (err: any) {
      this.logger.error(`[n8n Dispatcher] Lỗi ngoại lệ: ${err.message}`);
      return false;
    }
  }
}
