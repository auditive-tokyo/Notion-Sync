import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ["node_modules/", "root_page/", "dist/", "../root_page/", "../docs/", "./eslint.config.js", "./vitest.config.ts", "./tsconfig.json"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["./scripts/**/*.ts"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: "./tsconfig.json",
      },
    },
  }
);
