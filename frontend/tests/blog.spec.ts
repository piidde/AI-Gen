import { expect, test } from "@playwright/test";

test("blog index filters reviewed articles by topic without exposing drafts", async ({ page }, testInfo) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reference guides");
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByText("Editorial format preview")).toHaveCount(0);
  await page.getByRole("button", { name: "Image models" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Understanding image model request rates" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Understanding text token rates" })).toHaveCount(0);
  await page.getByRole("button", { name: "All topics" }).click();
  await expect(page.getByRole("article")).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath("blog-index.png"), fullPage: true });
});

test("article provides navigation, evidence, attribution and copy feedback", async ({ page }, testInfo) => {
  await page.goto("/blog/understanding-text-token-rates");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Understanding text token rates");
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
  await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Three components, one workload" }).click();
  await expect(page.locator("#three-components")).toBeFocused();
  await expect(page.locator("main time")).toHaveCount(2);
  await expect(page.locator("main")).toContainText("Technical review: Codex");
  await expect(page.locator("main")).toContainText("Publication review pending");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("img")).toHaveAttribute("alt", /token rate components/i);
  await expect(page.getByRole("link", { name: "Model catalogue", exact: true })).toHaveAttribute("href", "/models");
  await expect(page.getByRole("link", { name: "Documentation status", exact: true }).first()).toHaveAttribute("href", "/docs");
  await expect(page.getByRole("link", { name: "GPT-5.6 family reference" })).toHaveAttribute("href", "/models/gpt-5-6");
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => undefined } }));
  await page.getByRole("button", { name: "Copy checklist" }).click();
  await expect(page.getByRole("status")).toContainText("Copied");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } }));
  await page.getByRole("button", { name: "Copy checklist" }).click();
  await expect(page.getByRole("status")).toContainText("Could not copy");
  await page.screenshot({ path: testInfo.outputPath("blog-article.png"), fullPage: true });
  await page.getByRole("link", { name: "Understanding image model request rates" }).click();
  await expect(page).toHaveURL(/understanding-image-model-rates$/);
});

test("draft and unknown slugs render a useful not-found state", async ({ page }) => {
  for (const slug of ["editorial-format-preview", "does-not-exist"]) {
    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Article not found");
    await expect(page.getByRole("link", { name: "Browse reference guides" })).toHaveAttribute("href", "/blog");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("article tables and long content stay inside the mobile viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile layout check");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/blog/understanding-image-model-rates");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".blog-table-scroll")).toHaveCSS("overflow-x", "auto");
});
