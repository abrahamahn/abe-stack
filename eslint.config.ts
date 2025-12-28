import js from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Linter } from "eslint";
import eslintPluginImport from "eslint-plugin-import";

const tsconfigRootDir: string = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Ensure TypeScript-ESLint has an explicit root in monorepos.
  {
    files: ["**/*.{ts,tsx,cts,mts}"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir,
        project: ["./tsconfig.eslint.json"],
      },
    },
  },
  {
    files: ["apps/server/**/*.{ts,tsx,cts,mts}"],
    languageOptions: {
      parserOptions: {
        project: ["./apps/server/tsconfig.json"],
        tsconfigRootDir,
      },
    },
  },
  {
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // General rules
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  // Prevent frontend clients from importing server-side code
  {
    files: ["apps/web/**/*", "apps/desktop/**/*", "apps/mobile/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/apps/server/**",
                "@/server/**",
                "@abe-stack/server",
                "@server/*",
              ],
              message:
                "Frontend code must not import backend/server modules. Add an API layer or shared contract instead.",
            },
          ],
        },
      ],
    },
  },
  // Prevent UI from reaching into DB/infra directly; rely on contracts/API.
  {
    files: ["apps/web/**/*", "apps/desktop/**/*", "apps/mobile/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/infrastructure/**",
                "**/database/**",
                "drizzle-orm",
                "postgres",
                "pg",
                "@/server/**",
              ],
              message:
                "UI must not import database or backend internals. Use API clients or shared contracts instead.",
            },
          ],
        },
      ],
    },
  },
] satisfies Linter.Config[];
