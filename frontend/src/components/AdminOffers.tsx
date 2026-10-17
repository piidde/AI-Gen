import { useState } from "react";
import Button from "./Button";
import Icon from "./Icon";
import { formatMinor, formatUsd, microsToDecimal, usdToMicros } from "../data/api";
import { useMutation, type AdminOfferDto } from "../data/admin";

type Currency = "eur" | "usd";

// Accepts what people naturally type: "10", "10.50", "10,5", "€10", "10 EUR", "$10.50".
function stripMoney(input: string): string {
  return input.replace(/[€$\s]|eur|usd/gi, "");
}

function toMinor(input: string): number | null {
  const match = /^(\d{1,8})(?:[.,](\d{1,2}))?$/.exec(stripMoney(input));
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return minor > 0 ? minor : null;
}

// Readable default ID such as "eur-10" or "usd-12-50"; saving an existing ID updates that offer.
function suggestedId(currency: Currency, amountMinor: number): string {
  return `${currency}-${(amountMinor / 100).toFixed(2).replace(/\.00$/, "").replace(".", "-")}`;
}

// Only USD offers can be compared with their USD credit value; EUR has no FX feed (BILLING.md).
function bonus(currency: Currency, amountMinor: number, creditsMicros: string): string | null {
  if (currency !== "usd") return null;
  const percent = (Number(BigInt(creditsMicros) / 10_000n) / amountMinor - 1) * 100;
  if (Math.abs(percent) < 0.05) return null;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(1)} % ${percent > 0 ? "bonus" : "vs. price"}`;
}

const empty = { id: "", currency: "eur" as Currency, amount: "", credits: "", active: true };

export default function AdminOffers({ offers, reload }: { offers: AdminOfferDto[]; reload: () => void }) {
  const [form, setForm] = useState(empty);
  const [reason, setReason] = useState("");
  const mutation = useMutation();
  const amountMinor = toMinor(form.amount);
  const creditsMicros = usdToMicros(stripMoney(form.credits));
  const id = form.id.trim() || (amountMinor ? suggestedId(form.currency, amountMinor) : "");
  const existing = offers.some(offer => offer.id === id && offer.currency === form.currency);
  // Shown next to the save button so a disabled button always says what is missing.
  const missing = [
    amountMinor === null && (form.amount.trim() ? "a valid price such as 10.00" : "the price"),
    creditsMicros === null && (form.credits.trim() ? "valid credits such as 10.50" : "the credits"),
    id.length > 80 && "an offer ID of at most 80 characters",
    reason.trim().length < 3 && "a reason for the audit log (3+ characters)",
  ].filter((item): item is string => Boolean(item));
  const currency = form.currency.toUpperCase();
  const previewBonus = amountMinor !== null && creditsMicros !== null ? bonus(form.currency, amountMinor, creditsMicros) : null;

  function edit(offer: AdminOfferDto) {
    mutation.reset(); setReason("");
    setForm({ id: offer.id, currency: offer.currency, amount: (offer.amount_minor / 100).toFixed(2), credits: microsToDecimal(offer.credits_micros), active: offer.active });
  }
  function startNew() {
    mutation.reset(); setReason(""); setForm(empty);
  }
  async function submit() {
    if (missing.length || amountMinor === null || creditsMicros === null) return;
    if (await mutation.run("/v1/internal/offers", { reason: reason.trim(), id, currency: form.currency, amount_minor: amountMinor,
      credits_micros: creditsMicros, active: form.active }, `Offer ${id} (${currency}) saved.`)) {
      setForm(empty); setReason(""); reload();
    }
  }

  return <div className="admin-grid admin-offers">
    <section className="panel">
      <div className="table-head"><h2 className="admin-title"><Icon name="tag" />Credit offers</h2>
        <span className="small muted">{offers.filter(offer => offer.active).length} active · {offers.length} total</span></div>
      {offers.length ? <ul className="admin-offer-grid" aria-label="Credit offers">{offers.map(offer => {
        const extra = bonus(offer.currency, offer.amount_minor, offer.credits_micros);
        const selected = offer.id === form.id && offer.currency === form.currency;
        return <li key={`${offer.id}:${offer.currency}`} className={`admin-offer${offer.active ? "" : " inactive"}${selected ? " selected" : ""}`}>
          <div className="admin-offer-top">
            <span className="admin-offer-currency">{offer.currency.toUpperCase()}</span>
            <span className={`status ${offer.active ? "" : "revoked"}`}>{offer.active ? "Live" : "Hidden"}</span>
          </div>
          <strong className="admin-offer-price">{formatMinor(offer.amount_minor, offer.currency)}</strong>
          <span className="admin-offer-credits">gets {formatUsd(offer.credits_micros)} credits</span>
          {extra && <span className="admin-offer-bonus">{extra}</span>}
          <div className="admin-offer-foot">
            <span className="small muted mono" title="Offer ID · price version">{offer.id} · v{offer.price_version}</span>
            <Button className="secondary" aria-label={`Edit ${offer.id} (${offer.currency.toUpperCase()})`} onClick={() => edit(offer)}>Edit</Button>
          </div>
        </li>;
      })}</ul> : <div className="admin-empty">
        <Icon name="tag" />
        <p><strong>No offers yet.</strong> Customers cannot buy credits until at least one offer is live. Create the first one with the form.</p>
      </div>}
    </section>

    <section className="panel setting-section">
      <div className="admin-form-head">
        <h2 className="admin-title"><Icon name={existing ? "settings" : "plus"} />{existing ? `Edit ${id} (${currency})` : "New offer"}</h2>
        {(form.id || form.amount || form.credits) && <Button className="secondary" onClick={startNew}>{existing ? "New offer instead" : "Clear"}</Button>}
      </div>
      <p>Changes apply to new checkouts only. Credits are USD-value balance.</p>
      <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="admin-segment" role="group" aria-label="Currency">
          {(["eur", "usd"] as const).map(value => <button key={value} type="button" aria-pressed={form.currency === value}
            onClick={() => setForm({ ...form, currency: value })}>{value === "eur" ? "€ EUR" : "$ USD"}</button>)}
        </div>
        <div className="admin-field-row">
          <div className="field"><label htmlFor="offer-amount">Customer pays ({currency})</label>
            <input id="offer-amount" inputMode="decimal" required value={form.amount} aria-invalid={Boolean(form.amount.trim()) && amountMinor === null}
              onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="10.00" /></div>
          <div className="field"><label htmlFor="offer-credits">Credits granted (USD)</label>
            <input id="offer-credits" inputMode="decimal" required value={form.credits} aria-invalid={Boolean(form.credits.trim()) && creditsMicros === null}
              onChange={event => setForm({ ...form, credits: event.target.value })} placeholder="10.50" /></div>
        </div>
        <div className="admin-offer-preview" aria-live="polite">
          <span className="small muted">Customers see</span>
          {amountMinor !== null && creditsMicros !== null
            ? <p><strong>{formatUsd(creditsMicros)}</strong> credits for <strong>{formatMinor(amountMinor, form.currency)}</strong>
              {previewBonus && <span className="admin-offer-bonus">{previewBonus}</span>}</p>
            : <p className="muted">Enter a price and credits to preview the package.</p>}
        </div>
        <label className="admin-switch"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} />
          <span>Live at checkout</span></label>
        <div className="field"><label htmlFor="offer-id">Offer ID (optional)</label>
          <input id="offer-id" maxLength={80} value={form.id} onChange={event => setForm({ ...form, id: event.target.value.trim() })}
            placeholder={amountMinor ? suggestedId(form.currency, amountMinor) : `${form.currency}-10`} />
          <p>Left empty, it is created from the price. Saving an ID that already exists in this currency updates that offer.</p></div>
        <div className="field"><label htmlFor="offer-reason">Reason for the audit log (at least 3 characters)</label>
          <input id="offer-reason" required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="For example, launch starter pack" /></div>
        <div className="form-footer">
          <Button type="submit" disabled={missing.length > 0 || mutation.pending}>{mutation.pending ? "Saving…" : existing ? "Update offer" : "Create offer"}</Button>
          {missing.length > 0 && !mutation.done && <span className="save-status muted">Still needed: {missing.join(", ")}.</span>}
          {mutation.done && <span className="save-status" role="status">{mutation.done}</span>}
          {mutation.error && <span className="save-status error" role="alert">{mutation.error}</span>}
        </div>
      </form>
    </section>
  </div>;
}
