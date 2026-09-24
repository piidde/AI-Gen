import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Dialog from "../components/Dialog";
import PageHeading from "../components/PageHeading";
import BillingDetailsForm from "../components/BillingDetailsForm";
import CopyButton from "../components/CopyButton";
import FilterSelect from "../components/FilterSelect";
import { packages, snapshot } from "../content/catalogue";
import { useBillingDemo } from "../data/BillingDemoProvider";
import { needsReconciliation, orderExplanation, orderSupportSummary, type PurchaseOutcome } from "../data/billingDemo";
import { waitForDemo } from "../data/demoClient";
import type { Order } from "../data/viewModels";
import { formatLocalTime, formatMoney } from "../lib/formatting";
import "../styles/billing.css";

const credits = (value: string) => BigInt(value).toLocaleString("en-US");
function orderStatus(order: Order) {
  if (order.refund === "pending") return "Refund Pending";
  return order.payment.charAt(0).toUpperCase() + order.payment.slice(1);
}

function orderStatusTone(order: Order) {
  return order.refund === "pending" ? "pending" : order.payment;
}

function OrderDetails({ order }: { order: Order }) {
  const { client, refresh } = useBillingDemo();
  const [outcome, setOutcome] = useState<PurchaseOutcome>(order.refund === "pending" ? "refunded" : "paid");
  const [documentScenario, setDocumentScenario] = useState("unavailable");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function perform(document?: "receipt" | "invoice") {
    if (operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setPending(true); setMessage(""); setError(false);
    try {
      if (document) {
        await waitForDemo({ signal: controller.signal, delayMs: 400 });
        if (controller.signal.aborted) return;
        if (documentScenario === "denied") { setError(true); setMessage("Access denied in this document preview. No file downloaded. Contact support if access remains unavailable."); }
        else if (documentScenario === "error") { setError(true); setMessage("The document could not be retrieved (simulated failure). No file downloaded. You can request the document again; this does not retry payment."); }
        else setMessage(order[document].status === "pending" ? "Document pending: payment and document availability are not confirmed." : "No authentic document exists for a demo order. No file downloaded.");
      } else {
        await client.resolve(order.id, outcome, { signal: controller.signal, delayMs: 500 });
        if (controller.signal.aborted) return;
        refresh();
        if (outcome === "refund-pending") setOutcome("refunded");
      }
    } catch (cause) {
      if (!controller.signal.aborted) { setError(true); setMessage(cause instanceof Error ? cause.message : "The demo operation failed."); }
    } finally {
      if (!controller.signal.aborted) { operation.current = null; setPending(false); }
    }
  }
  return <>
    <p className="review-note">Demo order only · no real payment, refund or document.</p>
    <dl className="billing-summary">
      <dt>Order ID</dt><dd>{order.id}</dd>
      <dt>Created · your local time</dt><dd><time dateTime={order.createdAt}>{formatLocalTime(order.createdAt)}</time></dd>
      <dt>Updated · your local time</dt><dd><time dateTime={order.updatedAt}>{formatLocalTime(order.updatedAt)}</time></dd>
      <dt>Amount</dt><dd>{formatMoney(order.usd)}</dd>
      <dt>Package credits</dt><dd>{credits(order.credits)}</dd>
      <dt>Credits received</dt><dd>{order.fulfillment === "credited" ? credits(order.credits) : "0"} demo credits</dd>
      <dt>Status</dt><dd>{orderStatus(order)}</dd>
    </dl>
    <p role="status" className="notice">{orderExplanation(order)}</p>
    {needsReconciliation(order) && <fieldset className="demo-outcome" disabled={pending}>
      <legend>Demo controls · simulate a provider response</legend>
      <div className="field"><span>Simulated provider outcome</span><FilterSelect label="Simulated provider outcome" value={outcome}
        options={order.refund === "pending" ? [{ value: "refunded", label: "Captured funds refunded" }] : [
          { value: "paid", label: "Confirmed and credited (demo)" },
          { value: "unknown", label: "Confirmation unknown" },
          { value: "cancelled", label: "Cancelled before capture" },
          { value: "failed", label: "Failed before capture" },
          { value: "refund-pending", label: "Captured, unfulfilled · refund pending" },
        ]} onChange={value => setOutcome(value as PurchaseOutcome)} disabled={pending} /></div>
      <Button disabled={pending} onClick={() => void perform()}>{pending ? "Updating demo…" : "Apply demo outcome"}</Button>
    </fieldset>}
    <section className="document-preview">
      <h3>Receipt and invoice</h3>
      <p>Receipt: {order.receipt.status}. Invoice: {order.invoice.status}. Live documents depend on the payment provider.</p>
      <div className="field"><span>Document response preview</span><FilterSelect label="Document response preview" value={documentScenario}
        options={[{ value: "unavailable", label: "Current availability" }, { value: "error", label: "Download failed" }, { value: "denied", label: "Access denied" }]}
        onChange={setDocumentScenario} disabled={pending} /></div>
      <div className="billing-actions"><Button className="secondary" disabled={pending} onClick={() => void perform("receipt")}>Request receipt</Button>
        <Button className="secondary" disabled={pending} onClick={() => void perform("invoice")}>Request invoice</Button></div>
      {message && <p role={error ? "alert" : "status"}>{message}</p>}
    </section>
    <CopyButton label="Copy safe order details" text={orderSupportSummary(order)} />
    <div className="billing-actions"><Link className="text-link" to="/support">Payment support</Link><Link className="text-link" to="/status">Service status</Link></div>
  </>;
}

export default function Billing() {
  const { client, data, refresh, storageWarning } = useBillingDemo();
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");
  const [packageUsd, setPackageUsd] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const pendingOrderButton = useRef<HTMLButtonElement>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  const pack = packages.find(p => p.usd === packageUsd);
  const selected = data.orders.find(o => o.id === selectedId);
  const unresolved = data.orders.find(needsReconciliation);
  function close() {
    operation.current?.abort(); operation.current = null;
    setPending(false); setPackageUsd(null); setSelectedId(null); setError("");
  }
  async function begin() {
    if (!pack || operation.current) return;
    const controller = new AbortController(); operation.current = controller;
    setPending(true); setError("");
    try {
      const order = await client.begin(pack.usd, { signal: controller.signal, delayMs: 500 });
      if (controller.signal.aborted) return;
      refresh(); setSelectedId(order.id); setPackageUsd(null);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Demo checkout could not start. No payment was made.");
    } finally {
      if (!controller.signal.aborted) { operation.current = null; setPending(false); }
    }
  }
  return <div className="billing-page">
    <PageHeading title="Billing" description="Credits, purchases and payment history." />
    <section className="billing-balance" aria-labelledby="billing-balance-title">
      <h2 id="billing-balance-title" className="metric-label">Current balance</h2>
      <div className="value balance" data-testid="demo-balance">{credits(data.balance)} <span className="unit">credits</span></div>
      <p>Credits never expire.</p>
    </section>
    {storageWarning && <p role="alert" className="notice error">{storageWarning}</p>}
    {unresolved && <section className="notice"><h2>Order awaiting reconciliation</h2><p>{orderExplanation(unresolved)}</p>
      <button type="button" ref={pendingOrderButton} className="button secondary" onClick={() => setSelectedId(unresolved.id)}>Review pending order</button></section>}
    <section aria-labelledby="packages-title" className="billing-packages">
      <div className="table-head"><h2 id="packages-title">Buy credits</h2><div className="field"><span>Billing display currency</span><FilterSelect label="Billing display currency" value={currency}
        options={[{ value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }]}
        onChange={value => setCurrency(value as "USD" | "EUR")} /></div></div>
      <p>Reference packages checked {snapshot.checkedOn}. Priced in USD; checkout is not connected yet.</p>
      <div className="package-grid">{packages.map(p => <article className="panel package-card" key={p.usd}>
        <div className="package-card-main"><p className="package-card-label">Total credits</p>
          <h3>{credits(p.totalCredits)}</h3>
          <p className="package-card-price">{formatMoney(p.usd, currency)} <span>per package</span></p></div>
        <div className="package-card-bonus"><span className={`package-bonus-badge${p.bonusCredits === "0" ? " is-zero" : ""}`}>{p.bonusCredits === "0" ? "Standard package" : `+${BigInt(p.bonusCredits) * 100n / BigInt(p.baseCredits)}% bonus`}</span>
          <span>{p.bonusCredits === "0" ? "Base credits only" : `Includes ${credits(p.bonusCredits)} bonus credits`}</span></div>
        <Button className="secondary" disabled={Boolean(unresolved)} onClick={() => setPackageUsd(p.usd)}>Review ${p.usd} package</Button>
      </article>)}</div>
    </section>
    <section className="panel requests billing-history"><div className="table-head"><h2 ref={historyHeading} tabIndex={-1}>Payment history</h2><span className="small muted">Sample orders · local timestamps</span></div>
      {data.orders.length === 0 ? <p className="billing-history-empty">No payment history yet. Choose a package above to preview your first purchase.</p> : <>
        <div className="table-scroll" role="region" aria-label="Payment history table" tabIndex={0}><table><thead><tr>
          {["DATE · LOCAL TIME", "ORDER", "STATUS", "AMOUNT", "CREDITS RECEIVED", "DETAILS"].map(label => <th scope="col" key={label}>{label}</th>)}
        </tr></thead><tbody>{data.orders.map(order => <tr key={order.id}>
          <td><time dateTime={order.createdAt}>{formatLocalTime(order.createdAt)}</time></td><td>{order.id}</td><td><span className={`badge payment-status payment-status--${orderStatusTone(order)}`}>{orderStatus(order)}</span></td>
          <td>{formatMoney(order.usd)}</td><td>{order.fulfillment === "credited" ? credits(order.credits) : "0"}</td>
          <td><button className="text-link" onClick={() => setSelectedId(order.id)}>Details<span className="sr-only"> for {order.id}</span></button></td>
        </tr>)}</tbody></table></div>
        <p className="section-note">Sample history and demo balance reset on reload. Only an unresolved order marker is retained in this tab, always as unconfirmed.</p>
      </>}
    </section>
    <BillingDetailsForm />
    {(pack || selected) && <Dialog title={selected ? "Order details" : "Review credit package"} onClose={close} fallbackFocus={() => pendingOrderButton.current ?? historyHeading.current}>
      {selected ? <OrderDetails key={selected.id} order={selected} /> : pack && <>
        <p>Demo checkout only. No charge will be made.</p>
        <dl className="billing-summary"><dt>Exact USD total</dt><dd><strong>{formatMoney(pack.usd)}</strong></dd><dt>Base credits</dt><dd>{credits(pack.baseCredits)}</dd>
          <dt>Bonus credits</dt><dd>{credits(pack.bonusCredits)}</dd><dt>Total credits</dt><dd>{credits(pack.totalCredits)}</dd></dl>
        <p>Credits never expire. Model rates stay fixed. Any EUR display is approximate; checkout will use the USD total above.</p>
        <p>Continuing creates a pending demo order. A checkout return alone never confirms payment or adds credits.</p>
        <Button disabled={pending} onClick={() => void begin()}>{pending ? "Starting demo…" : "Continue demo checkout"}</Button>
        {error && <p role="alert">{error}</p>}
      </>}
    </Dialog>}
  </div>;
}
