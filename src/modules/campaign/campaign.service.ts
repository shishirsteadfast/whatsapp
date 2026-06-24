import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Campaign, CampaignStatus, CampaignRecipientType } from './entities/campaign.entity';
import {
  CampaignRecipient,
  RecipientStatus,
} from './entities/campaign-recipient.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { SessionService } from '../session/session.service';
import { ContactsService } from '../contacts/contacts.service';
import { GroupsService } from '../groups/groups.service';
import { EventsGateway } from '../events/events.gateway';

export interface CampaignStats {
  total: number;
  draft: number;
  scheduled: number;
  sending: number;
  completed: number;
  failed: number;
  paused: number;
  cancelled: number;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
}

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(CampaignRecipient)
    private readonly recipientRepository: Repository<CampaignRecipient>,
    private readonly sessionService: SessionService,
    private readonly contactsService: ContactsService,
    private readonly groupsService: GroupsService,
    private readonly eventsGateway: EventsGateway,
    @Optional()
    @InjectQueue('campaign-scheduler')
    private readonly schedulerQueue?: Queue,
  ) {}

  // ── CRUD ───────────────────────────────────────────────────────────

  async create(dto: CreateCampaignDto): Promise<Campaign> {
    // Validate session exists
    const session = await this.sessionService.findOne(dto.sessionId);
    if (!session) {
      throw new BadRequestException(`Session '${dto.sessionId}' not found`);
    }

    // Resolve recipients
    const recipients = await this.resolveRecipients(dto.recipientType, dto.recipientIds);

    if (recipients.length === 0) {
      throw new BadRequestException('No valid recipients found for the given selection');
    }

    const campaign = this.campaignRepository.create({
      name: dto.name,
      description: dto.description,
      sessionId: dto.sessionId,
      recipientType: dto.recipientType,
      recipientIds: dto.recipientIds,
      totalRecipients: recipients.length,
      messageContent: dto.messageContent,
      status: dto.scheduleAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
      scheduleAt: dto.scheduleAt ? new Date(dto.scheduleAt) : null,
    });

    const saved = await this.campaignRepository.save(campaign);

    // Create recipient records
    const recipientEntities = recipients.map((r) =>
      this.recipientRepository.create({
        campaignId: saved.id,
        chatId: r.chatId,
        recipientName: r.name,
        contactId: r.contactId,
        groupId: r.groupId,
        status: RecipientStatus.PENDING,
      }),
    );

    // Batch insert recipients (chunked to avoid issues with large groups)
    const chunkSize = 100;
    for (let i = 0; i < recipientEntities.length; i += chunkSize) {
      await this.recipientRepository.save(recipientEntities.slice(i, i + chunkSize));
    }

    // If scheduled, enqueue to BullMQ (if available)
    if (dto.scheduleAt && this.schedulerQueue) {
      const delay = new Date(dto.scheduleAt).getTime() - Date.now();
      if (delay > 0) {
        await this.schedulerQueue.add(
          'process-campaign',
          { campaignId: saved.id },
          { delay, jobId: `campaign-${saved.id}` },
        );
        this.logger.log(`Campaign ${saved.id} scheduled for ${dto.scheduleAt}`);
      } else {
        // Schedule time is in the past, send immediately
        saved.status = CampaignStatus.DRAFT;
        saved.scheduleAt = null;
        await this.campaignRepository.save(saved);
      }
    } else if (dto.scheduleAt && !this.schedulerQueue) {
      // No Redis available, schedule using setTimeout (best-effort)
      const delay = new Date(dto.scheduleAt).getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          this.start(saved.id).catch((err) => {
            this.logger.error(`Campaign ${saved.id} scheduled start failed: ${String(err)}`);
          });
        }, delay);
        this.logger.log(`Campaign ${saved.id} scheduled (in-memory) for ${dto.scheduleAt}`);
      }
    }

    this.logger.log(`Campaign ${saved.id} created with ${recipients.length} recipients`);
    return this.campaignRepository.findOne({ where: { id: saved.id } }) as Promise<Campaign>;
  }

  async findAll(query: CampaignQueryDto): Promise<{ campaigns: Campaign[]; total: number }> {
    const { status, search, page = 1, limit = 20 } = query;
    const where: Record<string, unknown> = {};

    if (status) where['status'] = status;
    if (search) where['name'] = Like(`%${search}%`);

    const [campaigns, total] = await this.campaignRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { campaigns, total };
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign '${id}' not found`);
    }
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be edited');
    }

    // Update schedule
    if (dto.scheduleAt !== undefined) {
      if (this.schedulerQueue) {
        await this.schedulerQueue.remove(`campaign-${id}`).catch(() => {});
      }

      const scheduleDate = new Date(dto.scheduleAt);
      const delay = scheduleDate.getTime() - Date.now();

      if (delay > 0) {
        campaign.status = CampaignStatus.SCHEDULED;
        campaign.scheduleAt = scheduleDate;
        if (this.schedulerQueue) {
          await this.schedulerQueue.add(
            'process-campaign',
            { campaignId: id },
            { delay, jobId: `campaign-${id}` },
          );
        } else {
          setTimeout(() => {
            this.start(id).catch((err) => {
              this.logger.error(`Campaign ${id} scheduled start failed: ${String(err)}`);
            });
          }, delay);
        }
      }
    }

    // Apply remaining fields
    Object.assign(campaign, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.messageContent !== undefined && { messageContent: dto.messageContent }),
    });

    return this.campaignRepository.save(campaign);
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);

    // Remove from scheduler if queued
    if (this.schedulerQueue) {
      await this.schedulerQueue.remove(`campaign-${id}`).catch(() => {});
    }

    await this.campaignRepository.remove(campaign);
    this.logger.log(`Campaign ${id} deleted`);
  }

  // ── Actions ────────────────────────────────────────────────────────

  async start(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (
      campaign.status !== CampaignStatus.DRAFT &&
      campaign.status !== CampaignStatus.SCHEDULED &&
      campaign.status !== CampaignStatus.PAUSED
    ) {
      throw new BadRequestException(
        `Campaign is in '${campaign.status}' state and cannot be started`,
      );
    }

    // Remove any existing scheduled job
    if (this.schedulerQueue) {
      await this.schedulerQueue.remove(`campaign-${id}`).catch(() => {});
    }

    campaign.status = CampaignStatus.SENDING;
    campaign.startedAt = new Date();
    campaign.scheduleAt = null;
    await this.campaignRepository.save(campaign);

    // Start processing asynchronously
    this.processCampaign(id).catch((err) => {
      this.logger.error(`Campaign ${id} processing error: ${String(err)}`);
    });

    return campaign;
  }

  async pause(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.SENDING) {
      throw new BadRequestException('Only sending campaigns can be paused');
    }

    campaign.status = CampaignStatus.PAUSED;
    await this.campaignRepository.save(campaign);

    this.logger.log(`Campaign ${id} paused`);
    return campaign;
  }

  async cancel(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (
      campaign.status === CampaignStatus.COMPLETED ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new BadRequestException(`Campaign is already ${campaign.status}`);
    }

    // Remove from scheduler
    if (this.schedulerQueue) {
      await this.schedulerQueue.remove(`campaign-${id}`).catch(() => {});
    }

    campaign.status = CampaignStatus.CANCELLED;
    campaign.completedAt = new Date();
    await this.campaignRepository.save(campaign);

    // Mark remaining pending recipients as cancelled
    await this.recipientRepository.update(
      { campaignId: id, status: RecipientStatus.PENDING },
      { status: RecipientStatus.CANCELLED },
    );

    this.logger.log(`Campaign ${id} cancelled`);
    return campaign;
  }

  async resendFailed(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.failedCount === 0) {
      throw new BadRequestException('No failed recipients to resend');
    }

    // Reset failed recipients to pending
    const failedRecipients = await this.recipientRepository.find({
      where: { campaignId: id, status: RecipientStatus.FAILED },
    });
    for (const r of failedRecipients) {
      r.status = RecipientStatus.PENDING;
      r.errorMessage = null;
      r.messageId = null;
      r.sentAt = null;
    }
    await this.recipientRepository.save(failedRecipients);

    // Update campaign stats
    campaign.failedCount = 0;
    campaign.currentIndex = 0;
    campaign.status = CampaignStatus.SENDING;
    campaign.completedAt = null;
    await this.campaignRepository.save(campaign);

    // Start processing
    this.processCampaign(id).catch((err) => {
      this.logger.error(`Campaign ${id} resend processing error: ${String(err)}`);
    });

    return campaign;
  }

  // ── Recipient queries ──────────────────────────────────────────────

  async getRecipients(
    campaignId: string,
    statusFilter?: string,
    search?: string,
    page = 1,
    limit = 50,
  ): Promise<{ recipients: CampaignRecipient[]; total: number }> {
    const where: Record<string, unknown> = { campaignId };

    if (statusFilter) {
      where['status'] = statusFilter;
    }
    if (search) {
      where['recipientName'] = Like(`%${search}%`);
    }

    const [recipients, total] = await this.recipientRepository.findAndCount({
      where,
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { recipients, total };
  }

  // ── Stats ──────────────────────────────────────────────────────────

  async getStats(): Promise<CampaignStats> {
    const campaigns = await this.campaignRepository.find();
    const stats: CampaignStats = {
      total: campaigns.length,
      draft: 0,
      scheduled: 0,
      sending: 0,
      completed: 0,
      failed: 0,
      paused: 0,
      cancelled: 0,
      totalRecipients: 0,
      totalSent: 0,
      totalFailed: 0,
    };

    for (const c of campaigns) {
      switch (c.status) {
        case CampaignStatus.DRAFT: stats.draft++; break;
        case CampaignStatus.SCHEDULED: stats.scheduled++; break;
        case CampaignStatus.SENDING: stats.sending++; break;
        case CampaignStatus.COMPLETED: stats.completed++; break;
        case CampaignStatus.FAILED: stats.failed++; break;
        case CampaignStatus.PAUSED: stats.paused++; break;
        case CampaignStatus.CANCELLED: stats.cancelled++; break;
      }
      stats.totalRecipients += c.totalRecipients;
      stats.totalSent += c.sentCount;
      stats.totalFailed += c.failedCount;
    }

    return stats;
  }

  // ── Private: Recipient Resolution ──────────────────────────────────

  private async resolveRecipients(
    type: CampaignRecipientType,
    ids: string[],
  ): Promise<Array<{ chatId: string; name?: string; contactId?: string; groupId?: string }>> {
    if (type === CampaignRecipientType.CONTACTS) {
      const contacts = await this.contactsService.findByIds(ids);
      return contacts.map((c) => ({
        chatId: `${c.countryCode}${c.phone}@c.us`,
        name: c.fullName || `${c.countryCode}${c.phone}`,
        contactId: c.id,
      }));
    }

    if (type === CampaignRecipientType.GROUPS) {
      const results: Array<{ chatId: string; name?: string; contactId?: string; groupId?: string }> = [];
      for (const groupId of ids) {
        const group = await this.groupsService.findOne(groupId);
        if (group?.members) {
          for (const member of group.members) {
            const contact = member.contact;
            if (contact) {
              results.push({
                chatId: `${contact.countryCode}${contact.phone}@c.us`,
                name: contact.fullName || `${contact.countryCode}${contact.phone}`,
                contactId: contact.id,
                groupId: group.id,
              });
            }
          }
        }
      }
      return results;
    }

    return [];
  }

  // ── Private: Campaign Processing ───────────────────────────────────

  private async processCampaign(campaignId: string): Promise<void> {
    const campaign = await this.findOne(campaignId);

    // Check if still supposed to be processing
    if (campaign.status !== CampaignStatus.SENDING) return;

    const engine = this.sessionService.getEngine(campaign.sessionId) as any;
    if (!engine) {
      campaign.status = CampaignStatus.FAILED;
      campaign.completedAt = new Date();
      await this.campaignRepository.save(campaign);
      return;
    }

    const recipients = await this.recipientRepository.find({
      where: { campaignId, status: RecipientStatus.PENDING },
      order: { createdAt: 'ASC' },
    });

    for (let i = campaign.currentIndex; i < recipients.length; i++) {
      // Re-fetch campaign to check status
      const current = await this.findOne(campaignId);
      if (current.status !== CampaignStatus.SENDING) break;

      const recipient = recipients[i];
      const content = current.messageContent;

      try {
        const result = await this.deliverMessage(engine, recipient.chatId, content);

        recipient.status = RecipientStatus.SENT;
        recipient.messageId = result.id;
        recipient.sentAt = new Date();
        await this.recipientRepository.save(recipient);

        current.sentCount++;
        this.logger.debug(`Campaign ${campaignId}: Sent to ${recipient.chatId} (${i + 1}/${recipients.length})`);
      } catch (error) {
        recipient.status = RecipientStatus.FAILED;
        recipient.errorMessage = error instanceof Error ? error.message : String(error);
        await this.recipientRepository.save(recipient);

        current.failedCount++;
        this.logger.warn(`Campaign ${campaignId}: Failed for ${recipient.chatId}: ${recipient.errorMessage}`);
      }

      current.currentIndex = i + 1;
      await this.campaignRepository.save(current);

      // Emit progress via WebSocket
      this.eventsGateway.emitCampaignProgress({
        campaignId,
        sentCount: current.sentCount,
        failedCount: current.failedCount,
        total: current.totalRecipients,
        status: current.status,
      });

      // Delay between messages (2-4 seconds with randomization)
      if (i < recipients.length - 1) {
        const delay = 2000 + Math.random() * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Final update
    const final = await this.findOne(campaignId);
    if (final.status === CampaignStatus.SENDING) {
      final.status = final.failedCount > 0 && final.sentCount === 0
        ? CampaignStatus.FAILED
        : CampaignStatus.COMPLETED;
      final.completedAt = new Date();
      await this.campaignRepository.save(final);

      this.logger.log(
        `Campaign ${campaignId} completed: ${final.sentCount} sent, ${final.failedCount} failed`,
      );

      // Emit final progress
      this.eventsGateway.emitCampaignProgress({
        campaignId,
        sentCount: final.sentCount,
        failedCount: final.failedCount,
        total: final.totalRecipients,
        status: final.status,
      });
    }
  }

  private async deliverMessage(
    engine: any,
    chatId: string,
    content: Campaign['messageContent'],
  ): Promise<{ id: string }> {
    switch (content.type) {
      case 'text':
        return engine.sendTextMessage(chatId, content.text || '');

      case 'image':
        return engine.sendImageMessage(chatId, {
          mimetype: 'image/jpeg',
          data: content.url || '',
          caption: content.caption,
        });

      case 'video':
        return engine.sendVideoMessage(chatId, {
          mimetype: 'video/mp4',
          data: content.url || '',
          caption: content.caption,
        });

      case 'audio':
        return engine.sendAudioMessage(chatId, {
          mimetype: 'audio/mpeg',
          data: content.url || '',
        });

      case 'document':
        return engine.sendDocumentMessage(chatId, {
          mimetype: 'application/octet-stream',
          data: content.url || '',
          filename: content.filename,
          caption: content.caption,
        });

      case 'location':
        return engine.sendLocationMessage(chatId, {
          latitude: content.latitude || 0,
          longitude: content.longitude || 0,
          description: content.caption,
        });

      case 'contact':
        return engine.sendContactMessage(chatId, {
          name: content.contactName || '',
          number: content.contactPhone || '',
        });

      default:
        throw new Error(`Unsupported message type: ${content.type}`);
    }
  }
}
