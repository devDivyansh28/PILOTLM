import { auth } from "@clerk/nextjs/server";
import { deleteNotebook, getNotebook, updateNotebook } from "@/features/notebooks/action/notebook-actions";
import { createNotebookSchema } from "@/lib/validation";
import { ok, unauthorized, bad, notFound, serverError } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const { id } = await params;
    const notebook = await getNotebook(id);
    return ok(notebook);
  } catch {
    return notFound("Notebook not found");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = createNotebookSchema.partial().safeParse(body);
    if (!parsed.success) return bad(parsed.error.issues[0].message);

    const notebook = await updateNotebook(id, parsed.data);
    return ok(notebook);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const { id } = await params;
    await deleteNotebook(id);
    return ok({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
