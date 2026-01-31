import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules/", "root_page/", "dist/", "../root_page/", "../docs/", "./eslint.config.js", "./vitest.config.ts", "./tsconfig.json"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["./scripts/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  }
);
