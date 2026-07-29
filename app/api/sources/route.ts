import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getUploadAuthParams } from "@/lib/storage/imagekit";
import { SourceStatus } from "@/lib/generated/prisma/enums";
import { ingestionQueue } from "@/lib/queue";
import { createSourceSchema } from "@/lib/validation";
import { ok, unauthorized, bad, serverError } from "@/lib/api-utils";

const URL_BASED_TYPES = new Set(["WEBSITE", "YOUTUBE"]);

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const url = new URL(request.url);
    const notebookId = url.searchParams.get("notebookId");
    if (!notebookId) return bad("notebookId required");

    const sources = await prisma.source.findMany({
      where: { notebookId },
      orderBy: { createdAt: "desc" },
      include: { jobs: { orderBy: { createdAt: "asc" } }, _count: { select: { chunks: true } } },
    });

    return ok(sources);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createSourceSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.issues[0].message);

    const { notebookId, type, name, filePath, url } = parsed.data;

    const source = await prisma.source.create({
      data: {
        notebookId,
        type,
        name,
        filePath,
        url: url || undefined,
        status: SourceStatus.PENDING,
      },
    });

    if (URL_BASED_TYPES.has(type)) {
      const jobTypes = ["EXTRACT", "CHUNK", "EMBED", "STORE", "INDEX"] as const;
      await prisma.job.createMany({
        data: jobTypes.map((jt) => ({ sourceId: source.id, type: jt, status: "PENDING" })),
      });
      await ingestionQueue.add("extract", { sourceId: source.id, jobType: "EXTRACT" });
    }

    const authParams = getUploadAuthParams();

    return ok({ sourceId: source.id, ...authParams }, 201);
  } catch (err) {
    return serverError(err);
  }
}
