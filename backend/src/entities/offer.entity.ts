import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
export enum OfferStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED',
    EXPIRED = 'EXPIRED'
}
@Entity('offers')
@Index(['applicationId', 'version'], { unique: true })
export class Offer {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({ name: 'application_id' })
    applicationId: number;
    @Column({ name: 'candidate_email', length: 255 })
    candidateEmail: string;
    @Column({ name: 'candidate_name', length: 150 })
    candidateName: string;
    @Column({ name: 'job_title', length: 200 })
    jobTitle: string;
    @Column({ name: 'salary', length: 100 })
    salary: string;
    @Column({ name: 'start_date', type: 'date' })
    startDate: string;
    @Column({ name: 'expires_at', type: 'datetime' })
    expiresAt: Date;
    @Column({ name: 'version', type: 'int', default: 1 })
    version: number;
    @Column({ type: 'enum', enum: OfferStatus, default: OfferStatus.PENDING })
    status: OfferStatus;
    @Column({ name: 'token_hash', length: 64, select: false })
    tokenHash: string;
    @Column({ length: 64, select: false, nullable: true })
    deliveryTokenHash: string;
    @Column({ length: 20, default: 'PENDING' })
    deliveryStatus: string;
    @Column({ type: 'datetime', nullable: true })
    claimedAt: Date;
    @Column({ type: 'datetime', nullable: true })
    sentAt: Date;
    @Column({ type: 'datetime', nullable: true })
    reminderClaimedAt: Date;
    @Column({ type: 'datetime', nullable: true })
    remindedAt: Date;
    @Column({ type: 'datetime', nullable: true })
    expiryNotifiedAt: Date;
    @Column({ type: 'datetime', nullable: true })
    expiryClaimedAt: Date;
    @Column({ length: 998, nullable: true })
    messageId: string;
    @Column({ name: 'responded_at', type: 'datetime', nullable: true })
    respondedAt: Date;
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
