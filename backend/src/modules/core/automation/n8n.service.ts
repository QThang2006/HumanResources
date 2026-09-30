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

  constructor(private readonly configService: ConfigService) {
    this.webhookBaseUrl =
      this.configService.get<string>('N8N_WEBHOOK_URL') ||
      'http://localhost:5678/webhook';
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
  }): Promise<boolean> {
    const url = `${this.webhookBaseUrl}/interview-schedule`;
    return this.postWebhook(url, payload, 'Xếp lịch phỏng vấn');
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
  }): Promise<boolean> {
    const url = `${this.webhookBaseUrl}/employee-hired`;
    return this.postWebhook(url, payload, 'Tuyển dụng nhân sự mới');
  }

  /**
   * Bắn Webhook cảnh báo kiệt sức (Telegram / Slack)
   */
  async triggerBurnoutAlert(payload: {
    userId: number;
    employeeName: string;
    departmentName: string;
    stressDays: number;
    latestFeedback?: string;
  }): Promise<boolean> {
    const url = `${this.webhookBaseUrl}/burnout-alert`;
    return this.postWebhook(url, payload, 'Cảnh báo nguy cơ kiệt sức');
  }

  private async postWebhook(url: string, data: any, actionName: string): Promise<boolean> {
    try {
      this.logger.log(`[n8n Dispatcher] Bắn webhook [${actionName}] tới: ${url}`);
      // Gọi fetch bất đồng bộ, không làm nghẽn luồng xử lý chính của người dùng
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: actionName,
          timestamp: new Date().toISOString(),
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
