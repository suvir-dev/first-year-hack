// vite.config.ts: Vite + Vitest settings.
// The Higher or Lower game's own tests use Node's built-in test runner
// (npm run test:higher-lower), so Vitest must not try to run them.
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/higher-lower/**"],
  },
});
