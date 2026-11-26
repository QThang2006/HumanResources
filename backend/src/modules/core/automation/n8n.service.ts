import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  private defaultTelegramChatId: string;

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
    action?: 'SCHEDULED' | 'RESCHEDULED';
    previousScheduledAt?: string;
    previousEventId?: string | null;
    delivery?: unknown;
    fromEmail?: string;
    telegramChatId?: string;
  }): Promise<boolean> {
    const url = `${this.webhookBaseUrl}/interview-schedule`;
    const fullPayload = {
      fromEmail: payload.fromEmail || this.defaultSenderEmail,
      telegramChatId: payload.telegramChatId || this.defaultTelegramChatId,
      ...payload,
    };
    return this.postTv2Webhook(
      url,
      fullPayload,
      'Xếp lịch phỏng vấn',
      'N8N_INTERVIEW_WEBHOOK_KEY',
    );
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
    return this.postTv2Webhook(
      this.webhookBaseUrl + '/offer-issued',
      payload,
      'Phát hành Offer Letter',
      'N8N_OFFER_WEBHOOK_KEY',
    );
  }

  /**
   * Bắn Webhook gửi thư cảm ơn / từ chối lịch sự khi HR chuyển hồ sơ sang REJECTED
   */
  async triggerApplicationRejected(payload: {
    applicationId: number;
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    departmentName?: string;
    rejectionReason?: string | null;
    trackingCode?: string | null;
    trackingUrl?: string | null;
    fromEmail?: string;
  }): Promise<boolean> {
    const safeName = escapeHtml(payload.candidateName || 'Ứng viên');
    const safeJobTitle = escapeHtml(payload.jobTitle || 'vị trí ứng tuyển');
    const safeDepartment = payload.departmentName ? escapeHtml(payload.departmentName) : '';
    const trimmedReason = payload.rejectionReason?.trim() || '';
    const safeReason = trimmedReason ? escapeHtml(trimmedReason) : '';
    const safeTrackingCode = payload.trackingCode ? escapeHtml(payload.trackingCode) : '';
    const safeTrackingUrl =
      payload.trackingUrl && /^https?:\/\//i.test(payload.trackingUrl)
        ? escapeHtml(payload.trackingUrl)
        : '';

    const subject = `Cảm ơn bạn đã ứng tuyển vị trí ${payload.jobTitle || 'tại công ty'}`;
    const reasonBlock = safeReason
      ? `<div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:6px;color:#334155;"><strong>Phản hồi từ bộ phận Tuyển dụng:</strong><br/>${safeReason}</div>`
      : '';
    const trackingBlock = safeTrackingCode
      ? `<p style="margin-top:16px;font-size:13px;color:#475569;">Mã tra cứu hồ sơ của bạn: <strong>${safeTrackingCode}</strong>${
          safeTrackingUrl
            ? ` — <a href="${safeTrackingUrl}" style="color:#2563eb;">Xem trạng thái hồ sơ</a>`
            : ''
        }</p>`
      : '';

    const html = [
      `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:600px;">`,
      `<p>Chào <strong>${safeName}</strong>,</p>`,
      `<p>Cảm ơn bạn đã dành thời gian quan tâm và gửi hồ sơ ứng tuyển cho vị trí <strong>${safeJobTitle}</strong>${safeDepartment ? ` (Phòng ${safeDepartment})` : ''}.</p>`,
      `<p>Sau quá trình xem xét kỹ lưỡng, chúng tôi rất tiếc chưa thể đồng hành cùng bạn ở vị trí này trong đợt tuyển dụng hiện tại.</p>`,
      reasonBlock,
      `<p>Chúng tôi luôn trân trọng hồ sơ và kinh nghiệm của bạn. Thông tin của bạn sẽ được lưu trong hệ thống ứng viên tiềm năng và chúng tôi rất mong có cơ hội kết nối lại khi có vị trí phù hợp hơn trong thời gian tới.</p>`,
      trackingBlock,
      `<p style="margin-top:20px;">Chúc bạn nhiều sức khỏe và thành công trên chặng đường sự nghiệp sắp tới!</p>`,
      `<p>Trân trọng,<br/><strong>Bộ phận Tuyển dụng (HR)</strong></p>`,
      `</div>`,
    ].join('');

    const fullPayload = {
      fromEmail: payload.fromEmail || this.defaultSenderEmail,
      applicationId: payload.applicationId,
      candidateName: payload.candidateName,
      candidateEmail: payload.candidateEmail,
      jobTitle: payload.jobTitle,
      departmentName: payload.departmentName || '',
      rejectionReason: trimmedReason || null,
      trackingCode: payload.trackingCode || null,
      trackingUrl: payload.trackingUrl || null,
      subject,
      html,
    };

    return this.postWebhook(
      `${this.webhookBaseUrl.replace(/\/+$/, '')}/application-rejected`,
      fullPayload,
      'Gửi thư từ chối ứng viên',
      this.aiHeaders(),
    );
  }

  /**
   * Bắn webhook khi danh sách tin tuyển dụng thay đổi để đồng bộ dropdown Google Form.
   * Backend vẫn là nguồn mã vị trí duy nhất; n8n chỉ chuyển danh sách job đang mở sang Form.
   */
  async triggerJobsChanged(payload: {
    action: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED';
    job: Record<string, unknown>;
  }): Promise<boolean> {
    return this.postWebhook(
      this.webhookBaseUrl + '/jobs-changed',
      payload,
      'Đồng bộ danh sách vị trí Google Form',
      this.aiHeaders(),
    );
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

  private aiHeaders(): Record<string, string> | undefined {
    const key =
      this.configService.get<string>('N8N_AI_KEY') ||
      this.configService.get<string>('N8N_INTAKE_KEY');

    return key ? { 'x-n8n-ai-key': key } : undefined;
  }

  private postTv2Webhook(
    url: string,
    data: unknown,
    actionName: string,
    overrideKeyName: 'N8N_INTERVIEW_WEBHOOK_KEY' | 'N8N_OFFER_WEBHOOK_KEY',
  ): Promise<boolean> {
    const key =
      this.configService.get<string>(overrideKeyName)?.trim() ||
      this.configService.get<string>('N8N_AI_KEY')?.trim();
    if (!key) {
      this.logger.warn(`[n8n Dispatcher] ${actionName}: chưa cấu hình khóa webhook TV2`);
      return Promise.resolve(false);
    }
    return this.postWebhook(url, data, actionName, { 'x-n8n-ai-key': key });
  }

  async triggerApplicationCreated(payload: { applicationId: number }): Promise<boolean> {
    // The live WF-02 intake credential already authenticates n8n -> BE callbacks.
    // Reuse that credential for this receipt webhook, independently of AI credentials.
    const key = this.configService.get<string>('N8N_INTAKE_KEY');
    if (!key || key.length < 32) {
      this.logger.warn('[n8n Dispatcher] Chưa cấu hình khóa intake cho xác nhận hồ sơ website');
      return false;
    }
    return this.postWebhook(
      `${this.webhookBaseUrl.replace(/\/+$/, '')}/application-received`,
      payload,
      'Xác nhận hồ sơ website',
      { 'x-intake-key': key },
    );
  }

  async triggerAiResumeScore(payload: {
    applicationId: number;
    requestId?: string;
  }): Promise<boolean> {
    return this.postWebhook(
      `${this.webhookBaseUrl}/ai-resume-score`,
      payload,
      'AI chấm điểm CV',
      this.aiHeaders(),
    );
  }

  async triggerAiInterviewQuestions(payload: {
    interviewId: number;
    requestId?: string;
  }): Promise<boolean> {
    return this.postWebhook(
      `${this.webhookBaseUrl}/ai-interview-questions`,
      payload,
      'AI tạo câu hỏi phỏng vấn',
      this.aiHeaders(),
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extraHeaders,
      };
      if (this.webhookSecret) {
        headers['X-Webhook-Secret'] = this.webhookSecret;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          event: actionName,
          timestamp: new Date().toISOString(),
          ...data,
          data,
        }),
      });
      if (!response.ok) {
        const reason = `HTTP ${response.status}: ${response.statusText}`;
        this.logger.warn(`[n8n Dispatcher] Webhook [${actionName}] trả về mã HTTP ${response.status}: ${response.statusText}`);
        await this.saveOutboxIfAvailable(url, data, reason);
      }
      return response.ok;
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
