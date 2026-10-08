import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProviderLogo } from "./ProviderLogo";
import { deals, multiply, share, subtract, usdTotal } from "../content/homeDeals";

// Image counts per month; text volumes are millions of input tokens per month.
const volumes = { image: [1000, 10000, 100000], text: [10, 100, 1000] } as const;
const volumeLabel = (modality: "image" | "text", volume: number) =>
  modality === "image" ? volume.toLocaleString("en-US") : volume >= 1000 ? `${volume / 1000}B` : `${volume}M`;

const variants = ["receipt", "split", "equation"] as const;

export default function SavingsCalculator() {
  const [dealIndex, setDealIndex] = useState(0);
  const [volumeIndex, setVolumeIndex] = useState(1);
  const deal = deals[dealIndex]!;
  // Text models are compared on input tokens; output is listed on the card.
  const rate = deal.rates[0]!;
  const quantity = volumes[deal.modality][volumeIndex]!;
  const official = multiply(rate.official, quantity);
  const ours = multiply(rate.ours, quantity);
  const saved = subtract(official, ours);
  // Design exploration: ?calc=receipt|split|equation picks the result layout.
  const [params] = useSearchParams();
  const variant = variants.find(entry => entry === params.get("calc")) ?? variants[0];

  return <section className="deal-calculator" aria-labelledby="calculator-title">
    <h2 id="calculator-title" className="deal-calculator-title">Savings calculator</h2>
    <fieldset>
      <legend>Model</legend>
      <div className="deal-choices deal-choices-models">
        {deals.map((option, index) => <button type="button" key={option.id} aria-pressed={index === dealIndex} onClick={() => setDealIndex(index)}><ProviderLogo name={option.name} size={16} /> {option.name}</button>)}
      </div>
    </fieldset>
    <fieldset>
      <legend>{deal.modality === "image" ? "Images per month" : "Input tokens per month"}</legend>
      <div className="deal-choices deal-choices-volumes">
        {volumes[deal.modality].map((volume, index) => <button type="button" key={volume} aria-pressed={index === volumeIndex} onClick={() => setVolumeIndex(index)}>{volumeLabel(deal.modality, volume)}</button>)}
      </div>
    </fieldset>
    <div className={`deal-calculator-result calc-${variant}`} aria-live="polite" key={variant}>
      {variant === "receipt" && <>
        {/* A: itemised receipt. The saving is a minus line, so the maths reads top to bottom. */}
        <div className="calc-receipt">
          <div className="calc-row"><span className="calc-who"><ProviderLogo name={deal.provider} size={18} />{deal.provider} official price</span><span className="calc-money">{usdTotal(official)}</span></div>
          <div className="calc-row calc-row-discount"><span className="calc-who"><img src="/favicon.svg" alt="" width={18} height={18} />AIAPI.deals discount <b>−{rate.percent}%</b></span><span className="calc-money">−<span className="deal-calculator-saved">{usdTotal(saved)}</span></span></div>
          <div className="calc-row calc-row-total"><span>You pay / month</span><span className="calc-money">≈ {usdTotal(ours)}</span></div>
        </div>
      </>}
      {variant === "split" && <>
        {/* B: one bar = the official bill, split into what you pay and what you keep. */}
        <p className="calc-split-head"><span className="calc-who"><ProviderLogo name={deal.provider} size={18} />{deal.provider} official price</span><span className="calc-money">{usdTotal(official)}<small> / month</small></span></p>
        <div className="calc-split-bar" aria-hidden="true">
          <i className="calc-split-pay" style={{ width: `${Math.max(share(ours, official), 6)}%` }} />
          <i className="calc-split-save"><b>−{rate.percent}%</b></i>
        </div>
        <dl className="calc-split-legend">
          <div className="calc-split-legend-pay"><dt>You pay with AIAPI.deals</dt><dd>≈ {usdTotal(ours)}</dd></div>
          <div className="calc-split-legend-save"><dt>You keep</dt><dd><span className="deal-calculator-saved">{usdTotal(saved)}</span></dd></div>
        </dl>
      </>}
      {variant === "equation" && <>
        {/* C: the saving as an equation, answer first. */}
        <p className="calc-eq-label">You keep every month</p>
        <p className="calc-eq-hero"><span className="deal-calculator-saved">{usdTotal(saved)}</span></p>
        <div className="calc-eq">
          <div className="calc-eq-tile"><span className="calc-who"><ProviderLogo name={deal.provider} size={16} />{deal.provider} price</span><s className="deal-strike calc-money">{usdTotal(official)}</s></div>
          <span className="calc-eq-op" aria-hidden="true">−</span>
          <div className="calc-eq-tile calc-eq-ours"><span className="calc-who"><img src="/favicon.svg" alt="" width={16} height={16} />Your price</span><span className="calc-money">≈ {usdTotal(ours)}</span></div>
          <span className="calc-eq-op" aria-hidden="true">=</span>
          <div className="calc-eq-tile calc-eq-save"><span className="calc-who">Saved</span><span className="calc-money">−{rate.percent}%</span></div>
        </div>
      </>}
      <p className="deal-calculator-percent">That's up to {rate.percent}% less than the official price.</p>
    </div>
    <p className="deal-calculator-note">{deal.modality === "text" ? "Input tokens only; output is billed separately. " : ""}Reference: {deal.basis}. Preview rates; your total depends on your requests.</p>
    <Link className="button" to="/signup">Start saving now</Link>
    {import.meta.env.DEV && <nav className="calc-variant-switch" aria-label="Calculator design options">
      {variants.map((entry, index) => <Link key={entry} to={`?calc=${entry}#calculator`} aria-current={entry === variant ? "true" : undefined} replace preventScrollReset>{String.fromCharCode(65 + index)} · {entry}</Link>)}
    </nav>}
  </section>;
}
