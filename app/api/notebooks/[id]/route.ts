import { auth } from "@clerk/nextjs/server";
import { deleteNotebook, getNotebook } from "@/features/notebooks/action/notebook-actions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const { id } = await params;
    const notebook = await getNotebook(id);
    return Response.json(notebook);
  } catch (error) {
    return new Response("Not found", { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const { id } = await params;
    await deleteNotebook(id);
    return Response.json({ success: true });
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}