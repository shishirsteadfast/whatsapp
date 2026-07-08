import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { jsonColumnType, dateColumnType } from '../../../common/utils/column-types';
import { DateTransformer } from '../../../common/transformers/date.transformer';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum CampaignRecipientType {
  CONTACTS = 'contacts',
  GROUPS = 'groups',
}

@Entity('campaigns')
@Index(['status', 'createdAt'])
@Index(['scheduleAt'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({
    type: 'varchar',
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({
    type: 'varchar',
    name: 'recipient_type',
    default: CampaignRecipientType.CONTACTS,
  })
  recipientType: CampaignRecipientType;

  @Column({ type: jsonColumnType(), nullable: true })
  recipientIds: string[];

  @Column({ type: 'int', name: 'total_recipients', default: 0 })
  totalRecipients: number;

  @Column({ type: jsonColumnType() })
  messageContent: {
    type: string;
    text?: string;
    url?: string;
    caption?: string;
    filename?: string;
    latitude?: number;
    longitude?: number;
    contactName?: string;
    contactPhone?: string;
  };

  @Column({ name: 'schedule_at', type: dateColumnType(), nullable: true, transformer: DateTransformer })
  scheduleAt: Date | null;

  @Column({ name: 'started_at', type: dateColumnType(), nullable: true, transformer: DateTransformer })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: dateColumnType(), nullable: true, transformer: DateTransformer })
  completedAt: Date | null;

  @Column({ name: 'sent_count', default: 0 })
  sentCount: number;

  @Column({ name: 'failed_count', default: 0 })
  failedCount: number;

  @Column({ name: 'current_index', default: 0 })
  currentIndex: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
