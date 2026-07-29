import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { updateChatSchema } from '@/lib/validation';
import { ok, bad, unauthorized, notFound, serverError } from '@/lib/api-utils';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const parsed = updateChatSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.issues[0].message);

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { notebook: true },
    });
    if (!chat) return notFound('Chat not found');

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || chat.notebook.userId !== user.id) return bad('Forbidden', 403);

    const updated = await prisma.chat.update({
      where: { id },
      data: parsed.data,
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const { id } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: { notebook: true },
    });
    if (!chat) return notFound('Chat not found');

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || chat.notebook.userId !== user.id) return bad('Forbidden', 403);

    await prisma.chat.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(err);
  }
}
