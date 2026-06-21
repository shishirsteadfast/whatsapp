import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, UpdateWebhookDto, WebhookResponseDto } from './dto';
import { Webhook } from './entities/webhook.entity';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { UserRole } from '../auth/entities/user.entity';

@Controller('sessions/:sessionId/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @RequireRole(UserRole.OPERATOR)
  async create(@Param('sessionId') sessionId: string, @Body() dto: CreateWebhookDto): Promise<Webhook> {
    return this.webhookService.create(sessionId, dto);
  }

  @Get()
  async findBySession(@Param('sessionId') sessionId: string): Promise<Webhook[]> {
    return this.webhookService.findBySession(sessionId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Webhook> {
    return this.webhookService.findOne(id);
  }

  @Put(':id')
  @RequireRole(UserRole.OPERATOR)
  async update(@Param('id') id: string, @Body() dto: UpdateWebhookDto): Promise<Webhook> {
    return this.webhookService.update(id, dto);
  }

  @Post(':id/test')
  @RequireRole(UserRole.OPERATOR)
  async test(
    @Param('sessionId') sessionId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    return this.webhookService.test(sessionId, id);
  }

  @Delete(':id')
  @RequireRole(UserRole.OPERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.webhookService.delete(id);
  }
}
