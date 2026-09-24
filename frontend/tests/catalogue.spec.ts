import { test, expect } from "@playwright/test";
import { catalogue } from '../src/content/catalogue';
import { publishedReference, publishedDifference, bestImageSettings } from '../src/content/publishedPrices';

test('every model card exposes its prices and percentage disposition', async ({ page }, info) => {
  await page.goto('/models');
  for (const model of catalogue) {
    const card = page.locator(`[data-model-id="${model.upstreamId}"]`);
    await expect(card).toContainText('Our price');
    await expect(card).toContainText('Official API');
    await expect(card).not.toContainText(/Public API ID pending|Comparison unavailable/);
    const expectedSavings = model.rates.filter(rate => {
      const reference = publishedReference(model, rate, bestImageSettings(model));
      return rate.component !== 'cached-input' && rate.credits !== null && reference.status === 'available' && publishedDifference(rate.credits, reference.usd)?.direction === 'lower';
    }).length;
    await expect(card.locator('.landing-saving')).toHaveCount(expectedSavings);
    if (model.upstreamId === 'gemini-3-pro') await expect(card).toContainText('No verified current comparison for this alias.');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const price of await page.locator('.reference-card .discounted').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent, thickness: getComputedStyle(node).textDecorationThickness })))) {
    expect(price.text).not.toMatch(/[≈~]/);
    expect(price.thickness).toBe('2px');
  }
  await expect(page.locator('.reference-card .landing-our-price .landing-price-label').first()).toBeVisible();
  await expect(page.locator('.reference-card .landing-official .landing-price-label').first()).toBeVisible();
  await page.getByRole('searchbox').fill('gpt-5.6');
  await page.screenshot({ path: info.outputPath('catalogue-comparisons.png'), fullPage: true });
});

test("researched catalogue groups all variants and shows exact reference rates", async ({ page }) => {
  await page.goto("/models");
  await expect(page.locator(".model-card")).toHaveCount(29);
  await expect(page.getByText("Fictional prices", { exact: false })).toHaveCount(0);
  await page.getByRole("searchbox").fill("gpt-image-2");
  const card = page.locator('[data-model-id="gpt-image-2"]');
  await expect(card).toContainText("$0.005");
  await expect(card).toContainText("8% below Low reference");
  await expect(card).toContainText("/ request");
  await expect(card).not.toContainText("Public API ID pending");
  await expect(card).toContainText("Official API example");
  await page.getByLabel("Display currency").click();
  await page.getByRole("option", { name: "EUR", exact: true }).click();
  await expect(page).toHaveURL(/currency=EUR/);
  await expect(page.getByRole("status").filter({ hasText: "EUR estimate unavailable" })).toBeVisible();
  await expect(card).toContainText("$0.005");
  await page.reload();
  await expect(page.getByLabel("Display currency")).toHaveText("EUR");
});

test("variant details preserve unknown cache, official settings and keyboard focus", async ({ page }) => {
  await page.goto("/models?q=gemini-2.5-pro");
  const details = page.getByRole("button", { name: "View details for gemini-2.5-pro", exact: true });
  await details.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Cache read");
  await expect(dialog).toContainText("Rate unavailable");
  await expect(dialog).toContainText("input >200000 tokens");
  await expect(dialog).toContainText("includes thinking");
  await expect(dialog.getByRole("link", { name: "Official source" }).first()).toHaveAttribute("href", /ai.google.dev/);
  await page.keyboard.press("Escape");
  await expect(details).toBeFocused();
});

test("family routes deep link with metadata, original content and responsive variants", async ({ page }, info) => {
  for (const [slug, name] of [["gpt-image-2", "GPT Image 2"], ["nano-banana-pro", "Nano Banana Pro"], ["gpt-5-6", "GPT-5.6"], ["gemini-flash", "Gemini Flash"]]) {
    await page.goto(`/models/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name!);
    await expect(page).toHaveTitle(new RegExp(name!.replaceAll(".", "\\.")));
    await expect(page.getByRole("heading", { name: "Before you integrate" })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/models/${slug}$`));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }
  await page.screenshot({ path: info.outputPath("family-page.png"), fullPage: true });
  for (const slug of ["missing", "__proto__", "gpt-image-2/extra"]) {
    await page.goto(`/models/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("availability notices agree between catalogue and status without live health claims", async ({ page }, info) => {
  await page.goto("/models?q=sunburst");
  await expect(page.locator(".model-card")).toContainText("Temporarily unavailable");
  const notice = page.locator('.model-card .availability-label');
  await expect(notice).toHaveCount(1);
  expect(await notice.evaluate(node => getComputedStyle(node).paddingTop)).toBe('0px');
  await expect(page.locator('.model-card footer .availability-label')).toHaveCount(1);
  await expect(page.locator('.model-card .model-status-notice')).toHaveCount(0);
  await expect(notice.getByRole('link')).toHaveAttribute('href', /status/);
  await page.screenshot({ path: info.outputPath('compact-model-notice.png'), fullPage: true });
  if (info.project.name === 'desktop') {
    await page.setViewportSize({ width: 2016, height: 1000 });
    await page.getByRole('searchbox').fill('gpt-image-2.5');
    const tops = await page.locator('.model-card .landing-prices').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
    expect(tops).toHaveLength(3);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
    await page.screenshot({ path: info.outputPath('aligned-model-notices.png'), fullPage: true });
  }
  await expect(page.getByText("How these reference prices work", { exact: true })).toHaveCount(0);
  await notice.getByRole("link").first().click();
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("Service status is not connected");
  await expect(page.getByRole("list", { name: "Model availability notices" })).toContainText("gpt-image-2.5-sunburst");
  await expect(page.getByRole("list", { name: "Model availability notices" })).toContainText("Temporarily unavailable");
});
