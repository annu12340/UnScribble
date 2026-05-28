import js from "@eslint/js";
import globals from "globals";

const commonRules = {
  "no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
      varsIgnorePattern: "^_"
    }
  ],
  "require-await": "warn",
  eqeqeq: ["error", "always", { null: "ignore" }],
  curly: ["error", "multi-line"],
  "no-console": ["warn", { allow: ["warn", "error"] }]
};

export default [
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "package-lock.json"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: commonRules
  },
  {
    files: ["public/js/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        google: "readonly",
        gapi: "readonly",
        THREE: "readonly",
        ProteinViewer: "readonly"
      }
    },
    rules: {
      ...commonRules,
      "no-console": ["warn", { allow: ["warn", "error", "debug"] }]
    }
  },
  {
    files: ["server.js", "agents/logger.js"],
    rules: {
      "no-console": "off"
    }
  },
  {
    files: [
      "agents/features/protein-mechanism.js",
      "agents/formulary.js",
      "agents/runners/safety-review.js",
      "agents/runners/synthesis.js",
      "public/js/medication/medication-schedule.js",
      "public/js/medication/protein-viewer.js"
    ],
    rules: {
      "require-await": "off"
    }
  },
  {
    files: ["test/**/*.js", "scripts/**/*.js", "playwright.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.es2021,
        Blob: "readonly",
        DOMException: "readonly",
        ReadableStream: "readonly",
        Response: "readonly",
        TextEncoder: "readonly"
      }
    },
    rules: {
      ...commonRules,
      "no-console": "off",
      "require-await": "off"
    }
  },
  {
    files: ["test/e2e/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      ...commonRules,
      "no-console": "off",
      "require-await": "off"
    }
  }
];
