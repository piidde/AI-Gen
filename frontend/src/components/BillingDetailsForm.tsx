import { useEffect, useRef, useState, type FormEvent } from "react";
import { useBillingDemo } from "../data/BillingDemoProvider";
import Button from "./Button";
import BillingProfileFields from "./BillingProfileFields";
import "./billing-details.css";

export default function BillingDetailsForm({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const { client, data, refresh } = useBillingDemo();
  const [draft, setDraft] = useState(data.profile);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.profile);
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operation.current || !dirty) return;
    const controller = new AbortController();
    operation.current = controller;
    setPending(true); setMessage(""); setError(false);
    try {
      await client.saveProfile(draft, { signal: controller.signal, delayMs: 500 });
      if (!controller.signal.aborted) { refresh(); setMessage("Billing details saved for this demo session only. No provider or account record was changed."); }
    } catch (cause) {
      if (!controller.signal.aborted) { setError(true); setMessage(cause instanceof Error ? cause.message : "Billing details could not be saved. Your edits are still here."); }
    } finally {
      if (!controller.signal.aborted) { operation.current = null; setPending(false); }
    }
  }
  return <form className="panel setting-section billing-details" aria-label="Billing details" onSubmit={event => void save(event)}>
    <div className="billing-details-header">
      <h2>Billing details</h2>
      <p>Manage your personal or business billing information here or in Settings.</p>
    </div>
    <fieldset disabled={pending}>
      <BillingProfileFields value={draft} onChange={value => { setDraft(value); setMessage(""); }} />
      <p className="small muted">All fields are optional.</p>
      <div className="billing-details-actions">
        <p className="small muted">Saved for this session only; details reset on reload or sign-out.</p>
        <Button type="submit" disabled={pending || !dirty}>{pending ? "Saving billing details…" : "Save billing details"}</Button>
      </div>
    </fieldset>
    {message && <p className="billing-details-message" role={error ? "alert" : "status"}>{message}</p>}
  </form>;
}
