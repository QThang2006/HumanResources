import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

/**
 * ⚡ Dịch vụ Điều Phối Webhook n8n Automation Engine (Non-blocking Asynchronous)
 * Tự động kích hoạt quy trình: Lịch Google Meet, Email chúc mừng Hired, Cảnh báo Telegram
 * Hỗ trợ: Header Auth (X-Webhook-Secret) & Transactional Outbox khi n8n sự cố
 */
@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private webhookBaseUrl: string;
  private webhookSecret: string;
  private defaultSenderEmail: string;
  private defaultHrEmail: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly dataSource?: DataSource,
  ) {
    this.webhookBaseUrl =
      this.configService.get<string>('N8N_WEBHOOK_URL') ||
      'http://localhost:5678/webhook';
    this.webhookSecret =
      this.configService.get<string>('N8N_WEBHOOK_SECRET') || '';
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

  private async postWebhook(url: string, data: any, actionName: string): Promise<boolean> {
    try {
      this.logger.log(`[n8n Dispatcher] Bắn webhook [${actionName}] tới: ${url}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.webhookSecret) {
        headers['X-Webhook-Secret'] = this.webhookSecret;
      }

      fetch(url, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          event: actionName,
          timestamp: new Date().toISOString(),
          ...data,
          data,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            this.logger.warn(
              `[n8n Dispatcher] Webhook [${actionName}] trả về mã HTTP ${res.status}: ${res.statusText}`,
            );
            await this.saveOutboxIfAvailable(url, data, `HTTP ${res.status}: ${res.statusText}`);
          }
        })
        .catch(async (err) => {
          this.logger.warn(
            `[n8n Dispatcher] Không thể kết nối tới server n8n (${url}): ${err.message}`,
          );
          await this.saveOutboxIfAvailable(url, data, err.message);
        });

      return true;
    } catch (err: any) {
      this.logger.error(`[n8n Dispatcher] Lỗi ngoại lệ: ${err.message}`);
      return false;
    }
  }

  /**
   * Lưu sự kiện vào bảng pending_webhooks (Outbox Pattern) khi n8n gặp sự cố
   * Workflow WF-01c sẽ tự động quét và gửi lại định kỳ 5 phút
   */
  private async saveOutboxIfAvailable(url: string, data: any, errorMessage: string): Promise<void> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      return;
    }

    try {
      const isBurnout = url.includes('burnout-alert');
      const eventType = isBurnout ? 'BURNOUT_ALERT' : 'GENERIC_EVENT';

      await this.dataSource.query(
        `INSERT INTO pending_webhooks (event_type, payload, last_error) VALUES (?, ?, ?)`,
        [eventType, JSON.stringify(data), String(errorMessage).slice(0, 480)],
      );
      this.logger.log(`[n8n Outbox] Đã lưu sự kiện [${eventType}] vào pending_webhooks để tự động gửi lại.`);
    } catch (dbErr: any) {
      this.logger.error(`[n8n Outbox] Không thể lưu pending_webhooks: ${dbErr.message}`);
    }
  }
}
