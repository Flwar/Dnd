export type AuthErrorDisposition = "retryable" | "invalid-session";

type AuthErrorShape = {
  name?: unknown;
  status?: unknown;
};

/**
 * Classifies an authentication failure without depending on Supabase runtime
 * classes. This keeps expired or malformed sessions separate from temporary
 * transport and service failures.
 */
export function classifyAuthError(error: unknown): AuthErrorDisposition {
  if (!error || typeof error !== "object") return "invalid-session";

  const { name, status } = error as AuthErrorShape;
  if (name === "AuthRetryableFetchError") return "retryable";
  if (typeof status === "number" && (status === 429 || (status >= 500 && status <= 599))) {
    return "retryable";
  }

  return "invalid-session";
}
