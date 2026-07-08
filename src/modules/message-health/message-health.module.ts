import { Module } from '@nestjs/common';
import { MessageHealthController } from './message-health.controller';
import { MessageHealthService } from './message-health.service';
import { SessionModule } from '../session/session.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [SessionModule, MessageModule],
  controllers: [MessageHealthController],
  providers: [MessageHealthService],
})
export class MessageHealthModule {}
