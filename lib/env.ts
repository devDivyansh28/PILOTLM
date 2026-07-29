const REQUIRED_VARS = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "QDRANT_URL",
  "QDRANT_API_KEY",
  "NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_URL_ENDPOINT",
  "REDIS_URL",
  "OPENAI_API_KEY",
] as const;

export function validateEnv() {
  const missing: string[] = [];
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) missing.push(key);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}`
    );
  }
}

export function getEnvVar(key: string, fallback?: string): string {
  const val = process.env[key] || fallback;
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}
