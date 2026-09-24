import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// A separate build: never overwrite the developer's dist or use real credentials.
const output = await mkdtemp(join(tmpdir(), "takewing-auth-fixture-"));
Object.assign(process.env, {
  VITE_SUPABASE_URL: "https://auth.takewing.invalid",
  VITE_SUPABASE_PUBLISHABLE_KEY: "fixture-only-not-a-real-key",
  VITE_AUTH_DISCORD_ENABLED: "false",
  VITE_SITE_ORIGIN: "http://127.0.0.1:4174",
  VITE_SITE_INDEXABLE: "false",
  VITE_GA_MEASUREMENT_ID: "",
  VITE_ADS_CONVERSION_ID: "",
  TAKEWING_AUTH_TEST_DIST: output,
});
const { build } = await import("vite");
await build({ build: { outDir: output, emptyOutDir: false } });
console.log(`Isolated auth fixture build: ${output}`);
const child = spawn(process.execPath, [
  fileURLToPath(import.meta.resolve("@playwright/test/cli")),
  "test", "--config=playwright.auth.config.mjs", ...process.argv.slice(2),
], { stdio: "inherit", env: process.env });
child.on("error", error => { console.error(error); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
