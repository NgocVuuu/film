import { defineConfig } from "eslint/config";
import nextConfig from "eslint-config-next/core-web-vitals.js";

export default defineConfig([
  nextConfig,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
]);
