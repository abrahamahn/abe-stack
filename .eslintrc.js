module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    node: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname,
  },
  settings: {
    react: {
      version: "detect",
    },
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"]
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json"
      },
      node: {
        paths: ["src"],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
        moduleDirectory: ["node_modules", "src"]
      },
      alias: {
        map: [
          ["@database", "./src/server/database"],
          ["@models", "./src/server/database/models"],
          ["@repositories", "./src/server/database/repositories"],
          ["@services", "./src/server/services"],
          ["@api", "./src/server/api"],
          ["@core", "./src/server/core"],
          ["@processors", "./src/server/processors"]
        ],
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
      }
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ],
  rules: {
    // General rules
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
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
    "import/no-unresolved": "error",
    "import/namespace": "off",
    "import/named": "error",
    "import/default": "off",
    "import/order": [
      "warn",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
          "object",
          "type"
        ],
        "pathGroups": [
          {
            "pattern": "@/**",
            "group": "internal",
            "position": "after"
          }
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],
    "import/export": "error",
    "import/no-named-as-default-member": "off"
  },
  overrides: [
    // Config files and scripts (CommonJS)
    {
      files: [".eslintrc.js", "*.config.js", "migrate_server.js"],
      env: {
        node: true
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "import/no-commonjs": "off"
      }
    },
    // Service Worker
    {
      files: ["src/client/service-worker.js"],
      env: {
        serviceworker: true,
        browser: true
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "import/no-commonjs": "off"
      }
    },
    // Client-side files
    {
      files: ["src/client/**/*.{ts,tsx}"],
      extends: [
        "plugin:react/recommended",
        "plugin:react-hooks/recommended"
      ],
      rules: {
        "react/prop-types": "off",
        "react/react-in-jsx-scope": "off"
      }
    },
    // Server-side files
    {
      files: ["src/server/**/*.ts"],
      rules: {
        "@typescript-eslint/explicit-function-return-type": ["warn", {
          allowExpressions: true,
          allowTypedFunctionExpressions: true
        }]
      }
    },
    // Database repositories
    {
      files: ["src/server/database/repositories/**/*.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unsafe-assignment": "warn",
        "@typescript-eslint/no-unsafe-member-access": "warn",
      }
    },
    // Test files
    {
      files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
      env: {
        jest: true,
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
      }
    },
  ],
  ignorePatterns: [
    "dist",
    "node_modules",
    "build",
    "coverage",
    "public"
  ]
};
