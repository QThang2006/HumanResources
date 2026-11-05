import { ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { Application, ApplicationStatus, AiRecommendation } from '../../entities/application.entity';
import { Job } from '../../entities/job.entity';
import { RecruitmentAiService } from '../jobs/recruitment-ai.service';
import { CvStorageService } from './cv-storage.service';

const terminal = (a: Application) => [ApplicationStatus.HIRED, ApplicationStatus.REJECTED].includes(a.status);
const MAX_ATTEMPTS = 3;
// Longer than the SDK deadline. An abandoned claim becomes eligible after restart.
const LEASE_MS = 10 * 60_000;

@Injectable()
export class CvScoreQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CvScoreQueueService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopping = false;

  constructor(private readonly db: DataSource, private readonly ai: RecruitmentAiService,
    private readonly files: CvStorageService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      if (!this.running && !this.stopping) {
        this.running = this.processNext().catch(() => {
          // Never put provider responses (which can include credentials) into logs.
          this.logger.warn('CV scoring worker failed; durable claim will be retried.');
        }).finally(() => { this.running = undefined; });
      }
    }, 3000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    this.stopping = true;
    clearInterval(this.timer);
    await this.running;
  }

  async enqueue(id: number) {
    return this.db.transaction(async m => {
      const repo = m.getRepository(Application);
      const app = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!app || terminal(app)) throw new ConflictException('Hồ sơ đã kết thúc hoặc không tồn tại.');
      if (!app.aiScoreRequestId?.startsWith('be:') || !['PENDING', 'PROCESSING'].includes(app.aiScoreStatus)) {
        app.aiScoreStatus = 'PENDING';
        app.aiScoreRequestId = 'be:' + randomUUID();
        app.aiScoreAttempts = 0;
        app.aiScoreAvailableAt = new Date();
        app.aiScoreError = null;
        await repo.save(app);
      }
      return { mode: 'BACKEND', pending: true, saved: false, requestId: app.aiScoreRequestId,
        data: { matchScore: app.matchScore, summary: 'Đang chờ chấm CV.', skillsDetected: app.skillsDetected || [] } };
    });
  }

  async processNext(): Promise<void> {
    const claim = await this.db.transaction(async m => {
      const repo = m.getRepository(Application);
      const app = await repo.createQueryBuilder('a')
        .where('a.aiScoreStatus IN (:...states)', { states: ['PENDING', 'PROCESSING'] })
        .andWhere('a.aiScoreRequestId LIKE :owner', { owner: 'be:%' })
        .andWhere('a.aiScoreAvailableAt <= :now', { now: new Date() })
        .orderBy('a.aiScoreAvailableAt', 'ASC').addOrderBy('a.id', 'ASC')
        .setLock('pessimistic_write').setOnLocked('skip_locked').getOne();
      if (!app) return null;
      if (terminal(app) || app.aiScoreAttempts >= MAX_ATTEMPTS) {
        app.aiScoreStatus = 'FAILED';
        app.aiScoreAvailableAt = null;
        app.aiScoreError = terminal(app) ? 'Hồ sơ đã kết thúc quy trình.' : 'Đã hết số lần thử chấm CV.';
        await repo.save(app);
        return null;
      }
      app.aiScoreStatus = 'PROCESSING';
      app.aiScoreAttempts++;
      // Each lease has a distinct token: late workers cannot overwrite a newer result.
      app.aiScoreRequestId = 'be:' + randomUUID();
      app.aiScoreAvailableAt = new Date(Date.now() + LEASE_MS);
      app.aiScoreError = null;
      await repo.save(app);
      const job = await m.getRepository(Job).findOneByOrFail({ id: app.jobId });
      return { app, jd: job.description + '\n' + job.requirements };
    });
    if (!claim) return;
    const { app, jd } = claim;
    try {
      const result = app.rawCvText?.trim()
        ? await this.ai.score(app.rawCvText, jd)
        : await this.ai.scoreFile(await this.files.read(app.cvFileUrl), this.files.mimeType(app.cvFileUrl) || 'application/pdf', jd);
      if (result.mode !== 'LIVE') throw new Error('AI_UNAVAILABLE');
      await this.db.transaction(async m => {
        const repo = m.getRepository(Application);
        const current = await repo.findOne({ where: { id: app.id }, lock: { mode: 'pessimistic_write' } });
        if (!current || current.aiScoreRequestId !== app.aiScoreRequestId) return;
        const job = await m.getRepository(Job).findOne({ where: { id: app.jobId }, lock: { mode: 'pessimistic_read' } });
        if (terminal(current)) throw new ConflictException('Hồ sơ đã kết thúc.');
        if (!job || job.description + '\n' + job.requirements !== jd || current.cvFileUrl !== app.cvFileUrl)
          throw new Error('CONTEXT_CHANGED');
        const score = result.data.matchScore;
        current.matchScore = score;
        current.aiSummary = result.data.summary;
        current.skillsDetected = result.data.skillsDetected;
        if ('extractedText' in result.data) current.rawCvText = String(result.data.extractedText).slice(0, 60000);
        current.aiRecommendation = score >= 85 ? AiRecommendation.STRONG_HIRE : score >= 70 ? AiRecommendation.HIRE : score >= 50 ? AiRecommendation.CONSIDER : AiRecommendation.REJECT;
        current.aiScoreStatus = 'COMPLETED';
        current.aiScoreError = null;
        current.aiScoreAvailableAt = null;
        await repo.save(current);
      });
    } catch (error: any) {
      const status = Number(error?.getStatus?.() || error?.status || 0);
      const retry = app.aiScoreAttempts < MAX_ATTEMPTS &&
        ([429, 502, 503, 504].includes(status) || ['AI_UNAVAILABLE', 'CONTEXT_CHANGED'].includes(error?.message));
      await this.db.getRepository(Application).update({ id: app.id, aiScoreRequestId: app.aiScoreRequestId }, {
        aiScoreStatus: retry ? 'PENDING' : 'FAILED',
        aiScoreAvailableAt: retry ? new Date(Date.now() + 60_000 * 2 ** (app.aiScoreAttempts - 1)) : null,
        aiScoreError: retry ? 'AI tạm thời chưa khả dụng; sẽ tự thử lại.' : 'Không chấm được CV. Kiểm tra dịch vụ AI hoặc tệp CV rồi thử lại.',
      });
    }
  }
}
