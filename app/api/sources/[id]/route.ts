import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getUploadAuthParams, deleteFile } from "@/lib/storage/imagekit";
import { deletePoints } from "@/lib/vector/qdrant";
import { ingestionQueue } from "@/lib/queue";
import { SourceStatus } from "@/lib/generated/prisma/enums";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const { id } = await params;
    const source = await prisma.source.findUnique({
      where: { id },
      include: { chunks: { orderBy: { chunkIndex: "asc" } }, jobs: { orderBy: { createdAt: "asc" } } },
    });

    if (!source) return new Response("Not found", { status: 404 });
    return Response.json(source);
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const { id } = await params;
    const source = await prisma.source.findUnique({
      where: { id },
      include: { chunks: true },
    });

    if (!source) return new Response("Not found", { status: 404 });

    // Delete from ImageKit
    if (source.filePath) {
      const fileId = source.filePath.split("/").pop();
      if (fileId) await deleteFile(fileId);
    }

    // Delete from Qdrant
    if (source.chunks.length > 0) {
      await deletePoints(source.notebookId, source.chunks.map((c) => c.qdrantPointId));
    }

    await prisma.source.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "reindex") {
      // Reset source
      await prisma.source.update({
        where: { id },
        data: { status: SourceStatus.PENDING, error: null },
      });

      // Delete existing chunks from Qdrant
      const chunks = await prisma.sourceChunk.findMany({ where: { sourceId: id } });
      if (chunks.length > 0) {
        await deletePoints(chunks[0].sourceId, chunks.map((c) => c.qdrantPointId));
        await prisma.sourceChunk.deleteMany({ where: { sourceId: id } });
      }

      // Delete old jobs
      await prisma.job.deleteMany({ where: { sourceId: id } });

      // Create new jobs
      const jobTypes = ["EXTRACT", "CHUNK", "EMBED", "STORE", "INDEX"] as const;
      await prisma.job.createMany({
        data: jobTypes.map((type) => ({ sourceId: id, type, status: "PENDING" })),
      });

      // Enqueue first job
      await ingestionQueue.add("extract", { sourceId: id, jobType: "EXTRACT" });

      return Response.json({ success: true });
    }

    if (action === "getUploadUrl") {
      const authParams = getUploadAuthParams();
      return Response.json(authParams);
    }

    if (action === "completeUpload") {
      const { filePath, metadata } = body;
      if (!filePath) return new Response("filePath required", { status: 400 });

      const source = await prisma.source.findUnique({ where: { id } });
      if (!source) return new Response("Not found", { status: 404 });

      await prisma.source.update({
        where: { id },
        data: {
          filePath,
          status: SourceStatus.UPLOADING,
          metadata: { ...(source.metadata as object), ...metadata },
        },
      });

      // Create jobs and enqueue
      const jobTypes = ["EXTRACT", "CHUNK", "EMBED", "STORE", "INDEX"] as const;
      await prisma.job.deleteMany({ where: { sourceId: id } });
      await prisma.job.createMany({
        data: jobTypes.map((type) => ({ sourceId: id, type, status: "PENDING" })),
      });
      await ingestionQueue.add("extract", { sourceId: id, jobType: "EXTRACT" });

      return Response.json({ success: true });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}