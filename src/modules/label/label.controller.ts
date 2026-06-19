import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { SessionService } from '../session/session.service';

@Controller('sessions/:sessionId/labels')
export class LabelController {
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
    return engine.getLabels();
  }

  @Get(':labelId')
  async findOne(@Param('sessionId') sessionId: string, @Param('labelId') labelId: string) {
    const engine = this.getEngine(sessionId);
    const label = await engine.getLabelById(labelId);
    if (!label) {
      throw new Error(`Label ${labelId} not found`);
    }
    return label;
  }

  @Get('chat/:chatId')
  async getChatLabels(@Param('sessionId') sessionId: string, @Param('chatId') chatId: string) {
    const engine = this.getEngine(sessionId);
    return engine.getChatLabels(chatId);
  }

  @Post('chat/:chatId')
  async addLabelToChat(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Body() body: { labelId: string },
  ) {
    const engine = this.getEngine(sessionId);
    await engine.addLabelToChat(chatId, body.labelId);
    return { success: true };
  }

  @Delete('chat/:chatId/:labelId')
  async removeLabelFromChat(
    @Param('sessionId') sessionId: string,
    @Param('chatId') chatId: string,
    @Param('labelId') labelId: string,
  ) {
    const engine = this.getEngine(sessionId);
    await engine.removeLabelFromChat(chatId, labelId);
    return { success: true };
  }
}
