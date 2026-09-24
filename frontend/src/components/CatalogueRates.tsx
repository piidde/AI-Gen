import type { ReferenceRate } from "../content/catalogue";
import { snapshot } from "../content/catalogue";
import { formatAmount } from "../lib/pricing";
import { sellingPrice } from "../content/publishedPrices";
import { formatMoney } from "../lib/formatting";

const labels = { input: "Input", output: "Output", "cached-input": "Cache read", "image-request": "Generation" };
export type DisplayCurrency = "USD" | "EUR";

export default function CatalogueRates({ rates, currency, detailed = false }: {
  rates: ReferenceRate[]; currency: DisplayCurrency; detailed?: boolean;
}) {
  return <div className="catalogue-rates">
    {rates.map(rate => {
      const amount = rate.credits === null ? null : formatAmount(sellingPrice(rate.credits));
      const unit = rate.unit === "requests" ? `per ${rate.per === "1" ? "request" : `${rate.per} requests`}` : `per ${BigInt(rate.per).toLocaleString("en-US")} tokens`;
      return <section className="reference-rate" key={rate.component} aria-label={`${labels[rate.component]} rate`}>
        <div className="bill-row"><span>{labels[rate.component]}</span><strong className={rate.credits === null ? "" : "price"}>{amount ? `${amount.approximate ? '≈ ' : ''}$${amount.decimal} USD` : 'Rate unavailable'}</strong></div>
        <p className="billing-unit">{rate.credits === null ? "Credits unavailable" : `${BigInt(rate.credits).toLocaleString("en-US")} credits`} · {unit}</p>
        {detailed && <>
          <p>{rate.conditions}</p>
          {rate.official.map((official, index) => <div className="official-rate" key={index}>
            <strong>Official reference: {formatMoney(official.usd)} per {BigInt(official.per).toLocaleString("en-US")} {official.unit}</strong>
            <p>{official.conditions}</p>
            <p><a className="text-link" href={official.source}>Official source</a> · checked {snapshot.checkedOn}{official.recheckOn ? ` · recheck by ${official.recheckOn}` : " · recheck required before publication"}</p>
          </div>)}
          {rate.comparison.status !== 'verified' && <p>Comparison unavailable: {rate.comparison.reason}</p>}
        </>}
      </section>;
    })}
  </div>;
}
