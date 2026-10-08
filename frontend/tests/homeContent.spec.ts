import { test, expect } from '@playwright/test';
import { deals, maxDealPercent, multiply, subtract, usd, usdTotal } from '../src/content/homeDeals';
import { findRouteMeta } from '../src/seo/routes';
import { homeDashboardPreview } from '../src/data/homeDashboardDemo';
import { usd as amountLabel } from '../src/lib/usage';

test('homepage deal cards use shared catalogue prices and honest comparisons', async ({ page }, testInfo) => {
  await page.goto('/');
  const cards = page.locator('.deal-card');
  await expect(cards).toHaveCount(4);
  const expected: Record<string, { percent: string; official: string }> = {
    'nano-banana-pro': { percent: '87', official: '$0.134' },
    'gpt-6-astra': { percent: '92', official: '$10.00' },
    'gpt-image-2.5': { percent: '89', official: '$0.053' },
    'gemini-3.8-flash': { percent: '85', official: '$0.75' },
  };
  for (const deal of deals) {
    const card = cards.filter({ has: page.getByRole('heading', { name: deal.name, exact: true }) });
    const main = deal.rates[0]!;
    const saving = deal.modality === 'text' ? deal.rates.find(rate => rate.label === 'Output')! : main;
    expect(main.percent).toBe(expected[deal.id]!.percent);
    await expect(card.locator('.deal-card-price strong')).toHaveText(usd(main.ours).replace('≈ ', '≈'));
    await expect(card.locator('.deal-card-price .deal-strike')).toContainText(expected[deal.id]!.official);
    await expect(card.locator('.deal-card-saving')).toContainText(`Save up to ${saving.percent}%`);
    await expect(card.locator('.deal-card-saving')).toContainText(usd(subtract(saving.official, saving.ours), 'saving'));
    if (deal.modality === 'text') await expect(card.locator('.deal-card-saving')).toContainText('per 1M output tokens');
    await expect(card.getByRole('link', { name: /Model details/ })).toHaveAttribute('href', /^\/models[/?]/);
    if (deal.modality === 'text') await expect(card.locator('.deal-strike')).toHaveCount(2);
  }
  await expect(page.locator('.deal-ticker span')).toHaveText(deals.map(deal => `−${(deal.modality === 'text' ? deal.rates.find(rate => rate.label === 'Output')! : deal.rates[0]!).percent}% ${deal.name}`));
  await expect(page.getByRole('link', { name: 'Get started', exact: true }).first()).toHaveAttribute('href', '/signup');
  await expect(page.locator('.home-steps')).toContainText('Credits never expire.');
  const faq = page.locator('details').filter({ hasText: 'Are failed requests always refunded?' });
  await faq.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(faq).toHaveAttribute('open', '');
  await expect(faq).toContainText('no upstream cost');
  await expect(page.locator('.home')).not.toContainText(/hottest|today only|limited time/i);
  const destinations = await page.locator('.home a[href^="/"]').evaluateAll(links => links.map(link => new URL((link as HTMLAnchorElement).href).pathname));
  for (const destination of new Set(destinations)) expect(findRouteMeta(destination), destination).toBeDefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('homepage-content.png'), fullPage: true });
});

test('hero headline stays on two lines', async ({ page }) => {
  await page.goto('/');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(`Official AI.Up to ${maxDealPercent}% off.`);
  await page.evaluate(() => document.fonts.ready);
  const lines = await heading.evaluate(element => element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight));
  expect(lines).toBeLessThan(2.5);
});

test('savings calculator compares official and AIAPI.deals bills', async ({ page }) => {
  await page.goto('/');
  const calculator = page.locator('.deal-calculator');
  const result = calculator.locator('.deal-calculator-result');
  const check = async (dealIndex: number, quantity: number) => {
    const deal = deals[dealIndex]!;
    const rate = deal.modality === 'text' ? deal.rates.find(rate => rate.label === 'Output')! : deal.rates[0]!;
    const official = multiply(rate.official, quantity);
    const ours = multiply(rate.ours, quantity);
    await expect(result).toContainText(usdTotal(official));
    await expect(result).toContainText(usdTotal(ours));
    await expect(result.locator('.deal-calculator-saved')).toHaveText(usdTotal(subtract(official, ours)));
    await expect(result).toContainText(`up to ${rate.percent}% less`);
  };
  await expect(calculator.getByRole('button', { name: deals[0]!.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await check(0, 10000);
  const height = await calculator.evaluate(element => element.getBoundingClientRect().height);
  const textIndex = deals.findIndex(deal => deal.modality === 'text');
  await calculator.getByRole('button', { name: deals[textIndex]!.name, exact: true }).click();
  await expect(calculator.getByRole('button', { name: '100M', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // Switching between image and text keeps the volume row, and the card height, stable.
  expect(await calculator.evaluate(element => element.getBoundingClientRect().height)).toBe(height);
  await check(textIndex, 100);
  await calculator.getByRole('button', { name: '1B', exact: true }).click();
  await check(textIndex, 1000);
  await expect(calculator).toContainText('Output tokens only; input is billed separately.');
  await expect(calculator.getByRole('group', { name: 'Output tokens per month' })).toBeVisible();
  await expect(result).toContainText('1B output tokens');
  for (const [index, deal] of deals.entries()) {
    await calculator.getByRole('button', { name: deal.name, exact: true }).click();
    await check(index, deal.modality === 'image' ? 100000 : 1000);
  }
  await expect(calculator).toContainText('Standard · includes thinking');
});

test('homepage has no running animations with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.locator('.home').evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
});

test('dashboard excerpt uses the actual request table and consistent chart totals', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('.home-dashboard-preview');
  const now = new Date();
  const summary = homeDashboardPreview(now);
  await expect(preview.locator('.home-request-trail')).toHaveCount(0);
  await expect(preview.getByRole('heading', { name: 'Recent requests' })).toBeVisible();
  await expect(preview.locator('tbody tr')).toHaveCount(2);
  await expect(preview.getByRole('tabpanel')).toContainText(String(summary.totals.requests));
  await expect(preview.locator('.axis')).toHaveText('3020100');
  await expect(preview.locator('svg desc')).toContainText(': 28');
  await preview.getByRole('tab', { name: 'Charged', exact: true }).click();
  await expect(preview.getByRole('tabpanel')).toContainText(amountLabel(summary.totals.credits));
  expect(await preview.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
});

test('homepage image deals compare at the same resolution, in the agreed order', async () => {
  expect(deals.map(deal => deal.name)).toEqual(['GPT Image 2.5', 'GPT-6 Astra', 'Nano Banana Pro', 'Gemini 3.8 Flash']);
  for (const deal of deals.filter(entry => entry.modality === 'image')) expect(deal.basis).toMatch(/^1K /);
});

test('deal card rows line up across cards', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Four cards share one row on desktop');
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const selector of ['.deal-card-saving', '.deal-card-price strong', '.deal-card-link']) {
    const boxes = await page.locator(`.deal-card ${selector}`).evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { top: Math.round(rect.top), height: Math.round(rect.height) };
    }));
    expect(new Set(boxes.map(box => box.top)).size, selector).toBe(1);
    if (selector === '.deal-card-saving') expect(new Set(boxes.map(box => box.height)).size).toBe(1);
  }
});
