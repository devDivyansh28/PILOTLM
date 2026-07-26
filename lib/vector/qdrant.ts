import { QdrantClient } from '@qdrant/js-client-rest';
import { getConfig } from '@/lib/providers/registry';

let qdrantClient: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (qdrantClient) return qdrantClient;

  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (!url) throw new Error('QDRANT_URL not set');
  if (!apiKey) throw new Error('QDRANT_API_KEY not set');

  qdrantClient = new QdrantClient({ url, apiKey });
  return qdrantClient;
}

export function getCollectionName(notebookId: string): string {
  return `notebook_${notebookId}`;
}

export async function ensureCollection(notebookId: string): Promise<void> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(notebookId);

  const exists = await client.collectionExists(collectionName);
  if (exists) return;

  const embeddingConfig = getConfig().embedding[getConfig().defaults.embedding];
  await client.createCollection(collectionName, {
    vectors: {
      size: embeddingConfig.dimensions,
      distance: 'Cosine',
    },
    optimizers_config: {
      default_segment_number: 2,
    },
  });
}

export async function upsertPoints(
  notebookId: string,
  points: Array<{
    id: string;
    vector: number[];
    payload: Record<string, unknown>;
  }>
): Promise<void> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(notebookId);

  await client.upsert(collectionName, {
    wait: true,
    points: points.map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload,
    })),
  });
}

export async function searchPoints(
  notebookId: string,
  vector: number[],
  options: {
    limit?: number;
    scoreThreshold?: number;
    filter?: Record<string, unknown>;
  } = {}
): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(notebookId);

  const result = await client.search(collectionName, {
    vector,
    limit: options.limit ?? 50,
    score_threshold: options.scoreThreshold ?? 0.5,
    filter: options.filter,
    with_payload: true,
  });

  return result.map((r) => ({
    id: r.id.toString(),
    score: r.score,
    payload: r.payload as Record<string, unknown>,
  }));
}

export async function deletePoints(notebookId: string, pointIds: string[]): Promise<void> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(notebookId);

  await client.delete(collectionName, {
    wait: true,
    points: pointIds,
  });
}

export async function deleteCollection(notebookId: string): Promise<void> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(notebookId);

  await client.deleteCollection(collectionName);
}

export async function getCollectionInfo(notebookId: string) {
  const client = getQdrantClient();
  const collectionName = getCollectionName(notebookId);

  return client.getCollection(collectionName);
}