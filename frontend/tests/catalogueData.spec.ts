import { test, expect } from "@playwright/test";
import { catalogue } from "../src/content/catalogue";
import { activeModels, groupFamilies, availabilityLabel, familyPages } from "../src/content/modelFamilies";
import { formatReferenceMoney } from "../src/lib/pricing";
import { buildRedirects, buildSitemapXml } from "../src/seo/generate";

test("retired entries leave discovery without deleting source records", () => {
  const retired = { ...catalogue[0]!, availability: "retired" as const };
  const inventory = [retired, catalogue[1]!];
  expect(activeModels(inventory)).toEqual([catalogue[1]]);
  expect(groupFamilies(activeModels(inventory))[0]!.variants).toHaveLength(1);
  expect(availabilityLabel(retired)).toBe("Retired");
  expect(inventory).toHaveLength(2);
  expect(inventory[0]!.upstreamId).toBe(retired.upstreamId);
  // No research alias is declared retired just because a candidate official version is.
  expect(activeModels()).toHaveLength(29);
});

test("reference money accepts only a fresh supplied EUR estimate and keeps USD visible", () => {
  const now = Date.parse("2026-09-20T10:30:00Z");
  const estimate = { amount: "0.0082", asOf: "2026-09-20T10:00:00Z", expiresAt: "2026-09-20T11:00:00Z" };
  const render = (quote = estimate, at = now) => formatReferenceMoney("600", "EUR", quote, at);
  expect(render()).toContain("€0.0082 EUR");
  expect(render()).toContain("0.009009 USD");
  expect(render(estimate, Date.parse(estimate.expiresAt))).not.toContain("EUR");
  expect(render(estimate, Date.parse(estimate.asOf) - 1)).not.toContain("EUR");
  expect(render({ ...estimate, expiresAt: "invalid" })).not.toContain("EUR");
  expect(formatReferenceMoney(null, "EUR", estimate, now)).toBe("Rate unavailable");
});

test("family metadata registers only known image/text pages for sitemap and host rewrites", () => {
  const redirects = buildRedirects();
  const publicMap = buildSitemapXml({ origin: "https://takewing.invalid", indexable: true, lastmod: "2026-09-20" });
  const previewMap = buildSitemapXml({ origin: "https://takewing.invalid", indexable: false, lastmod: "2026-09-20" });
  expect(familyPages.filter(page => page.modality === "image")).toHaveLength(2);
  expect(familyPages.filter(page => page.modality === "text")).toHaveLength(2);
  for (const page of familyPages) {
    expect(redirects).toContain(`/models/${page.slug} `);
    expect(publicMap).toContain(`/models/${page.slug}</loc>`);
  }
  expect(redirects).not.toContain("/models/*");
  expect(redirects).not.toContain("/models/missing");
  expect(previewMap).not.toContain("<url>");
});
