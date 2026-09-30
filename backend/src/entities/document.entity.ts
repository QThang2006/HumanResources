import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum DocumentStatus {
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'uploaded_by' })
  uploadedBy: number;

  @ManyToOne(() => User, (user) => user.documents, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ name: 'file_type', type: 'varchar', length: 50, default: 'application/pdf' })
  fileType: string;

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.PROCESSING })
  status: DocumentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
