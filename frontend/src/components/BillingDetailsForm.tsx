import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, errorMessage, useApiResource, type BillingProfileDto } from "../data/api";
import type { BillingProfile } from "../data/viewModels";
import Button from "./Button";
import BillingProfileFields from "./BillingProfileFields";
import "./billing-details.css";

const emptyProfile: BillingProfile = { kind: null, name: null, company: null, addressLine1: null, addressLine2: null, city: null, postalCode: null, region: null, countryCode: null, vatId: null };

function fromDto(dto: BillingProfileDto): BillingProfile {
  return { kind: dto.kind, name: dto.name, company: dto.company, addressLine1: dto.address_line1, addressLine2: dto.address_line2,
    city: dto.city, postalCode: dto.postal_code, region: dto.region, countryCode: dto.country_code, vatId: dto.vat_id };
}

function toDto(profile: BillingProfile): BillingProfileDto {
  const clean = (value: string | null) => value?.trim() || null;
  return { kind: profile.kind, name: clean(profile.name), company: clean(profile.company), address_line1: clean(profile.addressLine1),
    address_line2: clean(profile.addressLine2), city: clean(profile.city), postal_code: clean(profile.postalCode), region: clean(profile.region),
    country_code: clean(profile.countryCode)?.toUpperCase() ?? null, vat_id: clean(profile.vatId) };
}

export default function BillingDetailsForm({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const stored = useApiResource<BillingProfileDto>("/v1/account/billing-profile");
  const [saved, setSaved] = useState<BillingProfile>(emptyProfile);
  const [draft, setDraft] = useState<BillingProfile>(emptyProfile);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!stored.data) return;
    const profile = fromDto(stored.data);
    setSaved(profile); setDraft(profile);
  }, [stored.data]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operation.current || !dirty) return;
    if (draft.countryCode && !/^[A-Za-z]{2}$/.test(draft.countryCode.trim())) { setError(true); setMessage("Use a two-letter country code, for example DE."); return; }
    const controller = new AbortController();
    operation.current = controller;
    setPending(true); setMessage(""); setError(false);
    try {
      const result = await apiFetch<BillingProfileDto>("/v1/account/billing-profile", { method: "PUT", body: toDto(draft), signal: controller.signal });
      if (controller.signal.aborted) return;
      const profile = fromDto(result);
      setSaved(profile); setDraft(profile);
      setMessage("Billing details saved.");
    } catch (cause) {
      if (!controller.signal.aborted) { setError(true); setMessage(`${errorMessage(cause, "Billing details could not be saved.")} Your edits are still here.`); }
    } finally {
      if (!controller.signal.aborted) { operation.current = null; setPending(false); }
    }
  }
  return <form className="panel setting-section billing-details" aria-label="Billing details" onSubmit={event => void save(event)}>
    <div className="billing-details-header">
      <h2>Billing details</h2>
      <p>Your personal or business billing information, kept with your account.</p>
    </div>
    {stored.error && <p role="alert">{stored.error} <Button className="secondary" onClick={stored.reload}>Try again</Button></p>}
    <fieldset disabled={pending || !stored.data}>
      <BillingProfileFields value={draft} onChange={value => { setDraft(value); setMessage(""); }} />
      <p className="small muted">All fields are optional.</p>
      <div className="billing-details-actions">
        <p className="small muted">{stored.loading && !stored.data ? "Loading saved details…" : "Payment receipts are issued by Stripe."}</p>
        <Button type="submit" disabled={pending || !dirty}>{pending ? "Saving billing details…" : "Save billing details"}</Button>
      </div>
    </fieldset>
    {message && <p className="billing-details-message" role={error ? "alert" : "status"}>{message}</p>}
  </form>;
}
