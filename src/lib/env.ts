import { z } from "zod";

const rawPublicEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  })
  .refine(
    (environment) =>
      Boolean(
        environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
          environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
    { message: "A Supabase publishable key is required." },
  );

const serverEnvironmentSchema = rawPublicEnvironmentSchema.and(z.object({
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SUPABASE_DB_URL: z.string().url().optional(),
}));

export type PublicEnvironment = {
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
};
export type ServerEnvironment = PublicEnvironment & {
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_DB_URL?: string;
};

function optionalEnvironmentValue(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
}

function readableEnvironmentError(error: z.ZodError): Error {
  const missing = error.issues.map((issue) => issue.path.join(".")).join(", ");
  return new Error(`Missing or invalid environment configuration: ${missing}`);
}

export function getPublicEnvironment(): PublicEnvironment {
  const result = rawPublicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: optionalEnvironmentValue(process.env.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      optionalEnvironmentValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalEnvironmentValue(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  });

  if (!result.success) throw readableEnvironmentError(result.error);
  return {
    NEXT_PUBLIC_SITE_URL: result.data.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: result.data.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}

export function isSupabaseConfigured(): boolean {
  return rawPublicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: optionalEnvironmentValue(process.env.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      optionalEnvironmentValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalEnvironmentValue(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  }).success;
}

export function getSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    const result = z.string().url().safeParse(configured);
    if (!result.success) throw readableEnvironmentError(result.error);
    return result.data.replace(/\/$/, "");
  }

  const vercelHostname =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHostname) return `https://${vercelHostname}`;
  return process.env.NODE_ENV === "development" ? "http://localhost:3000" : null;
}

export function getServerEnvironment(): ServerEnvironment {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables cannot be read in the browser.");
  }

  const result = serverEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: optionalEnvironmentValue(process.env.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      optionalEnvironmentValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalEnvironmentValue(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    SUPABASE_SECRET_KEY: optionalEnvironmentValue(process.env.SUPABASE_SECRET_KEY),
    SUPABASE_SERVICE_ROLE_KEY: optionalEnvironmentValue(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    SUPABASE_DB_URL: optionalEnvironmentValue(process.env.SUPABASE_DB_URL),
  });

  if (!result.success) throw readableEnvironmentError(result.error);
  return {
    NEXT_PUBLIC_SITE_URL: result.data.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: result.data.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      result.data.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SECRET_KEY:
      result.data.SUPABASE_SECRET_KEY ?? result.data.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_DB_URL: result.data.SUPABASE_DB_URL,
  };
}
