import { Controller, Get } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Webhook } from './entities/webhook.entity';

@Controller('webhooks')
export class WebhooksListController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  async findAll(): Promise<Webhook[]> {
    return this.webhookService.findAll();
  }
}
