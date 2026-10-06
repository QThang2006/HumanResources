import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'document_id' })
  @Index('idx_chunk_document_id')
  documentId: number;

  @ManyToOne(() => Document, (doc) => doc.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  /**
   * Vector Embedding (Mảng số thực float e.g. 768 chiều từ Gemini text-embedding-004)
   * Lưu dưới dạng JSON trong MySQL 8.0 để hỗ trợ tìm kiếm ngữ nghĩa linh hoạt & truy xuất tốc độ cao.
   */
  @Column({ type: 'json' })
  embedding: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
