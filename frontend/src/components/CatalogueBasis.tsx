import { usePublicSearchParams } from "../lib/publicHydration";
import { Link } from "react-router-dom";
import { queryChoice, updateQuery } from "../lib/queryState";
import { snapshot } from "../content/catalogue";
import { useUsdToEur } from "../lib/fx";
import FilterSelect from "./FilterSelect";

export function useCatalogueCurrency() {
  const [params] = usePublicSearchParams();
  return queryChoice(params, "currency", ["USD", "EUR"], "USD");
}

export default function CatalogueBasis({ showExplanation = true }: { showExplanation?: boolean }) {
  const [params, setParams] = usePublicSearchParams();
  const currency = useCatalogueCurrency();
  const fxRate = useUsdToEur(currency === "EUR");
  return <div className="catalogue-basis">
    <div className="catalog-intro"><p>Prices checked {snapshot.checkedOn}. Official prices shown for comparison.</p><div className="catalogue-currency"><span>Display currency</span><FilterSelect label="Display currency" value={currency} options={[{value: 'USD', label: 'USD'}, {value: 'EUR', label: 'EUR'}]} onChange={value => setParams(updateQuery(params, 'currency', value, 'USD'))} /></div></div>
    {currency === "EUR" && <p role="status">{fxRate === null ? "EUR estimate loading or unavailable. Showing USD until it arrives. Checkout remains in USD." : `Approximate EUR at 1 USD = ${fxRate.toFixed(4)} EUR (ECB reference rate). Checkout remains in USD.`}</p>}
    {showExplanation && <details className="pricing-basis"><summary>How we compare prices</summary><p>Prices are in USD. Savings badges use exact, unrounded prices and the official price named on each card. Credit amounts and cache prices are in the model details.</p><p>For images we compare with the official price at the same resolution and quality, without input or thinking costs. The badge shows the best saving among the listed settings, so your own saving depends on the settings you use. A badge only appears when we are cheaper.</p><p>Availability shows the state at the last price check. It is not live monitoring. <Link className="text-link" to="/status">Service status</Link></p></details>}
  </div>;
}
