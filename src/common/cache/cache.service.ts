import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createLogger } from '../services/logger.service';

export interface SessionInfo {
  id: string;
  name: string;
  status: string;
  phone?: string;
  pushName?: string;
  connectedAt?: string;
}

export interface SessionStats {
  active: number;
  total: number;
  byStatus: Record<string, number>;
}

// TTL constants in seconds
const TTL = {
  SESSION_STATUS: 5,
  SESSION_INFO: 600,
  SESSION_QR: 60,
  SESSIONS_LIST: 30,
  SESSIONS_STATS: 15,
  MESSAGES_PAGE: 60,
  MESSAGES_COUNT: 60,
  WEBHOOKS: 300,
  CONTACTS: 300,
};

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('CacheService');
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get<boolean>('redis.enabled', false);

    if (!enabled) {
      this.logger.log('Redis cache is disabled (REDIS_ENABLED=false). Skipping connection.');
      return;
    }

    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');
    const db = this.configService.get<number>('redis.cacheDb', 1);

    this.redis = new Redis({
      host,
      port,
      password,
      db,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy: times => {
        if (times > 5) return null;
        return Math.min(times * 1000, 5000);
      },
    });

    this.redis.on('error', err => this.logger.warn(`Redis cache error: ${err.message}`));
    this.redis.on('connect', () => this.logger.log(`Redis cache connected (db=${db})`));
    this.redis.on('reconnecting', () => this.logger.log('Redis cache reconnecting...'));

    try {
      await this.redis.connect();
    } catch (err) {
      this.logger.warn(`Redis cache initial connect failed: ${String(err)} — will retry automatically`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit();
  }

  private async isAvailable(): Promise<boolean> {
    if (!this.redis) return false;
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  // ========== Generic helpers ==========

  async get<T>(key: string): Promise<T | null> {
    if (!(await this.isAvailable())) return null;
    try {
      const data = await this.redis!.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch (err) {
      this.logger.warn(`Cache get failed [${key}]: ${String(err)}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    if (!(await this.isAvailable())) return;
    try {
      await this.redis!.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
      this.logger.warn(`Cache set failed [${key}]: ${String(err)}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!(await this.isAvailable())) return;
    try {
      await this.redis!.del(...keys);
    } catch (err) {
      this.logger.warn(`Cache del failed: ${String(err)}`);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!(await this.isAvailable())) return;
    try {
      const keys = await this.redis!.keys(pattern);
      if (keys.length > 0) await this.redis!.del(...keys);
    } catch (err) {
      this.logger.warn(`Cache delPattern failed [${pattern}]: ${String(err)}`);
    }
  }

  // ========== Session Status ==========

  async getSessionStatus(id: string): Promise<string | null> {
    return this.get<string>(`session:${id}:status`);
  }

  async setSessionStatus(id: string, status: string): Promise<void> {
    await this.set(`session:${id}:status`, status, TTL.SESSION_STATUS);
  }

  // ========== Session Info ==========

  async getSessionInfo(id: string): Promise<SessionInfo | null> {
    return this.get<SessionInfo>(`session:${id}:info`);
  }

  async setSessionInfo(id: string, info: SessionInfo): Promise<void> {
    await this.set(`session:${id}:info`, info, TTL.SESSION_INFO);
  }

  // ========== Session QR ==========

  async getSessionQR(id: string): Promise<string | null> {
    return this.get<string>(`session:${id}:qr`);
  }

  async setSessionQR(id: string, qr: string): Promise<void> {
    await this.set(`session:${id}:qr`, qr, TTL.SESSION_QR);
  }

  // ========== Sessions List ==========

  async getSessionsList(): Promise<string[] | null> {
    return this.get<string[]>('sessions:list');
  }

  async setSessionsList(ids: string[]): Promise<void> {
    await this.set('sessions:list', ids, TTL.SESSIONS_LIST);
  }

  // ========== Sessions Stats ==========

  async getSessionsStats(): Promise<SessionStats | null> {
    return this.get<SessionStats>('sessions:stats');
  }

  async setSessionsStats(stats: SessionStats): Promise<void> {
    await this.set('sessions:stats', stats, TTL.SESSIONS_STATS);
  }

  // ========== Messages (paginated 100k support) ==========

  async getMessagesPage(sessionId: string, page: number, size: number): Promise<unknown[] | null> {
    return this.get<unknown[]>(`messages:${sessionId}:page:${page}:size:${size}`);
  }

  async setMessagesPage(sessionId: string, page: number, size: number, data: unknown[]): Promise<void> {
    await this.set(`messages:${sessionId}:page:${page}:size:${size}`, data, TTL.MESSAGES_PAGE);
  }

  async getMessagesCount(sessionId: string): Promise<number | null> {
    return this.get<number>(`messages:${sessionId}:count`);
  }

  async setMessagesCount(sessionId: string, count: number): Promise<void> {
    await this.set(`messages:${sessionId}:count`, count, TTL.MESSAGES_COUNT);
  }

  // ========== Webhooks ==========

  async getWebhooks(sessionId: string): Promise<unknown[] | null> {
    return this.get<unknown[]>(`webhooks:${sessionId}`);
  }

  async setWebhooks(sessionId: string, data: unknown[]): Promise<void> {
    await this.set(`webhooks:${sessionId}`, data, TTL.WEBHOOKS);
  }

  // ========== Invalidation ==========

  async invalidateSession(id: string): Promise<void> {
    await this.del(`session:${id}:status`, `session:${id}:info`, `session:${id}:qr`);
    await this.del('sessions:list', 'sessions:stats');
  }

  async invalidateSessionsList(): Promise<void> {
    await this.del('sessions:list', 'sessions:stats');
  }

  async invalidateMessages(sessionId: string): Promise<void> {
    await this.delPattern(`messages:${sessionId}:*`);
  }

  async invalidateWebhooks(sessionId: string): Promise<void> {
    await this.del(`webhooks:${sessionId}`);
  }

  async invalidateAll(): Promise<void> {
    await this.delPattern('session:*');
    await this.delPattern('sessions:*');
    await this.delPattern('messages:*');
    await this.delPattern('webhooks:*');
  }
}
