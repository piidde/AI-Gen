import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import Dialog from "../components/Dialog";
import PageHeading from "../components/PageHeading";
import BillingDetailsForm from "../components/BillingDetailsForm";
import FilterSelect from "../components/FilterSelect";
import { apiFetch, errorMessage, formatMinor, formatUsd, useApiResource, type OfferDto, type PaymentDto } from "../data/api";
import { formatLocalTime } from "../lib/formatting";
import "../styles/billing.css";

type Credits = { available_credits_micros: string; reserved_credits_micros: string; suspended: boolean };

const statusLabels: Record<string, { label: string; tone: string }> = {
  created: { label: "Not started", tone: "cancelled" }, checkout_open: { label: "Awaiting payment", tone: "pending" },
  paid: { label: "Paid", tone: "paid" }, expired: { label: "Expired", tone: "cancelled" }, refunded: { label: "Refunded", tone: "refunded" },
  disputed: { label: "Disputed", tone: "pending" }, dispute_won: { label: "Paid (dispute won)", tone: "paid" }, dispute_lost: { label: "Dispute lost", tone: "failed" },
};
const creditedStatuses = new Set(["paid", "dispute_won"]);
const receiptStatuses = new Set(["paid", "refunded", "disputed", "dispute_won", "dispute_lost"]);
const CONFIRMATION_POLLS = 20;

function PaymentReceipt({ payment }: { payment: PaymentDto }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  if (!receiptStatuses.has(payment.status)) return <span className="muted">—</span>;
  async function open() {
    setPending(true); setMessage("");
    // Open synchronously so the popup is not blocked, then point it at Stripe's receipt.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const { receipt_url } = await apiFetch<{ receipt_url: string }>(`/v1/billing/payments/${encodeURIComponent(payment.id)}/receipt`);
      if (tab) tab.location.href = receipt_url; else window.location.assign(receipt_url);
    } catch (cause) {
      tab?.close();
      setMessage(errorMessage(cause, "The receipt is not available right now."));
    } finally {
      setPending(false);
    }
  }
  return <><button className="text-link" disabled={pending} onClick={() => void open()}>{pending ? "Opening…" : "Receipt"}<span className="sr-only"> for payment from {formatLocalTime(payment.created_at, false)}</span></button>
    {message && <span className="small" role="alert"> {message}</span>}</>;
}

export default function Billing() {
  const [params, setParams] = useSearchParams();
  const checkoutReturn = params.get("checkout");
  const credits = useApiResource<Credits>("/v1/credits");
  const offers = useApiResource<{ data: OfferDto[] }>("/v1/billing/offers");
  const payments = useApiResource<{ data: PaymentDto[] }>("/v1/billing/payments");
  const currencies = [...new Set((offers.data?.data ?? []).map(offer => offer.currency))];
  const [currency, setCurrency] = useState<"eur" | "usd">("eur");
  const [selected, setSelected] = useState<OfferDto | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [polls, setPolls] = useState(0);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const activeCurrency = currencies.includes(currency) ? currency : currencies[0] ?? currency;
  const visibleOffers = (offers.data?.data ?? []).filter(offer => offer.currency === activeCurrency).sort((a, b) => a.amount_minor - b.amount_minor);
  const awaiting = (payments.data?.data ?? []).some(payment => payment.status === "checkout_open");

  // After Stripe redirects back, credits arrive only through the signed webhook; poll until it lands.
  useEffect(() => {
    if (checkoutReturn !== "success" || payments.loading || !awaiting || polls >= CONFIRMATION_POLLS) return;
    const timer = setTimeout(() => { setPolls(count => count + 1); payments.reload(); credits.reload(); }, 3000);
    return () => clearTimeout(timer);
  }, [checkoutReturn, payments.loading, awaiting, polls, payments.reload, credits.reload]);
  // Refresh the balance once the confirmation lands, independent of request ordering.
  const wasAwaiting = useRef(false);
  useEffect(() => {
    if (wasAwaiting.current && !awaiting) credits.reload();
    wasAwaiting.current = awaiting;
  }, [awaiting, credits.reload]);

  function review(offer: OfferDto) {
    setSelected(offer); setError("");
    // One key per purchase attempt: retries resume the same quote instead of creating a second one.
    setIdempotencyKey(crypto.randomUUID());
  }
  function close() { if (!pending) { setSelected(null); setError(""); } }
  function dismissReturn() { const next = new URLSearchParams(params); next.delete("checkout"); next.delete("session_id"); setParams(next, { replace: true }); }
  async function checkout() {
    if (!selected || pending) return;
    setPending(true); setError("");
    try {
      const session = await apiFetch<{ checkout_url: string }>("/v1/billing/checkout", { method: "POST", idempotencyKey, body: { offer_id: selected.id, currency: selected.currency } });
      window.location.assign(session.checkout_url);
    } catch (cause) {
      setError(errorMessage(cause, "Checkout could not start. No payment was taken."));
      setPending(false);
    }
  }

  return <div className="billing-page">
    <PageHeading title="Billing" description="Credits, purchases and payment history." />
    {checkoutReturn === "success" && <section className="notice" role="status"><h2>{awaiting ? "Confirming your payment" : "Payment complete"}</h2>
      <p>{awaiting ? polls >= CONFIRMATION_POLLS ? "Stripe has not confirmed the payment yet. It will appear below as soon as it does; you do not need to pay again." : "Stripe is confirming the payment. Credits are added automatically once it is confirmed." : "Your payment is confirmed. The credits are in your balance."}</p>
      <Button className="secondary" onClick={dismissReturn}>Dismiss</Button></section>}
    {checkoutReturn === "cancelled" && <section className="notice" role="status"><h2>Checkout cancelled</h2><p>No payment was taken. You can start a new purchase at any time.</p><Button className="secondary" onClick={dismissReturn}>Dismiss</Button></section>}
    <section className="billing-balance" aria-labelledby="billing-balance-title">
      <h2 id="billing-balance-title" className="metric-label">Current balance</h2>
      {credits.error ? <p role="alert">{credits.error}</p> : <div className="value balance" data-testid="billing-balance">{credits.data ? formatUsd(credits.data.available_credits_micros) : "…"}</div>}
      <p>Credits never expire.{credits.data && BigInt(credits.data.reserved_credits_micros) > 0n && ` ${formatUsd(credits.data.reserved_credits_micros)} reserved for running requests.`}</p>
    </section>
    <section aria-labelledby="packages-title" className="billing-packages">
      <div className="table-head"><h2 id="packages-title">Buy credits</h2>{currencies.length > 1 && <div className="field"><span>Checkout currency</span><FilterSelect label="Checkout currency" value={activeCurrency}
        options={currencies.map(value => ({ value, label: value.toUpperCase() }))} onChange={value => setCurrency(value as "eur" | "usd")} /></div>}</div>
      <p>Pay securely with Stripe. Credits are USD-value prepaid balance and never expire.</p>
      {offers.loading && !offers.data && <p role="status">Loading offers…</p>}
      {offers.error && <p role="alert">{offers.error} <Button className="secondary" onClick={offers.reload}>Try again</Button></p>}
      {offers.data && !visibleOffers.length && <p className="notice">Credit purchases are not open yet. Please check back soon.</p>}
      <div className="package-grid">{visibleOffers.map(offer => <article className="panel package-card" key={`${offer.id}-${offer.currency}`}>
        <div className="package-card-main"><p className="package-card-label">Credit value</p>
          <h3>{formatUsd(offer.credits_micros)}</h3>
          <p className="package-card-price">{formatMinor(offer.amount_minor, offer.currency)} <span>per package</span></p></div>
        <Button className="secondary" disabled={credits.data?.suspended} onClick={() => review(offer)}>Buy for {formatMinor(offer.amount_minor, offer.currency)}</Button>
      </article>)}</div>
    </section>
    <section className="panel requests billing-history"><div className="table-head"><h2 ref={historyHeading} tabIndex={-1}>Payment history</h2><span className="small muted">Local timestamps</span></div>
      {payments.error && <p role="alert">{payments.error} <Button className="secondary" onClick={payments.reload}>Try again</Button></p>}
      {payments.data && (payments.data.data.length === 0 ? <p className="billing-history-empty">No payments yet. Choose a package above to buy credits.</p> : <>
        <div className="table-scroll" role="region" aria-label="Payment history table" tabIndex={0}><table><thead><tr>
          {["DATE · LOCAL TIME", "STATUS", "AMOUNT", "CREDITS", "RECEIPT"].map(label => <th scope="col" key={label}>{label}</th>)}
        </tr></thead><tbody>{payments.data.data.map(payment => {
          const status = statusLabels[payment.status] ?? { label: payment.status, tone: "pending" };
          return <tr key={payment.id}>
            <td><time dateTime={payment.created_at}>{formatLocalTime(payment.created_at)}</time></td>
            <td><span className={`badge payment-status payment-status--${status.tone}`}>{status.label}</span></td>
            <td>{formatMinor(payment.amount_minor, payment.currency)}</td>
            <td>{creditedStatuses.has(payment.status) ? formatUsd(payment.credits_micros) : <span className="muted">{formatUsd(payment.credits_micros)} (not credited)</span>}</td>
            <td><PaymentReceipt payment={payment} /></td>
          </tr>;
        })}</tbody></table></div>
        <p className="section-note">Refunds and disputes remove the purchased credits. Questions about a payment? <Link className="text-link" to="/support">Contact support</Link>.</p>
      </>)}
    </section>
    <BillingDetailsForm />
    {selected && <Dialog title="Review purchase" onClose={close} fallbackFocus={() => historyHeading.current}>
      <dl className="billing-summary"><dt>You pay</dt><dd><strong>{formatMinor(selected.amount_minor, selected.currency)}</strong></dd>
        <dt>Credits added</dt><dd>{formatUsd(selected.credits_micros)} USD-value credits</dd></dl>
      <p>You continue to Stripe to pay. Credits are added once Stripe confirms the payment; returning to this page alone never adds credits.</p>
      <Button disabled={pending} onClick={() => void checkout()}>{pending ? "Opening Stripe…" : "Continue to payment"}</Button>
      {error && <p role="alert">{error}</p>}
    </Dialog>}
  </div>;
}
