import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum TaskCategory {
  PAPERWORK = 'PAPERWORK',
  EQUIPMENT = 'EQUIPMENT',
  TRAINING = 'TRAINING',
  MEETING = 'MEETING',
}

@Entity('onboarding_tasks')
export class OnboardingTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.onboardingTasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskCategory, default: TaskCategory.EQUIPMENT })
  category: TaskCategory;

  @Column({ name: 'due_day', type: 'int', default: 7 })
  dueDay: number;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
