import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'actor_ip', type: 'varchar', length: 100, nullable: true })
  actorIp: string;

  @Column({ name: 'target_email', type: 'varchar', length: 255, nullable: true })
  targetEmail: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
