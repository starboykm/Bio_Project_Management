import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client?: Redis;
  private readonly memory = new Map<string, { value: string; expiresAt: number }>();

  constructor(config: ConfigService) {
    const enabled = config.get<string>('REDIS_ENABLED', 'true') !== 'false';
    if (!enabled) {
      return;
    }

    this.client = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  async setSession(key: string, value: unknown, ttlSeconds = 60 * 60 * 8) {
    const raw = JSON.stringify(value);
    if (!this.client) {
      this.memory.set(key, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
      return;
    }
    await this.client.set(key, raw, 'EX', ttlSeconds);
  }

  async getSession<T>(key: string): Promise<T | null> {
    if (!this.client) {
      const entry = this.memory.get(key);
      if (!entry || entry.expiresAt < Date.now()) {
        this.memory.delete(key);
        return null;
      }
      return JSON.parse(entry.value) as T;
    }

    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }
}
