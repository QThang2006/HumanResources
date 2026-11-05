import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { TrainingCourse, TrainingCourseType } from './training-course.entity';

export interface TrainingCourseSnapshot {
  id: number;
  title: string;
  type: TrainingCourseType;
  skillsProvided: string[];
  courseUrl: string | null;
  durationHours: number;
}

export enum TrainingStatus {
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

// Lỗ hổng 2: Chống gán trùng 1 khóa học nhiều lần cho cùng 1 nhân viên
@Index(['userId', 'courseId'], { unique: true })
@Index('IDX_tv4_training_user_id', ['userId'])
@Entity('employee_trainings')
export class EmployeeTraining {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.trainings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'course_id', type: 'int', nullable: true })
  courseId: number | null;

  @ManyToOne(() => TrainingCourse, (course) => course.assignments, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'course_id' })
  course: TrainingCourse | null;

  @Column({ name: 'course_snapshot', type: 'json', nullable: true })
  courseSnapshot: TrainingCourseSnapshot | null;

  @Column({ name: 'course_deleted_at', type: 'datetime', nullable: true })
  courseDeletedAt: Date | null;

  // Lỗ hổng 2: Lưu tiến độ học tập thực tế (0 - 100%)
  @Column({ name: 'progress_percent', type: 'int', default: 0 })
  progressPercent: number;

  @Column({ name: 'assigned_by_ai', type: 'boolean', default: true })
  assignedByAi: boolean;

  @Column({ name: 'ai_reason', type: 'text', nullable: true })
  aiReason: string;

  @Column({ type: 'enum', enum: TrainingStatus, default: TrainingStatus.ASSIGNED })
  status: TrainingStatus;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ name: 'due_at', type: 'datetime', nullable: true })
  dueAt: Date;

  @Column({ name: 'last_reminder_at', type: 'datetime', nullable: true })
  lastReminderAt: Date;

  @Column({ name: 'reminder_count', type: 'int', default: 0 })
  reminderCount: number;

  @Column({ name: 'manager_escalated_at', type: 'datetime', nullable: true })
  managerEscalatedAt: Date;

  @Column({ name: 'last_reminder_run_id', type: 'varchar', length: 100, nullable: true })
  lastReminderRunId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
