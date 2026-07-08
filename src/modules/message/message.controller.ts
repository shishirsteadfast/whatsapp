import { Controller, Post, Get, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MessageService } from './message.service';
import { BulkMessageService } from './bulk-message.service';
import { SendTextMessageDto, SendMediaMessageDto, MessageResponseDto } from './dto';
import { SendBulkMessageDto, BulkMessageResponseDto } from './dto/bulk-message.dto';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { UserRole } from '../auth/entities/user.entity';

@Controller('sessions/:sessionId/messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly bulkMessageService: BulkMessageService,
  ) {}

  @Get()
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query('chatId') chatId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.messageService.getMessages(sessionId, {
      chatId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('send-text')
  @RequireRole(UserRole.OPERATOR)
  async sendText(@Param('sessionId') sessionId: string, @Body() dto: SendTextMessageDto): Promise<MessageResponseDto> {
    return this.messageService.sendText(sessionId, dto);
  }

  @Post('send-image')
  @RequireRole(UserRole.OPERATOR)
  async sendImage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMediaMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.sendImage(sessionId, dto);
  }

  @Post('send-video')
  @RequireRole(UserRole.OPERATOR)
  async sendVideo(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMediaMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.sendVideo(sessionId, dto);
  }

  @Post('send-audio')
  @RequireRole(UserRole.OPERATOR)
  async sendAudio(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMediaMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.sendAudio(sessionId, dto);
  }

  @Post('send-document')
  @RequireRole(UserRole.OPERATOR)
  async sendDocument(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMediaMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.sendDocument(sessionId, dto);
  }

  // ========== Phase 3: Extended Messaging ==========

  @Post('send-location')
  @RequireRole(UserRole.OPERATOR)
  async sendLocation(
    @Param('sessionId') sessionId: string,
    @Body() dto: { phoneNumber: string; latitude: number; longitude: number; description?: string; address?: string },
  ): Promise<MessageResponseDto> {
    return this.messageService.sendLocation(sessionId, dto);
  }

  @Post('send-contact')
  @RequireRole(UserRole.OPERATOR)
  async sendContact(
    @Param('sessionId') sessionId: string,
    @Body() dto: { phoneNumber: string; contactName: string; contactNumber: string },
  ): Promise<MessageResponseDto> {
    return this.messageService.sendContact(sessionId, dto);
  }

  @Post('send-sticker')
  @RequireRole(UserRole.OPERATOR)
  async sendSticker(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMediaMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.sendSticker(sessionId, dto);
  }

  @Post('reply')
  @RequireRole(UserRole.OPERATOR)
  async reply(
    @Param('sessionId') sessionId: string,
    @Body() dto: { chatId: string; quotedMessageId: string; text: string },
  ): Promise<MessageResponseDto> {
    return this.messageService.reply(sessionId, dto);
  }

  @Post('forward')
  @RequireRole(UserRole.OPERATOR)
  async forward(
    @Param('sessionId') sessionId: string,
    @Body() dto: { fromChatId: string; toChatId: string; messageId: string },
  ): Promise<MessageResponseDto> {
    return this.messageService.forward(sessionId, dto);
  }

  // ========== Phase 3: Reactions ==========

  @Post('react')
  @RequireRole(UserRole.OPERATOR)
  async react(
    @Param('sessionId') sessionId: string,
    @Body() dto: { chatId: string; messageId: string; emoji: string },
  ): Promise<{ success: boolean }> {
    await this.messageService.reactToMessage(sessionId, dto);
    return { success: true };
  }

  @Get(':chatId/:messageId/reactions')
  async getReactions(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messageService.getMessageReactions(sessionId, chatId, messageId);
  }

  // ========== Delete Message ==========

  @Post('delete')
  @RequireRole(UserRole.OPERATOR)
  async deleteMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: { chatId: string; messageId: string; forEveryone?: boolean },
  ): Promise<{ success: boolean }> {
    await this.messageService.deleteMessage(sessionId, dto);
    return { success: true };
  }

  // ========== Bulk Messaging ==========

  @Post('send-bulk')
  @RequireRole(UserRole.OPERATOR)
  @HttpCode(HttpStatus.ACCEPTED)
  async sendBulk(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendBulkMessageDto,
  ): Promise<BulkMessageResponseDto> {
    const batch = await this.bulkMessageService.createBatch(sessionId, dto);
    const estimatedTime = new Date(Date.now() + batch.messages.length * (batch.options?.delayBetweenMessages || 3000));

    return {
      batchId: batch.batchId,
      status: batch.status,
      totalMessages: batch.messages.length,
      estimatedCompletionTime: estimatedTime.toISOString(),
      statusUrl: `/api/sessions/${sessionId}/messages/batch/${batch.batchId}`,
    };
  }

  @Get('batch/:batchId')
  async getBatchStatus(@Param('sessionId') sessionId: string, @Param('batchId') batchId: string) {
    const batch = await this.bulkMessageService.getBatchStatus(sessionId, batchId);
    return {
      batchId: batch.batchId,
      status: batch.status,
      progress: batch.progress,
      results: batch.results,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
    };
  }

  @Post('batch/:batchId/cancel')
  @RequireRole(UserRole.OPERATOR)
  @HttpCode(HttpStatus.OK)
  async cancelBatch(@Param('sessionId') sessionId: string, @Param('batchId') batchId: string) {
    const batch = await this.bulkMessageService.cancelBatch(sessionId, batchId);
    return {
      batchId: batch.batchId,
      status: batch.status,
      progress: batch.progress,
    };
  }
}
