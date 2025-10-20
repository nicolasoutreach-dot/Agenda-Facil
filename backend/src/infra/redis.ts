import { createClient } from 'redis';
import { env } from '../config/env.js';

export const redis = createClient({
  url: env.redisUrl
});

redis.on('error', (err: unknown) => console.error('Redis error:', err));

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}
