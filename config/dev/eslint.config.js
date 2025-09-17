const importPlugin = require("eslint-plugin-import");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");

module.exports = [
  {
    // Base configuration for all files
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: ["../build/tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "../build/tsconfig.json",
        },
        node: {
          paths: ["../../src"],
          extensions: [".js", ".jsx", ".ts", ".tsx"],
          moduleDirectory: ["../../node_modules", "../../src"],
        },
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      import: importPlugin,
    },
    rules: {
      // General rules
      "no-console": "off", // Allow console statements during development
      "no-debugger": process.env.NODE_ENV === "production" ? "error" : "warn",
      "no-unused-vars": "off",

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-interface": "warn",
      "@typescript-eslint/no-inferrable-types": "off",

      // React rules
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-key": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Import rules
      "import/no-unresolved": "warn", // Downgrade to warning during development
      "import/namespace": "off",
      "import/named": "warn",
      "import/default": "off",
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "object",
            "type",
          ],
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/export": "warn",
      "import/no-named-as-default-member": "off",
    },
  },

  // Config files and scripts (CommonJS)
  {
    files: [
      ".eslintrc.js",
      "*.config.js",
      "*.config.ts",
      "migrate_server.js",
      "vitest.config.js",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: null,
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "import/no-commonjs": "off",
    },
  },

  // DI container (for circular dependency)
  {
    files: ["src/server/infrastructure/di/container.ts"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "import/no-commonjs": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Service Worker
  {
    files: ["src/client/service-worker.js"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "import/no-commonjs": "off",
    },
  },

  // Client-side files
  {
    files: ["src/client/**/*.{ts,tsx}"],
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
    },
  },

  // Server-side files
  {
    files: ["src/server/**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
    },
  },

  // Database repositories
  {
    files: ["src/server/database/repositories/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
    },
  },

  // Test files
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },

  // Ignore patterns
  {
    ignores: [
      "dist/**/*",
      "**/dist/**/*",
      "src/client/dist/**/*",
      "node_modules",
      "build",
      "coverage",
      "public",
      "backup/**/*",
      "backup/unit-backup/**/*",
      "project-data/**/*",
      "**/project-data/**/*",
      "src/server/index.ts",
      "src/server/shared/helpers/authHelpers.ts",
      "src/server/shared/helpers/fileHelpers.ts",
      "*.js",
      "scripts/**/*.js",
      "restart-db-pool.js",
      "tools/**/*.js",
      "config/paths.config.js",
      "config/test.config.js",
    ],
  },
];
