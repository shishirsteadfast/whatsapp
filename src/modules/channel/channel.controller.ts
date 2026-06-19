import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { SessionService } from '../session/session.service';

@Controller('sessions/:sessionId/channels')
export class ChannelController {
  constructor(private readonly sessionService: SessionService) {}

  private getEngine(sessionId: string) {
    const engine = this.sessionService.getEngine(sessionId);
    if (!engine) {
      throw new Error('Session is not started');
    }
    return engine;
  }

  @Get()
  async findAll(@Param('sessionId') sessionId: string) {
    const engine = this.getEngine(sessionId);
    return engine.getSubscribedChannels();
  }

  @Get(':channelId')
  async findOne(@Param('sessionId') sessionId: string, @Param('channelId') channelId: string) {
    const engine = this.getEngine(sessionId);
    const channel = await engine.getChannelById(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    return channel;
  }

  @Get(':channelId/messages')
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
  ) {
    const engine = this.getEngine(sessionId);
    return engine.getChannelMessages(channelId, limit ? parseInt(limit, 10) : undefined);
  }

  @Post('subscribe')
  async subscribe(@Param('sessionId') sessionId: string, @Body() body: { inviteCode: string }) {
    const engine = this.getEngine(sessionId);
    return engine.subscribeToChannel(body.inviteCode);
  }

  @Delete(':channelId')
  async unsubscribe(@Param('sessionId') sessionId: string, @Param('channelId') channelId: string) {
    const engine = this.getEngine(sessionId);
    await engine.unsubscribeFromChannel(channelId);
    return { success: true };
  }
}
