import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { DemoBar, DataState, type DemoState } from "../components/DemoState";
import Dialog from "../components/Dialog";
import PageHeading from "../components/PageHeading";
import BillingDetailsForm from "../components/BillingDetailsForm";
import CopyButton from "../components/CopyButton";
import { packages, snapshot } from "../content/catalogue";
import { useBillingDemo } from "../data/BillingDemoProvider";
import { needsReconciliation, orderExplanation, orderSupportSummary, type PurchaseOutcome } from "../data/billingDemo";
import { waitForDemo } from "../data/demoClient";
import type { Order } from "../data/viewModels";
import { formatLocalTime, formatMoney } from "../lib/formatting";

const credits = (value: string) => BigInt(value).toLocaleString("en-US");
function orderStatus(order: Order) {
  return order.refund === "pending" ? "Refund pending" : order.payment;
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
      <label className="field">Simulated provider outcome<select value={outcome} onChange={e => setOutcome(e.target.value as PurchaseOutcome)}>
        {order.refund === "pending" ? <option value="refunded">Captured funds refunded</option> : <>
          <option value="paid">Confirmed and credited (demo)</option>
          <option value="unknown">Confirmation unknown</option>
          <option value="cancelled">Cancelled before capture</option>
          <option value="failed">Failed before capture</option>
          <option value="refund-pending">Captured, unfulfilled · refund pending</option>
        </>}
      </select></label>
      <Button disabled={pending} onClick={() => void perform()}>{pending ? "Updating demo…" : "Apply demo outcome"}</Button>
    </fieldset>}
    <section className="document-preview">
      <h3>Receipt and invoice</h3>
      <p>Receipt: {order.receipt.status}. Invoice: {order.invoice.status}. Live documents depend on the payment provider.</p>
      <label className="field">Document response preview<select disabled={pending} value={documentScenario} onChange={e => setDocumentScenario(e.target.value)}>
        <option value="unavailable">Current availability</option><option value="error">Download failed</option><option value="denied">Access denied</option>
      </select></label>
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
  const [state, setState] = useState<DemoState>("populated");
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
      refresh(); setSelectedId(order.id); setPackageUsd(null); setState("populated");
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Demo checkout could not start. No payment was made.");
    } finally {
      if (!controller.signal.aborted) { operation.current = null; setPending(false); }
    }
  }
  return <>
    <DemoBar state={state} onChange={setState} />
    <PageHeading title="Billing" description="Buy credits, review orders and manage billing details." />
    <section className="balance-grid">
      <div><h2 className="metric-label">Demo wallet balance</h2><div className="value balance" data-testid="demo-balance">{credits(data.balance)} <span className="unit">credits</span></div>
        <p>Credits never expire. This fictional balance resets on reload; no real funds are held.</p></div>
      <div><h3>One balance. Fixed model rates.</h3><p>Package bonuses add credits to your wallet. They never change a model’s credit charge.</p>
        <Link className="text-link" to="/dashboard/usage">View usage & requests ↗</Link></div>
    </section>
    {storageWarning && <p role="alert" className="notice error">{storageWarning}</p>}
    {unresolved && <section className="notice"><h2>Order awaiting reconciliation</h2><p>{orderExplanation(unresolved)}</p>
      <button type="button" ref={pendingOrderButton} className="button secondary" onClick={() => setSelectedId(unresolved.id)}>Review pending order</button></section>}
    <section aria-labelledby="packages-title" className="billing-packages">
      <div className="table-head"><h2 id="packages-title">Buy credits</h2><label>Billing display currency <select value={currency} onChange={e => setCurrency(e.target.value as "USD" | "EUR")}><option>USD</option><option>EUR</option></select></label></div>
      <p>Reference packages checked {snapshot.checkedOn}. Preview only: checkout is not connected. Final checkout will be in USD; EUR is an estimate only.</p>
      <div className="package-grid">{packages.map(p => <article className="panel package-card" key={p.usd}>
        <h3>{formatMoney(p.usd, currency)}</h3>
        <dl><dt>Base credits</dt><dd>{credits(p.baseCredits)}</dd><dt>Bonus credits · {(BigInt(p.bonusCredits) * 100n / BigInt(p.baseCredits)).toString()}%</dt><dd>+{credits(p.bonusCredits)}</dd><dt>Total credits</dt><dd><strong>{credits(p.totalCredits)}</strong></dd></dl>
        <p className="small muted">Credits never expire</p>
        <Button className="secondary" disabled={Boolean(unresolved)} onClick={() => setPackageUsd(p.usd)}>Review ${p.usd} package</Button>
      </article>)}</div>
    </section>
    <DataState state={state} title="Payment history" emptyTitle="No payment history yet" onRetry={() => setState("populated")}
      emptyContent={<p>Choose a package above to preview your first purchase. No real payment will be made.</p>}>
      <section className="panel requests"><div className="table-head"><h2 ref={historyHeading} tabIndex={-1}>Payment history</h2><span className="small muted">Sample orders · local timestamps</span></div>
        <div className="table-scroll" role="region" aria-label="Payment history table" tabIndex={0}><table><thead><tr>
          {["DATE · LOCAL TIME", "ORDER", "STATUS", "AMOUNT", "CREDITS RECEIVED", "DETAILS"].map(label => <th scope="col" key={label}>{label}</th>)}
        </tr></thead><tbody>{data.orders.map(order => <tr key={order.id}>
          <td><time dateTime={order.createdAt}>{formatLocalTime(order.createdAt)}</time></td><td>{order.id}</td><td><span className="badge">{orderStatus(order)}</span></td>
          <td>{formatMoney(order.usd)}</td><td>{order.fulfillment === "credited" ? credits(order.credits) : "0"}</td>
          <td><button className="text-link" onClick={() => setSelectedId(order.id)}>Details<span className="sr-only"> for {order.id}</span></button></td>
        </tr>)}</tbody></table></div>
        <p className="section-note">Sample history and demo balance reset on reload. Only an unresolved order marker is retained in this tab, always as unconfirmed.</p>
      </section>
    </DataState>
    <BillingDetailsForm />
    <Link className="text-link" to="/dashboard/settings">Edit billing details in Settings</Link>
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
  </>;
}
