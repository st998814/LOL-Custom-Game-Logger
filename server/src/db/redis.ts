import { createClient } from 'redis';

// Configure the connection string from environment variables
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 5000, // 5 seconds initial connection timeout
    reconnectStrategy: (retries) => {
      // Exponential backoff strategy up to 3 secondsmax
      return Math.min(retries * 50, 3000);
    }
  }
});

// Setup global error handling to prevent Node runtime crashes
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis connected successfully.'));

// Connect asynchronously when the module evaluates
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Failed to initialize Redis connection:', err);
  }
})();

export default redisClient;
