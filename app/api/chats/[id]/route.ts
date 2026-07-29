import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { id } = await params;
    const { title } = await request.json();

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { notebook: true },
    });
    if (!chat) return new Response('Chat not found', { status: 404 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || chat.notebook.userId !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    const updated = await prisma.chat.update({
      where: { id },
      data: { title },
    });

    return Response.json(updated);
  } catch {
    return new Response('Internal server error', { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { id } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { notebook: true },
    });
    if (!chat) return new Response('Chat not found', { status: 404 });

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || chat.notebook.userId !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    await prisma.chat.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return new Response('Internal server error', { status: 500 });
  }
}
