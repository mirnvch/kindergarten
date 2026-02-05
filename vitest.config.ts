import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.tsx"],
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: [
        "src/lib/**/*.ts",
        "src/server/services/**/*.ts",
        "src/server/repositories/**/*.ts",
        "src/server/validators/**/*.ts",
        "src/hooks/**/*.ts",
      ],
      exclude: [
        "node_modules",
        ".next",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/*",
        "**/*.test.ts",
        "**/__tests__/**",
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
