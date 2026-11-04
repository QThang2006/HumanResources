import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Application } from './application.entity';
import { User } from './user.entity';

export enum InterviewResult {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'application_id' })
  applicationId: number;

  @ManyToOne(() => Application, (app) => app.interviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'interviewer_id' })
  interviewerId: number;

  @ManyToOne(() => User, (user) => user.interviews, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'interviewer_id' })
  interviewer: User;

  @Column({ type: 'int', default: 1 })
  round: number;

  @Column({ name: 'scheduled_at', type: 'datetime' })
  scheduledAt: Date;

  @Column({ name: 'meeting_link', type: 'varchar', length: 255, nullable: true })
  meetingLink: string;

  @Column({ name: 'google_calendar_event_id', type: 'varchar', length: 255, nullable: true })
  googleCalendarEventId: string;

  @Column({ name: 'ai_suggested_questions', type: 'json', nullable: true })
  aiSuggestedQuestions: string[];

  @Column({ name: 'ai_questions_status', type: 'varchar', length: 24, nullable: true })
  aiQuestionsStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null;

  @Column({ name: 'ai_questions_request_id', type: 'varchar', length: 80, nullable: true })
  aiQuestionsRequestId: string | null;

  @Column({ name: 'ai_questions_error', type: 'varchar', length: 500, nullable: true })
  aiQuestionsError: string | null;

  @Column({ name: 'interviewer_feedback', type: 'text', nullable: true })
  interviewerFeedback: string;

  @Column({ type: 'int', nullable: true })
  score: number;

  @Column({ type: 'enum', enum: InterviewResult, default: InterviewResult.PENDING })
  result: InterviewResult;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
