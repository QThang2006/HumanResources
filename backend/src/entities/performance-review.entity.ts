import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum RatingRank {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  AVERAGE = 'AVERAGE',
  POOR = 'POOR',
}

@Entity('performance_reviews')
export class PerformanceReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.performanceReviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'reviewer_id' })
  reviewerId: number;

  @ManyToOne(() => User, (user) => user.conductedReviews, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ name: 'review_period', type: 'varchar', length: 50 })
  reviewPeriod: string;

  @Column({ name: 'kpi_score', type: 'decimal', precision: 5, scale: 2 })
  kpiScore: number;

  @Column({ name: 'manager_comment', type: 'text', nullable: true })
  managerComment: string;

  @Column({ name: 'ai_summary_feedback', type: 'text', nullable: true })
  aiSummaryFeedback: string;

  @Column({ name: 'rating_rank', type: 'enum', enum: RatingRank })
  ratingRank: RatingRank;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
