import { test, expect } from '@playwright/test';
import { publicRoutes } from '../src/seo/routes';

test('public documents contain content and metadata before JavaScript', async ({ request }) => {
  for (const route of publicRoutes) {
    const html = await (await request.get(route.path)).text();
    expect(html, route.path).toMatch(/<h1[ >]/);
    expect(html.match(/<h1[ >]/g), route.path).toHaveLength(1);
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).toContain('data-prerendered="true"');
  }
});

test('direct query routes hydrate without errors and retain URL state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const path of [...publicRoutes.map(route => route.path), '/models?capability=Text&currency=EUR&q=gpt', '/status?statusPreview=incident']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    if (path.startsWith('/models?')) await expect(page.getByRole('searchbox')).toHaveValue('gpt');
    if (path.startsWith('/status?')) await expect(page.getByLabel('Demo status scenario')).toHaveValue('incident');
  }
  expect(errors).toEqual([]);
});
