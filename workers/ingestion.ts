import { createIngestionWorker } from '@/lib/queue';

console.log('[Worker Entry] Starting BullMQ ingestion worker...');

const worker = createIngestionWorker();

process.on('SIGINT', async () => {
  console.log('[Worker] Shutting down...');
  await worker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await worker.close();
  process.exit(0);
});