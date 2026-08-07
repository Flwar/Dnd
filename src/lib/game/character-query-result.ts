type QueryResult = { error: unknown };
type ErrorLogger = (message: string, details: { query: string; code: string | null }) => void;

export function assertCharacterQuerySucceeded(
  result: QueryResult,
  query: string,
  logError: ErrorLogger = console.error,
): void {
  if (!result.error) return;

  const code = typeof result.error === "object" && result.error && "code" in result.error
    ? String(result.error.code)
    : null;
  logError("[game] character load query failed", { query, code });
  throw new Error("CHARACTER_LOAD_UNAVAILABLE", { cause: result.error });
}
