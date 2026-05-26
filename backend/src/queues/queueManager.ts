import { Queue } from 'bullmq';
import { isRedisAvailable, connectRedis } from '../config/redis';
import { processAssignmentJob } from '../workers/processor';

const QUEUE_NAME = 'assessment-generation';

let bullQueue: Queue | null = null;

// Initialize BullMQ Queue if Redis is available
export const initQueue = () => {
  const { redisClient, isRedisAvailable: activeRedis } = connectRedis();

  if (activeRedis && redisClient) {
    console.log('📦 Initializing BullMQ Queue (Redis backed)...');
    bullQueue = new Queue(QUEUE_NAME, {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });
  } else {
    console.warn('📦 Redis unavailable. Initializing In-Memory Fallback Queue...');
  }
};

/**
 * Add a job to generate/regenerate an assessment
 */
export const addGenerationJob = async (assignmentId: string): Promise<void> => {
  if (isRedisAvailable && bullQueue) {
    console.log(`[BullMQ] Enqueueing job for assignment: ${assignmentId}`);
    await bullQueue.add('generate', { assignmentId });
  } else {
    console.log(`[In-Memory Queue] Enqueueing job for assignment: ${assignmentId}`);
    
    // Simulate background execution
    setTimeout(async () => {
      try {
        await processAssignmentJob(assignmentId);
      } catch (err) {
        console.error('❌ Error processing job in memory fallback:', err);
      }
    }, 1000); // 1s start delay to mimic network queueing
  }
};
