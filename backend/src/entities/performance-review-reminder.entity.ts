import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ReviewReminderPhase {
  OPENING = 'OPENING',
  SECOND_REMINDER = 'SECOND_REMINDER',
}

export enum AutomationDeliveryStatus {
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

@Index(['reviewPeriod', 'recipientId', 'phase'], { unique: true })
@Entity('performance_review_reminders')
export class PerformanceReviewReminder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'review_period', type: 'varchar', length: 20 })
  reviewPeriod: string;

  @Column({ name: 'recipient_id' })
  recipientId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ type: 'enum', enum: ReviewReminderPhase })
  phase: ReviewReminderPhase;

  @Column({ name: 'pending_employee_ids', type: 'simple-json' })
  pendingEmployeeIds: number[];

  @Column({ name: 'last_run_id', type: 'varchar', length: 100 })
  lastRunId: string;

  @Column({ name: 'email_notified', type: 'boolean', default: false })
  emailNotified: boolean;

  @Column({ name: 'telegram_notified', type: 'boolean', default: false })
  telegramNotified: boolean;

  @Column({
    type: 'enum',
    enum: AutomationDeliveryStatus,
    default: AutomationDeliveryStatus.FAILED,
  })
  status: AutomationDeliveryStatus;

  @Column({ type: 'text', nullable: true })
  detail: string;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
