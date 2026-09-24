import { defineConfig, loadEnv, type Plugin } from "vite";
import { prerenderSite } from "./scripts/prerender.mjs";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { publicRoutes, spaPaths } from "./src/seo/routes.ts";
import react from "@vitejs/plugin-react";
import { buildRedirects, buildRobotsTxt, buildSitemapXml } from "./src/seo/generate.ts";

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
      this.emitFile({
        type: "asset",
        fileName: "_redirects",
        source: buildRedirects(),
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

export default defineConfig(({ mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  let outputDirectory = "";
  let building = false;

  return {
    appType: isPreview ? 'mpa' : 'spa',
    plugins: [react(), seoFiles(env), {
      name: 'takewing-public-prerender',
      configResolved(config) { outputDirectory = resolve(config.root, config.build.outDir); building = config.command === 'build'; },
      async closeBundle() { if (building) await prerenderSite(outputDirectory, mode); },
      configurePreviewServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const url = new URL(request.url ?? '/', 'http://localhost');
          const path = url.pathname.replace(/\/$/, '') || '/';
          const page = publicRoutes.find(route => route.path === path);
          if (page) request.url = (path === '/' ? '/index.html' : `${path}/index.html`) + url.search;
          else if (spaPaths.includes(path) || path === '/dashboard' || path.startsWith('/dashboard/')) request.url = '/spa.html' + url.search;
          else if (!path.startsWith('/assets/') && !['/index.html','/spa.html','/404.html','/favicon.svg','/og-image.png','/site.webmanifest','/robots.txt','/sitemap.xml','/_redirects','/_headers'].includes(path)) {
            response.statusCode = 404;
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            try { response.end(await readFile(resolve(outputDirectory, '404.html'))); }
            catch (error) { next(error); }
            return;
          }
          next();
        });
      },
    } as Plugin],
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
