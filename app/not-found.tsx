import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground">The page you are looking for does not exist</p>
      <Link href="/notebooks">
        <Button>Go to Notebooks</Button>
      </Link>
    </div>
  );
}
