import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "app/**/*.test.{ts,tsx}",
      "components/**/*.test.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
      "tools/**/*.test.{ts,tsx}",
    ],
    passWithNoTests: true,
    setupFiles: ["./vitest.setup.ts"],
  },
})
