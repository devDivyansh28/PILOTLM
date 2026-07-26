import { Redis } from 'ioredis';

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (redisConnection) return redisConnection;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL not set');

  redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redisConnection.on('error', (err) => {
    console.error('[Redis] Connection error:', err);
  });

  redisConnection.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}