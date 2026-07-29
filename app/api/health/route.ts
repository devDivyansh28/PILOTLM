import { prisma } from "@/lib/db";
import { ok, serverError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbMs = Date.now() - dbStart;

    const checks = {
      database: dbMs < 5000 ? "ok" : "slow",
      databaseMs: dbMs,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    const status = checks.database === "ok" ? 200 : 503;
    return ok(checks, status);
  } catch (err) {
    return serverError(err, "Health check failed");
  }
}
