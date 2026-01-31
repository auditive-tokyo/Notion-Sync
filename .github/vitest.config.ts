import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [".github/scripts/**/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: [".github/scripts/**/*.ts"],
      exclude: [".github/scripts/**/test/**"],
    },
  },
});
