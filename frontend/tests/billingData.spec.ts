import { test, expect } from "@playwright/test";
import { createBillingDemo, restorePendingOrder, orderSupportSummary } from "../src/data/billingDemo";
import { packages } from "../src/content/catalogue";

test("packages create pending orders once and explicit demo confirmation credits once", async () => {
  const client = createBillingDemo();
  const before = client.read().balance;
  const [first, duplicate] = await Promise.all([client.begin("10", { delayMs: 0 }), client.begin("10", { delayMs: 0 })]);
  expect(first.id).toBe(duplicate.id);
  expect(first.payment).toBe("pending");
  expect(client.read().balance).toBe(before);
  expect(first.credits).toBe("732600");
  expect(orderSupportSummary(first)).toContain(`Order: ${first.id}`);
  expect(orderSupportSummary(first)).not.toMatch(/@|address|token|password|VAT/i);
  await client.resolve(first.id, "paid", { delayMs: 0 });
  await client.resolve(first.id, "paid", { delayMs: 0 });
  expect(BigInt(client.read().balance) - BigInt(before)).toBe(732600n);
  for (const p of packages) expect(BigInt(p.baseCredits) + BigInt(p.bonusCredits)).toBe(BigInt(p.totalCredits));
});

test("uncaptured failure, cancellation and captured refund never add credits", async () => {
  for (const outcome of ["failed", "cancelled", "refund-pending", "unknown"] as const) {
    const client = createBillingDemo();
    const before = client.read().balance;
    const order = await client.begin("5", { delayMs: 0 });
    await client.resolve(order.id, outcome, { delayMs: 0 });
    const saved = client.read().orders[0];
    expect(client.read().balance).toBe(before);
    expect(saved.fulfillment).not.toBe("credited");
    expect(saved.refund).toBe(outcome === "refund-pending" ? "pending" : outcome === "unknown" ? "unknown" : "not-required");
    if (outcome === "refund-pending") {
      await client.resolve(order.id, "refunded", { delayMs: 0 });
      expect(client.read().orders[0].refund).toBe("refunded");
    }
  }
});

test("reload restores pending identity but never trusts stored payment or credit amounts", async () => {
  const client = createBillingDemo();
  const order = await client.begin("30", { delayMs: 0 });
  const restored = restorePendingOrder(JSON.stringify({ id: order.id, packageId: order.packageId, createdAt: order.createdAt, payment: "paid", credits: "999999999" }));
  expect(restored?.payment).toBe("pending");
  expect(restored?.credits).toBe("2597400");
  const reloaded = createBillingDemo(restored);
  expect(reloaded.read().balance).toBe(client.read().balance);
  expect((await reloaded.begin("5", { delayMs: 0 })).id).toBe(order.id);
  for (const invalid of ["{}", "null", "broken", '{"id":"external","packageId":"5","createdAt":"today"}']) expect(restorePendingOrder(invalid)).toBeNull();
});

test("cancelled operations cannot mutate and failed profile save keeps original data", async () => {
  const client = createBillingDemo();
  const controller = new AbortController();
  const pending = client.begin("5", { signal: controller.signal, delayMs: 100 });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(client.read().orders.some(o => o.payment === "pending")).toBe(false);
  const profile = { ...client.read().profile, company: "Demo company" };
  await expect(client.saveProfile(profile, { fail: true, delayMs: 0 })).rejects.toThrow("Simulated save failure");
  expect(client.read().profile.company).toBeNull();
  const saving = client.saveProfile(profile, { delayMs: 0 });
  profile.company = "Late edit";
  await saving;
  expect(client.read().profile.company).toBe("Demo company");
  expect(createBillingDemo().read().profile.company).toBeNull();
});
