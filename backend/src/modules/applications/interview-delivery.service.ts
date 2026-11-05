import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import { Application } from '../../entities/application.entity';
import { Interview } from '../../entities/interview.entity';
import { InterviewDelivery } from './interview-delivery.entity';
import { DeliveryCallbackInput, DeliveryEvent } from './interview-delivery.dto';
import { isEmail } from 'class-validator';

export interface InterviewDispatchPayload {
  interviewId: number;
  applicationId: number;
  candidateName: string;
  candidateEmail: string;
  interviewerName: string;
  interviewerEmail: string;
  scheduledAt: string;
  round: number;
  fromEmail?: string;
}
function digest(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export function deliveryView(row?: InterviewDelivery) {
  if (!row)
    return {
      status: 'UNVERIFIED',
      calendarStatus: 'UNVERIFIED',
      emailStatus: 'UNVERIFIED',
      failureStage: null,
      updatedAt: null,
    };
  // An absent callback is uncertain, not evidence that email failed or arrived.
  const waiting = ['PENDING', 'RUNNING'].includes(row.status);
  const status =
    waiting && Date.now() - row.createdAt.getTime() > 10 * 60_000 ? 'UNKNOWN' : row.status;
  return {
    status,
    calendarStatus: row.calendarStatus,
    emailStatus: row.emailStatus,
    failureStage: row.failureStage || null,
    updatedAt: row.updatedAt,
  };
}
@Injectable()
export class InterviewDeliveryService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}

  private callbackBase() {
    const value = this.config.get<string>('RECRUITMENT_CALLBACK_BASE_URL');
    if (!value) return null;
    try {
      const url = new URL(value);
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        !(
          url.protocol === 'https:' ||
          (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
        )
      )
        throw new Error();
      return url.toString().replace(/\/$/, '');
    } catch {
      throw new ServiceUnavailableException('Cấu hình địa chỉ nhận kết quả phỏng vấn chưa hợp lệ.');
    }
  }

  async prepare(manager: EntityManager, payload: InterviewDispatchPayload) {
    const base = this.callbackBase();
    if (base && !isEmail(payload.fromEmail || ''))
      throw new ServiceUnavailableException(
        'Cần cấu hình MAIL_FROM là email gửi thư mời trước khi bật nhận kết quả.',
      );
    const requestId = randomUUID();
    const token = base ? randomBytes(32).toString('hex') : null;
    const row = manager.getRepository(InterviewDelivery).create({
      interviewId: payload.interviewId,
      requestId,
      tokenHash: token ? digest(token) : null,
      payloadSnapshot: { ...payload, requireBothRecipients: true } as unknown as Record<string, unknown>,
      expectedEventId: 'hrtv2' + requestId.replace(/-/g, ''),
      status: base ? 'PENDING' : 'UNVERIFIED',
      calendarStatus: base ? 'PENDING' : 'UNVERIFIED',
      emailStatus: base ? 'PENDING' : 'UNVERIFIED',
      expiresAt: new Date(Date.now() + 48 * 60 * 60_000),
    });
    await manager.getRepository(InterviewDelivery).save(row);
    return base
      ? {
          requestId,
          token,
          callbackUrl: base + '/applications/interviews/' + payload.interviewId + '/delivery',
          eventId: row.expectedEventId,
        }
      : undefined;
  }

  async views(interviewIds: number[]) {
    if (!interviewIds.length) return new Map<number, ReturnType<typeof deliveryView>>();
    const rows = await this.db
      .getRepository(InterviewDelivery)
      .findBy({ interviewId: In(interviewIds) });
    return new Map(rows.map((row) => [row.interviewId, deliveryView(row)]));
  }

  async dispatchFailed(interviewId: number) {
    // CAS: never downgrade a callback that raced with dispatcher completion.
    await this.db
      .getRepository(InterviewDelivery)
      .createQueryBuilder()
      .update()
      .set({ status: 'FAILED', failureStage: 'DISPATCH', failureCode: 'WEBHOOK_REJECTED' })
      .where('interview_id = :interviewId AND status IN (:...statuses)', {
        interviewId,
        statuses: ['PENDING', 'UNVERIFIED'],
      })
      .execute();
  }

  private authenticate(row: InterviewDelivery, requestId: string, token?: string) {
    const supplied =
      typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? digest(token) : '0'.repeat(64);
    const expected = row?.tokenHash || 'f'.repeat(64);
    const valid = timingSafeEqual(Buffer.from(supplied, 'hex'), Buffer.from(expected, 'hex'));
    if (
      !row?.tokenHash ||
      !valid ||
      row.requestId !== requestId ||
      row.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Kết quả phỏng vấn chưa được xác thực.');
    }
  }

  private async authorized<T>(
    interviewId: number,
    requestId: string,
    token: string,
    action: (manager: EntityManager, row: InterviewDelivery, interview: Interview) => Promise<T>,
  ) {
    const preliminary = await this.db
      .getRepository(InterviewDelivery)
      .createQueryBuilder('delivery')
      .addSelect('delivery.tokenHash')
      .where('delivery.interviewId = :id', { id: interviewId })
      .getOne();
    this.authenticate(preliminary, requestId, token);
    return this.db.transaction(async (manager) => {
      const record = await manager.getRepository(Interview).findOneBy({ id: interviewId });
      if (!record) throw new UnauthorizedException('Kết quả phỏng vấn chưa được xác thực.');
      // Same lock order as schedule/result: Application -> Interview -> delivery.
      await manager
        .getRepository(Application)
        .findOne({ where: { id: record.applicationId }, lock: { mode: 'pessimistic_write' } });
      const interview = await manager
        .getRepository(Interview)
        .findOne({ where: { id: interviewId }, lock: { mode: 'pessimistic_write' } });
      const row = await manager
        .getRepository(InterviewDelivery)
        .createQueryBuilder('delivery')
        .addSelect(['delivery.tokenHash', 'delivery.payloadSnapshot'])
        .where('delivery.interviewId = :id', { id: interviewId })
        .setLock('pessimistic_write')
        .getOne();
      this.authenticate(row, requestId, token);
      return action(manager, row, interview);
    });
  }

  async claim(interviewId: number, requestId: string, token: string) {
    return this.authorized(interviewId, requestId, token, async (manager, row) => {
      if (row.claimedAt || row.status !== 'PENDING')
        throw new ConflictException(
          'Workflow đã nhận lịch này. Không chạy lại bước tạo lịch/gửi thư.',
        );
      row.claimedAt = new Date();
      row.status = 'RUNNING';
      await manager.getRepository(InterviewDelivery).save(row);
      // Authoritative snapshot prevents caller-submitted recipients from changing dispatch.
      return { claimed: true, payload: row.payloadSnapshot, eventId: row.expectedEventId };
    });
  }

  async callback(interviewId: number, input: DeliveryCallbackInput, token: string) {
    return this.authorized(interviewId, input.requestId, token, async (manager, row, interview) => {
      if (!row.claimedAt || interview.applicationId !== input.applicationId)
        throw new ConflictException('Kết quả không khớp lịch được workflow nhận.');
      let duplicate = false;
      if (input.event === DeliveryEvent.CALENDAR_CONFIRMED) {
        if (
          input.eventId !== row.expectedEventId ||
          Date.parse(input.scheduledAt) !== interview.scheduledAt.getTime()
        )
          throw new ConflictException('Lịch Google không khớp vòng phỏng vấn.');
        if (row.calendarStatus === 'CONFIRMED') {
          if (
            interview.meetingLink !== input.meetingLink ||
            interview.googleCalendarEventId !== input.eventId
          )
            throw new ConflictException('Lịch đã nhận kết quả khác.');
          duplicate = true;
        } else {
          // Delivery changes must not reset Manager result-form revision.
          await manager.getRepository(Interview).update(interviewId, {
            meetingLink: input.meetingLink,
            googleCalendarEventId: input.eventId,
            updatedAt: interview.updatedAt,
          });
          row.calendarStatus = 'CONFIRMED';
          if (row.failureStage === 'CALENDAR') {
            row.failureStage = null;
            row.failureCode = null;
            row.status = 'RUNNING';
          }
        }
      } else if (input.event === DeliveryEvent.SMTP_ACCEPTED) {
        if (
          row.calendarStatus !== 'CONFIRMED' ||
          input.eventId !== row.expectedEventId ||
          input.recipient.trim().toLowerCase() !==
            String(row.payloadSnapshot.candidateEmail).toLowerCase()
        )
          throw new ConflictException('Thư chưa khớp hồ sơ và lịch Google đã xác nhận.');
        if (row.payloadSnapshot.requireBothRecipients) {
          const accepted = new Set((input.acceptedRecipients || []).map(x => x.toLowerCase()));
          if (![row.payloadSnapshot.candidateEmail, row.payloadSnapshot.interviewerEmail].every(x => accepted.has(String(x).toLowerCase())))
            throw new ConflictException('SMTP chưa chấp nhận thư cho cả ứng viên và người phỏng vấn.');
        }
        if (row.emailStatus === 'SMTP_ACCEPTED') {
          if (row.smtpMessageId !== input.messageId)
            throw new ConflictException('Thư đã được xác nhận bằng messageId khác.');
          duplicate = true;
        } else {
          row.emailStatus = 'SMTP_ACCEPTED';
          row.smtpMessageId = input.messageId;
          row.status = 'COMPLETED';
          row.failureStage = null;
          row.failureCode = null;
        }
      } else {
        if (
          row.status === 'COMPLETED' ||
          (input.stage === 'CALENDAR' && row.calendarStatus === 'CONFIRMED')
        )
          throw new ConflictException('Không hạ kết quả đã xác nhận.');
        if (input.stage === 'EMAIL' && row.calendarStatus !== 'CONFIRMED')
          throw new ConflictException('Chưa có lịch Google để gửi thư.');
        if ((input.stage === 'EMAIL') !== (input.code === 'SMTP_ERROR'))
          throw new ConflictException('Mã lỗi không khớp bước workflow.');
        duplicate =
          row.status === 'FAILED' &&
          row.failureStage === input.stage &&
          row.failureCode === input.code;
        row.status = 'FAILED';
        row.failureStage = input.stage;
        row.failureCode = input.code;
        if (input.stage === 'CALENDAR') row.calendarStatus = 'FAILED';
        else row.emailStatus = 'UNKNOWN';
      }
      if (!duplicate) await manager.getRepository(InterviewDelivery).save(row);
      return {
        recorded: true,
        duplicate,
        interviewId,
        applicationId: interview.applicationId,
        automation: deliveryView(row),
      };
    });
  }
}
