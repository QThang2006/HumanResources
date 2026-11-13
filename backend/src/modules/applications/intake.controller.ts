import { Body, CanActivate, ConflictException, Controller, ExecutionContext, Injectable, Param, ParseIntPipe, Post, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createHash, timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';
import { IsArray, IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, isEmail } from 'class-validator';
import { SubmitInput } from '../jobs/recruitment.dto';
import { Application } from '../../entities/application.entity';
import { ApplicationsService } from './applications.service';
import { MAX_CV_BYTES } from './cv-storage.service';
import { ApplicationAcknowledgementService } from './application-acknowledgement.service';
@Injectable()
export class IntakeGuard implements CanActivate {
    constructor(private readonly config: ConfigService) { }
    canActivate(context: ExecutionContext) {
        const expected = this.config.get<string>('N8N_INTAKE_KEY') || '';
        const supplied = context.switchToHttp().getRequest().headers['x-intake-key'];
        const digest = (s: string) => createHash('sha256').update(s).digest();
        if (expected.length < 32 || typeof supplied !== 'string' || !timingSafeEqual(digest(expected), digest(supplied)))
            throw new UnauthorizedException('Intake credential không hợp lệ.');
        return true;
    }
}
class IntakeInput extends SubmitInput {
    @IsIn(['GMAIL', 'GOOGLE_FORM'])
    channel: string;
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    sourceId: string;
}
class AcknowledgementInput {
    @IsArray()
    @IsEmail({}, { each: true })
    accepted: string[];
    @IsString()
    @IsNotEmpty()
    @MaxLength(998)
    messageId: string;
}
@Controller('recruitment/intake')
@UseGuards(IntakeGuard)
export class IntakeController {
    constructor(private readonly applications: ApplicationsService, private readonly db: DataSource, private readonly config: ConfigService,
        private readonly acknowledgements: ApplicationAcknowledgementService) { }
    @Post()
    @UseInterceptors(FileInterceptor('cv', { storage: memoryStorage(), limits: { fileSize: MAX_CV_BYTES, files: 1, fields: 6, fieldSize: 1000, parts: 8 } }))
    async ingest(
    @Body()
    input: IntakeInput,
    @UploadedFile()
    file: Express.Multer.File) {
        const key = createHash('sha256').update(input.channel + ':' + input.sourceId).digest('hex');
        const fromEmail = this.config.get<string>('MAIL_FROM');
        if (!isEmail(fromEmail || ''))
            throw new ConflictException('MAIL_FROM chưa cấu hình đúng email gửi.');
        if (await this.db.getRepository(Application).findOneBy({ intakeKey: key }))
            return { shouldSend: false, duplicate: true };
        const { channel, sourceId, ...submission } = input;
        try {
            const result = await this.applications.apply(submission, file, { key, channel });
            return { ...result, shouldSend: true, fromEmail, candidateEmail: input.candidateEmail.trim().toLowerCase(), candidateName: input.candidateName };
        }
        catch (e) {
            // Unique job+email and source key arbitrate concurrent deliveries from both channels.
            if (e instanceof ConflictException && await this.db.getRepository(Application).findOneBy({ jobId: input.jobId, candidateEmail: input.candidateEmail.trim().toLowerCase() }))
                return { shouldSend: false, duplicate: true };
            throw e;
        }
    }
    @Post(':id/acknowledgement/claim')
    async claimAcknowledgement(@Param('id', ParseIntPipe) id: number) {
        return this.acknowledgements.claim(id);
    }
    @Post(':id/acknowledgement')
    async acknowledge(
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    input: AcknowledgementInput) {
        return this.db.transaction(async (m) => {
            const row = await m.getRepository(Application).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
            if (!row || !['CLAIMED', 'SMTP_ACCEPTED'].includes(row.acknowledgementStatus) ||
                !input.accepted.map(e => e.toLowerCase()).includes(row.candidateEmail.toLowerCase()))
                throw new ConflictException('SMTP chưa xác nhận đúng ứng viên.');
            if (row.acknowledgementMessageId && row.acknowledgementMessageId !== input.messageId)
                throw new ConflictException('Hồ sơ đã xác nhận bằng thư khác.');
            if (row.acknowledgementStatus === 'SMTP_ACCEPTED' && row.acknowledgementMessageId === input.messageId)
                return { recorded: true };
            row.acknowledgementStatus = 'SMTP_ACCEPTED';
            row.acknowledgementMessageId = input.messageId;
            await m.getRepository(Application).save(row);
            return { recorded: true };
        });
    }
}
