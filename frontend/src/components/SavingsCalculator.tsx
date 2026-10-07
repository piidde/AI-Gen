import { useState } from "react";
import { Link } from "react-router-dom";
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

  return <section className="deal-calculator" aria-labelledby="calculator-title">
    <h2 id="calculator-title" className="deal-calculator-title">Savings calculator</h2>
    <fieldset>
      <legend>Model</legend>
      <div className="deal-choices deal-choices-models">
        {deals.map((option, index) => <button type="button" key={option.id} aria-pressed={index === dealIndex} onClick={() => setDealIndex(index)}>{option.name}</button>)}
      </div>
    </fieldset>
    <fieldset>
      <legend>{deal.modality === "image" ? "Images per month" : "Input tokens per month"}</legend>
      <div className="deal-choices deal-choices-volumes">
        {volumes[deal.modality].map((volume, index) => <button type="button" key={volume} aria-pressed={index === volumeIndex} onClick={() => setVolumeIndex(index)}>{volumeLabel(deal.modality, volume)}</button>)}
      </div>
    </fieldset>
    <div className="deal-calculator-result" aria-live="polite">
      <dl>
        <div><dt>Official API bill</dt><dd><s className="deal-strike">{usdTotal(official)}</s></dd></div>
        <div><dt>Your AIAPI.deals bill</dt><dd>≈ {usdTotal(ours)}</dd></div>
      </dl>
      <p className="deal-calculator-label">You keep every month</p>
      <p className="deal-calculator-saved"><span className="deal-approx">≈</span>{usdTotal(subtract(official, ours))}</p>
      <p className="deal-calculator-percent">That's up to {rate.percent}% less than the official price.</p>
    </div>
    <p className="deal-calculator-note">{deal.modality === "text" ? "Input tokens only; output is billed separately. " : ""}Reference: {deal.basis}. Preview rates; your total depends on your requests.</p>
    <Link className="button" to="/signup">Start saving now</Link>
  </section>;
}
