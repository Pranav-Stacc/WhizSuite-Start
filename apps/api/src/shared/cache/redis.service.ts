import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AppConfig } from '../config/app.config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  async onModuleInit(): Promise<void> {
    this.client = new Redis(this.config.get('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
    await this.client.ping();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  orgKey(organizationId: string, ...parts: string[]): string {
    return `org:${organizationId}:${parts.join(':')}`;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, payload);
    } else {
      await this.client.set(key, payload);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    const pipeline = this.client.pipeline();
    let batch = 0;
    for await (const keys of stream) {
      for (const key of keys as string[]) {
        pipeline.del(key);
        batch++;
      }
      if (batch >= 100) {
        await pipeline.exec();
        batch = 0;
      }
    }
    if (batch > 0) {
      await pipeline.exec();
    }
  }
}
