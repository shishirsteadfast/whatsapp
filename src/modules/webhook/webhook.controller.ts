import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto';
import { Webhook } from './entities/webhook.entity';
import { RequireRole, CurrentUser } from '../auth/decorators/auth.decorators';
import { User, UserRole } from '../auth/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Controller('sessions/:sessionId/webhooks')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @RequireRole(UserRole.OPERATOR)
  async create(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: User,
  ): Promise<Webhook> {
    const webhook = await this.webhookService.create(sessionId, dto);
    await this.auditService.logInfo(AuditAction.WEBHOOK_CREATED, {
      user,
      sessionId,
      metadata: { webhookId: webhook.id, url: webhook.url },
    });
    return webhook;
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
  async delete(
    @Param('sessionId') sessionId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    const webhook = await this.webhookService.findOne(id);
    await this.webhookService.delete(id);
    await this.auditService.logInfo(AuditAction.WEBHOOK_DELETED, {
      user,
      sessionId,
      metadata: { webhookId: webhook.id, url: webhook.url },
    });
  }
}
