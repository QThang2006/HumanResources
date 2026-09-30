import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum MoodType {
  GREAT = 'GREAT',
  NORMAL = 'NORMAL',
  STRESSED = 'STRESSED',
}

export enum SentimentLabel {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
}

@Entity('employee_moods')
export class EmployeeMood {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.moods, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: MoodType })
  mood: MoodType;

  @Column({ name: 'feedback_text', type: 'text', nullable: true })
  feedbackText: string;

  @Column({ name: 'sentiment_label', type: 'enum', enum: SentimentLabel, nullable: true })
  sentimentLabel: SentimentLabel;

  @Column({ name: 'is_burnout_risk', type: 'boolean', default: false })
  isBurnoutRisk: boolean;

  // Lỗ hổng 4: Quản lý vòng đời xử lý kiệt sức (Burnout Lifecycle)
  @Column({ name: 'is_resolved', type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ name: 'resolved_by_id', nullable: true })
  resolvedById: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy: User;

  @Column({ name: 'resolved_note', type: 'text', nullable: true })
  resolvedNote: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
