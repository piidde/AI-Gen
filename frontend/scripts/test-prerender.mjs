import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, preview } from 'vite';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const indexable of [false, true]) {
    const output = await mkdtemp(join(tmpdir(), 'takewing-public-check-'));
    const origin = 'http://127.0.0.1:4176';
    Object.assign(process.env, { VITE_SITE_ORIGIN: origin, VITE_SITE_INDEXABLE: String(indexable),
      VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '', VITE_GA_MEASUREMENT_ID: '', VITE_ADS_CONVERSION_ID: '' });
    await build({ build: { outDir: output, emptyOutDir: false } });
    const server = await preview({ build: { outDir: output }, preview: { host: '127.0.0.1', port: 4176, strictPort: true } });
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const rules = (await readFile(join(output, '_redirects'), 'utf8')).split('\n').filter(line => line && !line.startsWith('#'));
      const publicPaths = rules.filter(line => !line.includes('/spa.html')).map(line => line.trim().split(/\s+/)[0]);
      const page = await context.newPage();
      const titles = new Set();
      for (const path of publicPaths) {
        const response = await page.goto(origin + path + '?q=private-query');
        assert.equal(response.status(), 200, path);
        assert.equal(await page.locator('h1').count(), 1, path);
        const title = await page.title();
        assert.ok(title && !titles.has(title), path); titles.add(title);
        assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), origin + path);
        const expected = indexable && !path.startsWith('/updates') ? 'index, follow' : 'noindex, nofollow';
        assert.ok((await page.locator('meta[name=robots]').getAttribute('content')).startsWith(expected), path);
        assert.equal(await page.locator('#structured-data').count(), indexable && !path.startsWith('/updates') ? 1 : 0, path);
        if (indexable && !path.startsWith('/updates')) JSON.parse(await page.locator('#structured-data').textContent());
        assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), title);
        assert.ok(await page.locator('meta[name=description]').getAttribute('content'));
        for (const asset of await page.locator('[src],link[rel=stylesheet]').evaluateAll(nodes => nodes.map(node => node.getAttribute('src') ?? node.getAttribute('href')).filter(url => url?.startsWith('/')))) {
          assert.equal((await context.request.get(origin + asset)).status(), 200, asset);
        }
      }
      for (const path of ['/login', '/signup', '/auth/callback?code=private-token', '/dashboard/billing']) {
        const response = await context.request.get(origin + path);
        assert.equal(response.status(), 200);
        const html = await response.text();
        assert.ok(html.includes('noindex, nofollow'));
        assert.ok(!html.includes('data-prerendered') && !html.includes('private-token'));
        assert.ok(!html.includes('Recent requests'));
      }
      for (const path of ['/missing', '/models/no-such-model', '/blog/editorial-format-preview']) {
        const response = await context.request.get(origin + path);
        assert.equal(response.status(), 404);
        assert.ok((await response.text()).includes('noindex, nofollow'));
      }
      const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
      assert.equal((sitemap.match(/<loc>/g) ?? []).length, indexable ? publicPaths.filter(p => !p.startsWith('/updates')).length : 0);
      assert.ok(!(await readdir(output)).some(file => file.startsWith('render')));
      const hydrated = await browser.newContext({ timezoneId: 'America/Los_Angeles', viewport: { width: 390, height: 844 } });
      try {
        const live = await hydrated.newPage();
        const errors = [];
        live.on('pageerror', error => errors.push(error.message));
        live.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        for (const path of publicPaths) {
          await live.goto(origin + path);
          await live.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.equal(await live.locator('h1').count(), 1, path);
        }
        assert.deepEqual(errors, []);
      } finally { await hydrated.close(); }
      console.log(`PASS ${indexable ? 'indexable test-only' : 'closed preview'}: ${publicPaths.length} no-JS pages, private shells, 404s, metadata, sitemap, assets.`);
    } finally {
      await context.close();
      await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
    }
  }
} finally { await browser.close(); }
