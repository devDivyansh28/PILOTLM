import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; chatId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { id, chatId } = await params;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return new Response('User not found', { status: 404 });

    const notebook = await prisma.notebook.findUnique({ where: { id } });
    if (!notebook || notebook.userId !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId, notebookId: id } });
    if (!chat) return new Response('Chat not found', { status: 404 });

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      include: { citations: true },
    });

    return Response.json(messages);
  } catch {
    return new Response('Internal server error', { status: 500 });
  }
}
