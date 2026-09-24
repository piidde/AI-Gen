import { build } from 'vite';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function assembleDocument(template, tags, body, hydrate) {
  for (const marker of ['</head>', '<div id="root"></div>']) {
    if (template.split(marker).length !== 2) throw new Error(`Invalid HTML template marker: ${marker}`);
  }
  return template.replace('</head>', () => `${tags}\n</head>`)
    .replace('<div id="root"></div>', () => `<div id="root"${hydrate ? ' data-prerendered="true"' : ''}>${body}</div>`);
}

// Called only after a successful client build. The render bundle never ships.
export async function prerenderSite(outDir, mode) {
  const temporary = await mkdtemp(join(tmpdir(), 'takewing-render-'));
  try {
    await build({ configFile: false, mode, plugins: [], ssr: { noExternal: true },
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      build: { ssr: resolve('src/entry-public.tsx'), outDir: temporary, emptyOutDir: false,
        rollupOptions: { output: { entryFileNames: 'render.mjs' } } },
    });
    const { render, publicRoutes, routeHead, structuredData } = await import(pathToFileURL(join(temporary, 'render.mjs')).href);
    const template = await readFile(join(outDir, 'index.html'), 'utf8');
    const clean = template.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<meta\s+name="(?:robots|description)"[\s\S]*?\/>/g, '');
    const documents = [];
    const paths = new Set();
    for (const route of [...publicRoutes, { path: '/404' }, { path: '/__spa' }]) {
      if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(route.path) && route.path !== '/__spa') throw new Error(`Unsafe route: ${route.path}`);
      if (paths.has(route.path)) throw new Error(`Duplicate route: ${route.path}`);
      paths.add(route.path);
      const shell = route.path === '/__spa';
      const head = routeHead(shell ? '/login' : route.path);
      const json = structuredData(route.path);
      const tags = `<title>${escape(head.title)}</title>\n<link rel="canonical" href="${escape(head.canonical)}">\n` +
        Object.entries(head.names).map(([key,value]) => `<meta name="${key}" content="${escape(value)}">`).join('\n') + '\n' +
        Object.entries(head.properties).map(([key,value]) => `<meta property="${key}" content="${escape(value)}">`).join('\n') +
        (json ? `\n<script id="structured-data" type="application/ld+json">${json}</script>` : '');
      const body = shell ? '' : await render(route.path);
      if (!shell && (body.match(/<h1(?: |>)/g)?.length !== 1)) throw new Error(`Expected one heading: ${route.path}`);
      const html = assembleDocument(clean, tags, body, !shell && route.path !== '/404');
      if (!shell && html.match(/<h1(?: |>)/g)?.length !== 1) throw new Error(`Missing final content: ${route.path}`);
      if (!html.includes(`<title>${escape(head.title)}</title>`) || !html.includes('rel="canonical"') || !html.includes('name="robots"')) throw new Error(`Missing final metadata: ${route.path}`);
      const file = shell ? 'spa.html' : route.path === '/404' ? '404.html' : route.path === '/' ? 'index.html' : `${route.path.slice(1)}/index.html`;
      documents.push({ file, html });
    }
    // SSR asset URLs must reference the client assets, never render-bundle paths.
    const assets = new Set(await readdir(join(outDir, 'assets')));
    for (const { file, html } of documents) {
      for (const match of html.matchAll(/(?:src|href)="\/assets\/([^"?#]+)"/g)) {
        if (!assets.has(match[1])) throw new Error(`Missing client asset ${match[1]} in ${file}`);
      }
    }
    for (const { file, html } of documents) {
      await mkdir(resolve(outDir, file, '..'), { recursive: true });
      await writeFile(join(outDir, file), html);
    }
    console.log(`Prerendered ${publicRoutes.length} public pages plus private shell and 404.`);
  } finally {
    // Only our own freshly-created temporary directory is removed.
    await rm(temporary, { recursive: true, force: true });
  }
}
