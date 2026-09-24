import type { BillingProfile } from "../data/viewModels";

const fields: [Exclude<keyof BillingProfile, "kind">, string][] = [
  ["name", "Billing name"], ["company", "Company"], ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"], ["city", "City"], ["postalCode", "Postal code"],
  ["region", "State / region"], ["countryCode", "Country code"], ["vatId", "VAT ID"],
];

export default function BillingProfileFields({ value, onChange, prefix = "billing" }: {
  value: BillingProfile; onChange: (value: BillingProfile) => void; prefix?: string;
}) {
  return <>
    <div className="field"><label htmlFor={`${prefix}-kind`}>Account type (optional)</label>
      <select id={`${prefix}-kind`} value={value.kind ?? ""} onChange={e => onChange({ ...value, kind: (e.target.value || null) as BillingProfile["kind"] })}>
        <option value="">Not specified</option><option value="personal">Personal</option><option value="business">Business</option>
      </select>
    </div>
    <div className="billing-fields">{fields.map(([key, label]) => <div className="field" key={key}>
      <label htmlFor={`${prefix}-${key}`}>{label}</label>
      <input id={`${prefix}-${key}`} maxLength={key === "countryCode" ? 2 : 200} value={value[key] ?? ""}
        onChange={e => onChange({ ...value, [key]: e.target.value || null })} />
    </div>)}</div>
  </>;
}
