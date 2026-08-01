"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createBrowserSupabaseClient() {
  if (browserClient) return browserClient;

  const environment = getPublicEnvironment();
  browserClient = createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return browserClient;
}
