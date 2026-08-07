"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";
import {
  loginSchema,
  recoverySchema,
  registerSchema,
  resetPasswordSchema,
  type LoginInput,
  type RecoveryInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@/lib/validation/auth";

export type AuthActionResult =
  | { ok: true; message?: string; requiresEmailConfirmation?: boolean }
  | { ok: false; message: string; fields?: Record<string, string> };

function validationFailure(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }): AuthActionResult {
  const fields = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors)
      .filter((entry): entry is [string, string[]] => Boolean(entry[1]?.[0]))
      .map(([key, messages]) => [key, messages[0]]),
  );
  return { ok: false, message: "יש לתקן את השדות המסומנים.", fields };
}

type AuthOperation = "sign-in" | "sign-up" | "request-password-reset" | "reset-password";

type AuthFailureShape = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
};

const SERVICE_UNAVAILABLE_MESSAGE = "שירות החשבונות אינו זמין כרגע. נסו שוב בעוד רגע.";

function authFailureShape(error: unknown): AuthFailureShape {
  if (typeof error === "string") return { message: error };
  return error && typeof error === "object" ? error as AuthFailureShape : {};
}

function safeLogMessage(value: unknown): string {
  const message = typeof value === "string" ? value : "Unknown authentication error";
  return message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:Bearer\s+)?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gi, "[redacted-token]")
    .replace(/\b(password|token|secret)\s*[=:]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 240);
}

function logAuthFailure(operation: AuthOperation, error: unknown): void {
  const failure = authFailureShape(error);
  console.error("[auth-action] request failed", {
    operation,
    code: typeof failure.code === "string" ? failure.code : null,
    status: typeof failure.status === "number" ? failure.status : null,
    message: safeLogMessage(failure.message),
  });
}

function mapAuthError(error: unknown): string {
  const failure = authFailureShape(error);
  const message = typeof failure.message === "string" ? failure.message : "";
  const normalized = message.toLowerCase();
  const code = typeof failure.code === "string" ? failure.code.toLowerCase() : "";
  const status = typeof failure.status === "number" ? failure.status : null;
  const name = typeof failure.name === "string" ? failure.name.toLowerCase() : "";

  if (normalized.includes("invalid login credentials")) return "כתובת האימייל או הסיסמה אינם נכונים.";
  if (normalized.includes("email not confirmed")) return "יש לאשר את כתובת האימייל לפני ההתחברות.";
  if (normalized.includes("already registered") || normalized.includes("already been registered")) return "כבר קיים חשבון עם כתובת האימייל הזאת.";
  if (normalized.includes("password") && normalized.includes("weak")) return "הסיסמה אינה חזקה מספיק. נסו סיסמה ארוכה ומורכבת יותר.";
  if (normalized.includes("rate limit") || normalized.includes("too many")) return "בוצעו ניסיונות רבים מדי. המתינו מעט ונסו שוב.";
  if (
    (status !== null && status >= 500 && status <= 599)
    || ["unexpected_failure", "request_timeout", "hook_timeout", "hook_timeout_after_retry"].includes(code)
    || normalized.includes("database error")
    || normalized.includes("service unavailable")
    || normalized.includes("temporarily unavailable")
  ) return SERVICE_UNAVAILABLE_MESSAGE;
  if (normalized.includes("network") || normalized.includes("fetch")) return "לא הצלחנו להגיע לשרת. בדקו את החיבור ונסו שוב.";
  if (name.includes("timeout") || name === "authretryablefetcherror") return SERVICE_UNAVAILABLE_MESSAGE;
  return "לא הצלחנו להשלים את הפעולה. אפשר לנסות שוב בעוד רגע.";
}

function configurationFailure(): AuthActionResult {
  return { ok: false, message: "שירות החשבונות עדיין לא חובר לסביבת הענן. מנהל המשחק צריך להשלים את ההגדרה." };
}

function siteConfigurationFailure(): AuthActionResult {
  return { ok: false, message: "כתובת המשחק הציבורית עדיין לא הוגדרה. מנהל המשחק צריך להשלים את הגדרת הפריסה." };
}

export async function signInAction(input: LoginInput): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  if (!isSupabaseConfigured()) return configurationFailure();
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      logAuthFailure("sign-in", error);
      return { ok: false, message: mapAuthError(error) };
    }
    return { ok: true };
  } catch (error) {
    logAuthFailure("sign-in", error);
    return { ok: false, message: mapAuthError(error) };
  }
}

export async function signUpAction(input: RegisterInput): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  if (!isSupabaseConfigured()) return configurationFailure();
  try {
    const supabase = await createServerSupabaseClient();
    const siteUrl = getSiteUrl();
    if (!siteUrl) return siteConfigurationFailure();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.displayName },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/menu`,
      },
    });
    if (error) {
      logAuthFailure("sign-up", error);
      return { ok: false, message: mapAuthError(error) };
    }
    return {
      ok: true,
      requiresEmailConfirmation: !data.session,
      message: data.session ? "החשבון נוצר בהצלחה." : "שלחנו הודעת אישור לכתובת האימייל שלך.",
    };
  } catch (error) {
    logAuthFailure("sign-up", error);
    return { ok: false, message: mapAuthError(error) };
  }
}

export async function requestPasswordResetAction(input: RecoveryInput): Promise<AuthActionResult> {
  const parsed = recoverySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  if (!isSupabaseConfigured()) return configurationFailure();
  try {
    const supabase = await createServerSupabaseClient();
    const siteUrl = getSiteUrl();
    if (!siteUrl) return siteConfigurationFailure();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset`,
    });
    if (error) {
      logAuthFailure("request-password-reset", error);
      return { ok: false, message: mapAuthError(error) };
    }
    return { ok: true, message: "אם קיים חשבון בכתובת הזאת, נשלח אליו קישור מאובטח לאיפוס הסיסמה." };
  } catch (error) {
    logAuthFailure("request-password-reset", error);
    return { ok: false, message: mapAuthError(error) };
  }
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  if (!isSupabaseConfigured()) return configurationFailure();
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      logAuthFailure("reset-password", error);
      return { ok: false, message: mapAuthError(error) };
    }
    return { ok: true, message: "הסיסמה עודכנה. אפשר לשוב למסע." };
  } catch (error) {
    logAuthFailure("reset-password", error);
    return { ok: false, message: mapAuthError(error) };
  }
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // הניווט החוצה עדיין בטוח; ענן המשחק אינו נמחק.
    }
  }
  redirect("/");
}
