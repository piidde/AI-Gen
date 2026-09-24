import { test, expect } from '@playwright/test';
import { catalogue } from '../src/content/catalogue';
import { formatAmount } from '../src/lib/pricing';
import { sellingPrice } from '../src/content/publishedPrices';
import { findRouteMeta } from '../src/seo/routes';
import { overviewSummary } from '../src/data/overviewDemo';
import { homeDashboardRequests } from '../src/data/homeDashboardDemo';

test('homepage uses shared image and text reference prices with honest purchase guidance', async ({ page }, testInfo) => {
  await page.goto('/');
  const cards = page.locator('.home-models .model-card');
  await expect(cards).toHaveCount(4);
  for (const [id, name] of [['gpt-image-2.5', 'GPT Image 2.5'], ['nano-banana-pro', 'Nano Banana Pro'], ['gpt-6-astra', 'GPT-6 Astra'], ['gemini-3.8-flash', 'Gemini 3.8 Flash']]) {
    const model = catalogue.find(model => model.upstreamId === id)!;
    const card = cards.filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(card).toContainText(`$${formatAmount(sellingPrice(model.rates[0].credits!), model.modality === 'image' && id === 'gpt-image-2.5' ? 3 : 2).decimal}`);
    await expect(card).not.toContainText(/Cache read|Availability not verified|Public API ID|Comparison unavailable|Reference ID|Official API example|Pricing details|Official pricing/);
    await expect(card.locator('s.discounted')).toHaveCount(model.modality === 'text' ? 2 : 1);
    await expect(card.getByRole('link', { name: /Model details/ })).toHaveAttribute('href', /^\/models[/?]/);
    if (model.modality === 'text') {
      await expect(card).toContainText('Official API');
      await expect(card.locator('.landing-official .discounted')).toHaveCount(2);
      await expect(card.locator('.landing-saving')).toHaveText(id === 'gpt-6-astra'
        ? ['Save up to 92%', 'Save up to 92%'] : ['Save up to 85%', 'Save up to 83%']);
    } else {
      await expect(card).toContainText('/ request');
      if (id === 'gpt-image-2.5') await expect(card.locator('.landing-saving')).toHaveText('Save up to 89%');
      else await expect(card.locator('.landing-saving')).toHaveText('Save up to 93%');
      await expect(card.locator('.landing-official')).toContainText(id === 'gpt-image-2.5' ? '$0.053' : '$0.24');
      await expect(card.locator('.price-reference-basis')).toContainText(id === 'gpt-image-2.5' ? '1K · Auto quality; official High reference' : '4K image output');
      await expect(card.locator('.landing-official')).not.toContainText(/depends|Varies/);
    }
  }
  await expect(page.getByRole('link', { name: 'Get started', exact: true }).first()).toHaveAttribute('href', '/signup');
  await expect(page.getByText('Credits never expire.', { exact: true })).toBeVisible();
  const faq = page.locator('details').filter({ hasText: 'Are failed requests always refunded?' });
  await faq.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(faq).toHaveAttribute('open', '');
  await expect(faq).toContainText('no upstream cost');
  await expect(page.locator('.home')).not.toContainText('Accounts, payments and API access are not connected');
  const destinations = await page.locator('.home a[href^="/"]').evaluateAll(links => links.map(link => new URL((link as HTMLAnchorElement).href).pathname));
  for (const destination of new Set(destinations)) expect(findRouteMeta(destination), destination).toBeDefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('homepage-content.png'), fullPage: true });
});

test('homepage illustrations respect reduced motion and guide links work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.model-featured')).toContainText('GPT Image 2.5');
  await expect(page.locator('.home-flow')).not.toContainText('API access coming soon');
  expect(await page.locator('.home').evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
  await page.locator('.home-guide').first().click();
  await expect(page).toHaveURL(/\/blog\/understanding-image-model-rates$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('image');
});

test('dashboard excerpt uses the actual request table and consistent chart totals', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.home-dashboard-preview');
  const now = new Date();
  const summary = overviewSummary(homeDashboardRequests(now), '7d', now);
  await expect(preview.locator('.home-request-trail')).toHaveCount(0);
  await expect(preview.getByRole('heading', { name: 'Recent requests' })).toBeVisible();
  await expect(preview.locator('tbody tr')).toHaveCount(2);
  await expect(preview.getByRole('tabpanel')).toContainText(String(summary.totals.requests));
  await expect(preview.locator('.axis')).toHaveText('3020100');
  await expect(preview.locator('svg desc')).toContainText(': 28');
  await preview.getByRole('tab', { name: 'Credits used', exact: true }).click();
  await expect(preview.getByRole('tabpanel')).toContainText(summary.totals.credits);
  expect(await preview.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
});

test('featured image dots animate while reduced motion keeps a still frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const dots = page.locator('.model-featured canvas');
  await dots.scrollIntoViewIfNeeded();
  await expect.poll(() => dots.evaluate((element: HTMLCanvasElement) => element.width)).toBeGreaterThan(300);
  const still = await dots.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  await page.waitForTimeout(250);
  expect(await dots.evaluate((element: HTMLCanvasElement) => element.toDataURL())).toBe(still);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => dots.evaluate((element: HTMLCanvasElement) => element.toDataURL())).not.toBe(still);
  await expect(page.locator('.model-featured')).not.toContainText(/Thinking|Generating|23 %/);
});

test('dot canvas matches displayed dimensions at high density and after resize', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/');
    const canvas = page.locator('.model-featured canvas');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => {
        const rect = element.getBoundingClientRect();
        return element.width === Math.round(rect.width * devicePixelRatio) && element.height === Math.round(rect.height * devicePixelRatio);
      })).toBe(true);
    }
  } finally { await context.close(); }
});
