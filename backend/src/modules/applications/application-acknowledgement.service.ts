import { ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';
import { DataSource } from 'typeorm';
import { Application } from '../../entities/application.entity';
import { N8nService } from '../core/automation/n8n.service';

/** Pending website receipts are durable; only n8n's atomic claim authorizes SMTP. */
@Injectable()
export class ApplicationAcknowledgementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApplicationAcknowledgementService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;

  constructor(private readonly db: DataSource, private readonly config: ConfigService,
    private readonly n8n: N8nService) {}

  private enabled() {
    return this.config.get<string>('N8N_ACKNOWLEDGEMENT_ENABLED') === 'true';
  }

  onModuleInit() {
    this.timer = setInterval(() => {
      if (!this.running && this.enabled()) {
        this.running = this.processPending().catch(() => {
          this.logger.warn('Website acknowledgement worker failed; pending receipts are retained.');
        }).finally(() => { this.running = undefined; });
      }
    }, 30_000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.running;
  }

  async dispatch(applicationId: number): Promise<void> {
    if (!this.enabled()) return;
    try {
      if (await this.n8n.triggerApplicationCreated({ applicationId })) return;
    } catch {
      // No provider response, CV, recipient, or credential belongs in this log.
    }
    this.logger.warn('Website acknowledgement dispatch pending for application ' + applicationId);
  }

  async processPending() {
    if (!this.enabled()) return;
    const pending = await this.db.getRepository(Application).createQueryBuilder('a')
      .select(['a.id'])
      .where('a.intakeChannel IS NULL')
      .andWhere('a.acknowledgementStatus = :status', { status: 'PENDING' })
      .orderBy('a.createdAt', 'ASC').addOrderBy('a.id', 'ASC').take(10).getMany();
    // Multiple dispatchers may deliver the same event; claim() arbitrates in MySQL.
    await Promise.all(pending.map(app => this.dispatch(app.id)));
  }

  async claim(applicationId: number) {
    if (!this.enabled()) throw new ServiceUnavailableException('Chưa bật gửi thư xác nhận website.');
    return this.db.transaction(async manager => {
      const repo = manager.getRepository(Application);
      const row = await repo.findOne({ where: { id: applicationId }, lock: { mode: 'pessimistic_write' } });
      if (!row || row.intakeChannel)
        throw new ConflictException('Hồ sơ không thuộc kênh website.');
      if (row.acknowledgementStatus !== 'PENDING') return { shouldSend: false };
      const fromEmail = this.config.get<string>('MAIL_FROM');
      if (!isEmail(fromEmail || ''))
        throw new ServiceUnavailableException('MAIL_FROM chưa cấu hình đúng email gửi.');
      row.acknowledgementStatus = 'CLAIMED';
      await repo.save(row);
      return {
        shouldSend: true, applicationId: row.id, channel: 'WEBSITE', fromEmail,
        candidateName: row.candidateName, candidateEmail: row.candidateEmail,
      };
    });
  }
}
