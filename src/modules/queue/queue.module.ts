import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookProcessor } from './processors/webhook.processor';
import { QUEUE_NAMES } from './queue-names';
import { Webhook } from '../webhook/entities/webhook.entity';
import { HooksModule } from '../../core/hooks/hooks.module';

export { QUEUE_NAMES } from './queue-names';

@Module({})
export class QueueModule {
  /**
   * Register the queue module.
   * When Redis is disabled, returns an empty module (no BullMQ setup).
   */
  static register(redisEnabled: boolean): DynamicModule {
    if (!redisEnabled) {
      return {
        module: QueueModule,
      };
    }

    return {
      module: QueueModule,
      imports: [
        TypeOrmModule.forFeature([Webhook]),
        HooksModule,

        // Single Redis connection shared by all queues
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            connection: {
              host: configService.get<string>('redis.host', 'localhost'),
              port: configService.get<number>('redis.port', 6379),
              password: configService.get<string>('redis.password'),
              db: configService.get<number>('redis.queueDb', 0),
            },
          }),
        }),

        // Single message sends — high priority, 20 concurrent workers, 200/sec rate cap
        BullModule.registerQueue({
          name: QUEUE_NAMES.MESSAGE_SEND,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 500,
            removeOnFail: 200,
          },
        }),

        // Bulk/batch sends — lower priority, 10 concurrent workers, 100/sec rate cap
        BullModule.registerQueue({
          name: QUEUE_NAMES.MESSAGE_BULK,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 200,
            removeOnFail: 100,
          },
        }),

        // Webhook deliveries — 15 concurrent workers
        BullModule.registerQueue({
          name: QUEUE_NAMES.WEBHOOK,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 500,
            removeOnFail: 200,
          },
        }),

        BullBoardModule.forRoot({
          route: '/admin/queues',
          adapter: ExpressAdapter,
        }),
        BullModule.registerQueue({
          name: QUEUE_NAMES.CAMPAIGN_SCHEDULER,
          defaultJobOptions: {
            attempts: 1,
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        }),

        BullBoardModule.forFeature({ name: QUEUE_NAMES.MESSAGE_SEND, adapter: BullMQAdapter }),
        BullBoardModule.forFeature({ name: QUEUE_NAMES.MESSAGE_BULK, adapter: BullMQAdapter }),
        BullBoardModule.forFeature({ name: QUEUE_NAMES.WEBHOOK, adapter: BullMQAdapter }),
        BullBoardModule.forFeature({ name: QUEUE_NAMES.CAMPAIGN_SCHEDULER, adapter: BullMQAdapter }),
      ],
      providers: [WebhookProcessor],
      exports: [BullModule],
    };
  }
}
