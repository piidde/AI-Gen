import { test, expect } from "@playwright/test";
import { createDemoClient } from "../src/data/demoClient";

test("demo changes stay isolated from other clients and returned snapshots", async () => {
  const first = createDemoClient();
  const second = createDemoClient();
  const preferences = { displayCurrency: "EUR", productUpdates: true, creditAlert: { enabled: false } } as const;
  await first.savePreferences(preferences, { delayMs: 0 });
  const changed = await first.read({ delayMs: 0 });
  expect(changed.status).toBe("success");
  if (changed.status !== "success") throw new Error("Expected demo snapshot");
  expect(changed.data.preferences).toEqual(preferences);
  changed.data.preferences.productUpdates = false;
  const again = await first.read({ delayMs: 0 });
  expect(again.status === "success" && again.data.preferences.productUpdates).toBe(true);
  const unchanged = await second.read({ delayMs: 0 });
  expect(unchanged.status === "success" && unchanged.data.preferences.productUpdates).toBe(false);
});

test("error, uncertain and empty mock saves do not change demo state", async () => {
  const client = createDemoClient();
  for (const scenario of ["error", "uncertain", "empty"] as const) {
    const result = await client.savePreferences({
      displayCurrency: "EUR", productUpdates: true, creditAlert: { enabled: false },
    }, { scenario, delayMs: 0 });
    expect(result.status).toBe(scenario);
    const snapshot = await client.read({ delayMs: 0 });
    expect(snapshot.status === "success" && snapshot.data.preferences.productUpdates).toBe(false);
  }
});

test("pending saves retain submitted values when the form is edited", async () => {
  const client = createDemoClient();
  const preferences = { displayCurrency: "USD", productUpdates: true, creditAlert: { enabled: false } } as const;
  const editable = { ...preferences };
  const saving = client.savePreferences(editable, { delayMs: 0 });
  Object.assign(editable, { productUpdates: false });
  await saving;
  const snapshot = await client.read({ delayMs: 0 });
  expect(snapshot.status === "success" && snapshot.data.preferences.productUpdates).toBe(true);
});

test("aborted loading and pending saves reject without late mutation", async () => {
  const client = createDemoClient();
  const controller = new AbortController();
  const loading = client.read({ scenario: "loading", signal: controller.signal });
  const saving = client.savePreferences({
    displayCurrency: "EUR", productUpdates: true, creditAlert: { enabled: false },
  }, { delayMs: 100, signal: controller.signal });
  const checks = [
    expect(loading).rejects.toMatchObject({ name: "AbortError" }),
    expect(saving).rejects.toMatchObject({ name: "AbortError" }),
  ];
  controller.abort();
  await Promise.all(checks);
  await expect(client.read({ signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  const snapshot = await client.read({ delayMs: 0 });
  expect(snapshot.status === "success" && snapshot.data.preferences.productUpdates).toBe(false);
});
