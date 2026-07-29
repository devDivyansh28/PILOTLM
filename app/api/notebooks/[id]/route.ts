import { auth } from "@clerk/nextjs/server";
import { deleteNotebook, getNotebook } from "@/features/notebooks/action/notebook-actions";
import { ok, unauthorized, notFound, serverError } from "@/lib/api-utils";

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
