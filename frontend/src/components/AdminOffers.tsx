import { useState } from "react";
import Button from "./Button";
import FilterSelect from "./FilterSelect";
import { formatMinor, formatUsd, microsToDecimal, usdToMicros } from "../data/api";
import { useMutation, type AdminOfferDto } from "../data/admin";

function toMinor(input: string): number | null {
  const match = /^\s*(\d{1,8})(?:[.,](\d{1,2}))?\s*$/.exec(input);
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return minor > 0 ? minor : null;
}

const empty = { id: "", currency: "eur" as "eur" | "usd", amount: "", credits: "", active: true };

export default function AdminOffers({ offers, reload }: { offers: AdminOfferDto[]; reload: () => void }) {
  const [form, setForm] = useState(empty);
  const [reason, setReason] = useState("");
  const mutation = useMutation();
  const amountMinor = toMinor(form.amount);
  const creditsMicros = usdToMicros(form.credits);
  const valid = form.id.length >= 1 && form.id.length <= 80 && amountMinor !== null && creditsMicros !== null && reason.trim().length >= 3;
  const existing = offers.some(offer => offer.id === form.id && offer.currency === form.currency);
  function edit(offer: AdminOfferDto) {
    mutation.reset(); setReason("");
    setForm({ id: offer.id, currency: offer.currency, amount: (offer.amount_minor / 100).toFixed(2), credits: microsToDecimal(offer.credits_micros), active: offer.active });
  }
  async function submit() {
    if (!valid) return;
    if (await mutation.run("/v1/internal/offers", { reason: reason.trim(), id: form.id, currency: form.currency, amount_minor: amountMinor,
      credits_micros: creditsMicros, active: form.active }, `Offer ${form.id} (${form.currency.toUpperCase()}) saved.`)) {
      setForm(empty); setReason(""); reload();
    }
  }
  return <div className="admin-grid">
    <section className="panel">
      <div className="table-head"><h2>Credit offers</h2><span className="small muted">{offers.filter(offer => offer.active).length} active</span></div>
      <div className="table-scroll" role="region" aria-label="Credit offers" tabIndex={0}>
        <table><thead><tr>{["OFFER", "PRICE", "CREDITS", "BONUS", "STATUS", "VERSION"].map(label => <th scope="col" key={label}>{label}</th>)}
          <th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{offers.map(offer => <tr key={`${offer.id}:${offer.currency}`}>
            <td className="mono">{offer.id}</td><td>{formatMinor(offer.amount_minor, offer.currency)}</td><td>{formatUsd(offer.credits_micros)}</td>
            <td className="small muted">{offer.currency === "usd" ? `${((Number(BigInt(offer.credits_micros) / 10_000n) / offer.amount_minor - 1) * 100).toFixed(1)} %` : "–"}</td>
            <td><span className={`status badge ${offer.active ? "" : "revoked"}`}>{offer.active ? "Active" : "Inactive"}</span></td>
            <td>{offer.price_version}</td>
            <td><Button className="secondary" onClick={() => edit(offer)}>Edit</Button></td>
          </tr>)}</tbody></table>
      </div>
      {!offers.length && <p className="section-note">No offers yet. Customers cannot buy credits until at least one offer is active.</p>}
    </section>
    <section className="panel setting-section">
      <h2>{existing ? `Edit ${form.id} (${form.currency.toUpperCase()})` : "New offer"}</h2>
      <p>Changes apply to new checkouts. Credits are USD-value credits; a customer paying the price receives the credits shown.</p>
      <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="field"><label htmlFor="offer-id">Offer ID</label><input id="offer-id" required maxLength={80} value={form.id} onChange={event => setForm({ ...form, id: event.target.value.trim() })} placeholder="starter" />
          <p>The same ID can exist once per currency; saving an existing ID updates it.</p></div>
        <div className="field"><FilterSelect id="offer-currency" label="Currency" value={form.currency} options={[{ value: "eur", label: "EUR" }, { value: "usd", label: "USD" }]}
          onChange={value => setForm({ ...form, currency: value as "eur" | "usd" })} /></div>
        <div className="field"><label htmlFor="offer-amount">Price ({form.currency.toUpperCase()})</label><input id="offer-amount" inputMode="decimal" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="10.00" /></div>
        <div className="field"><label htmlFor="offer-credits">Credits granted (USD value)</label><input id="offer-credits" inputMode="decimal" required value={form.credits} onChange={event => setForm({ ...form, credits: event.target.value })} placeholder="10.50" /></div>
        <label className="admin-check"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} /> Active (visible at checkout)</label>
        <div className="field"><label htmlFor="offer-reason">Reason for the audit log</label><input id="offer-reason" required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div>
        <div className="form-footer">
          <Button type="submit" disabled={!valid || mutation.pending}>{mutation.pending ? "Saving…" : existing ? "Update offer" : "Create offer"}</Button>
          {(form.id || form.amount || form.credits) && <Button className="secondary" onClick={() => { setForm(empty); setReason(""); mutation.reset(); }}>Clear</Button>}
          {mutation.done && <span className="save-status" role="status">{mutation.done}</span>}
          {mutation.error && <span className="save-status error" role="alert">{mutation.error}</span>}
        </div>
      </form>
    </section>
  </div>;
}
