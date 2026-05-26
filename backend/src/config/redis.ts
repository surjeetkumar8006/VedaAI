import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export const connectRedis = () => {
  if (redisClient) return { redisClient, isRedisAvailable };

  try {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: 1, // retry once, then fail and fall back to memory
      connectTimeout: 2000,
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      console.log('⚡ Connected to Redis successfully.');
    });

    redisClient.on('error', (err) => {
      if (isRedisAvailable) {
        console.warn('⚠️ Redis went offline. Falling back to In-Memory Queue.');
      }
      isRedisAvailable = false;
    });
  } catch (error) {
    console.error('❌ Redis Initialization Error:', error);
    isRedisAvailable = false;
    redisClient = null;
  }

  return { redisClient, isRedisAvailable };
};

export const checkRedisStatus = async (): Promise<boolean> => {
  if (!redisClient) return false;
  try {
    const res = await redisClient.ping();
    isRedisAvailable = res === 'PONG';
    return isRedisAvailable;
  } catch {
    isRedisAvailable = false;
    return false;
  }
};

export { redisClient, isRedisAvailable };
