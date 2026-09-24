import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (!process.env.TAKEWING_AUTH_TEST_DIST) throw new Error("Use npm run test:auth");
export default defineConfig({
  testDir: "./tests",
  testMatch: "auth-fixture.spec.ts",
  outputDir: join(tmpdir(), "takewing-auth-fixture-results"),
  reporter: "list",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4174", channel: "chrome", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "node scripts/preview-auth.mjs",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
