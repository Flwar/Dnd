import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.RUN_HOSTED_MIGRATIONS !== "1") {
  console.log("Hosted migration skipped. Set RUN_HOSTED_MIGRATIONS=1 to enable it.");
  process.exit(0);
}

const databaseUrl = [
  process.env.SUPABASE_DB_URL,
  process.env.POSTGRES_URL_NON_POOLING,
].find((value) => value?.trim());

if (!databaseUrl) {
  console.error(
    "Hosted migration requires SUPABASE_DB_URL or POSTGRES_URL_NON_POOLING.",
  );
  process.exit(1);
}

let parsedDatabaseUrl;
try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch {
  parsedDatabaseUrl = null;
}

if (
  !parsedDatabaseUrl ||
  !["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol) ||
  !parsedDatabaseUrl.hostname
) {
  console.error("Hosted migration received an invalid PostgreSQL connection URL.");
  process.exit(1);
}

function redactSecrets(value) {
  return value
    .replaceAll(databaseUrl, "[redacted database URL]")
    .replace(
      /(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi,
      "$1[redacted]@",
    );
}

const cliPath = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);
const allowedEnvironmentNames = [
  "APPDATA",
  "CI",
  "HOME",
  "LOCALAPPDATA",
  "NO_COLOR",
  "PATH",
  "Path",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
];
const childEnvironment = Object.fromEntries(
  allowedEnvironmentNames.flatMap((name) =>
    process.env[name] ? [[name, process.env[name]]] : [],
  ),
);
childEnvironment.CI = "1";
childEnvironment.NO_COLOR = "1";

function runSupabase(arguments_, phase) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...arguments_], {
      env: childEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let standardOutput = "";
    let standardError = "";

    child.stdout.on("data", (chunk) => {
      standardOutput += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      standardError += chunk.toString();
    });
    child.on("error", (error) => {
      reject(
        new Error(
          `${phase} could not start the pinned Supabase CLI: ${redactSecrets(error.message)}`,
        ),
      );
    });
    child.on("close", (code) => {
      if (standardOutput) process.stdout.write(redactSecrets(standardOutput));
      if (standardError) process.stderr.write(redactSecrets(standardError));
      if (code === 0) resolve();
      else reject(new Error(`${phase} failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

const baseArguments = [
  "db",
  "push",
  "--db-url",
  databaseUrl,
  "--yes",
  "--log-level",
  "error",
];

try {
  await runSupabase([...baseArguments, "--dry-run"], "Hosted migration preflight");
  await runSupabase(baseArguments, "Hosted migration apply");
  await runSupabase(
    [...baseArguments, "--dry-run"],
    "Hosted migration verification",
  );
  console.log("Hosted Supabase migrations completed.");
} catch (error) {
  console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
}
