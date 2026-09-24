import { usePublicSearchParams } from "../lib/publicHydration";
import { Link } from "react-router-dom";
import { queryChoice, updateQuery } from "../lib/queryState";
import { snapshot } from "../content/catalogue";
import FilterSelect from "./FilterSelect";

export function useCatalogueCurrency() {
  const [params] = usePublicSearchParams();
  return queryChoice(params, "currency", ["USD", "EUR"], "USD");
}

export default function CatalogueBasis({ showExplanation = true }: { showExplanation?: boolean }) {
  const [params, setParams] = usePublicSearchParams();
  const currency = useCatalogueCurrency();
  return <div className="catalogue-basis">
    <div className="catalog-intro"><p>Preview prices · {snapshot.checkedOn}. Compare published rates and labelled image examples. Paid API access is not live yet.</p><div className="catalogue-currency"><span>Display currency</span><FilterSelect label="Display currency" value={currency} options={[{value: 'USD', label: 'USD'}, {value: 'EUR', label: 'EUR'}]} onChange={value => setParams(updateQuery(params, 'currency', value, 'USD'))} /></div></div>
    {currency === "EUR" && <p role="status">EUR estimate unavailable. Showing USD until a fresh estimate is supplied. Checkout remains in USD.</p>}
    {showExplanation && <details className="pricing-basis"><summary>How these reference prices work</summary><p>Preview prices are shown in USD. Savings use unrounded prices and the official comparison shown on each card. Exact credit amounts and cache rates are in model details.</p><p>Image savings show the best comparison among the listed resolution and quality presets. The official price uses the stated settings, excluding input and thinking costs. Family and preview examples name the official reference used; they do not confirm the version served. These are published-price examples, not verified customer savings. Savings vary by request; only positive comparisons receive a badge.</p><p>Availability is a dated notice, not live monitoring. <Link className="text-link" to="/status">Status and notices</Link></p></details>}
  </div>;
}
