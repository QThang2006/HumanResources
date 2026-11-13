import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('performance_review_schedules')
export class PerformanceReviewSchedule {
  @PrimaryColumn({ name: 'review_period', type: 'varchar', length: 7 })
  reviewPeriod: string;

  @Column({ name: 'opening_date', type: 'date' })
  openingDate: string;

  @Column({ name: 'reminder_date', type: 'date' })
  reminderDate: string;

  @Column({ type: 'date' })
  deadline: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'updated_by_id', type: 'int' })
  updatedById: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
