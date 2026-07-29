import { listNotebooks } from "@/features/notebooks/action/notebook-actions";
import { NotebookList } from "@/features/notebooks/components/NotebookList";

export default async function NotebooksPage() {
  const notebooks = await listNotebooks();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Notebooks</h1>
      </div>
      <NotebookList notebooks={notebooks} />
    </div>
  );
}