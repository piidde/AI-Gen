import { catalogue, type CatalogueReference } from './catalogue';
import { bestImageSettings, openaiImageUsd, publishedDifference, publishedReference, sellingPrice } from './publishedPrices';
import { decimalAmount, formatAmount, type ExactAmount } from '../lib/pricing';

// Homepage deal cards and the savings calculator share these derived prices so a
// card, the ticker and the calculator can never disagree. GPT Image 2.5 compares
// against official 1K High, as in the compact ModelPrices view. Unlike the catalogue's
// "up to" presets, every homepage image model is compared at the same 1K resolution
// (owner request, 2026-10-07) so models can be compared with each other fairly.

export type DealRate = {
  label: 'Image request' | 'Input' | 'Output';
  ours: ExactAmount;
  official: ExactAmount;
  percent: string;
  unit: string;
};

export type Deal = {
  id: string;
  name: string;
  provider: CatalogueReference['provider'];
  modality: CatalogueReference['modality'];
  family: string;
  basis: string;
  rates: DealRate[];
};

const featured: [id: string, name: string][] = [
  ['gpt-image-2.5', 'GPT Image 2.5'],
  ['gpt-6-astra', 'GPT-6 Astra'],
  ['nano-banana-pro', 'Nano Banana Pro'],
  ['gemini-3.8-flash', 'Gemini 3.8 Flash'],
];
const homepageResolution = '1K';

function dealFor(model: CatalogueReference, name: string): Deal {
  const image = model.modality === 'image';
  const autoQuality = model.upstreamId === 'gpt-image-2.5';
  const settings = { resolution: homepageResolution, quality: bestImageSettings(model).quality };
  const rates = model.rates.filter(rate => rate.component !== 'cached-input').map((rate): DealRate => {
    if (rate.credits === null) throw new Error(`Featured deal without a listed rate: ${model.upstreamId}`);
    const reference = publishedReference(model, rate, settings);
    const officialUsd = autoQuality ? openaiImageUsd(model.upstreamId, '1K', 'high') : reference.status === 'available' ? reference.usd : null;
    if (officialUsd === null) throw new Error(`Featured deal without an official reference: ${model.upstreamId}`);
    const difference = publishedDifference(rate.credits, officialUsd);
    if (difference?.direction !== 'lower') throw new Error(`Featured deal is not below the official price: ${model.upstreamId}`);
    return {
      label: image ? 'Image request' : rate.component === 'input' ? 'Input' : 'Output',
      ours: sellingPrice(rate.credits),
      official: decimalAmount(officialUsd),
      percent: difference.percent,
      unit: image ? 'request' : '1M tokens',
    };
  });
  const firstReference = publishedReference(model, model.rates[0]!, settings);
  const basis = autoQuality ? '1K · Auto quality; official High reference'
    : image ? `${homepageResolution} image output`
      : firstReference.status === 'available' ? firstReference.basis.replace(/; input$|; output$/, '') : '';
  return { id: model.upstreamId, name, provider: model.provider, modality: model.modality, family: model.family, basis, rates };
}

export const deals: Deal[] = featured.map(([id, name]) => {
  const model = catalogue.find(entry => entry.upstreamId === id);
  if (!model) throw new Error(`Missing homepage deal: ${id}`);
  return dealFor(model, name);
});

/** Largest headline saving among the featured deals, for "up to" claims. */
export const maxDealPercent = Math.max(...deals.flatMap(deal => deal.rates.map(rate => Number(rate.percent))));

export function subtract(a: ExactAmount, b: ExactAmount): ExactAmount {
  return { numerator: a.numerator * b.denominator - b.numerator * a.denominator, denominator: a.denominator * b.denominator };
}

export function multiply(amount: ExactAmount, quantity: number): ExactAmount {
  return { numerator: amount.numerator * BigInt(quantity), denominator: amount.denominator };
}

/**
 * Dollar display. Our prices follow the catalogue rule (three places below one cent).
 * Official references and savings below $1 get a third place whenever two places
 * would round, so $0.134 and $0.053 are not shown as $0.13 and $0.05.
 */
export function usd(amount: ExactAmount, kind: 'ours' | 'reference' | 'saving' = 'ours') {
  // Savings keep a third place only below ten cents ($0.047), otherwise two ($0.12).
  if (kind === 'saving') {
    const formatted = formatAmount(amount, amount.numerator * 10n < amount.denominator ? 3 : 2);
    return `${formatted.approximate ? '≈ ' : ''}$${formatted.decimal}`;
  }
  let places = amount.numerator > 0n && amount.numerator * 100n < amount.denominator ? 3 : 2;
  if (kind === 'reference' && places === 2 && amount.numerator < amount.denominator && formatAmount(amount, 2).approximate) places = 3;
  const formatted = formatAmount(amount, places);
  return `${formatted.approximate ? '≈ ' : ''}$${formatted.decimal}`;
}

/** Whole-dollar-style grouping for calculator totals. */
export function usdTotal(amount: ExactAmount) {
  const formatted = formatAmount(amount, 2);
  const [whole, fraction] = formatted.decimal.split('.');
  return `$${Number(whole).toLocaleString('en-US')}.${fraction}`;
}

/** Part as a percentage of whole (two decimals), for proportional price bars only. */
export function share(part: ExactAmount, whole: ExactAmount) {
  return Number((part.numerator * whole.denominator * 10000n) / (part.denominator * whole.numerator)) / 100;
}
