"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getSignedUploadUrl } from "@/lib/storage/imagekit";
import { Prisma } from "@/lib/generated/prisma/client";
import { SourceType, SourceStatus } from "@/lib/generated/prisma/enums";
import { ingestionQueue } from "@/lib/queue";

export async function getUploadUrl(fileName: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const folder = `/sources/${userId}`;
  const { signedUrl, expire, token } = getSignedUploadUrl(fileName, folder);

  return { signedUrl, expire, token, folder };
}

export async function createSource(
  notebookId: string,
  type: SourceType,
  name: string,
  filePath?: string,
  url?: string,
  metadata?: Prisma.InputJsonValue
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
  });
  if (!notebook) throw new Error("Notebook not found");
  if (notebook.userId !== user.id) throw new Error("Forbidden");

  const source = await prisma.source.create({
    data: {
      notebookId,
      type,
      name,
      filePath,
      url,
      status: SourceStatus.PENDING,
      metadata,
    },
  });

  return source;
}

export async function completeUploadAndEnqueue(
  sourceId: string,
  filePath: string,
  metadata?: Prisma.InputJsonValue
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: { notebook: true },
  });

  if (!source) throw new Error("Source not found");
  if (source.notebook.userId !== (await prisma.user.findUnique({ where: { clerkId: userId } }))?.id) {
    throw new Error("Forbidden");
  }

  // Update source with file path and start ingestion
  const mergedMetadata = source.metadata && metadata
    ? { ...(source.metadata as Record<string, unknown>), ...(metadata as Record<string, unknown>) }
    : metadata ?? source.metadata;

  await prisma.source.update({
    where: { id: sourceId },
    data: {
      filePath,
      status: SourceStatus.UPLOADING,
      metadata: mergedMetadata as Prisma.InputJsonValue,
    },
  });

  // Create ingestion jobs for each step
  const jobTypes = ["EXTRACT", "CHUNK", "EMBED", "STORE", "INDEX"] as const;
  await Promise.all(
    jobTypes.map((type) =>
      prisma.job.create({
        data: {
          sourceId,
          type: type as "EXTRACT" | "CHUNK" | "EMBED" | "STORE" | "INDEX",
          status: "PENDING",
        },
      })
    )
  );

  // Enqueue the first job (EXTRACT)
  await ingestionQueue.add("extract", { sourceId, jobType: "EXTRACT" });

  return { success: true };
}

export async function deleteSource(sourceId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: { notebook: true, chunks: true },
  });

  if (!source) throw new Error("Source not found");
  if (source.notebook.userId !== user.id) throw new Error("Forbidden");

  // Delete from ImageKit
  if (source.filePath) {
    try {
      // Extract fileId from filePath (format: /sources/userId/filename)
      const fileId = source.filePath.split("/").pop();
      if (fileId) {
        const { deleteFile } = await import("@/lib/storage/imagekit");
        await deleteFile(fileId);
      }
    } catch (error) {
      console.error("Failed to delete from ImageKit:", error);
    }
  }

  // Delete from Qdrant (via chunk qdrantPointIds)
  if (source.chunks.length > 0) {
    const { deletePoints } = await import("@/lib/vector/qdrant");
    await deletePoints(source.notebookId, source.chunks.map((c) => c.qdrantPointId));
  }

  // Delete source (cascades to chunks, jobs)
  await prisma.source.delete({ where: { id: sourceId } });

  return { success: true };
}

export async function reindexSource(sourceId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: { notebook: true, chunks: true },
  });

  if (!source) throw new Error("Source not found");
  if (source.notebook.userId !== user.id) throw new Error("Forbidden");

  // Reset source status
  await prisma.source.update({
    where: { id: sourceId },
    data: { status: SourceStatus.PENDING, error: null },
  });

  // Delete existing chunks from Qdrant
  if (source.chunks.length > 0) {
    const { deletePoints } = await import("@/lib/vector/qdrant");
    await deletePoints(source.notebookId, source.chunks.map((c) => c.qdrantPointId));
    await prisma.sourceChunk.deleteMany({ where: { sourceId } });
  }

  // Delete old jobs
  await prisma.job.deleteMany({ where: { sourceId } });

  // Create new jobs
  const jobTypes = ["EXTRACT", "CHUNK", "EMBED", "STORE", "INDEX"] as const;
  await Promise.all(
    jobTypes.map((type) =>
      prisma.job.create({
        data: { sourceId, type: type as "EXTRACT" | "CHUNK" | "EMBED" | "STORE" | "INDEX", status: "PENDING" },
      })
    )
  );

  // Enqueue EXTRACT
  await ingestionQueue.add("extract", { sourceId, jobType: "EXTRACT" });

  return { success: true };
}

export async function listSources(notebookId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
  });
  if (!notebook) throw new Error("Notebook not found");
  if (notebook.userId !== user.id) throw new Error("Forbidden");

  const sources = await prisma.source.findMany({
    where: { notebookId },
    orderBy: { createdAt: "desc" },
    include: {
      jobs: { orderBy: { createdAt: "asc" } },
      _count: { select: { chunks: true } },
    },
  });

  return sources;
}

export async function getSource(sourceId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: {
      notebook: true,
      chunks: { orderBy: { chunkIndex: "asc" } },
      jobs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!source) throw new Error("Source not found");
  if (source.notebook.userId !== user.id) throw new Error("Forbidden");

  return source;
}

export async function getSourceStatus(sourceId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: {
      jobs: { orderBy: { createdAt: "asc" } },
      chunks: { select: { id: true } },
    },
  });

  if (!source) throw new Error("Source not found");

  // Verify ownership
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (source.notebookId) {
    const notebook = await prisma.notebook.findUnique({ where: { id: source.notebookId } });
    if (notebook?.userId !== user?.id) throw new Error("Forbidden");
  }

  const jobStatuses = source.jobs.reduce((acc, job) => {
    acc[job.type] = { status: job.status, error: job.error, attempts: job.attempts };
    return acc;
  }, {} as Record<string, { status: string; error: string | null; attempts: number }>);

  return {
    sourceId: source.id,
    status: source.status,
    error: source.error,
    jobs: jobStatuses,
    chunkCount: source.chunks.length,
  };
}