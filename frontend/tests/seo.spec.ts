import { test, expect, type Page } from "@playwright/test";

// These guard the rules that are expensive to get wrong and easy to break
// silently: a stale canonical merges two pages in the index, a missing robots
// directive exposes account screens, and a tag that loads before consent is a
// compliance problem rather than a bug. Failures here are not cosmetic.

const PUBLIC_ROUTES = ["/", "/models", "/docs", "/support", "/status", "/contact", "/privacy", "/terms"];
const PRIVATE_ROUTES = ["/login", "/signup", "/forgot-password", "/update-password"];

function head(page: Page) {
  return page.evaluate(() => ({
    title: document.title,
    description:
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? "",
    robots: document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? "",
    canonical:
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute("href") ?? "",
    ogTitle:
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? "",
    ogImage:
      document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ?? "",
    twitterCard:
      document.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')?.content ?? "",
    h1Count: document.querySelectorAll("h1").length,
  }));
}

test("public pages expose unique, complete metadata", async ({ page }) => {
  const seenTitles = new Set<string>();
  const seenDescriptions = new Set<string>();

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route);
    const meta = await head(page);

    expect(meta.title, `${route} title`).not.toEqual("");
    expect(meta.description, `${route} description`).not.toEqual("");
    expect(meta.ogTitle, `${route} og:title`).toEqual(meta.title);
    expect(meta.ogImage, `${route} og:image`).toContain("og-image");
    expect(meta.twitterCard, `${route} twitter:card`).toEqual("summary_large_image");

    // Exactly one h1 per page: the document outline is what a crawler reads as
    // the page's subject.
    expect(meta.h1Count, `${route} h1 count`).toBe(1);

    // Duplicate titles or descriptions make pages compete for the same query.
    expect(seenTitles.has(meta.title), `${route} duplicate title`).toBe(false);
    expect(seenDescriptions.has(meta.description), `${route} duplicate description`).toBe(false);
    seenTitles.add(meta.title);
    seenDescriptions.add(meta.description);
  }
});

test("canonical URLs are absolute and ignore tracking parameters", async ({ page }) => {
  await page.goto("/models?utm_source=newsletter&utm_medium=email");
  const meta = await head(page);
  expect(meta.canonical).toMatch(/^https?:\/\//);
  expect(meta.canonical).not.toContain("utm_");
  expect(meta.canonical.endsWith("/models")).toBe(true);
});

test("account pages and unknown URLs stay out of search results", async ({ page }) => {
  for (const route of [...PRIVATE_ROUTES, "/this-page-does-not-exist"]) {
    await page.goto(route);
    const meta = await head(page);
    expect(meta.robots, `${route} robots`).toContain("noindex");
  }
});

test("an unknown single-segment URL renders not-found, not a topic page", async ({ page }) => {
  await page.goto("/not-a-real-topic");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
});

test("legacy ?topic= links still resolve to their content", async ({ page }) => {
  await page.goto("/information?topic=privacy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Privacy");
});

test("no analytics or advertising request is made without consent", async ({ page }) => {
  const trackingRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/googletagmanager|google-analytics|doubleclick|googleadservices/.test(url)) {
      trackingRequests.push(url);
    }
  });

  for (const route of ["/", "/models", "/docs"]) {
    await page.goto(route, { waitUntil: "networkidle" });
  }

  expect(trackingRequests).toEqual([]);
});

test("structured data is valid JSON and only on indexable pages", async ({ page }) => {
  await page.goto("/");
  const raw = await page.evaluate(
    () => document.getElementById("structured-data")?.textContent ?? "",
  );

  if (raw !== "") {
    const parsed = JSON.parse(raw) as { "@context": string; "@graph": unknown[] };
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(Array.isArray(parsed["@graph"])).toBe(true);
    expect(parsed["@graph"].length).toBeGreaterThan(0);
  }

  // Never describe a sign-in wall as public content.
  await page.goto("/login");
  const onPrivate = await page.evaluate(() => document.getElementById("structured-data"));
  expect(onPrivate).toBeNull();
});
