import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Department } from './department.entity';
import { User } from './user.entity';
import { Application } from './application.entity';

export enum JobStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'department_id' })
  departmentId: number;

  @ManyToOne(() => Department, (dept) => dept.jobs, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User, (user) => user.createdJobs, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 150, default: 'Hà Nội' })
  location: string;

  @Column({ name: 'salary_range', type: 'varchar', length: 100, default: 'Thỏa thuận' })
  salaryRange: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  requirements: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.OPEN })
  status: JobStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Application, (app) => app.job)
  applications: Application[];
}
