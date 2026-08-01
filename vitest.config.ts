import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Vite 8 transforms TypeScript with OXC. Next.js intentionally keeps JSX
  // as `preserve`, so tests must select the automatic React runtime here
  // before Vite's import-analysis phase sees TSX.
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "react",
    },
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.{test,spec}.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/game/**/*.ts", "src/lib/validation/**/*.ts"],
    },
  },
});
