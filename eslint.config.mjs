import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".vitest-attachments/**",
    ".vercel/**",
    ".open-next/**",
    ".wrangler/**",
    "supabase/.branches/**",
    "supabase/.temp/**",
    "public/assets/rebuild/**",
    "next-env.d.ts",
    "cloudflare-env.d.ts",
  ]),
]);

export default eslintConfig;
