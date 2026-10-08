import { useState } from "react";
import { Link } from "react-router-dom";
import { ProviderLogo } from "./ProviderLogo";
import { deals, multiply, subtract, usdTotal } from "../content/homeDeals";

// Image counts per month; text volumes are millions of input tokens per month.
const volumes = { image: [1000, 10000, 100000], text: [10, 100, 1000] } as const;
const volumeLabel = (modality: "image" | "text", volume: number) =>
  modality === "image" ? volume.toLocaleString("en-US") : volume >= 1000 ? `${volume / 1000}B` : `${volume}M`;

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
    <div className="deal-calculator-result" aria-live="polite">
      {/* A receipt that "prints" from the slot on every change; the saving is the minus line. */}
      <span className="calc-printer" aria-hidden="true" />
      <div className="calc-receipt-frame">
        <div className="calc-receipt" key={`${dealIndex}-${volumeIndex}`}>
          <p className="calc-receipt-head"><span>AIAPI.deals · receipt</span><span>per month</span></p>
          <p className="calc-receipt-item">{volumeLabel(deal.modality, quantity)} {deal.modality === "image" ? "images" : "input tokens"} · {deal.name}</p>
          <div className="calc-row"><span className="calc-who"><ProviderLogo name={deal.provider} size={18} />{deal.provider} official price</span><span className="calc-money">{usdTotal(official)}</span></div>
          <div className="calc-row calc-row-discount"><span className="calc-who"><img src="/favicon.svg" alt="" width={18} height={18} />AIAPI.deals discount <b>−{rate.percent}%</b></span><span className="calc-money">−<span className="deal-calculator-saved">{usdTotal(saved)}</span></span></div>
          <div className="calc-row calc-row-total"><span>You pay</span><span className="calc-total">≈ {usdTotal(ours)}</span></div>
        </div>
      </div>
      <p className="deal-calculator-percent">That's up to {rate.percent}% less than the official price.</p>
    </div>
    <p className="deal-calculator-note">{deal.modality === "text" ? "Input tokens only; output is billed separately. " : ""}Reference: {deal.basis}. Preview rates; your total depends on your requests.</p>
    <Link className="button" to="/signup">Start saving now</Link>
  </section>;
}
