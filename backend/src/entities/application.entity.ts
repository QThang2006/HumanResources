import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { Job } from './job.entity';
import { Interview } from './interview.entity';
import { User } from './user.entity';

export enum ApplicationStatus {
  APPLIED = 'APPLIED',
  INTERVIEWING = 'INTERVIEWING',
  OFFERED = 'OFFERED',
  HIRED = 'HIRED',
  REJECTED = 'REJECTED',
}

export enum AiRecommendation {
  STRONG_HIRE = 'STRONG_HIRE',
  HIRE = 'HIRE',
  CONSIDER = 'CONSIDER',
  REJECT = 'REJECT',
}

// Lỗ hổng 3: Chống Spam nộp trùng nhiều lần cùng 1 job
@Index(['jobId', 'candidateEmail'], { unique: true })
@Entity('applications')
export class Application {
  @Column({ length: 64, nullable: true, unique: true, select: false }) intakeKey: string;
  @Column({ length: 20, nullable: true }) intakeChannel: string;
  @Column({ length: 20, nullable: true }) acknowledgementStatus: string;
  @Column({ length: 998, nullable: true }) acknowledgementMessageId: string;
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'job_id' })
  jobId: number;

  @ManyToOne(() => Job, (job) => job.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  // Lỗ hổng 1: Lưu vết sang tài khoản nhân viên mới khi trúng tuyển (1-Click Hire)
  @Column({ name: 'hired_user_id', nullable: true })
  hiredUserId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hired_user_id' })
  hiredUser: User;

  @Column({ name: 'candidate_name', type: 'varchar', length: 150 })
  candidateName: string;

  @Column({ name: 'candidate_email', type: 'varchar', length: 255 })
  candidateEmail: string;

  @Column({ name: 'candidate_phone', type: 'varchar', length: 20, nullable: true })
  candidatePhone: string;

  @Column({ name: 'cv_file_url', type: 'varchar', length: 500 })
  cvFileUrl: string;

  @Column({ name: 'raw_cv_text', type: 'mediumtext', nullable: true })
  rawCvText: string;

  @Column({ name: 'match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  matchScore: number;

  @Column({ name: 'skills_detected', type: 'json', nullable: true })
  skillsDetected: string[];

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary: string;

  @Column({ name: 'ai_recommendation', type: 'enum', enum: AiRecommendation, nullable: true })
  aiRecommendation: AiRecommendation;

  @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.APPLIED })
  status: ApplicationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Interview, (interview) => interview.application)
  interviews: Interview[];
}
