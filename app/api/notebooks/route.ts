import { auth } from "@clerk/nextjs/server";
import { createNotebook, listNotebooks } from "@/features/notebooks/action/notebook-actions";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const notebooks = await listNotebooks();
    return Response.json(notebooks);
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await request.json();
    const { title } = body;
    if (!title?.trim()) return new Response("Title required", { status: 400 });

    const notebook = await createNotebook(title.trim());
    return Response.json(notebook);
  } catch (error) {
    return new Response("Internal server error", { status: 500 });
  }
}