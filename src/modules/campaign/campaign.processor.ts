import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { QUEUE_NAMES } from '../queue/queue-names';

export interface CampaignSchedulerJobData {
  campaignId: string;
}

@Processor(QUEUE_NAMES.CAMPAIGN_SCHEDULER)
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(private readonly campaignService: CampaignService) {
    super();
  }

  async process(job: Job<CampaignSchedulerJobData>): Promise<void> {
    const { campaignId } = job.data;
    this.logger.log(`Processing scheduled campaign job: ${campaignId}`);

    try {
      await this.campaignService.start(campaignId);
      this.logger.log(`Scheduled campaign ${campaignId} started successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to start scheduled campaign ${campaignId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
