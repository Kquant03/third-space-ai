import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    testTimeout: 10000,
  },
  resolve: {
    // Allow .js import specifiers in tests to resolve to .ts sources.
    extensions: [".ts", ".js"],
  },
});
