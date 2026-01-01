import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const resolveDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(resolveDir, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Only run .test.ts files, exclude .spec.ts files (Playwright tests)
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/*.spec.ts", "**/*.spec.tsx", "node_modules", ".next", "dist"],
    coverage: {
      enabled: false,
    },
  },
});

