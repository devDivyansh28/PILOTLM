import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { runRetrieval, formatContextForGeneration, extractCitationsFromAnswer } from '@/lib/rag/pipeline';
import { createLLM } from '@/lib/providers/llm';
import { formatPrompt, getRAGStepPrompt } from '@/lib/rag/prompts';
import { Prisma } from '@/lib/generated/prisma/client';
import { chatRequestSchema } from '@/lib/validation';
import { bad, unauthorized, serverError } from '@/lib/api-utils';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorized();

    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.issues[0].message);

    const { notebookId, query, chatId } = parsed.data;

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return bad('User not found', 404);

    const notebook = await prisma.notebook.findUnique({ where: { id: notebookId } });
    if (!notebook || notebook.userId !== user.id) return bad('Notebook not found or access denied', 403);

    let chat;
    if (chatId) {
      chat = await prisma.chat.findUnique({ where: { id: chatId } });
      if (!chat || chat.notebookId !== notebookId) return bad('Chat not found', 404);
    } else {
      chat = await prisma.chat.create({
        data: {
          notebookId,
          title: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
        },
      });
    }

    await prisma.message.create({
      data: { chatId: chat.id, role: 'user', content: query },
    });

    const { reranked } = await runRetrieval(notebookId, query);
    const contextStr = formatContextForGeneration(reranked);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llm = createLLM();
          const prompt = formatPrompt(getRAGStepPrompt("generation"), {
            context: contextStr,
            query,
          });

          let fullAnswer = '';
          const stream_ = await llm.stream(prompt);

          for await (const chunk of stream_) {
            const content = typeof chunk.content === 'string' ? chunk.content : '';
            if (content) {
              fullAnswer += content;
              const event = `data: ${JSON.stringify({ type: 'token', content })}\n\n`;
              controller.enqueue(encoder.encode(event));
            }
          }

          const citations = extractCitationsFromAnswer(fullAnswer, reranked);

          const assistantMessage = await prisma.message.create({
            data: {
              chatId: chat.id,
              role: 'assistant',
              content: fullAnswer,
              citations: {
                create: citations.map((c) => ({
                  sourceId: c.sourceId,
                  type: c.sourceType,
                  location: c.location as Prisma.InputJsonValue,
                })),
              },
            },
            include: { citations: true },
          });

          const doneEvent = `data: ${JSON.stringify({
            type: 'done',
            chatId: chat.id,
            messageId: assistantMessage.id,
            citations: citations.map((c) => ({
              sourceId: c.sourceId,
              type: c.sourceType,
              location: c.location,
              text: c.text,
            })),
          })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));
        } catch (err) {
          console.error("Stream generation error:", err);
          const errorEvent = `data: ${JSON.stringify({ type: 'error', message: 'Failed to generate answer' })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return serverError(error);
  }
}
