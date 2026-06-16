import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from './entities/webhook.entity';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhooksListController } from './webhooks-list.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Webhook])],
  controllers: [WebhookController, WebhooksListController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
