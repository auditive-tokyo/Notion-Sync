import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["./scripts/**/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "../coverage",
      include: ["./scripts/**/*.ts"],
      exclude: ["./scripts/**/test/**"],
    },
  },
});
