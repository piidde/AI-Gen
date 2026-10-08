import { test, expect, type Page } from "@playwright/test";

const incident = (resolved: string | null) => ({
  id: "00000000-0000-4000-8000-0000000000e1", title: "Image delays", impact: "gpt-image-2 requests are slower than usual.",
  service: "Image generation", model_ids: ["gpt-image-2"], started_at: "2026-10-08T08:00:00Z", updated_at: resolved ?? "2026-10-08T08:20:00Z", resolved_at: resolved,
  timeline: [...(resolved ? [{ at: resolved, message: "Recovered." }] : []), { at: "2026-10-08T08:20:00Z", message: "Investigating." }],
});

async function feed(page: Page, incidents: unknown[]) {
  await page.route("**/v1/status", route => route.fulfill({ json: { checked_at: new Date().toISOString(), updated_at: "2026-10-08T08:20:00Z", incidents } }));
}

test("status page shows published incidents and links affected model cards", async ({ page }, info) => {
  await feed(page, [incident(null)]);
  await page.goto("/status");
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("Active incident");
  await expect(page.locator(".incident-record")).toContainText("gpt-image-2");
  await expect(page.locator(".incident-record")).toContainText("Not resolved yet");
  await expect(page.locator(".incident-record time").first()).toContainText(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
  await page.screenshot({ path: info.outputPath("status-incident.png"), fullPage: true });
  await page.getByRole("link", { name: "Browse models" }).click();
  const card = page.locator('[data-model-id="gpt-image-2"]');
  await expect(card).toContainText("Active incident affects this model");
  await card.getByRole("link", { name: "View status" }).click();
  await expect(page).toHaveURL(/\/status$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("resolved incidents stay visible as history and an empty feed claims no health", async ({ page }) => {
  await feed(page, [incident("2026-10-08T09:10:00Z")]);
  await page.goto("/status");
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("No active incidents reported");
  await expect(page.locator(".incident-record")).toContainText("Resolved");
  await expect(page.locator(".incident-record")).toContainText("Recovered.");
  await page.unroute("**/v1/status");
  await feed(page, []);
  await page.reload();
  await expect(page.locator(".incident-record")).toHaveCount(0);
  await expect(page.getByText("No incidents in the last 7 days.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Overall status" })).toContainText("contact support");
});

test("updates archive is empty until real announcements are published", async ({ page }) => {
  await page.goto("/updates");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Updates");
  await expect(page.getByText("No announcements yet.")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/sample|fictional/i);
  await page.goto("/updates/unknown");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Update not found");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
