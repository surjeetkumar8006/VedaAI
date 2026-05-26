import { Worker, Job } from 'bullmq';
import { isRedisAvailable, connectRedis } from '../config/redis';
import { processAssignmentJob } from './processor';

const QUEUE_NAME = 'assessment-generation';
let bullWorker: Worker | null = null;

export const initWorker = () => {
  const { redisClient, isRedisAvailable: activeRedis } = connectRedis();

  if (activeRedis && redisClient) {
    console.log('👷 Initializing BullMQ Worker (Redis backed)...');
    
    bullWorker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        const { assignmentId } = job.data;
        await processAssignmentJob(assignmentId);
      },
      {
        connection: redisClient,
        concurrency: 2, // process up to 2 jobs concurrently
      }
    );

    bullWorker.on('completed', (job) => {
      console.log(`✅ Worker: Job ${job.id} completed successfully.`);
    });

    bullWorker.on('failed', (job, err) => {
      console.error(`❌ Worker: Job ${job?.id} failed with error:`, err);
    });
  } else {
    console.log('Worker: Running in In-Memory mode. No BullMQ Worker started.');
  }
};
