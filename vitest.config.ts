import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "app/**/*.test.ts",
      "app/**/*.test.tsx",
      "components/**/*.test.ts",
      "components/**/*.test.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tools/**/*.test.ts",
      "tools/**/*.test.tsx",
    ],
    passWithNoTests: true,
    setupFiles: ["./vitest.setup.ts"],
  },
})
