import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicEnvironment, getServerEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const environment = getPublicEnvironment();

  return createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. The proxy refresh helper
            // performs the write before protected content is rendered.
          }
        },
      },
    },
  );
}

export function createServiceRoleSupabaseClient() {
  const environment = getServerEnvironment();
  if (!environment.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this server operation.");
  }

  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
