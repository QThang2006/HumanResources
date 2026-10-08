import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Interview } from '../../entities/interview.entity';

// TV2 owns delivery tracking; shared Interview keeps its existing Meet fields.
@Entity('interview_deliveries')
export class InterviewDelivery {
  @PrimaryColumn({ name: 'interview_id', type: 'int' }) interviewId: number;
  @OneToOne(() => Interview, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interview_id' })
  interview: Interview;
  @Column({ name: 'request_id', length: 36, unique: true }) requestId: string;
  @Column({ name: 'token_hash', length: 64, nullable: true, select: false }) tokenHash: string;
  @Column({ name: 'payload_snapshot', type: 'json', select: false }) payloadSnapshot: Record<
    string,
    unknown
  >;
  @Column({ name: 'expected_event_id', length: 64 }) expectedEventId: string;
  @Column({ length: 20, default: 'PENDING' }) status: string;
  @Column({ name: 'calendar_status', length: 20, default: 'PENDING' }) calendarStatus: string;
  @Column({ name: 'email_status', length: 20, default: 'PENDING' }) emailStatus: string;
  @Column({ name: 'smtp_message_id', length: 998, nullable: true }) smtpMessageId: string;
  @Column({ name: 'failure_stage', length: 20, nullable: true }) failureStage: string;
  @Column({ name: 'failure_code', length: 32, nullable: true }) failureCode: string;
  @Column({ name: 'claimed_at', type: 'datetime', nullable: true }) claimedAt: Date;
  @Column({ name: 'expires_at', type: 'datetime' }) expiresAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
