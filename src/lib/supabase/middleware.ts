import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicEnvironment } from "@/lib/env";
import { createTimedFetch } from "@/lib/network/timed-fetch";
import type { Database } from "@/types/database";

// This is only the request gate. Protected pages perform authoritative user
// verification themselves, so the proxy should fail open promptly when Auth
// is temporarily slow instead of holding every route transition hostage.
const supabaseMiddlewareFetch = createTimedFetch(2_000);

export async function refreshSupabaseSession(request: NextRequest) {
  const environment = getPublicEnvironment();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { fetch: supabaseMiddlewareFetch },
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

  // getClaims validates asymmetric JWTs locally after the JWKS is cached and
  // still falls back to the Auth server for legacy symmetric tokens. The
  // protected Server Components verify ownership again with getUser().
  const { data, error } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  return { response, user: error ? null : user, authError: error };
}
