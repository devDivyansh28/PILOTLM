import { auth } from "@clerk/nextjs/server";
import { createNotebook, listNotebooks } from "@/features/notebooks/action/notebook-actions";
import { createNotebookSchema } from "@/lib/validation";
import { ok, unauthorized, bad, serverError } from "@/lib/api-utils";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const notebooks = await listNotebooks();
    return ok(notebooks);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createNotebookSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.issues[0].message);

    const notebook = await createNotebook(parsed.data.title.trim());
    return ok(notebook, 201);
  } catch (err) {
    return serverError(err);
  }
}
