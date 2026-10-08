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

test("variant details explain unknown cache and official conditions without an expander", async ({ page }) => {
  await page.goto("/models?q=gemini-2.5-pro");
  const details = page.getByRole("button", { name: "View details for gemini-2.5-pro", exact: true });
  await details.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole('table')).toHaveCount(0);
  await expect(dialog.locator('details')).toHaveCount(0);
  await expect(dialog).toContainText(/cached[- ]input/i);
  await expect(dialog).toContainText(/pricing is not available/i);
  await expect(dialog).toContainText(/cached tokens should not be assumed free/i);
  await expect(dialog).toContainText(/200,000 input tokens/);
  await expect(dialog).toContainText(/thinking tokens/i);
  const source = dialog.getByRole('link', { name: 'Official source' });
  await expect(source).toHaveCount(1);
  await expect(source).toHaveAttribute('href', /ai.google.dev/);
  await expect(source).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).toBeFocused();
});

test('text model details explain billing and long-context comparison plainly', async ({ page }) => {
  await page.goto('/models?q=gpt-6-astra');
  const opener = page.getByRole('button', { name: 'View details for gpt-6-astra', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'gpt-6-astra', exact: true })).toBeVisible();
  await expect(dialog.getByRole('table')).toHaveCount(0);
  await expect(dialog.locator('details')).toHaveCount(0);
  await expect(dialog).toContainText(/input/i);
  await expect(dialog).toContainText(/output/i);
  await expect(dialog).toContainText(/cached input/i);
  await expect(dialog).toContainText(/272,000 input tokens/);
  await expect(dialog).toContainText(/longer requests|above that threshold/i);
  await expect(dialog).toContainText('Tool calling and streaming are verified through the Responses API');
  await expect(dialog).toContainText('Image and file inputs are not supported');
  await expect(dialog.getByText('Model ID', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Copy model ID' })).toBeVisible();
  const source = dialog.getByRole('link', { name: 'Official source' });
  await expect(source).toHaveCount(1);
  await expect(source).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('image model details explain request billing and the official output comparison', async ({ page }) => {
  await page.goto('/models?q=gpt-image-2.5');
  await page.getByRole('button', { name: 'View details for gpt-image-2.5', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('table')).toHaveCount(0);
  await expect(dialog.locator('details')).toHaveCount(0);
  await expect(dialog).toContainText(/per request/i);
  await expect(dialog).toContainText(/not per image/i);
  await expect(dialog).not.toContainText(/\$\d/);
  await expect(dialog).toContainText(/official 1K High/i);
  await expect(dialog).toContainText(/quality is automatic/i);
  await expect(dialog).toContainText(/input.*(extra|excluded)/i);
  const source = dialog.getByRole('link', { name: 'Official source' });
  await expect(source).toHaveCount(1);
  await expect(source).toBeVisible();
});

test('model details dismiss on the backdrop but preserve interactions inside', async ({ page }) => {
  await page.goto('/models?q=gemini-2.5-pro');
  const opener = page.getByRole('button', { name: 'View details for gemini-2.5-pro', exact: true });
  const dialog = page.getByRole('dialog');
  await opener.click();
  await dialog.getByRole('heading', { name: 'gemini-2.5-pro', exact: true }).click();
  await expect(dialog).toBeVisible();
  const bounds = (await dialog.boundingBox())!;
  // Padding inside the native dialog is not the backdrop.
  await page.mouse.click(bounds.x + 6, bounds.y + 6);
  await expect(dialog).toBeVisible();
  // A drag that begins inside must not dismiss when released outside.
  await page.mouse.move(bounds.x + 6, bounds.y + 6);
  await page.mouse.down();
  await page.mouse.move(2, 2);
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
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
  // The preview server has no backend, so the status feed must report itself unavailable.
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("Status feed unavailable");
  await expect(page.getByRole("list", { name: "Model availability notices" })).toContainText("gpt-image-2.5-sunburst");
  await expect(page.getByRole("list", { name: "Model availability notices" })).toContainText("Temporarily unavailable");
});

test("model collection separates coding and chat models and opens Codex and tool setup in place", async ({ page }, info) => {
  await page.goto("/models");
  await expect(page.locator('.collection-heading h2')).toHaveText(['Image models', 'Coding & agent models', 'Chat models']);
  const coding = page.getByRole("region", { name: "Coding & agent models" });
  await expect(coding).toContainText("tool calling");
  await expect(coding.locator(".model-card").first()).toHaveAttribute("data-model-id", /^gpt-/);
  await expect(coding.locator(".model-card").first().getByLabel("Works with Codex CLI and Codex for VS Code")).toBeVisible();
  const chat = page.getByRole("region", { name: "Chat models" });
  await expect(chat.locator(".model-card").first()).toHaveAttribute("data-model-id", /^gemini-/);
  await expect(chat.locator(".works-with")).toHaveCount(0);
  const codex = coding.getByRole("button", { name: "Use with Codex (CLI & VS Code)" });
  await codex.click();
  const dialog = page.getByRole("dialog", { name: "Use with Codex (CLI & VS Code)" });
  await expect(dialog).toContainText('wire_api = "responses"');
  await expect(dialog).toContainText("https://aiapi.deals/v1");
  await expect(dialog.getByRole("link", { name: /Full guide in the docs/ })).toHaveAttribute("href", "/docs#codex");
  await page.screenshot({ path: info.outputPath("codex-setup.png") });
  await page.keyboard.press("Escape");
  await expect(codex).toBeFocused();
  await coding.getByRole("button", { name: "Use with any OpenAI tool" }).click();
  await expect(page.getByRole("dialog", { name: "Use with any OpenAI tool" })).toContainText("client.responses.create");
  const bounds = await page.getByRole("dialog").boundingBox();
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.keyboard.press("Escape");
  await coding.screenshot({ path: info.outputPath("coding-models.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
