
"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ensureCollection, deleteCollection } from "@/lib/vector/qdrant";

export async function createNotebook(title: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const notebook = await prisma.notebook.create({
    data: {
      userId: user.id,
      title,
    },
  });

  // Auto-create Qdrant collection for this notebook
  try {
    await ensureCollection(notebook.id);
  } catch (error) {
    // If Qdrant fails, delete the notebook to keep consistency
    await prisma.notebook.delete({ where: { id: notebook.id } });
    throw new Error(`Failed to create vector collection: ${error}`);
  }

  return notebook;
}

export async function deleteNotebook(notebookId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
    include: { sources: true },
  });

  if (!notebook) throw new Error("Notebook not found");
  if (notebook.userId !== user.id) throw new Error("Forbidden");

  // Delete Qdrant collection
  try {
    await deleteCollection(notebookId);
  } catch (error) {
    console.error(`Failed to delete Qdrant collection for notebook ${notebookId}:`, error);
    // Continue with DB deletion even if Qdrant fails
  }

  // Delete notebook (cascades to sources, chunks, jobs, chats, messages, citations)
  await prisma.notebook.delete({ where: { id: notebookId } });

  return { success: true };
}

export async function listNotebooks() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const notebooks = await prisma.notebook.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { sources: true, chats: true } },
    },
  });

  return notebooks;
}

export async function getNotebook(notebookId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) throw new Error("User not found");

  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
    include: {
      sources: {
        orderBy: { createdAt: "desc" },
      },
      chats: {
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { messages: true } },
        },
      },
    },
  });

  if (!notebook) throw new Error("Notebook not found");
  if (notebook.userId !== user.id) throw new Error("Forbidden");

  return notebook;
}