import { Injectable, BadRequestException } from '@nestjs/common';
import { SessionService } from '../session/session.service';
import { SessionStatus } from '../session/entities/session.entity';
import { MessageService } from '../message/message.service';
import { MessageHealthResult, SessionConnectivity, SessionHealth, TestSendResult } from './message-health.types';

const LIVE_PING_TIMEOUT_MS = 5000;

@Injectable()
export class MessageHealthService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly messageService: MessageService,
  ) {}

  async getHealth(): Promise<MessageHealthResult> {
    const sessions = await this.sessionService.findAll();

    const sessionHealths = await Promise.all(
      sessions.map(async session => {
        const connectivity = await this.checkConnectivity(session.id, session.status, session.phone ?? null);
        const health: SessionHealth = {
          id: session.id,
          name: session.name,
          phone: session.phone ?? null,
          status: session.status,
          connectivity,
        };
        return health;
      }),
    );

    return {
      sessions: sessionHealths,
      checkedAt: new Date().toISOString(),
    };
  }

  async sendTestMessage(sessionId: string): Promise<TestSendResult> {
    const session = await this.sessionService.findOne(sessionId);

    if (session.status !== SessionStatus.READY) {
      throw new BadRequestException('Session is not connected — start the session before sending a test message');
    }
    if (!session.phone) {
      throw new BadRequestException('Session has no known phone number to send a test message to');
    }

    const chatId = `${session.phone}@c.us`;
    const text = `✅ OpenWA health check — test message sent at ${new Date().toISOString()}`;

    const result = await this.messageService.sendText(sessionId, { chatId, text });

    return { ...result, chatId };
  }

  private async checkConnectivity(
    sessionId: string,
    status: SessionStatus,
    phone: string | null,
  ): Promise<SessionConnectivity> {
    if (status !== SessionStatus.READY) return 'not_connected';

    const engine = this.sessionService.getEngine(sessionId);
    if (!engine || !phone) return 'not_connected';

    try {
      const exists = await this.withTimeout(engine.checkNumberExists(phone), LIVE_PING_TIMEOUT_MS);
      return exists ? 'connected' : 'degraded';
    } catch {
      return 'unreachable';
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
    ]);
  }
}
