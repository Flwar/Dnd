import "server-only";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireUser(returnTo = "/menu") {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[auth] user verification failed", {
      code: error.code ?? null,
      status: error.status ?? null,
    });
    throw new Error("AUTH_VERIFICATION_UNAVAILABLE");
  }
  if (!data.user) redirect(`/auth/login?next=${encodeURIComponent(returnTo)}`);
  return { supabase, user: data.user };
}
