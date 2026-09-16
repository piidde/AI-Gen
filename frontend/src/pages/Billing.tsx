import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { DemoBar, DataState } from "../components/DemoState";
import type { DemoState } from "../components/DemoState";
import Dialog from "../components/Dialog";
import { MetricIcon } from "../components/Icon";
import PageHeading from "../components/PageHeading";
import { payments, summary } from "../demo/fixtures";

export default function Billing() {
  const [state, setState] = useState<DemoState>("populated");
  const [purchase, setPurchase] = useState(false);
  const [selected, setSelected] = useState<(typeof payments)[number] | null>(
    null,
  );
  return (
    <>
      <DemoBar state={state} onChange={setState} />
      <PageHeading
        title="Billing"
        description="Manage your credits and review payment history."
      />
      <DataState
        state={state}
        title="Billing"
        emptyTitle="No payment history yet"
        onRetry={() => setState("populated")}
        emptyContent={
          <p>
            Credit purchases will appear here when payments are connected. No
            purchase can be made in this demo.
          </p>
        }
      >
        <section className="balance-grid">
          <div>
            <h2 className="metric-label">
              <MetricIcon name="wallet" />
              Available balance
            </h2>
            <div className="value balance">
              {summary.balance} <span className="unit">credits</span>
            </div>
            <Button onClick={() => setPurchase(true)}>Add credits +</Button>
          </div>
          <div>
            <h3>Usage and payments, kept separate</h3>
            <p>
              Payment history shows credit purchases. For the credits consumed
              by your API requests, visit usage.
            </p>
            <Link className="text-link" to="/dashboard/usage">
              View usage & requests ↗
            </Link>
          </div>
        </section>
        <section className="panel requests">
          <div className="table-head">
            <h2>Payment history</h2>
            <span className="small muted">Sample orders</span>
          </div>
          <div
            className="table-scroll"
            role="region"
            aria-label="Payment history table"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  {["DATE", "ORDER", "STATUS", "AMOUNT", "DOCUMENT"].map(
                    (label) => (
                      <th scope="col" key={label}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.date}</td>
                    <td>{payment.id}</td>
                    <td>
                      <span
                        className={`status badge ${payment.status.toLowerCase()}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td>{payment.amount}</td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => setSelected(payment)}
                      >
                        {payment.status === "Paid" ? "Receipt" : "Details"} ↗
                        <span className="sr-only"> for {payment.id}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-note">
            Illustrative amounts and currency only. Credit conversion, payment
            methods and document delivery are not finalized.
          </p>
        </section>
      </DataState>
      {purchase && (
        <Dialog title="Add credits" onClose={() => setPurchase(false)}>
          <p>
            The purchase flow will show the price, currency and credit amount
            before payment.
          </p>
          <p>
            Packages, conversion rates and payment methods are still open. This
            demo cannot accept payments or change your balance.
          </p>
        </Dialog>
      )}
      {selected && (
        <Dialog
          title={
            selected.status === "Paid"
              ? "Receipt preview"
              : `${selected.status} payment`
          }
          onClose={() => setSelected(null)}
        >
          <p>
            Sample order {selected.id} · {selected.amount} · {selected.status}.
          </p>
          <p>
            {selected.status === "Paid"
              ? "Receipt and invoice delivery are not connected. No document is generated in this demo."
              : selected.status === "Pending"
                ? "A pending order is not confirmed payment. The final flow must verify its status before encouraging another purchase."
                : "The final flow will explain the failure using the confirmed payment-provider response."}
          </p>
        </Dialog>
      )}
    </>
  );
}
