import { packages } from "../content/catalogue";
import { demoSnapshot } from "./demoSnapshot";
import { waitForDemo } from "./demoClient";
import type { BillingProfile, Order } from "./viewModels";

export type PurchaseOutcome = "paid" | "cancelled" | "failed" | "refund-pending" | "refunded" | "unknown";
type Options = { signal?: AbortSignal; delayMs?: number; fail?: boolean };
const unavailable = { status: "unavailable", reason: "No authentic document exists for a demo order." } as const;

function pendingOrder(usd: string, id = `demo-order-${crypto.randomUUID()}`, createdAt = new Date().toISOString()): Order {
  const pack = packages.find(p => p.usd === usd);
  if (!pack) throw new Error("Unknown reference package");
  return { id, packageId: usd, createdAt, updatedAt: createdAt, usd,
    credits: pack.totalCredits, payment: "pending", fulfillment: "pending", refund: "unknown",
    receipt: { status: "pending", reason: "Awaiting payment confirmation." },
    invoice: { status: "pending", reason: "Awaiting payment confirmation and provider document rules." } };
}

// Only identity is restored. Storage and return URLs can never confirm payment.
export function restorePendingOrder(raw: string | null): Order | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const { id, packageId, createdAt } = value as Record<string, unknown>;
    if (typeof id !== "string" || !/^demo-order-[a-z0-9-]{1,64}$/.test(id)
      || typeof packageId !== "string" || !packages.some(p => p.usd === packageId)
      || typeof createdAt !== "string" || !/^\d{4}-\d\d-\d\dT.*Z$/.test(createdAt)
      || !Number.isFinite(Date.parse(createdAt))) return null;
    return pendingOrder(packageId, id, createdAt);
  } catch { return null; }
}

export function needsReconciliation(order: Order): boolean {
  return order.payment === "pending" || order.payment === "unknown" || order.refund === "pending";
}

function applyOutcome(order: Order, outcome: PurchaseOutcome): Order {
  const refunded = outcome === "refunded";
  const capturedFailure = outcome === "refund-pending";
  return { ...order, updatedAt: new Date().toISOString(),
    payment: capturedFailure ? "failed" : outcome,
    fulfillment: outcome === "paid" ? "credited" : outcome === "unknown" ? "unknown" : "unfulfilled",
    refund: refunded ? "refunded" : capturedFailure ? "pending" : outcome === "unknown" ? "unknown" : "not-required",
    receipt: unavailable, invoice: unavailable };
}

const history = (["paid", "failed", "cancelled", "refunded"] as const).map((outcome, index) => {
  const at = `2026-09-${19 - index}T10:00:00Z`;
  return { ...applyOutcome(pendingOrder("5", `demo-order-sample-${index + 1}`, at), outcome), updatedAt: at };
});

// Explicitly fictional accounting only. No network, live wallet, or payment API.
export function createBillingDemo(restored: Order | null = null) {
  let balance = "333000";
  let orders = structuredClone(restored ? [restored, ...history] : history);
  let profile = structuredClone(demoSnapshot.profile.billing);
  const read = () => structuredClone({ balance, orders, profile });
  async function run<T>(operation: () => T, options: Options): Promise<T> {
    await waitForDemo(options);
    if (options.signal?.aborted) throw new DOMException("Demo operation cancelled", "AbortError");
    if (options.fail) throw new Error("Simulated save failure. Your edits are still here.");
    return structuredClone(operation());
  }
  return {
    read,
    begin: (usd: string, options: Options = {}) => run(() => {
      const pending = orders.find(needsReconciliation);
      if (pending) return pending;
      const order = pendingOrder(usd);
      orders.unshift(order);
      return order;
    }, options),
    resolve: (id: string, outcome: PurchaseOutcome, options: Options = {}) => run(() => {
      const order = orders.find(o => o.id === id);
      if (!order) throw new Error("Demo order not found");
      // Terminal outcomes are immutable; repeated confirmation cannot add credits.
      if (!needsReconciliation(order)) return order;
      if (order.refund === "pending" && outcome !== "refunded") throw new Error("Captured failure must finish refund reconciliation");
      if (outcome === "refunded" && order.refund !== "pending") throw new Error("No captured funds awaiting refund");
      const next = applyOutcome(order, outcome);
      orders = orders.map(o => o.id === id ? next : o);
      if (next.fulfillment === "credited") balance = (BigInt(balance) + BigInt(next.credits)).toString();
      return next;
    }, options),
    saveProfile: (value: BillingProfile, options: Options = {}) => {
      const submitted = structuredClone(value);
      return run(() => { profile = submitted; return profile; }, options);
    },
  };
}

export function orderExplanation(order: Order): string {
  if (order.refund === "pending") return "Captured funds, credits not delivered. Refund reconciliation is pending. Do not pay again for this order; check status or contact support.";
  if (order.refund === "refunded") return "Sample refund completed: captured funds returned, no credits delivered.";
  if (order.payment === "paid") return "Simulated confirmation: credits added to this demo wallet only. No real payment was made.";
  if (order.payment === "cancelled") return "Sample checkout cancelled before capture. No funds captured and no credits added.";
  if (order.payment === "failed") return "Sample payment failed before capture. No funds captured, no cash refund required, and no credits added.";
  return "Payment confirmation is pending or unknown. No credits have been added. Do not pay again for this order; check status or contact support. A return URL is not payment confirmation.";
}

export function orderSupportSummary(order: Order): string {
  return ["DEMO ORDER — no real payment", `Order: ${order.id}`, `Created (UTC): ${order.createdAt}`,
    `Amount: ${order.usd} USD`, `Payment: ${order.payment}`, `Fulfillment: ${order.fulfillment}`, `Refund: ${order.refund}`].join("\n");
}
