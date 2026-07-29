import { Skeleton } from "@/components/ui/skeleton";

export default function NotebookDetailLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      <div className="w-80 border-r p-4 space-y-3">
        <Skeleton className="h-8 w-24" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <div className="w-56 border-r p-4">
        <Skeleton className="h-6 w-16 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full mb-2" />
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    </div>
  );
}
