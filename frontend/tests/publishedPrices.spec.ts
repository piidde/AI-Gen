import { test, expect } from '@playwright/test';
import { catalogue } from '../src/content/catalogue';
import { publishedReference, publishedDifference, openaiImageUsd, imageOptions, sellingPrice, bestImageSettings } from '../src/content/publishedPrices';

test('image references follow selected resolution and quality, including official half-even rounding', () => {
  expect(openaiImageUsd('gpt-image-2.5-sunburst', '1K', 'medium')).toBe('0.01317');
  expect(openaiImageUsd('gpt-image-2.5-sunburst', '4K', 'medium')).toBe('0.02595');
  expect(openaiImageUsd('gpt-image-2.5-sunburst', '4K', 'high')).toBe('0.10008');
  expect(openaiImageUsd('gpt-image-2-vip', '4K', 'high')).toBe('0.40026');
  const flare = catalogue.find(model => model.upstreamId === 'gpt-image-2.5-flare')!;
  expect(imageOptions(flare).qualities).not.toContain('max');
  expect(publishedReference(flare, flare.rates[0]!, { resolution: '4K', quality: 'max' }).status).toBe('unavailable');
});

test('image cards have static context and only positive savings badges', async ({ page }) => {
  await page.goto('/models');
  await expect(page.getByLabel(/Comparison resolution|Comparison quality/)).toHaveCount(0);
  for (const id of ['nano-banana-fast', 'nano-banana-2-lite']) {
    const card = page.locator(`[data-model-id="${id}"]`);
    await expect(card.locator('.landing-saving')).toHaveText('Save up to 88%');
    await expect(card.locator('.price-reference-basis')).toContainText('1K · official image output');
    await expect(card.getByRole('link', { name: /Official pricing/ })).toHaveCount(0);
    await card.getByRole('button', { name: /View details/ }).click();
    await expect(page.getByRole('dialog')).toContainText('Gemini 3.1 Flash-Lite Image');
    await page.keyboard.press('Escape');
  }
  expect(imageOptions(catalogue.find(model => model.upstreamId === 'gpt-image-2-vip')!).qualities).toEqual(['medium']);
  const sunburst = page.locator('[data-model-id="gpt-image-2.5-sunburst"]');
  await expect(sunburst.locator('.landing-saving')).toHaveText('Save up to 94%');
  await expect(sunburst.locator('.landing-official .discounted')).toHaveCount(1);
  await expect(sunburst.locator('.price-reference-basis')).toContainText('Max quality');
  for (const badge of await page.locator('.landing-saving').allTextContents()) expect(badge).toMatch(/^(Save up to .*%|8% below Low reference|One flat price)$/);
  await page.goto('/');
  await expect(page.getByLabel(/Comparison resolution|Comparison quality/)).toHaveCount(0);
});

test('every catalogue row has a deliberate published-reference disposition', () => {
  for (const model of catalogue) {
    for (const rate of model.rates.filter(rate => rate.component !== 'cached-input')) {
      const reference = publishedReference(model, rate);
      if (model.upstreamId === 'gemini-3-pro') {
        expect(reference.status).toBe('unavailable');
      } else {
        expect(reference.status, model.upstreamId).toBe('available');
        if (reference.status === 'available') {
          expect(reference.source).toMatch(/^https:\/\//);
          expect(reference.basis.length).toBeGreaterThan(5);
          expect(publishedDifference(rate.credits!, reference.usd)).not.toBeNull();
        }
      }
    }
  }
});

test('percentages use exact values, retain higher costs and never invent zero savings', () => {
  expect(publishedDifference('600', '0.05268')).toEqual({ direction: 'lower', percent: '89' });
  expect(publishedDifference('1800', '0.1344')).toEqual({ direction: 'lower', percent: '87' });
  expect(publishedDifference('10000', '0.1344')).toEqual({ direction: 'lower', percent: '32' });
  expect(publishedDifference('111000', '1')).toEqual({ direction: 'equal', percent: '0' });
  expect(publishedDifference('110999', '1')).toEqual({ direction: 'lower', percent: '<1' });
  expect(publishedDifference('66600', '0')).toBeNull();
});

 test('selling price applies approved package and markup exactly', () => {
 const cost = sellingPrice('2400');
 expect(cost.numerator * 111000n).toBe(cost.denominator * 2400n);
 const sunburst=catalogue.find(model=>model.upstreamId==='gpt-image-2.5-sunburst')!;
 expect(bestImageSettings(sunburst)).toEqual({resolution:'2K',quality:'max'});
 expect(publishedDifference('2400','0.01317')).toEqual({direction:'higher',percent:'65'});
 });

test('auto-only tiers use the common Low benchmark without assuming High output', () => {
 for (const id of ['gpt-image-2', 'gpt-image-2.5']) {
 const model=catalogue.find(model=>model.upstreamId===id)!;
 const settings=bestImageSettings(model);
 expect(settings).toEqual({resolution:'1K',quality:'low'});
 const reference=publishedReference(model,model.rates[0]!,settings);
 expect(reference.status==='available' && reference.usd).toBe('0.00588');
 expect(publishedDifference('600','0.00588')).toEqual({direction:'lower',percent:'8'});
 }
});

test('basic GPT Image2.5 qualifies its savings against official High pricing', async ({page}) => {
 await page.goto('/models?q=gpt-image-2.5');
 const card=page.locator('[data-model-id="gpt-image-2.5"]');
 await expect(card.locator('.landing-saving')).toHaveText('Save up to 89%');
 await expect(card.locator('.price-reference-basis')).toContainText('Auto quality · official 1K High savings reference');
 await expect(card.locator('.landing-official')).toContainText('$0.006');
 await expect(card.locator('.landing-official')).toContainText('$0.053');
 await expect(card).not.toContainText(/below Low reference|unverified|benchmark/);
});
