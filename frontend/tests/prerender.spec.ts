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
  await page.route('**/v1/status', route => route.fulfill({ json: { checked_at: new Date().toISOString(), updated_at: null, incidents: [] } }));
  for (const path of [...publicRoutes.map(route => route.path), '/models?capability=Text&currency=EUR&q=gpt']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    if (path.startsWith('/models?')) await expect(page.getByRole('searchbox')).toHaveValue('gpt');
  }
  expect(errors).toEqual([]);
});
