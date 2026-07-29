import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-6 w-16" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
    </div>
  );
}
