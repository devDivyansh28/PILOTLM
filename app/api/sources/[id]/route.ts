import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getUploadAuthParams, deleteFile } from "@/lib/storage/imagekit";
import { deletePoints } from "@/lib/vector/qdrant";
import { ingestionQueue } from "@/lib/queue";
import { Prisma } from "@/lib/generated/prisma/client";
import { SourceStatus } from "@/lib/generated/prisma/enums";
import { completeUploadSchema } from "@/lib/validation";
import { ok, unauthorized, bad, notFound, serverError } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const { id } = await params;
    const source = await prisma.source.findUnique({
      where: { id },
      include: { chunks: { orderBy: { chunkIndex: "asc" } }, jobs: { orderBy: { createdAt: "asc" } } },
    });

    if (!source) return notFound();
    return ok(source);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const { id } = await params;
    const source = await prisma.source.findUnique({
      where: { id },
      include: { chunks: true },
    });

    if (!source) return notFound();

    if (source.filePath) {
      const fileId = source.filePath.split("/").pop();
      if (fileId) await deleteFile(fileId);
    }

    if (source.chunks.length > 0) {
      await deletePoints(source.notebookId, source.chunks.map((c) => c.qdrantPointId));
    }

    await prisma.source.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "reindex") {
      const source = await prisma.source.findUnique({
        where: { id },
        include: { chunks: true },
      });
      if (!source) return notFound();

      await prisma.source.update({
        where: { id },
        data: { status: SourceStatus.PENDING, error: null },
      });

      if (source.chunks.length > 0) {
        await deletePoints(source.notebookId, source.chunks.map((c) => c.qdrantPointId));
        await prisma.sourceChunk.deleteMany({ where: { sourceId: id } });
      }

      await prisma.job.deleteMany({ where: { sourceId: id } });

      const jobTypes = ["EXTRACT", "CHUNK", "EMBED", "STORE", "INDEX"] as const;
      await prisma.job.createMany({
        data: jobTypes.map((type) => ({ sourceId: id, type, status: "PENDING" })),
      });

      await ingestionQueue.add("extract", { sourceId: id, jobType: "EXTRACT" });

      return ok({ success: true });
    }

    if (action === "getUploadUrl") {
      return ok(getUploadAuthParams());
    }

    if (action === "completeUpload") {
      const parsed = completeUploadSchema.safeParse(body);
      if (!parsed.success) return bad(parsed.error.issues[0].message);

      const { filePath, metadata } = parsed.data;

      const source = await prisma.source.findUnique({ where: { id } });
      if (!source) return notFound();

      await prisma.source.update({
        where: { id },
        data: {
          filePath,
          status: SourceStatus.UPLOADING,
          metadata: { ...(source.metadata as Record<string, unknown>), ...metadata } as Prisma.InputJsonValue,
        },
      });

      const jobTypes = ["EXTRACT", "CHUNK", "EMBED", "STORE", "INDEX"] as const;
      await prisma.job.deleteMany({ where: { sourceId: id } });
      await prisma.job.createMany({
        data: jobTypes.map((type) => ({ sourceId: id, type, status: "PENDING" })),
      });
      await ingestionQueue.add("extract", { sourceId: id, jobType: "EXTRACT" });

      return ok({ success: true });
    }

    return bad("Invalid action");
  } catch (err) {
    return serverError(err);
  }
}
