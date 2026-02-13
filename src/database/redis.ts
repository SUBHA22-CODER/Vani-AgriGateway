import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export class RedisConnection {
  private static client: RedisClientType;

  static async initialize(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      await this.client.connect();
      console.log('Redis connected successfully');
    }

    return this.client;
  }

  static async getClient(): Promise<RedisClientType> {
    if (!this.client || !this.client.isOpen) {
      return this.initialize();
    }
    return this.client;
  }

  static async close(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
    }
  }
}
