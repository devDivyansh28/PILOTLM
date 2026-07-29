import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getSignedUploadUrl } from "@/lib/storage/imagekit";
import { SourceType, SourceStatus } from "@/lib/generated/prisma/enums";
import { ingestionQueue } from "@/lib/queue";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const url = new URL(request.url);
    const notebookId = url.searchParams.get("notebookId");
    if (!notebookId) return new Response("notebookId required", { status: 400 });

    const sources = await prisma.source.findMany({
      where: { notebookId },
      orderBy: { createdAt: "desc" },
      include: { jobs: { orderBy: { createdAt: "asc" } }, _count: { select: { chunks: true } } },
    });

    return Response.json(sources);
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const { notebookId, type, name, filePath, url, metadata } = body;

    if (!notebookId || !type || !name) {
      return new Response("notebookId, type, name required", { status: 400 });
    }

    const source = await prisma.source.create({
      data: {
        notebookId,
        type: type as SourceType,
        name,
        filePath,
        url,
        status: SourceStatus.PENDING,
        metadata,
      },
    });

    // Create job records
    const jobTypes = ["EXTRACT", "CHUNK", "EMBED", "STORE", "INDEX"] as const;
    await prisma.job.createMany({
      data: jobTypes.map((jt) => ({ sourceId: source.id, type: jt, status: "PENDING" })),
    });

    // Enqueue first job
    await ingestionQueue.add("extract", { sourceId: source.id, jobType: "EXTRACT" });

    return Response.json(source);
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}