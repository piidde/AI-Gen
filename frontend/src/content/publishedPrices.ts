import type { CatalogueReference, ReferenceRate } from './catalogue';
import { decimalAmount } from '../lib/pricing';

// Published examples, NOT settlement/equivalence evidence. Research: MODEL_PRICING.md.
// Image examples compare one listed request with one official output, excluding inputs.
const openai = 'https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency';
const google = 'https://ai.google.dev/gemini-api/docs/pricing';
type Reference = { status: 'available'; usd: string; basis: string; source: string; example: boolean };
type Missing = { status: 'unavailable'; reason: string };
export type ImageSettings = { resolution: string; quality: string };
export function imageOptions(model: CatalogueReference) {
  const resolutions = model.listedResolutions.length ? model.listedResolutions : ['1K'];
  const qualities = model.provider === 'Google' ? [] : model.upstreamId === 'gpt-image-2-vip' ? ['medium'] : model.upstreamId === 'gpt-image-2.5-sunburst'
    ? ['low', 'medium', 'high', 'xhigh', 'max'] : ['low', 'medium', 'high'];
  return { resolutions, qualities };
}
// USD150 buys19,980,000 credits; retail adds20% to that acquisition cost.
export function sellingPrice(credits: string) {
  const value = decimalAmount(credits);
  if (value.numerator < 0n) throw new Error('Negative model tariff');
  return { numerator: value.numerator * 120n, denominator: value.denominator * 133200n * 100n };
}

// Maximum among explicitly listed comparison presets, not a cross-model bargain.
export function bestImageSettings(model: CatalogueReference): ImageSettings {
  // Auto-only tiers: use the low-quality family benchmark, never assume a
  // particular higher-quality output. This is a labelled price example only.
  if (['gpt-image-2', 'gpt-image-2.5'].includes(model.upstreamId)) return { resolution: '1K', quality: 'low' };
  const options = imageOptions(model);
  let best = defaultImageSettings(model);
  let highest = decimalAmount('0');
  for (const resolution of options.resolutions) for (const quality of options.qualities.length ? options.qualities : ['medium']) {
    const candidate = { resolution, quality };
    const reference = publishedReference(model, model.rates[0]!, candidate);
    if (reference.status !== 'available') continue;
    const amount = decimalAmount(reference.usd);
    if (amount.numerator * highest.denominator > highest.numerator * amount.denominator) {
      highest = amount;
      best = candidate;
    }
  }
  return best;
}

export function defaultImageSettings(model: CatalogueReference): ImageSettings {
  return { resolution: imageOptions(model).resolutions[0]!, quality: 'medium' };
}

// Official calculator: aspect-ratio grid with round-half-to-even, then ceil tokens.
// 4K is UHD landscape; a 4096-square image exceeds the official pixel budget.
export function openaiImageUsd(model: string, resolution: string, quality: string): string {
  const sizes: Record<string, [number, number]> = { '1K': [1024,1024], '2K': [2048,2048], '4K': [3840,2160] };
  const factors: Record<string, number> = model.startsWith('gpt-image-2.5')
    ? { low:16, medium:24, high:48, xhigh:64, max:96 } : { low:16, medium:48, high:96 };
  const size = sizes[resolution], factor = factors[quality];
  if (!size || !factor) throw new Error('Unsupported image comparison settings');
  const [width,height] = size;
  const short = factor * height / width;
  const floor = Math.floor(short);
  const grid = short - floor === 0.5 ? floor + floor % 2 : Math.round(short);
  const tokens = Math.ceil(factor * grid * (2000000 + width * height) / 4000000);
  return (tokens * 30 / 1000000).toFixed(5);
}

export function publishedReference(model: CatalogueReference, rate: ReferenceRate, settings = defaultImageSettings(model)): Reference | Missing {
  if (model.modality === 'image') {
    const options = imageOptions(model);
    if (!options.resolutions.includes(settings.resolution) || (options.qualities.length > 0 && !options.qualities.includes(settings.quality))) {
      return { status: 'unavailable', reason: 'These settings are not listed for this variant.' };
    }
    if (model.provider === 'OpenAI') {
      const dimensions: Record<string, string> = { '1K': '1024 × 1024', '2K': '2048 × 2048', '4K': '3840 × 2160' };
      const name = model.upstreamId === 'gpt-image-2.5' ? 'Sunburst/Flare family reference' : model.upstreamId;
      return { status: 'available', usd: openaiImageUsd(model.upstreamId, settings.resolution, settings.quality),
        basis: name + ' · ' + dimensions[settings.resolution] + ' · ' + settings.quality[0]!.toUpperCase() + settings.quality.slice(1) + ' quality', source: openai, example: true };
    }
    const pro = model.upstreamId.startsWith('nano-banana-pro');
    const lite = ['nano-banana-2-lite','nano-banana-fast'].includes(model.upstreamId);
    const prices: Record<string, string> = pro ? { '1K':'0.1344', '2K':'0.1344', '4K':'0.24' }
      : lite ? { '1K':'0.0336' } : { '1K':'0.0672', '2K':'0.1008', '4K':'0.1512' };
    return { status: 'available', usd: prices[settings.resolution]!,
      basis: (pro ? 'Gemini 3 Pro Image' : lite ? 'Gemini 3.1 Flash-Lite Image' : 'Gemini 3.1 Flash Image') + ' reference · ' + settings.resolution,
      source: google, example: true };
  }
  const official = rate.official[0];
  if (official && rate.unit === official.unit && rate.per === official.per) {
    return { status: 'available', usd: official.usd, basis: official.conditions.replace('Paid Standard text; ', 'Standard · ').replace('ordinary context; ', ''), source: official.source, example: false };
  }
  const preview = model.upstreamId === 'gemini-3.1-pro' ? ['2', '12', '0.20']
    : model.upstreamId === 'gemini-3-flash' ? ['0.50', '3', '0.05'] : null;
  if (preview) return { status: 'available', usd: preview[rate.component === 'input' ? 0 : rate.component === 'output' ? 1 : 2]!,
    basis: `${model.upstreamId}-preview reference${model.upstreamId === 'gemini-3.1-pro' ? ' · ≤200K input' : ''}`, source: google, example: true };
  return { status: 'unavailable', reason: model.upstreamId === 'gemini-3-pro'
    ? 'No verified current comparison for this alias.' : 'No sourced official rate.' };
}

export function publishedDifference(credits: string, officialUsd: string): { direction: 'lower' | 'higher' | 'equal'; percent: string } | null {
  const actual = sellingPrice(credits);
  const baseline = decimalAmount(officialUsd);
  if (baseline.numerator <= 0n) return null;
  const difference = baseline.numerator * actual.denominator - actual.numerator * baseline.denominator;
  if (difference === 0n) return { direction: 'equal', percent: '0' };
  const denominator = baseline.numerator * actual.denominator;
  const magnitude = (difference < 0n ? -difference : difference) * 100n;
  // Understate savings, never understate a higher reference charge.
  const whole = difference > 0n ? magnitude / denominator : (magnitude + denominator - 1n) / denominator;
  return { direction: difference > 0n ? 'lower' : 'higher', percent: whole === 0n ? '<1' : whole.toString() };
}
