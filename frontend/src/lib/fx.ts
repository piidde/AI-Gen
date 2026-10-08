import { useEffect, useState } from "react";

// Display-only USD→EUR estimate (ECB reference rate via Frankfurter). Never used for
// billing: checkout stays in USD. Fetched client-side only so prerendering stays static.
const ENDPOINT = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR";
const STORAGE_KEY = "aiapi-usd-eur";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

type Cached = { rate: number; fetchedAt: number };
let memory: Cached | null = null;
let inflight: Promise<Cached | null> | null = null;

function valid(value: unknown): value is Cached {
  const cached = value as Cached | null;
  return !!cached && Number.isFinite(cached.rate) && cached.rate > 0 && Number.isFinite(cached.fetchedAt);
}

function readStored(): Cached | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return valid(parsed) ? parsed : null;
  } catch { return null; }
}

function load(): Promise<Cached | null> {
  inflight ??= fetch(ENDPOINT)
    .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
    .then((body: { rates?: { EUR?: number } }) => {
      const rate = body.rates?.EUR;
      if (typeof rate !== "number" || !(rate > 0)) throw new Error("Unexpected rate payload");
      const fresh = { rate, fetchedAt: Date.now() };
      memory = fresh;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch { /* storage unavailable */ }
      return fresh;
    })
    .catch(() => null)
    .finally(() => { inflight = null; });
  return inflight;
}

/** USD→EUR rate once EUR display is requested; null while loading or unavailable. */
export function useUsdToEur(enabled: boolean): number | null {
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const cached = memory ?? readStored();
    if (cached) { memory = cached; setRate(cached.rate); }
    if (!cached || Date.now() - cached.fetchedAt > MAX_AGE_MS) {
      load().then(fresh => { if (active && fresh) setRate(fresh.rate); });
    }
    return () => { active = false; };
  }, [enabled]);
  return enabled ? rate : null;
}

/** Format a USD decimal string for display; falls back to USD when EUR cannot be estimated. */
export function money(decimal: string, currency: "USD" | "EUR", rate: number | null): string {
  if (currency !== "EUR" || rate === null || !/^\d+(\.\d+)?$/.test(decimal)) return `$${decimal}`;
  const eur = Number(decimal) * rate;
  const places = Math.max(2, decimal.split(".")[1]?.length ?? 0, eur < 0.01 ? 3 : 0);
  return `€${eur.toLocaleString("en-US", { minimumFractionDigits: places, maximumFractionDigits: places })}`;
}
