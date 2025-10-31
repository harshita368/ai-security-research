// Flat config for ESLint v9+
import tsParser from "@typescript-eslint/parser";

export default [
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: "module", ecmaVersion: "latest" },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "warn",
    },
  },
];