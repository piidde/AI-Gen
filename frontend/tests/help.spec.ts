import { test, expect } from "@playwright/test";

test("docs retains its contract boundary and legacy help links reach dedicated pages", async ({ page }) => {
  await page.goto("/information?topic=docs");
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Documentation is being prepared");
  await expect(page.locator("main")).toContainText("verified API contract");
  await expect(page.locator("main pre, main code")).toHaveCount(0);
  await page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Support", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Help & support");
  await page.goto("/information?topic=terms#deletion");
  await expect(page).toHaveURL(/\/terms#deletion$/);
  await expect(page.locator("#deletion")).toBeInViewport();
  await expect(page.locator("#deletion")).toBeFocused();
});

test("support connects safe request/order help without inventing a contact channel", async ({ page }, info) => {
  await page.goto("/support?request=secret-prompt&email=private@example.com");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Help & support");
  await expect(page.getByRole("link", { name: "Investigate a request" })).toHaveAttribute("href", "/dashboard/usage");
  await expect(page.getByRole("link", { name: "Review an order" })).toHaveAttribute("href", "/dashboard/billing");
  await expect(page.locator("main")).toContainText("Never send API keys");
  await expect(page.locator("main")).not.toContainText("private@example.com");
  await expect(page.locator("main")).not.toContainText("secret-prompt");
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator("#contact-channel")).toContainText("not been selected");
  await page.getByRole("link", { name: "Safe details to share", exact: true }).click();
  await expect(page).toHaveURL(/#safe-details$/);
  await expect(page.locator("#safe-details")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("support.png"), fullPage: true });
  await page.getByRole("link", { name: "Investigate a request" }).click();
  await expect(page).toHaveURL(/login\?next=%2Fdashboard%2Fusage/);
});

test("policy sections preserve accepted product rules and explicit publication gates", async ({ page }, info) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of service");
  await expect(page.locator("main")).toContainText("not published legal terms");
  await expect(page.locator("#credits")).toContainText("never expire");
  await expect(page.locator("#requests")).toContainText("upstream cost");
  await expect(page.locator("#deletion")).toContainText("forfeits");
  await page.getByRole("link", { name: "Account deletion", exact: true }).click();
  await expect(page.locator("#deletion")).toBeInViewport();
  await page.reload();
  await expect(page.locator("#deletion")).toBeInViewport();
  await page.goto("/contact");
  await expect(page.locator("main")).toContainText("response-time commitment");
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await page.goto("/privacy");
  await expect(page.locator("main")).toContainText("not a published privacy notice");
  await expect(page.getByRole("heading", { name: "Cookie preferences", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reject optional cookies" }).click();
  await expect(page.getByRole("status")).toContainText("saved");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("takewing.consent")!))).toEqual({ analytics: false, ads: false });
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Allow analytics" })).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("privacy.png"), fullPage: true });
});
