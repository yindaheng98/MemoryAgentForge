import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  globalIgnores(["dist/**", "node_modules/**", "coverage/**", "test/**"]),
  {
    files: ["src/**/*.ts"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
);
