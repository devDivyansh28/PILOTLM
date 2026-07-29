import { Prisma } from "@/lib/generated/prisma/client";
import { Worker, Job } from 'bullmq';
import { getRedisConnection } from './connection';
import { QUEUE_NAME, IngestionJobData } from './ingestion';
import { prisma } from '@/lib/db';
import { SourceStatus, JobStatus, JobType } from '@/lib/generated/prisma/enums';
import { extractContent, chunkContent, embedChunks, storeVectors, indexChunks, ChunkData } from '@/lib/ingestion/pipeline';

async function processExtract(job: Job<IngestionJobData>) {
  const { sourceId } = job.data;
  console.log(`[EXTRACT] Processing source ${sourceId}`);

  await prisma.job.updateMany({
    where: { sourceId, type: JobType.EXTRACT },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() },
  });

  try {
    await extractContent(sourceId);
    await prisma.job.updateMany({
      where: { sourceId, type: JobType.EXTRACT },
      data: { status: JobStatus.COMPLETED, completedAt: new Date() },
    });
    await addNextJob(sourceId, JobType.CHUNK);
  } catch (error) {
    await handleJobError(sourceId, JobType.EXTRACT, error);
    throw error;
  }
}

async function processChunk(job: Job<IngestionJobData>) {
  const { sourceId } = job.data;
  console.log(`[CHUNK] Processing source ${sourceId}`);

  await prisma.job.updateMany({
    where: { sourceId, type: JobType.CHUNK },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() },
  });

  try {
    const result = await chunkContent(sourceId);
    await prisma.job.updateMany({
      where: { sourceId, type: JobType.CHUNK },
      data: { status: JobStatus.COMPLETED, completedAt: new Date() },
    });
    // Store chunks in job payload for next step
    await prisma.job.updateMany({
      where: { sourceId, type: JobType.EMBED },
      data: { payload: { chunks: result.chunks } as unknown as Prisma.InputJsonValue },
    });
    await addNextJob(sourceId, JobType.EMBED);
  } catch (error) {
    await handleJobError(sourceId, JobType.CHUNK, error);
    throw error;
  }
}

async function processEmbed(job: Job<IngestionJobData>) {
  const { sourceId } = job.data;
  console.log(`[EMBED] Processing source ${sourceId}`);

  await prisma.job.updateMany({
    where: { sourceId, type: JobType.EMBED },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() },
  });

  try {
    // Get chunks from previous job payload
    const chunkJob = await prisma.job.findFirst({
      where: { sourceId, type: JobType.CHUNK },
      select: { payload: true },
    });

    const chunks = (chunkJob?.payload as unknown as { chunks?: ChunkData[] })?.chunks || [];
    if (chunks.length === 0) {
      throw new Error("No chunks found for embedding");
    }

    const embedded = await embedChunks(sourceId, chunks);

    // Store embedded chunks for next step
    await prisma.job.updateMany({
      where: { sourceId, type: JobType.STORE },
      data: { payload: { embeddedChunks: embedded } as unknown as Prisma.InputJsonValue },
    });

    await prisma.job.updateMany({
      where: { sourceId, type: JobType.EMBED },
      data: { status: JobStatus.COMPLETED, completedAt: new Date() },
    });
    await addNextJob(sourceId, JobType.STORE);
  } catch (error) {
    await handleJobError(sourceId, JobType.EMBED, error);
    throw error;
  }
}

async function processStore(job: Job<IngestionJobData>) {
  const { sourceId, notebookId } = job.data;
  console.log(`[STORE] Processing source ${sourceId} into notebook ${notebookId}`);

  await prisma.job.updateMany({
    where: { sourceId, type: JobType.STORE },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() },
  });

  try {
    const storeJob = await prisma.job.findFirst({
      where: { sourceId, type: JobType.STORE },
      select: { payload: true },
    });

    const embeddedChunks = (storeJob?.payload as unknown as { embeddedChunks?: Array<{ chunk: ChunkData; embedding: number[] }> })?.embeddedChunks || [];
    if (embeddedChunks.length === 0) {
      throw new Error("No embedded chunks found for storage");
    }

    const qdrantPointIds = await storeVectors(notebookId, sourceId, embeddedChunks);

    // Store point IDs for next step
    await prisma.job.updateMany({
      where: { sourceId, type: JobType.INDEX },
      data: { payload: { qdrantPointIds } as unknown as Prisma.InputJsonValue },
    });

    await prisma.job.updateMany({
      where: { sourceId, type: JobType.STORE },
      data: { status: JobStatus.COMPLETED, completedAt: new Date() },
    });
    await addNextJob(sourceId, JobType.INDEX);
  } catch (error) {
    await handleJobError(sourceId, JobType.STORE, error);
    throw error;
  }
}

async function processIndex(job: Job<IngestionJobData>) {
  const { sourceId, notebookId } = job.data;
  console.log(`[INDEX] Finalizing source ${sourceId}`);

  await prisma.job.updateMany({
    where: { sourceId, type: JobType.INDEX },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() },
  });

  try {
    const indexJob = await prisma.job.findFirst({
      where: { sourceId, type: JobType.INDEX },
      select: { payload: true },
    });

    const qdrantPointIds = (indexJob?.payload as unknown as { qdrantPointIds?: string[] })?.qdrantPointIds || [];
    const chunkJob = await prisma.job.findFirst({
      where: { sourceId, type: JobType.CHUNK },
      select: { payload: true },
    });
    const chunks = (chunkJob?.payload as unknown as { chunks?: ChunkData[] })?.chunks || [];

    if (qdrantPointIds.length === 0 || chunks.length === 0) {
      throw new Error("Missing data for indexing");
    }

    await indexChunks(sourceId, notebookId, qdrantPointIds, chunks);

    await prisma.source.update({
      where: { id: sourceId },
      data: { status: SourceStatus.READY },
    });

    await prisma.job.updateMany({
      where: { sourceId, type: JobType.INDEX },
      data: { status: JobStatus.COMPLETED, completedAt: new Date() },
    });

    console.log(`[INGESTION] Source ${sourceId} completed`);
  } catch (error) {
    await handleJobError(sourceId, JobType.INDEX, error);
    throw error;
  }
}

async function handleJobError(sourceId: string, type: JobType, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Worker] Job ${type} failed for source ${sourceId}:`, message);

  await prisma.job.updateMany({
    where: { sourceId, type },
    data: { status: JobStatus.FAILED, error: message },
  });

  await prisma.source.update({
    where: { id: sourceId },
    data: { status: SourceStatus.FAILED, error: message },
  });
}

async function addNextJob(sourceId: string, jobType: JobType) {
  const { ingestionQueue } = await import('./ingestion');
  await ingestionQueue.add(jobType.toLowerCase(), { sourceId, jobType });
}

const processors: Record<string, (job: Job<IngestionJobData>) => Promise<void>> = {
  extract: processExtract,
  chunk: processChunk,
  embed: processEmbed,
  store: processStore,
  index: processIndex,
};

export function createIngestionWorker() {
  const worker = new Worker<IngestionJobData>(
    QUEUE_NAME,
    async (job) => {
      const processor = processors[job.name];
      if (!processor) throw new Error(`Unknown job type: ${job.name}`);
      await processor(job);
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
      limiter: { max: 10, duration: 60000 },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} (${job?.name}) failed:`, err);

    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      prisma.job.updateMany({
        where: {
          sourceId: job.data.sourceId,
          type: job.name.toUpperCase() as JobType,
        },
        data: { status: JobStatus.DEAD_LETTER, error: err.message },
      }).catch(console.error);

      prisma.source.update({
        where: { id: job.data.sourceId },
        data: { status: SourceStatus.FAILED, error: err.message },
      }).catch(console.error);
    }
  });

  worker.on('error', (err) => {
    console.error('[Worker] Error:', err);
  });

  return worker;
}

const isMainModule = process.argv[1]?.replace(/\\/g, '/').endsWith('worker.ts') ||
  process.argv[1]?.replace(/\\/g, '/').endsWith('worker.js');

if (isMainModule) {
  console.log('[Worker] Starting ingestion worker...');
  createIngestionWorker();
  console.log('[Worker] Worker started');
}