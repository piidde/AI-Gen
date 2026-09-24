import { useEffect, useRef, useState, type FormEvent } from "react";
import { useBillingDemo } from "../data/BillingDemoProvider";
import Button from "./Button";
import BillingProfileFields from "./BillingProfileFields";

export default function BillingDetailsForm() {
  const { client, data, refresh } = useBillingDemo();
  const [draft, setDraft] = useState(data.profile);
  const [scenario, setScenario] = useState("success");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setPending(true); setMessage(""); setError(false);
    try {
      await client.saveProfile(draft, { signal: controller.signal, delayMs: 500, fail: scenario === "error" });
      if (!controller.signal.aborted) { refresh(); setMessage("Billing details saved for this demo session only. No provider or account record was changed."); }
    } catch (cause) {
      if (!controller.signal.aborted) { setError(true); setMessage(cause instanceof Error ? cause.message : "Billing details could not be saved. Your edits are still here."); }
    } finally {
      if (!controller.signal.aborted) { operation.current = null; setPending(false); }
    }
  }
  return <form className="panel setting-section billing-details" aria-label="Billing details" onSubmit={event => void save(event)}>
    <h2>Billing details</h2>
    <p>Optional personal or business details, shared with Settings. Use sample details in this demo. Edits reset on reload or sign-out.</p>
    <fieldset disabled={pending}>
      <BillingProfileFields value={draft} onChange={value => { setDraft(value); setMessage(""); }} />
      <p className="small muted">All fields are optional. Any fields required by a future payment provider will be explained at checkout.</p>
      <label className="field">Billing save preview<select value={scenario} onChange={e => setScenario(e.target.value)}>
        <option value="success">Successful demo save</option><option value="error">Failed demo save</option>
      </select></label>
      <Button type="submit" disabled={pending}>{pending ? "Saving billing details…" : "Save billing details"}</Button>
    </fieldset>
    {message && <p role={error ? "alert" : "status"}>{message}</p>}
  </form>;
}
