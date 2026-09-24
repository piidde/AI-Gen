import { test, expect } from "@playwright/test";
import { localDayRange, formatMoney, formatLocalTime } from "../src/lib/formatting";
import { copyText } from "../src/lib/clipboard";

test("local day ranges respect DST and reject normalized or inverted dates", () => {
  const previous = process.env.TZ;
  process.env.TZ = "Europe/Berlin";
  try {
    const spring = localDayRange("2026-03-29", "2026-03-29")!;
    const autumn = localDayRange("2026-10-25", "2026-10-25")!;
    expect(Date.parse(spring.endExclusive) - Date.parse(spring.start)).toBe(23 * 3600000);
    expect(Date.parse(autumn.endExclusive) - Date.parse(autumn.start)).toBe(25 * 3600000);
    expect(localDayRange("2026-02-30", "2026-03-01")).toBeNull();
    expect(localDayRange("2026-09-21", "2026-09-20")).toBeNull();
    expect(formatLocalTime("2026-09-20T12:00:00Z")).toContain("Europe/Berlin");
    expect(formatLocalTime(null)).toBe("Unavailable");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("money preserves exact decimals and EUR falls back without a fresh quote", () => {
  expect(formatMoney("9007199254740993.0123")).toBe("$9,007,199,254,740,993.0123 USD");
  expect(formatMoney(null)).toBe("Unavailable");
  expect(formatMoney("5", "EUR")).toContain("$5.00 USD · EUR estimate unavailable");
  const quote = { amount: "4.60", asOf: "2026-09-20T10:00:00Z", expiresAt: "2026-09-20T11:00:00Z" };
  expect(formatMoney("5", "EUR", quote, Date.parse("2026-09-20T10:30:00Z"))).toContain("≈ €4.60 EUR");
  expect(formatMoney("5", "EUR", quote, Date.parse("2026-09-20T11:00:00Z"))).toContain("estimate unavailable");
  expect(() => formatMoney("$5")).toThrow();
});

test("clipboard reports denied and unavailable access without false success", async () => {
  expect(await copyText("sample", undefined)).toEqual({ status: "error", message: "Could not copy. Select and copy the text manually." });
  expect((await copyText("sample", { writeText: async () => { throw new Error("Denied"); } })).status).toBe("error");
  let copied = "";
  expect((await copyText("sample", { writeText: async text => { copied = text; } })).status).toBe("success");
  expect(copied).toBe("sample");
});

test("catalogue URL filters survive reload and history without stealing focus", async ({ page }) => {
  await page.goto("/models?provider=Gemini&capability=Image");
  await expect(page.locator(".model-card")).toHaveCount(10);
  await expect(page.getByLabel("Filter provider")).toHaveText("Google (Gemini)");
  const capability = page.getByLabel("Filter capability");
  await capability.focus();
  await capability.click();
  await page.getByRole("option", { name: "Text", exact: true }).click();
  await expect(capability).toBeFocused();
  await expect(page).toHaveURL(/capability=Text/);
  await page.goBack();
  await expect(capability).toHaveText("Image");
  const search = page.getByRole("searchbox");
  await search.fill("missing");
  await expect(search).toBeFocused();
  await page.reload();
  await expect(search).toHaveValue("missing");
  await expect(page.locator(".model-card")).toHaveCount(0);
  await page.goto("/models?provider=__proto__&capability=bad&q=%E0%A4%A");
  await expect(page.getByLabel("Filter provider")).toHaveText("All providers");
  await expect(capability).toHaveText("All capabilities");
});

test("catalogue copy failure is visible and the reference ID remains selectable", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
    value: { writeText: async () => { throw new Error("Denied"); } }, configurable: true,
  }));
  await page.goto("/models");
  await page.getByRole("button", { name: /View details/ }).first().click();
  await page.getByRole("button", { name: "Copy reference ID" }).click();
  await expect(page.getByRole("dialog")).toContainText("Could not copy");
  await expect(page.getByRole("dialog")).toContainText("gpt-image-2.5");
});

test("query-only typing preserves catalogue scroll position", async ({ page }) => {
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 600 });
  await page.goto("/models");
  await page.evaluate(() => document.fonts.ready);
  const search = page.getByRole("searchbox");
  await search.scrollIntoViewIfNeeded();
  await search.evaluate(el => (el as HTMLElement).focus({ preventScroll: true }));
  // Keep the field visible: typing into an offscreen field scrolls it into view.
  await page.evaluate(() => { if (scrollY === 0) window.scrollTo(0, 100); });
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(0);
  await search.pressSequentially("model");
  await expect(search).toHaveValue("model");
  await expect(page).toHaveURL(/q=model/);
  await expect(search).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await expect(page.locator(".model-card")).toHaveCount(29);
});
