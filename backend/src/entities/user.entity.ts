import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Department } from './department.entity';
import { Job } from './job.entity';
import { Interview } from './interview.entity';
import { OnboardingTask } from './onboarding-task.entity';
import { Document } from './document.entity';
import { EmployeeTraining } from './employee-training.entity';
import { PerformanceReview } from './performance-review.entity';
import { EmployeeMood } from './employee-mood.entity';

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  HR = 'HR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'department_id', nullable: true })
  departmentId: number;

  @ManyToOne(() => Department, (dept) => dept.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  // Cách B: Quan hệ phân cấp Trưởng phòng trực tiếp (Self-referencing FK)
  @Column({ name: 'manager_id', nullable: true })
  managerId: number;

  @ManyToOne(() => User, (user) => user.subordinates, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @OneToMany(() => User, (user) => user.manager)
  subordinates: User[];

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ name: 'job_title', type: 'varchar', length: 100, nullable: true })
  jobTitle: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'joined_date', type: 'date', nullable: true })
  joinedDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Job, (job) => job.creator)
  createdJobs: Job[];

  @OneToMany(() => Interview, (interview) => interview.interviewer)
  interviews: Interview[];

  @OneToMany(() => OnboardingTask, (task) => task.user)
  onboardingTasks: OnboardingTask[];

  @OneToMany(() => Document, (doc) => doc.uploader)
  documents: Document[];

  @OneToMany(() => EmployeeTraining, (training) => training.user)
  trainings: EmployeeTraining[];

  @OneToMany(() => PerformanceReview, (review) => review.user)
  performanceReviews: PerformanceReview[];

  @OneToMany(() => PerformanceReview, (review) => review.reviewer)
  conductedReviews: PerformanceReview[];

  @OneToMany(() => EmployeeMood, (mood) => mood.user)
  moods: EmployeeMood[];
}
