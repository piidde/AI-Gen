import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { catalogue, packages, snapshot } from "../src/content/catalogue";
import { addAmounts, creditsToUsd, decimalAmount, formatAmount, rateCost, usdRateCost, compareRate } from "../src/lib/pricing";
import type { ReferenceRate } from "../src/content/catalogue";

test("reference inventory preserves every documented tariff and unknown cache", () => {
  const evidence = readFileSync(new URL("../../docs/MODEL_PRICING.md", import.meta.url), "utf8");
  const tariffSection = evidence.split("### Upstream credit rates")[1]!.split("### USD packages")[0]!;
  const rows = [...tariffSection.matchAll(/^\| `([^`]+)` \| (\d+) \|(?: (\d+) \| ([\d?]+) \|)?$/gm)];
  expect(rows).toHaveLength(29);
  expect(new Set(catalogue.map(model => model.upstreamId)).size).toBe(29);
  for (const [, id, input, output, cache] of rows) {
    const model = catalogue.find(model => model.upstreamId === id)!;
    expect(model).toBeDefined();
    expect(model.rates.map(rate => rate.credits)).toEqual(output ? [input, output, cache === "?" ? null : cache] : [input]);
    expect(model.publicApiId).toBeNull();
    expect(model.support.status).toBe("awaiting-evidence");
    expect(model.availability).not.toBe("available");
  }
  expect(catalogue.filter(model => model.modality === "image")).toHaveLength(15);
  expect(catalogue.filter(model => model.modality === "text")).toHaveLength(14);
  expect(catalogue.flatMap(model => model.rates).every(rate => rate.comparison.status !== "verified")).toBe(true);
});

test("fixed conversion and package bonuses remain exact and independent", () => {
  expect(snapshot.creditsPerUsd).toBe("66600");
  expect(formatAmount(creditsToUsd("600"))).toEqual({ decimal: "0.009009", approximate: true });
  expect(packages.map(p => p.totalCredits)).toEqual(["333000", "732600", "2597400", "5994000", "11322000", "19980000", "133200000"]);
  for (const p of packages) {
    expect(BigInt(p.baseCredits)).toBe(BigInt(p.usd) * 66600n);
    expect(BigInt(p.baseCredits) + BigInt(p.bonusCredits)).toBe(BigInt(p.totalCredits));
  }
  expect(formatAmount(creditsToUsd("9007199254740993000000"))).toEqual({ decimal: "135243232053168063.063063", approximate: true });
});

test("official candidates preserve recorded components, context tiers and deadlines", () => {
  const evidence = readFileSync(new URL("../../docs/MODEL_PRICING.md", import.meta.url), "utf8");
  const section = evidence.split("### Official text reference rates")[1]!.split("### Official image")[0]!;
  const rows = [...section.matchAll(/^\| `([^`]+)` \| ([\d.]+) \| ([\d.]+) \| ([\d.]+) \| ([^\n]+) \|$/gm)];
  let candidates = 0;
  for (const model of catalogue.filter(model => model.modality === "text" && model.identity.status === "verified")) {
    candidates++;
    const row = rows.find(row => row[1] === model.upstreamId)!;
    expect(row, model.upstreamId).toBeDefined();
    expect(model.rates.map(rate => rate.official[0]!.usd)).toEqual(row.slice(2, 5));
    if (model.provider === "OpenAI") expect(model.rates[0]!.official[0]!.conditions).toContain("<=272000");
    if (model.upstreamId === "gemini-2.5-pro") {
      const high = rows.find(row => row[1] === model.upstreamId && row[5]!.includes(">200K"))!;
      expect(model.rates.map(rate => rate.official[1]!.usd)).toEqual(high.slice(2, 5));
      expect(model.rates[0]!.official[1]!.conditions).toContain(">200000");
    }
  }
  expect(candidates).toBe(11);
  const get = (id: string) => catalogue.find(model => model.upstreamId === id)!;
  expect(get("gpt-6-astra").rates.map(rate => rate.official[1]?.usd)).toEqual(["20", "75", "2"]);
  expect(get("gpt-5.6-terra").rates.map(rate => rate.official[1]?.usd)).toEqual(["4", "18", "0.40"]);
  expect(get("gpt-5.6-sol").rates.map(rate => rate.official[1]?.usd)).toEqual(["8", "30", "0.80"]);
  expect(get("gpt-5.5").rates.map(rate => rate.official[1]?.usd)).toEqual(["10", "45", undefined]);
  expect(get("gpt-5.6-sol").rates[0]!.official[0]!.recheckOn).toBe("2026-11-21");
  for (const id of ["gemini-3.7-flash", "gemini-3.8-flash"]) expect(get(id).rates[0]!.official[0]!.recheckOn).toBe("2027-01-01");
  expect(get("gpt-5.5").rates[0]!.official[0]!.recheckOn).toBeNull();
});

test("text buckets and image output retain exact amounts until final display", () => {
  const rates = catalogue.find(model => model.upstreamId === "gpt-5.6-terra")!.rates;
  const costs = rates.map((rate, i) => rateCost(rate, ["1000", "2000", "500"][i]!));
  expect(formatAmount(addAmounts(costs))).toEqual({ decimal: "0.003407", approximate: true });
  expect(formatAmount(creditsToUsd("226.9"))).toEqual(formatAmount(addAmounts(costs)));
  const officialCosts = rates.map((rate, i) => usdRateCost(rate.official[0]!.usd, "1000000", ["1000", "2000", "500"][i]!));
  expect(formatAmount(addAmounts(officialCosts))).toEqual({ decimal: "0.026100", approximate: false });
  // Official output-only example: 1680 tokens * $60/M, not an upstream total.
  expect(formatAmount(usdRateCost("60", "1000000", "1680"))).toEqual({ decimal: "0.100800", approximate: false });
  expect(() => rateCost({ credits: null, per: "1000000" }, "1")).toThrow(/unavailable/i);
});

test("display rounds once, preserves tiny nonzero values and rejects malformed amounts", () => {
  expect(formatAmount(decimalAmount("1.2345675"))).toEqual({ decimal: "1.234568", approximate: true });
  expect(formatAmount(decimalAmount("-1.2345675"))).toEqual({ decimal: "-1.234568", approximate: true });
  expect(formatAmount(decimalAmount("0.00000001"))).toEqual({ decimal: "<0.000001", approximate: true });
  expect(formatAmount(decimalAmount("-0.00000001"))).toEqual({ decimal: ">-0.000001", approximate: true });
  for (const bad of ["NaN", "Infinity", "1e3", "$5", "1,000", " 1", ""]) expect(() => decimalAmount(bad)).toThrow();
  expect(() => creditsToUsd("-1")).toThrow();
  expect(() => rateCost({ credits: "1", per: "0" }, "1")).toThrow();
  expect(() => rateCost({ credits: "1", per: "1" }, "-1")).toThrow();
});

test("comparisons fail closed for evidence, unit, settings and freshness gaps", () => {
  const rate: ReferenceRate = {
    component: "input", credits: "66600", unit: "tokens", per: "1000000", conditions: "text-standard",
    comparison: { status: "verified", reason: "Synthetic test equivalence" },
    official: [{ usd: "2", unit: "tokens", per: "1000000", conditions: "text-standard", source: "https://example.test/rate", recheckOn: "2026-11-21" }],
  };
  expect(compareRate(rate, 0, "2026-09-20")).toEqual({ status: "available", percent: "50.0" });
  expect(compareRate({ ...rate, credits: "199800" }, 0, "2026-09-20")).toEqual({ status: "error", reason: "Reference price exceeds the equivalent official price. Reconciliation required." });
  expect(compareRate({ ...rate, credits: "133200" }, 0, "2026-09-20")).toEqual({ status: "available", percent: "0.0" });
  expect(compareRate({ ...rate, credits: "133201" }, 0, "2026-09-20")).toEqual({ status: "error", reason: "Reference price exceeds the equivalent official price. Reconciliation required." });
  expect(compareRate({ ...rate, credits: "133199" }, 0, "2026-09-20")).toEqual({ status: "available", percent: "<0.1" });
  for (const official of [
    { ...rate.official[0]!, unit: "requests" as const },
    { ...rate.official[0]!, per: "1" },
    { ...rate.official[0]!, conditions: "image-output-only" },
    { ...rate.official[0]!, usd: "0" },
  ]) expect(compareRate({ ...rate, official: [official] }, 0, "2026-09-20").status).toBe("unavailable");
  expect(compareRate(rate, 0, "2026-11-21").status).toBe("unavailable");
  expect(compareRate(rate, 0, "2026-09-31").status).toBe("unavailable");
  expect(compareRate(rate, 0, "2026-09-19").status).toBe("unavailable");
  expect(compareRate({ ...rate, official: [{ ...rate.official[0]!, recheckOn: null }] }, 0, "2026-09-20").status).toBe("unavailable");
  expect(compareRate(rate, 4, "2026-09-20").status).toBe("unavailable");
  for (const model of catalogue) for (const reference of model.rates) {
    expect(compareRate(reference, 0, "2026-09-20").status).toBe("unavailable");
  }
});
