import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { dateColumnType } from '../../../common/utils/column-types';
import { DateTransformer } from '../../../common/transformers/date.transformer';

export enum RecipientStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('campaign_recipients')
@Index(['campaignId', 'status'])
@Index(['campaignId', 'chatId'])
export class CampaignRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id' })
  @Index()
  campaignId: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'chat_id' })
  chatId: string;

  @Column({ type: 'varchar', name: 'recipient_name', nullable: true })
  recipientName: string | null;

  @Column({ type: 'varchar', name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({ type: 'varchar', name: 'group_id', nullable: true })
  groupId: string | null;

  @Column({
    type: 'varchar',
    default: RecipientStatus.PENDING,
  })
  status: RecipientStatus;

  @Column({ type: 'varchar', name: 'message_id', nullable: true })
  messageId: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'sent_at', type: dateColumnType(), nullable: true, transformer: DateTransformer })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
