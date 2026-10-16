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

export enum OffboardingStatus {
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Index(['userId', 'status'])
@Entity('offboarding_cases')
export class OffboardingCase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'approved_by_id' })
  approvedById: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User;

  @Column({ name: 'last_working_date', type: 'date' })
  lastWorkingDate: string;

  @Column({ name: 'personal_email', type: 'varchar', length: 255, nullable: true })
  personalEmail: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'asset_notes', type: 'text', nullable: true })
  assetNotes: string;

  @Column({ name: 'exit_survey_url', type: 'varchar', length: 1000, nullable: true })
  exitSurveyUrl: string;

  @Column({ type: 'enum', enum: OffboardingStatus, default: OffboardingStatus.APPROVED })
  status: OffboardingStatus;

  @Column({ name: 'last_workflow_run_id', type: 'varchar', length: 100, nullable: true })
  lastWorkflowRunId: string;

  @Column({ name: 'it_notified_at', type: 'datetime', nullable: true })
  itNotifiedAt: Date;

  @Column({ name: 'finance_notified_at', type: 'datetime', nullable: true })
  financeNotifiedAt: Date;

  @Column({ name: 'employee_notified_at', type: 'datetime', nullable: true })
  employeeNotifiedAt: Date;

  @Column({ name: 'telegram_notified_at', type: 'datetime', nullable: true })
  telegramNotifiedAt: Date;

  @Column({ name: 'automation_detail', type: 'text', nullable: true })
  automationDetail: string;

  @CreateDateColumn({ name: 'approved_at' })
  approvedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
