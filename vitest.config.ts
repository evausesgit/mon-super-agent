import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@mon-super-agent/agent-runtime": fileURLToPath(
        new URL("./services/agent-runtime/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["apps/*/src/**/*.test.ts", "services/*/src/**/*.test.ts"],
    environment: "node",
  },
});
