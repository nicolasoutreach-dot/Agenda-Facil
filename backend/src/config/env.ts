import 'dotenv/config';

export const env = {
  port: process.env.PORT ?? '3001',
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? ''
};
