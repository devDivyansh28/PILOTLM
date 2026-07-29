import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { runRAGPipeline } from '@/lib/rag/pipeline';
import { Prisma } from '@/lib/generated/prisma/client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { notebookId, query, chatId } = body;

    if (!notebookId || !query) {
      return new Response('Missing notebookId or query', { status: 400 });
    }

    // Verify user owns the notebook
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    const notebook = await prisma.notebook.findUnique({
      where: { id: notebookId },
    });

    if (!notebook || notebook.userId !== user.id) {
      return new Response('Notebook not found or access denied', { status: 403 });
    }

    // Get or create chat
    let chat;
    if (chatId) {
      chat = await prisma.chat.findUnique({ where: { id: chatId } });
      if (!chat || chat.notebookId !== notebookId) {
        return new Response('Chat not found', { status: 404 });
      }
    } else {
      chat = await prisma.chat.create({
        data: {
          notebookId,
          title: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
        },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content: query,
      },
    });

    // Run RAG pipeline
    const ragResult = await runRAGPipeline(notebookId, query);

    // Save assistant message with citations
    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: ragResult.answer,
        citations: {
          create: ragResult.citations.map((c) => ({
            sourceId: c.sourceId,
            type: c.sourceType,
            location: c.location as Prisma.InputJsonValue,
          })),
        },
      },
      include: { citations: true },
    });

    // Return response with citations
    const response = {
      chatId: chat.id,
      messageId: assistantMessage.id,
      answer: ragResult.answer,
      citations: ragResult.citations,
    };

    return Response.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}