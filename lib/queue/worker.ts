import { Worker, Job } from 'bullmq';
import { getRedisConnection } from './connection';
import { QUEUE_NAME, IngestionJobData } from './ingestion';
import { prisma } from '@/lib/db';
import { SourceStatus, JobStatus, JobType } from '@/lib/generated/prisma/enums';

async function processExtract(job: Job<IngestionJobData>) {
  const { sourceId } = job.data;
  console.log(`[EXTRACT] Processing source ${sourceId}`);
  
  await prisma.job.updateMany({
    where: { sourceId, type: JobType.EXTRACT },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() }
  });

  // TODO: Implement actual extraction using LangChain loaders
  // const loader = getLoaderForSource(source);
  // const docs = await loader.load();
  
  await prisma.job.updateMany({
    where: { sourceId, type: JobType.EXTRACT },
    data: { status: JobStatus.COMPLETED, completedAt: new Date() }
  });

  // Chain to next job
  await addNextJob(sourceId, 'CHUNK');
}

async function processChunk(job: Job<IngestionJobData>) {
  const { sourceId } = job.data;
  console.log(`[CHUNK] Processing source ${sourceId}`);
  
  await prisma.job.updateMany({
    where: { sourceId, type: JobType.CHUNK },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() }
  });

  // TODO: Implement chunking with RecursiveCharacterTextSplitter
  // const chunks = await splitDocuments(docs);

  await prisma.job.updateMany({
    where: { sourceId, type: JobType.CHUNK },
    data: { status: JobStatus.COMPLETED, completedAt: new Date() }
  });

  await addNextJob(sourceId, 'EMBED');
}

async function processEmbed(job: Job<IngestionJobData>) {
  const { sourceId } = job.data;
  console.log(`[EMBED] Processing source ${sourceId}`);
  
  await prisma.job.updateMany({
    where: { sourceId, type: JobType.EMBED },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() }
  });

  // TODO: Generate embeddings using provider
  // const embeddings = await embedDocuments(chunks);

  await prisma.job.updateMany({
    where: { sourceId, type: JobType.EMBED },
    data: { status: JobStatus.COMPLETED, completedAt: new Date() }
  });

  await addNextJob(sourceId, 'STORE');
}

async function processStore(job: Job<IngestionJobData>) {
  const { sourceId, notebookId } = job.data;
  console.log(`[STORE] Processing source ${sourceId} into notebook ${notebookId}`);
  
  await prisma.job.updateMany({
    where: { sourceId, type: JobType.STORE },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() }
  });

  // TODO: Store vectors in Qdrant
  // await qdrantClient.upsert(collectionName, points);

  await prisma.job.updateMany({
    where: { sourceId, type: JobType.STORE },
    data: { status: JobStatus.COMPLETED, completedAt: new Date() }
  });

  await addNextJob(sourceId, 'INDEX');
}

async function processIndex(job: Job<IngestionJobData>) {
  const { sourceId } = job.data;
  console.log(`[INDEX] Finalizing source ${sourceId}`);
  
  await prisma.job.updateMany({
    where: { sourceId, type: JobType.INDEX },
    data: { status: JobStatus.PROCESSING, startedAt: new Date() }
  });

  // TODO: Create SourceChunk records in Prisma with qdrantPointId
  
  await prisma.source.update({
    where: { id: sourceId },
    data: { status: SourceStatus.READY }
  });

  await prisma.job.updateMany({
    where: { sourceId, type: JobType.INDEX },
    data: { status: JobStatus.COMPLETED, completedAt: new Date() }
  });

  console.log(`[INGESTION] Source ${sourceId} completed`);
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
    
    if (job && job.attemptsMade >= job.opts.attempts!) {
      // Move to dead letter - update job status
      prisma.job.updateMany({
        where: { 
          sourceId: job.data.sourceId, 
          type: job.name.toUpperCase() as JobType 
        },
        data: { status: JobStatus.DEAD_LETTER, error: err.message }
      }).catch(console.error);
    }
  });

  worker.on('error', (err) => {
    console.error('[Worker] Error:', err);
  });

  return worker;
}

if (require.main === module) {
  console.log('[Worker] Starting ingestion worker...');
  createIngestionWorker();
  console.log('[Worker] Worker started');
}