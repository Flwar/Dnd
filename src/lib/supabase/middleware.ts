import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

export async function refreshSupabaseSession(request: NextRequest) {
  const environment = getPublicEnvironment();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser verifies the access token with the Auth server and refreshes stale
  // sessions. Do not replace this with getSession in a route-protection proxy.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { response, user: error ? null : user, authError: error };
}
