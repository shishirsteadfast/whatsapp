import { Controller, Get, Post, Body } from '@nestjs/common';
import { MessageHealthService } from './message-health.service';
import { TestSendDto } from './dto/test-send.dto';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { UserRole } from '../auth/entities/user.entity';
import { MessageHealthResult, TestSendResult } from './message-health.types';

@Controller('message-health')
export class MessageHealthController {
  constructor(private readonly messageHealthService: MessageHealthService) {}

  @Get()
  @RequireRole(UserRole.OPERATOR)
  async check(): Promise<MessageHealthResult> {
    return this.messageHealthService.getHealth();
  }

  @Post('test-send')
  @RequireRole(UserRole.OPERATOR)
  async testSend(@Body() dto: TestSendDto): Promise<TestSendResult> {
    return this.messageHealthService.sendTestMessage(dto.sessionId);
  }
}
