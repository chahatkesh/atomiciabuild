import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/components",
              from: "./src/modules/**/*.model.ts",
              message: "Components must never import Mongoose models directly.",
            },
            {
              target: "./src/app",
              from: "./src/modules/**/*.model.ts",
              message: "App routes must never import Mongoose models directly.",
            },
            {
              target: "./src/components",
              from: "./src/modules/**/*.service.ts",
              message:
                "Components must not import services directly. Fetch via API or receive props from pages.",
            },
            {
              target: "./src/modules",
              from: "./src/components",
              message: "Domain modules must not depend on UI components.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**", "next-env.d.ts"]),
]);

export default eslintConfig;
