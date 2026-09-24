import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";

// Isolated configured-tag build; no real identifiers or external requests.
const output = await mkdtemp(join(tmpdir(), "takewing-consent-fixture-"));
Object.assign(process.env, {
  VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "",
  VITE_SITE_INDEXABLE: "false", VITE_SITE_ORIGIN: "http://127.0.0.1:4175",
  VITE_GA_MEASUREMENT_ID: "G-CONSENT-FIXTURE", VITE_ADS_CONVERSION_ID: "AW-CONSENT-FIXTURE",
});
const { build, preview } = await import("vite");
await build({ build: { outDir: output, emptyOutDir: false } });
const server = await preview({ build: { outDir: output }, preview: { host: "127.0.0.1", port: 4175, strictPort: true } });
let browser;
let failures = 0;
try {
  browser = await chromium.launch({ channel: "chrome" });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    for (const scenario of ["preferences dismiss banner", "banner synchronizes preferences", "blocked persistence revokes current page", "legacy ads only", "legacy analytics and ads"]) {
      const context = await browser.newContext({ viewport, serviceWorkers: "block" });
      if (scenario.startsWith("legacy")) {
        await context.addInitScript(analytics => localStorage.setItem("takewing.consent", JSON.stringify({ analytics, ads: true })), scenario === "legacy analytics and ads");
      }
      let tagRequests = 0;
      const requestedTagIds = [];
      const unexpected = [];
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === "http://127.0.0.1:4175") return route.continue();
        if (url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js") {
          tagRequests++;
          requestedTagIds.push(url.searchParams.get("id"));
          return route.fulfill({ contentType: "application/javascript", body: "window.fixtureTagLoaded = true;" });
        }
        unexpected.push(url.origin);
        return route.abort();
      });
      const page = await context.newPage();
      try {
        await page.goto("http://127.0.0.1:4175/privacy");
        const banner = page.getByRole("dialog", { name: "Cookies and measurement" });
        const option = page.getByRole("checkbox", { name: "Allow analytics" });
        if (scenario.startsWith("legacy")) {
          await expect(banner).toBeHidden();
          expect(tagRequests).toBe(scenario === "legacy ads only" ? 0 : 1);
        } else {
        await expect(banner).toBeVisible();
        expect(tagRequests).toBe(0);
        if (scenario === "preferences dismiss banner") {
          await page.getByRole("button", { name: "Reject optional cookies" }).click();
          await expect(banner).toBeHidden();
          await expect(page.getByRole("button", { name: "Reject optional cookies" })).toBeFocused();
          await expect(page.getByRole("status")).toContainText("Cookie preferences saved");
          await page.reload();
          await expect(banner).toBeHidden();
          await expect(option).not.toBeChecked();
          expect(tagRequests).toBe(0);
        } else {
          await banner.getByRole("button", { name: "Accept", exact: true }).click();
          await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
          await expect.poll(() => tagRequests).toBe(1);
          const measurementOrder = await page.evaluate(() => (window.dataLayer ?? []).map(entry =>
            entry[0] === "config" ? "config" :
              entry[0] === "consent" && entry[1] === "update" ? "consent-update" :
                entry[0] === "event" && entry[1] === "public_landing" ? "public-landing" : "other"));
          expect(measurementOrder.indexOf("consent-update")).toBeLessThan(measurementOrder.indexOf("public-landing"));
          expect(measurementOrder.indexOf("config")).toBeLessThan(measurementOrder.indexOf("public-landing"));
          if (scenario === "banner synchronizes preferences") {
            await expect(option).toBeChecked();
            expect(await page.evaluate(() => JSON.parse(localStorage.getItem("takewing.consent")))).toEqual({ analytics: true, ads: false });
            await page.reload();
            await expect(option).toBeChecked();
            await expect(banner).toBeHidden();
          } else {
            await page.getByRole("link", { name: "Models", exact: true }).first().click();
            await expect(page).toHaveURL(/\/models$/);
            expect(await page.evaluate(() => (window.dataLayer ?? []).filter(entry => entry[0] === "event" && entry[1] === "page_view").length)).toBeGreaterThan(0);
            await page.getByRole("link", { name: "Privacy", exact: true }).click();
            await expect(page).toHaveURL(/\/privacy$/);
            await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); }; });
            await page.getByRole("button", { name: "Reject optional cookies" }).click();
            await expect(page.getByRole("status")).toContainText("this page only");
            await expect(option).not.toBeChecked();
            const countViews = () => page.evaluate(() => (window.dataLayer ?? []).filter(entry => entry[0] === "event" && entry[1] === "page_view").length);
            const before = await countViews();
            await page.getByRole("link", { name: "Models", exact: true }).first().click();
            await expect(page).toHaveURL(/\/models$/);
            expect(await countViews()).toBe(before);
            expect(await page.evaluate(() => window.dataLayer.filter(entry => entry[0] === "consent").at(-1)[2].analytics_storage)).toBe("denied");
          }
        }
        }
        expect(requestedTagIds.every(id => id === "G-CONSENT-FIXTURE")).toBe(true);
        const advertisingCommands = await page.evaluate(() => (window.dataLayer ?? []).filter(entry =>
          (entry[0] === "config" && String(entry[1]).startsWith("AW-")) ||
          (entry[0] === "consent" && ["ad_storage", "ad_user_data", "ad_personalization"].some(field => entry[2][field] === "granted"))));
        expect(advertisingCommands).toEqual([]);
        expect(unexpected).toEqual([]);
        console.log(`PASS ${viewport.width}: ${scenario}`);
      } catch (error) {
        failures++;
        console.error(`FAIL ${viewport.width}: ${scenario}\n${error.message}`);
      } finally { await context.close(); }
    }

    const context = await browser.newContext({ viewport, serviceWorkers: "block" });
    let tagRequests = 0;
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (url.origin === "http://127.0.0.1:4175") return route.continue();
      if (url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js") {
        tagRequests++;
        return route.fulfill({ contentType: "application/javascript", body: "window.fixtureTagLoaded = true;" });
      }
      return route.abort();
    });
    const landingPage = await context.newPage();
    const preferencesPage = await context.newPage();
    try {
      await landingPage.goto("http://127.0.0.1:4175/models?email=private@example.com&token=secret", {
        referer: "https://search.example/results?email=private@example.com",
      });
      await preferencesPage.goto("http://127.0.0.1:4175/privacy");
      const funnelEvents = () => landingPage.evaluate(() => (window.dataLayer ?? []).filter(entry =>
        entry[0] === "event" && entry[1] === "public_landing"));
      expect(await funnelEvents()).toEqual([]);
      expect(tagRequests).toBe(0);

      // Grant locally on the measured page; the preferences tab receives it via storage.
      await landingPage.getByRole("button", { name: "Accept", exact: true }).click();
      await expect.poll(() => tagRequests).toBe(2);
      expect(await landingPage.evaluate(() => window["ga-disable-G-CONSENT-FIXTURE"])).toBe(false);
      await expect.poll(async () => (await funnelEvents()).length).toBe(1);
      const [landing] = await funnelEvents();
      expect(landing).toEqual(["event", "public_landing", { landing_path: "/models", referral: "external" }]);
      expect(JSON.stringify(landing)).not.toContain("private");
      expect(JSON.stringify(landing)).not.toContain("secret");

      const config = await landingPage.evaluate(() => window.dataLayer.find(entry => entry[0] === "config"));
      expect(config[2]).toMatchObject({
        send_page_view: false,
        page_location: "http://127.0.0.1:4175/models",
        page_referrer: "",
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      await landingPage.evaluate(() => {
        history.pushState({}, "", "/private-secret-123?token=secret");
        dispatchEvent(new PopStateEvent("popstate"));
      });
      await expect.poll(async () => landingPage.evaluate(() => (window.dataLayer ?? []).filter(entry =>
        entry[0] === "event" && entry[1] === "page_view").length)).toBeGreaterThan(0);
      const safePageView = await landingPage.evaluate(() => (window.dataLayer ?? []).filter(entry =>
        entry[0] === "event" && entry[1] === "page_view").at(-1));
      expect(safePageView[2]).toMatchObject({ page_path: "/404", page_location: "http://127.0.0.1:4175/404" });
      expect(JSON.stringify(safePageView)).not.toContain("private-secret");
      expect(JSON.stringify(safePageView)).not.toContain("token");

      // Clearing consent in another tab is a revocation, just like an explicit reject.
      await preferencesPage.evaluate(() => localStorage.clear());
      await expect.poll(() => landingPage.evaluate(() => window["ga-disable-G-CONSENT-FIXTURE"])).toBe(true);
      const pageViewsBeforeRejectNavigation = await landingPage.evaluate(() => (window.dataLayer ?? []).filter(entry =>
        entry[0] === "event" && entry[1] === "page_view").length);
      await landingPage.evaluate(() => {
        history.pushState({}, "", "/models?token=secret");
        dispatchEvent(new PopStateEvent("popstate"));
      });
      await landingPage.waitForTimeout(100);
      const pageViews = await landingPage.evaluate(() => (window.dataLayer ?? []).filter(entry =>
        entry[0] === "event" && entry[1] === "page_view"));
      expect(pageViews.length).toBe(pageViewsBeforeRejectNavigation);
      console.log(`PASS ${viewport.width}: cross-tab funnel privacy`);
    } catch (error) {
      failures++;
      console.error(`FAIL ${viewport.width}: cross-tab funnel privacy\n${error.message}`);
    } finally { await context.close(); }
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
console.log(`Consent regression: ${12 - failures}/12 passed. Build: ${output}`);
process.exitCode = failures ? 1 : 0;
