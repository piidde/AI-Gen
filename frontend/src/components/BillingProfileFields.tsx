import type { BillingProfile } from "../data/viewModels";
import FilterSelect from "./FilterSelect";

const fields: [Exclude<keyof BillingProfile, "kind">, string][] = [
  ["name", "Billing name"], ["company", "Company"], ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"], ["city", "City"], ["postalCode", "Postal code"],
  ["region", "State / region"], ["countryCode", "Country code"], ["vatId", "VAT ID"],
];

export default function BillingProfileFields({ value, onChange, prefix = "billing" }: {
  value: BillingProfile; onChange: (value: BillingProfile) => void; prefix?: string;
}) {
  return <>
    <div className="field"><span>Account type (optional)</span>
      <FilterSelect id={`${prefix}-kind`} label="Account type (optional)" value={value.kind ?? ""}
        options={[{ value: "", label: "Not specified" }, { value: "personal", label: "Personal" }, { value: "business", label: "Business" }]}
        onChange={kind => onChange({ ...value, kind: (kind || null) as BillingProfile["kind"] })} />
    </div>
    <div className="billing-fields">{fields.map(([key, label]) => <div className="field" key={key}>
      <label htmlFor={`${prefix}-${key}`}>{label}</label>
      <input id={`${prefix}-${key}`} maxLength={key === "countryCode" ? 2 : 200} value={value[key] ?? ""}
        onChange={e => onChange({ ...value, [key]: e.target.value || null })} />
    </div>)}</div>
  </>;
}
