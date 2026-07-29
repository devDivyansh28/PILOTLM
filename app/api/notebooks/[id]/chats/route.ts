import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { ok, unauthorized, bad, serverError } from '@/lib/api-utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return bad('User not found', 404);

    const notebook = await prisma.notebook.findUnique({ where: { id } });
    if (!notebook || notebook.userId !== user.id) return bad('Not found', 403);

    const chats = await prisma.chat.findMany({
      where: { notebookId: id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });

    return ok(chats);
  } catch (err) {
    return serverError(err);
  }
}
