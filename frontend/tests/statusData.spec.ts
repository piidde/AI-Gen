import { test, expect } from "@playwright/test";
import { catalogue } from "../src/content/catalogue";
import { getServiceStatus, readStatusScenario, statusHref, catalogueNotices, updates } from "../src/content/serviceStatus";

test("unknown or missing status previews never imply a healthy source", () => {
  for (const search of ["", "?statusPreview=healthy", "?statusPreview=__proto__"]) {
    expect(readStatusScenario(search)).toBe("unavailable");
    expect(getServiceStatus(readStatusScenario(search)).state).toBe("unavailable");
  }
});

test("incident and resolution share exact affected catalogue IDs and chronology", () => {
  const incident = getServiceStatus("incident").incidents[0]!;
  const resolved = getServiceStatus("resolved").incidents[0]!;
  expect(incident.resolvedAt).toBeNull();
  expect(resolved.id).toBe(incident.id);
  expect(Date.parse(resolved.resolvedAt!)).toBeGreaterThan(Date.parse(incident.startedAt));
  for (const id of incident.modelIds) expect(catalogue.some(model => model.upstreamId === id)).toBe(true);
  expect(getServiceStatus("stale").state).toBe("stale");
  expect(getServiceStatus("loading").sourceUpdatedAt).toBeNull();
});

test("notice links preserve only the explicit status preview", () => {
  expect(statusHref("?other=private&statusPreview=incident")).toBe("/status?statusPreview=incident");
  expect(statusHref("?other=private")).toBe("/status");
  expect(catalogueNotices.map(notice => notice.modelId)).toEqual(["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"]);
});

test("announcement archive has unique slugs and descending dates with sample labels", () => {
  expect(new Set(updates.map(update => update.slug)).size).toBe(updates.length);
  expect(updates.every(update => update.sample)).toBe(true);
  expect(updates.map(update => update.publishedAt)).toEqual(updates.map(update => update.publishedAt).sort().reverse());
});
