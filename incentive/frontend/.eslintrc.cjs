/** @type {import("eslint").Linter.Config} */
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ],
  rules: {
    "react/no-unescaped-entities": "off",
    "@next/next/no-page-custom-font": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "off", // Suppress nullish coalescing errors
    "@typescript-eslint/no-floating-promises": "off", // Suppress floating promises errors
    "@typescript-eslint/no-unused-vars": "off", // Suppress unused vars warnings
    "@typescript-eslint/consistent-type-imports": "off", // Suppress consistent type imports warnings
    "@typescript-eslint/no-misused-promises": "off", // Suppress misused promises errors
    "@typescript-eslint/no-explicit-any": "off", // Suppress explicit any errors
    "@typescript-eslint/no-unsafe-call": "off", // Suppress unsafe call errors
    "@typescript-eslint/no-unsafe-member-access": "off", // Suppress unsafe member access errors
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/require-await": "off",
  },
};
module.exports = config;
