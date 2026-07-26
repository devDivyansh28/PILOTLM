import { Queue } from 'bullmq';
import { getRedisConnection } from './connection';

export const QUEUE_NAME = 'ingestion';

export const ingestionQueue = new Queue(QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export type JobType = 'EXTRACT' | 'CHUNK' | 'EMBED' | 'STORE' | 'INDEX' | 'REINDEX';

export interface IngestionJobData {
  sourceId: string;
  notebookId: string;
  jobType: JobType;
  payload?: Record<string, unknown>;
}

export async function addIngestionJob(data: IngestionJobData) {
  return ingestionQueue.add(data.jobType.toLowerCase(), data);
}

export async function addBulkIngestionJobs(jobs: IngestionJobData[]) {
  return ingestionQueue.addBulk(jobs.map(j => ({ name: j.jobType.toLowerCase(), data: j })));
}

export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    ingestionQueue.getWaitingCount(),
    ingestionQueue.getActiveCount(),
    ingestionQueue.getCompletedCount(),
    ingestionQueue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
}

export async function pauseQueue() {
  await ingestionQueue.pause();
}

export async function resumeQueue() {
  await ingestionQueue.resume();
}

export async function cleanQueue() {
  await ingestionQueue.clean(0, 100, 'completed');
  await ingestionQueue.clean(0, 100, 'failed');
}