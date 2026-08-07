import "server-only";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { classifyAuthError } from "@/lib/auth/auth-error-classifier";

export async function requireUser(returnTo = "/menu") {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    const disposition = classifyAuthError(error);
    if (disposition === "retryable") {
      console.error("[auth] user verification temporarily unavailable", {
        code: error.code ?? null,
        status: error.status ?? null,
      });
      throw new Error("AUTH_VERIFICATION_UNAVAILABLE", { cause: error });
    }

    redirect(`/auth/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (!data.user) redirect(`/auth/login?next=${encodeURIComponent(returnTo)}`);
  return { supabase, user: data.user };
}
