import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { buildRobotsTxt, buildSitemapXml } from "./src/seo/generate.ts";

// Emits robots.txt and sitemap.xml from the route registry so the crawl surface
// always matches the routes the app serves. Both honour VITE_SITE_INDEXABLE:
// a build that is not marked indexable ships a blanket disallow.
function seoFiles(env: Record<string, string>): Plugin {
  return {
    name: "takewing-seo-files",
    apply: "build",
    generateBundle() {
      const rawOrigin = env["VITE_SITE_ORIGIN"]?.trim() || "https://takewing.ai";
      const origin = rawOrigin.endsWith("/") ? rawOrigin.slice(0, -1) : rawOrigin;
      const indexable = env["VITE_SITE_INDEXABLE"] === "true";
      const lastmod = new Date().toISOString().slice(0, 10);

      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: buildRobotsTxt({ origin, indexable }),
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: buildSitemapXml({ origin, indexable, lastmod }),
      });
    },
  };
}

const REACT_PACKAGES = ["react", "react-dom", "react-router", "react-router-dom", "scheduler"];

// Vendor code changes far less often than application code. Giving it its own
// chunks means a normal deploy leaves the cached React and Supabase bundles
// valid, so returning visitors download less. Repeat-load speed feeds Core Web
// Vitals, which is a direct ranking input.
function vendorChunk(moduleId: string): string | undefined {
  const path = moduleId.split("\\").join("/");
  if (!path.includes("/node_modules/")) return undefined;
  const afterModules = path.slice(path.lastIndexOf("/node_modules/") + "/node_modules/".length);
  const scope = afterModules.split("/")[0] ?? "";
  if (scope === "@supabase") return "supabase";
  if (REACT_PACKAGES.includes(scope)) return "react";
  return undefined;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react(), seoFiles(env)],
    build: {
      // Smaller assets inline as data URIs; anything larger stays a cacheable
      // file with a content hash, which is better for repeat visits.
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          manualChunks: vendorChunk,
        },
      },
    },
  };
});
