import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { isEmail } from 'class-validator';
import { Application, ApplicationStatus } from '../../entities/application.entity';
import { Interview, InterviewResult } from '../../entities/interview.entity';
import { Offer, OfferStatus } from '../../entities/offer.entity';
import { N8nService } from '../core/automation/n8n.service';
import { Actor, assertOperator } from '../jobs/recruitment.policy';
import { CreateOfferInput, OfferDeliveryInput } from './offer.dto';
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const html = (v: unknown) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function offerView(o: Offer) {
    return { offerId: o.id, candidateName: o.candidateName, jobTitle: o.jobTitle, salary: o.salary,
        startDate: o.startDate, expiresAt: o.expiresAt, status: o.status, deliveryStatus: o.deliveryStatus,
        sentAt: o.sentAt, remindedAt: o.remindedAt, respondedAt: o.respondedAt };
}
@Injectable()
export class OfferService {
    constructor(
    @InjectRepository(Offer)
    private readonly offers: Repository<Offer>, private readonly db: DataSource, private readonly n8n: N8nService, private readonly config: ConfigService) { }
    private settings() {
        const fromEmail = this.config.get<string>('MAIL_FROM');
        const hrEmail = this.config.get<string>('HR_EMAIL');
        const ui = (this.config.get<string>('PUBLIC_WEB_BASE_URL') || 'http://localhost:5173').replace(/\/$/, '');
        if (!isEmail(fromEmail || '') || !isEmail(hrEmail || ''))
            throw new ServiceUnavailableException('Cần cấu hình MAIL_FROM và HR_EMAIL trước khi gửi Offer.');
        try {
            const u = new URL(ui);
            if (u.username || u.password || u.search || u.hash || !['http:', 'https:'].includes(u.protocol))
                throw new Error();
        }
        catch {
            throw new ServiceUnavailableException('PUBLIC_WEB_BASE_URL không hợp lệ.');
        }
        return { fromEmail, hrEmail, ui };
    }
    async create(applicationId: number, input: CreateOfferInput, actor: Actor) {
        assertOperator(actor);
        this.settings();
        if (input.startDate < new Date().toISOString().slice(0, 10) || !input.salary.trim() || !input.roleTitle.trim())
            throw new BadRequestException('Ngày nhận việc và nội dung Offer chưa hợp lệ.');
        const responseToken = randomBytes(32).toString('hex'), token = randomBytes(32).toString('hex');
        const saved = await this.db.transaction(async (m) => {
            const app = await m.getRepository(Application).findOne({ where: { id: applicationId }, lock: { mode: 'pessimistic_write' } });
            if (!app)
                throw new NotFoundException('Không tìm thấy hồ sơ.');
            if (![ApplicationStatus.INTERVIEWING, ApplicationStatus.OFFERED].includes(app.status))
                throw new ConflictException('Hồ sơ không ở bước phát hành Offer.');
            const latest = await m.getRepository(Interview).findOne({ where: { applicationId }, order: { round: 'DESC', id: 'DESC' } });
            if (latest?.result !== InterviewResult.PASSED)
                throw new ConflictException('Vòng phỏng vấn mới nhất chưa đạt.');
            if (await m.getRepository(Offer).findOneBy({ applicationId }))
                throw new ConflictException('Hồ sơ đã có Offer. Tải lại để kiểm tra trạng thái.');
            const row = m.getRepository(Offer).create({ applicationId, candidateEmail: app.candidateEmail, candidateName: app.candidateName,
                jobTitle: input.roleTitle.trim(), salary: input.salary.trim(), startDate: input.startDate,
                expiresAt: new Date(Date.now() + 48 * 3600000), version: 1, tokenHash: hash(responseToken), deliveryTokenHash: hash(token), status: OfferStatus.PENDING });
            const result = await m.getRepository(Offer).save(row);
            app.status = ApplicationStatus.OFFERED;
            await m.getRepository(Application).save(app);
            return result;
        });
        await this.dispatch(saved.id, token, responseToken);
        return offerView(await this.offers.findOneByOrFail({ id: saved.id }));
    }
    private async dispatch(offerId: number, token: string, responseToken: string) {
        const ok = await this.n8n.triggerOfferIssued({ offerId, token, responseToken });
        if (!ok)
            await this.offers.createQueryBuilder().update().set({ deliveryStatus: 'DISPATCH_FAILED' }).where('id = :id AND claimedAt IS NULL', { id: offerId }).execute();
    }
    async retry(applicationId: number, actor: Actor) {
        assertOperator(actor);
        this.settings();
        const token = randomBytes(32).toString('hex'), responseToken = randomBytes(32).toString('hex');
        const id = await this.db.transaction(async (m) => {
            await m.getRepository(Application).findOne({ where: { id: applicationId }, lock: { mode: 'pessimistic_write' } });
            const o = await m.getRepository(Offer).findOne({ where: { applicationId }, lock: { mode: 'pessimistic_write' } });
            if (!o || o.claimedAt || o.status !== OfferStatus.PENDING)
                throw new ConflictException('Chỉ thử lại Offer chưa được workflow nhận. Kiểm tra execution nếu đã nhận.');
            o.tokenHash = hash(responseToken);
            o.deliveryTokenHash = hash(token);
            o.deliveryStatus = 'PENDING';
            await m.getRepository(Offer).save(o);
            return o.id;
        });
        await this.dispatch(id, token, responseToken);
        return offerView(await this.offers.findOneByOrFail({ id }));
    }
    async list(applicationId: number, actor: Actor) {
        assertOperator(actor);
        return (await this.offers.find({ where: { applicationId }, order: { version: 'DESC' } })).map(offerView);
    }
    private validToken(token: string, expected: string) {
        return /^[a-f0-9]{64}$/.test(token || '') && !!expected && timingSafeEqual(Buffer.from(hash(token)), Buffer.from(expected));
    }
    private async publicRow(token: string) {
        if (!/^[a-f0-9]{64}$/.test(token || ''))
            throw new NotFoundException('Liên kết Offer không hợp lệ.');
        const o = await this.offers.findOneBy({ tokenHash: hash(token) });
        if (!o)
            throw new NotFoundException('Liên kết Offer không hợp lệ.');
        return o;
    }
    async view(token: string) {
        const o = await this.publicRow(token);
        // CAS protects concurrent acceptance; an unsent offer never expires.
        await this.offers.createQueryBuilder().update().set({ status: OfferStatus.EXPIRED }).where('id=:id AND status=:status AND sentAt IS NOT NULL AND expires_at <= :now', { id: o.id, status: OfferStatus.PENDING, now: new Date() }).execute();
        return offerView(await this.offers.findOneByOrFail({ id: o.id }));
    }
    async respond(token: string, status: OfferStatus.ACCEPTED | OfferStatus.DECLINED) {
        const found = await this.publicRow(token);
        return this.db.transaction(async (m) => {
            const app = await m.getRepository(Application).findOne({ where: { id: found.applicationId }, lock: { mode: 'pessimistic_write' } });
            const o = await m.getRepository(Offer).findOne({ where: { id: found.id }, lock: { mode: 'pessimistic_write' } });
            if (!o.sentAt)
                throw new ConflictException('Offer chưa được xác nhận gửi.');
            if (o.status === status)
                return offerView(o);
            if (o.status !== OfferStatus.PENDING || app.status !== ApplicationStatus.OFFERED)
                throw new ConflictException('Offer đã được xử lý hoặc hồ sơ đã kết thúc.');
            if (o.expiresAt.getTime() <= Date.now())
                o.status = OfferStatus.EXPIRED;
            else {
                o.status = status;
                o.respondedAt = new Date();
            }
            await m.getRepository(Offer).save(o);
            return offerView(o);
        });
    }
    async delivery(id: number, token: string, input: OfferDeliveryInput) {
        const config = this.settings();
        return this.db.transaction(async (m) => {
            const o = await m.getRepository(Offer).createQueryBuilder('o').addSelect(['o.deliveryTokenHash', 'o.tokenHash']).where('o.id=:id', { id }).setLock('pessimistic_write').getOne();
            if (!o || !this.validToken(token, o.deliveryTokenHash))
                throw new UnauthorizedException('Offer callback không hợp lệ.');
            const now = new Date();
            const app = await m.getRepository(Application).findOneBy({ id: o.applicationId });
            const active = app?.status === ApplicationStatus.OFFERED;
            const checkSmtp = (recipients: string[]) => {
                const accepted = new Set((input.accepted || []).map(x => x.toLowerCase()));
                if (!input.messageId || !recipients.every(x => accepted.has(x.toLowerCase())))
                    throw new ConflictException('SMTP chưa chấp nhận đủ người nhận.');
            };
            let shouldSend = false;
            if (input.action === 'CLAIM') {
                if (!active || o.claimedAt || o.status !== OfferStatus.PENDING || !this.validToken(input.responseToken, o.tokenHash))
                    throw new ConflictException('Offer đã nhận hoặc không còn hợp lệ.');
                o.claimedAt = now;
                o.deliveryStatus = 'RUNNING';
                shouldSend = true;
            }
            else if (input.action === 'SENT') {
                if (!o.claimedAt)
                    throw new ConflictException('Chưa claim Offer.');
                checkSmtp([o.candidateEmail]);
                if (o.sentAt && o.messageId !== input.messageId)
                    throw new ConflictException('Offer đã có thư khác.');
                if (!o.sentAt) {
                    o.sentAt = now;
                    o.expiresAt = new Date(now.getTime() + 48 * 3600000);
                    o.messageId = input.messageId;
                    o.deliveryStatus = 'SMTP_ACCEPTED';
                }
            }
            else {
                if (!o.sentAt)
                    throw new ConflictException('Offer chưa được gửi.');
                if (o.status === OfferStatus.PENDING && o.expiresAt <= now)
                    o.status = OfferStatus.EXPIRED;
                if (input.action === 'REMIND' && active && o.status === OfferStatus.PENDING && now.getTime() >= o.sentAt.getTime() + 24 * 3600000 && !o.reminderClaimedAt) {
                    o.reminderClaimedAt = now;
                    shouldSend = true;
                }
                if (input.action === 'REMINDED') {
                    checkSmtp([o.candidateEmail, config.hrEmail]);
                    if (!o.reminderClaimedAt)
                        throw new ConflictException('Chưa claim nhắc nhở.');
                    o.remindedAt ||= now;
                }
                if (input.action === 'EXPIRE' && active && o.status === OfferStatus.EXPIRED && !o.expiryClaimedAt) {
                    shouldSend = true;
                    o.expiryClaimedAt = now;
                }
                if (input.action === 'EXPIRY_NOTIFIED') {
                    checkSmtp([config.hrEmail]);
                    if (o.status !== OfferStatus.EXPIRED || !o.expiryClaimedAt)
                        throw new ConflictException('Offer chưa hết hạn.');
                    o.expiryNotifiedAt ||= now;
                }
            }
            await m.getRepository(Offer).save(o);
            const responseUrl = input.responseToken ? `${config.ui}/offers/${input.responseToken}` : '';
            return { ...offerView(o), shouldSend, fromEmail: config.fromEmail, hrEmail: config.hrEmail, candidateEmail: o.candidateEmail,
                remindAt: o.sentAt ? new Date(o.sentAt.getTime() + 24 * 3600000).toISOString() : null,
                subject: `Thư mời nhận việc - ${o.jobTitle.replace(/[\r\n]/g, ' ')}`,
                html: `<h2>Thư mời nhận việc</h2><p>Kính gửi ${html(o.candidateName)},</p><p>Vị trí: <b>${html(o.jobTitle)}</b></p><p>Mức lương: ${html(o.salary)}</p><p>Ngày nhận việc: ${html(o.startDate)}</p><p>Vui lòng phản hồi trong 48 giờ kể từ khi thư được gửi.</p><p><a href="${html(responseUrl)}">Xem và phản hồi Offer</a></p><p>Trân trọng, Phòng Nhân sự.</p>` };
        });
    }
}
