import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Campaign } from './entities/campaign.entity';
import { CampaignRecipient } from './entities/campaign-recipient.entity';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { CampaignProcessor } from './campaign.processor';
import { SessionModule } from '../session/session.module';
import { ContactsModule } from '../contacts/contacts.module';
import { GroupsModule } from '../groups/groups.module';
import { EventsModule } from '../events/events.module';
import { QUEUE_NAMES } from '../queue/queue-names';

@Module({})
export class CampaignModule {
  static register(redisEnabled: boolean): DynamicModule {
    const bullImports = redisEnabled
      ? [
          BullModule.registerQueue({
            name: QUEUE_NAMES.CAMPAIGN_SCHEDULER,
            defaultJobOptions: {
              attempts: 1,
              removeOnComplete: 100,
              removeOnFail: 50,
            },
          }),
        ]
      : [];

    const providers: any[] = [CampaignService];
    if (redisEnabled) {
      providers.push(CampaignProcessor);
    }

    return {
      module: CampaignModule,
      imports: [
        TypeOrmModule.forFeature([Campaign, CampaignRecipient]),
        ...bullImports,
        SessionModule,
        ContactsModule,
        GroupsModule,
        EventsModule,
      ],
      controllers: [CampaignController],
      providers,
      exports: [CampaignService],
    };
  }
}
