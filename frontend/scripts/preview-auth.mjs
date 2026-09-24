import { preview } from "vite";

if (!process.env.TAKEWING_AUTH_TEST_DIST) throw new Error("Use npm run test:auth");
await preview({
  build: { outDir: process.env.TAKEWING_AUTH_TEST_DIST },
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
});
