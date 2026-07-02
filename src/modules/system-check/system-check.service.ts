import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';
import Docker from 'dockerode';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { createLogger } from '../../common/services/logger.service';
import { SystemCheckItem, SystemCheckResult } from './system-check.types';

const INSECURE_JWT_SECRETS = new Set(['openwa-default-jwt-secret-change-in-production', 'change-this-in-production']);
const MIN_DISK_SPACE_BYTES = 500 * 1024 * 1024; // 500MB
const REDIS_CHECK_TIMEOUT_MS = 2000;
const DOCKER_CHECK_TIMEOUT_MS = 2000;
const S3_CHECK_TIMEOUT_MS = 3000;

@Injectable()
export class SystemCheckService {
  private readonly logger = createLogger('SystemCheckService');

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async runChecks(): Promise<SystemCheckResult> {
    const results = await Promise.all([
      Promise.resolve(this.checkJwtSecret()),
      this.checkDatabase(),
      Promise.resolve(this.checkSessionStorage()),
      this.checkFileStorage(),
      this.checkRedis(),
      Promise.resolve(this.checkQueueRedisConsistency()),
      this.checkDockerSocket(),
      Promise.resolve(this.checkDiskSpace()),
      Promise.resolve(this.checkCors()),
    ]);

    const checks = results.filter((item): item is SystemCheckItem => item !== null);

    return {
      checks,
      hasIssues: checks.some(c => c.status === 'fail'),
      checkedAt: new Date().toISOString(),
    };
  }

  private checkJwtSecret(): SystemCheckItem {
    const secret = this.configService.get<string>('jwtSecret');

    if (!secret) {
      return { key: 'jwtSecret', status: 'fail', detail: 'JWT_SECRET is not set' };
    }
    if (INSECURE_JWT_SECRETS.has(secret)) {
      return { key: 'jwtSecret', status: 'fail', detail: 'JWT_SECRET is still set to the default placeholder value' };
    }
    if (secret.length < 32) {
      return {
        key: 'jwtSecret',
        status: 'fail',
        detail: `JWT_SECRET is only ${secret.length} characters (minimum 32 recommended)`,
      };
    }
    return { key: 'jwtSecret', status: 'ok' };
  }

  private async checkDatabase(): Promise<SystemCheckItem> {
    try {
      await this.dataSource.query('SELECT 1');
      return { key: 'database', status: 'ok' };
    } catch (err) {
      return { key: 'database', status: 'fail', detail: String(err instanceof Error ? err.message : err) };
    }
  }

  private checkSessionStorage(): SystemCheckItem {
    const sessionPath = this.configService.get<string>('engine.sessionDataPath', './data/sessions');
    return this.checkDirWritable('sessionStorage', sessionPath);
  }

  private async checkFileStorage(): Promise<SystemCheckItem> {
    const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();

    if (storageType === 's3') {
      const endpoint = process.env.S3_ENDPOINT;
      const accessKeyId = process.env.S3_ACCESS_KEY;
      const secretAccessKey = process.env.S3_SECRET_KEY;
      const bucket = process.env.S3_BUCKET;
      const region = process.env.S3_REGION || 'us-east-1';

      const missing = [
        !endpoint && 'S3_ENDPOINT',
        !accessKeyId && 'S3_ACCESS_KEY',
        !secretAccessKey && 'S3_SECRET_KEY',
        !bucket && 'S3_BUCKET',
      ].filter(Boolean) as string[];

      if (missing.length > 0) {
        return { key: 'fileStorage', status: 'fail', detail: `Missing S3 configuration: ${missing.join(', ')}` };
      }

      try {
        const client = new S3Client({
          endpoint,
          region,
          credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
          forcePathStyle: true,
        });
        await this.withTimeout(client.send(new HeadBucketCommand({ Bucket: bucket! })), S3_CHECK_TIMEOUT_MS);
        return { key: 'fileStorage', status: 'ok' };
      } catch (err) {
        return {
          key: 'fileStorage',
          status: 'fail',
          detail: `S3 bucket unreachable: ${String(err instanceof Error ? err.message : err)}`,
        };
      }
    }

    const localPath = this.configService.get<string>('storage.localPath', './data/media');
    return this.checkDirWritable('fileStorage', localPath);
  }

  private async checkRedis(): Promise<SystemCheckItem | null> {
    const enabled = this.configService.get<boolean>('redis.enabled', false);
    if (!enabled) return null;

    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');
    const db = this.configService.get<number>('redis.cacheDb', 1);

    const client = new Redis({
      host,
      port,
      password,
      db,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: REDIS_CHECK_TIMEOUT_MS,
      retryStrategy: () => null,
    });
    client.on('error', () => {
      /* swallow — connect()/ping() below surfaces the failure */
    });

    try {
      await client.connect();
      await client.ping();
      return { key: 'redis', status: 'ok' };
    } catch (err) {
      return {
        key: 'redis',
        status: 'fail',
        detail: `${host}:${port} unreachable — ${String(err instanceof Error ? err.message : err)}`,
      };
    } finally {
      client.disconnect();
    }
  }

  private checkQueueRedisConsistency(): SystemCheckItem | null {
    const queueEnabled = process.env.QUEUE_ENABLED === 'true';
    if (!queueEnabled) return null;

    const redisEnabled = this.configService.get<boolean>('redis.enabled', false);
    if (!redisEnabled) {
      return { key: 'queueRedis', status: 'fail', detail: 'QUEUE_ENABLED=true but REDIS_ENABLED is not true' };
    }
    return { key: 'queueRedis', status: 'ok' };
  }

  private async checkDockerSocket(): Promise<SystemCheckItem | null> {
    const needsDocker = process.env.REDIS_BUILTIN === 'true' || process.env.MINIO_BUILTIN === 'true';
    if (!needsDocker) return null;

    try {
      const docker = new Docker();
      await this.withTimeout(docker.ping(), DOCKER_CHECK_TIMEOUT_MS);
      return { key: 'dockerSocket', status: 'ok' };
    } catch (err) {
      return { key: 'dockerSocket', status: 'fail', detail: String(err instanceof Error ? err.message : err) };
    }
  }

  private checkDiskSpace(): SystemCheckItem | null {
    try {
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      const stats = fs.statfsSync(dataDir);
      const freeBytes = stats.bavail * stats.bsize;

      if (freeBytes < MIN_DISK_SPACE_BYTES) {
        return {
          key: 'diskSpace',
          status: 'fail',
          detail: `Only ${(freeBytes / (1024 * 1024)).toFixed(0)}MB free (minimum 500MB recommended)`,
        };
      }
      return { key: 'diskSpace', status: 'ok' };
    } catch (err) {
      this.logger.warn(`Disk space check unavailable: ${String(err)}`);
      return null;
    }
  }

  private checkCors(): SystemCheckItem | null {
    if (process.env.NODE_ENV !== 'production') return null;

    const origins = process.env.CORS_ORIGINS?.trim();
    if (!origins) {
      return { key: 'cors', status: 'fail', detail: 'CORS_ORIGINS is not set' };
    }
    if (origins === '*') {
      return { key: 'cors', status: 'fail', detail: 'CORS_ORIGINS is set to the wildcard "*" in production' };
    }
    return { key: 'cors', status: 'ok' };
  }

  private checkDirWritable(key: string, dirPath: string): SystemCheckItem {
    const resolved = path.resolve(process.cwd(), dirPath);
    try {
      if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
      fs.accessSync(resolved, fs.constants.W_OK);
      return { key, status: 'ok' };
    } catch (err) {
      return {
        key,
        status: 'fail',
        detail: `${resolved} is not writable — ${String(err instanceof Error ? err.message : err)}`,
      };
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms))]);
  }
}
