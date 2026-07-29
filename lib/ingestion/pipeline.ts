import { Prisma } from "@/lib/generated/prisma/client";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { prisma } from "@/lib/db";
import { createEmbeddings } from "@/lib/providers/embeddings";
import { upsertPoints, getCollectionName } from "@/lib/vector/qdrant";
import { SourceStatus, JobStatus, JobType, SourceType } from "@/lib/generated/prisma/enums";
import { v4 as uuidv4 } from "uuid";

export interface ChunkData {
  content: string;
  metadata: Record<string, unknown>;
  charRange: { start: number; end: number };
}

export interface ProcessedSource {
  chunks: ChunkData[];
  totalChars: number;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

export async function extractContent(
  sourceId: string
): Promise<ProcessedSource> {
  await updateJobStatus(sourceId, JobType.EXTRACT, JobStatus.PROCESSING);
  await updateSourceStatus(sourceId, SourceStatus.EXTRACTING);

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: { type: true, filePath: true, url: true, metadata: true, notebookId: true },
  });

  if (!source) throw new Error("Source not found");

  // Dynamic import to avoid circular dependency
  const { loadSource } = await import("./loaders");
  const { documents, metadata } = await loadSource(source.type as SourceType, {
    filePath: source.filePath || undefined,
    url: source.url || undefined,
    metadata: source.metadata as Record<string, unknown> | undefined,
  });

  // Combine all document content
  const fullContent = documents.map((d) => d.pageContent).join("\n\n");
  const totalChars = fullContent.length;

  // Update source with extracted metadata
  await prisma.source.update({
    where: { id: sourceId },
    data: {
      metadata: { ...(source.metadata as object), ...metadata, totalChars },
      status: SourceStatus.CHUNKING,
    },
  });

  await updateJobStatus(sourceId, JobType.EXTRACT, JobStatus.COMPLETED);

  return { chunks: [], totalChars };
}

export async function chunkContent(
  sourceId: string
): Promise<ProcessedSource> {
  await updateJobStatus(sourceId, JobType.CHUNK, JobStatus.PROCESSING);
  await updateSourceStatus(sourceId, SourceStatus.CHUNKING);

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: { type: true, filePath: true, url: true, metadata: true },
  });

  if (!source) throw new Error("Source not found");

  const { loadSource } = await import("./loaders");
  const { documents } = await loadSource(source.type as SourceType, {
    filePath: source.filePath || undefined,
    url: source.url || undefined,
    metadata: source.metadata as Record<string, unknown> | undefined,
  });

  const fullContent = documents.map((d) => d.pageContent).join("\n\n");
  const langchainDocs = documents.map((d) => new Document({ pageContent: d.pageContent, metadata: d.metadata }));
  const splitDocs = await textSplitter.splitDocuments(langchainDocs);

  const chunks: ChunkData[] = splitDocs.map((doc, index) => {
    const startChar = fullContent.indexOf(doc.pageContent);
    return {
      content: doc.pageContent,
      metadata: { ...doc.metadata, chunkIndex: index },
      charRange: { start: startChar >= 0 ? startChar : index * CHUNK_SIZE, end: startChar >= 0 ? startChar + doc.pageContent.length : (index + 1) * CHUNK_SIZE },
    };
  });

  await prisma.source.update({
    where: { id: sourceId },
    data: { status: SourceStatus.EMBEDDING },
  });

  await updateJobStatus(sourceId, JobType.CHUNK, JobStatus.COMPLETED);

  return { chunks, totalChars: fullContent.length };
}

export async function embedChunks(
  sourceId: string,
  chunks: ChunkData[]
): Promise<Array<{ chunk: ChunkData; embedding: number[] }>> {
  await updateJobStatus(sourceId, JobType.EMBED, JobStatus.PROCESSING);
  await updateSourceStatus(sourceId, SourceStatus.EMBEDDING);

  const embeddings = createEmbeddings();
  const texts = chunks.map((c) => c.content);
  const vectors = await embeddings.embedDocuments(texts);

  const embedded = chunks.map((chunk, index) => ({
    chunk,
    embedding: vectors[index],
  }));

  await updateSourceStatus(sourceId, SourceStatus.STORING);
  await updateJobStatus(sourceId, JobType.EMBED, JobStatus.COMPLETED);

  return embedded;
}

export async function storeVectors(
  notebookId: string,
  sourceId: string,
  embeddedChunks: Array<{ chunk: ChunkData; embedding: number[] }>
): Promise<string[]> {
  await updateJobStatus(sourceId, JobType.STORE, JobStatus.PROCESSING);

  const collectionName = getCollectionName(notebookId);
  const points = embeddedChunks.map(({ chunk, embedding }, index) => {
    const pointId = uuidv4();
    return {
      id: pointId,
      vector: embedding,
      payload: {
        sourceId,
        chunkIndex: index,
        content: chunk.content,
        charRange: chunk.charRange,
        metadata: chunk.metadata,
      },
    };
  });

  await upsertPoints(collectionName, points);

  const qdrantPointIds = points.map((p) => p.id);
  await updateJobStatus(sourceId, JobType.STORE, JobStatus.COMPLETED);

  return qdrantPointIds;
}

export async function indexChunks(
  sourceId: string,
  notebookId: string,
  qdrantPointIds: string[],
  chunks: ChunkData[]
): Promise<void> {
  await updateJobStatus(sourceId, JobType.INDEX, JobStatus.PROCESSING);
  await updateSourceStatus(sourceId, SourceStatus.STORING);

  const chunkRecords = chunks.map((chunk, index) => ({
    sourceId,
    qdrantPointId: qdrantPointIds[index],
    chunkIndex: index,
    charRange: chunk.charRange,
    metadata: chunk.metadata as Prisma.InputJsonValue,
  }));

  await prisma.sourceChunk.createMany({ data: chunkRecords });

  await prisma.source.update({
    where: { id: sourceId },
    data: { status: SourceStatus.READY },
  });

  await updateJobStatus(sourceId, JobType.INDEX, JobStatus.COMPLETED);
}

async function updateSourceStatus(sourceId: string, status: SourceStatus) {
  await prisma.source.update({
    where: { id: sourceId },
    data: { status },
  });
}

async function updateJobStatus(
  sourceId: string,
  type: JobType,
  status: JobStatus,
  error?: string
) {
  await prisma.job.updateMany({
    where: { sourceId, type },
    data: {
      status,
      ...(status === JobStatus.PROCESSING && { startedAt: new Date() }),
      ...(status === JobStatus.COMPLETED && { completedAt: new Date() }),
      ...(status === JobStatus.FAILED && { error }),
      ...(status === JobStatus.DEAD_LETTER && { error }),
    },
  });
}