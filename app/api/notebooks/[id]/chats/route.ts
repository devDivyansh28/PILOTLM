import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return new Response('User not found', { status: 404 });

    const notebook = await prisma.notebook.findUnique({ where: { id } });
    if (!notebook || notebook.userId !== user.id) {
      return new Response('Not found', { status: 403 });
    }

    const chats = await prisma.chat.findMany({
      where: { notebookId: id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });

    return Response.json(chats);
  } catch {
    return new Response('Internal server error', { status: 500 });
  }
}
