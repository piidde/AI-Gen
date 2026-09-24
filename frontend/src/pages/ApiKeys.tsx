import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import CopyButton from "../components/CopyButton";
import { DemoBar, DataState, type DemoState } from "../components/DemoState";
import Dialog from "../components/Dialog";
import { MetricIcon } from "../components/Icon";
import PageHeading from "../components/PageHeading";
import { waitForDemo } from "../data/demoClient";
import { useKeyDemo } from "../data/KeyDemoProvider";
import type { ApiKey } from "../data/viewModels";
import { formatLocalTime } from "../lib/formatting";

export default function ApiKeys() {
  const { keys, addKey, revokeKey } = useKeyDemo();
  const [state, setState] = useState<DemoState>("populated");
  const [status, setStatus] = useState<"active" | "revoked" | "all">("active");
  const [scenario, setScenario] = useState<"success" | "error" | "loading">("success");
  const [action, setAction] = useState<"create" | "created" | "revoke" | "revoked" | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<ApiKey | null>(null);
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef<AbortController | null>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => operation.current?.abort(), []);
  function close() {
    operation.current?.abort(); operation.current = null;
    setAction(null); setSecret(""); setSelected(null); setName(""); setPending(false); setError("");
  }
  function create() { setName(""); setError(""); setAction("create"); }
  async function submit() {
    if (operation.current || (action !== "create" && action !== "revoke")) return;
    if (action === "create" && !name.trim()) return;
    const controller = new AbortController(); operation.current = controller;
    setPending(true); setError("");
    try {
      await waitForDemo({ scenario, signal: controller.signal, delayMs: 500 });
      if (controller.signal.aborted) return;
      if (scenario === "error") throw new Error("Simulated failure. No demo key changes were saved. Try again.");
      if (action === "create") {
        const sample = `DEMO-ONLY-NOT-A-VALID-API-KEY-${crypto.randomUUID()}`;
        addKey({ id: `key-demo-${crypto.randomUUID()}`, name: name.trim(), maskedIdentifier: `•••• •••• ${sample.slice(-8)}`,
          status: "active", createdAt: new Date().toISOString(), lastUsed: { status: "never" }, revokedAt: null });
        setSecret(sample); setStatus("active"); setState("populated"); setAction("created");
      } else if (selected) {
        revokeKey(selected.id); setAction("revoked");
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Demo operation failed. No demo key changes were saved.");
    } finally {
      if (!controller.signal.aborted) { operation.current = null; setPending(false); }
    }
  }
  const title = pending ? action === "create" ? "Creating sample key…" : "Revoking sample key…"
    : error ? action === "create" ? "Creation failed" : "Revocation failed"
    : action === "create" ? "Create a sample API key" : action === "created" ? "Sample key created"
    : action === "revoke" ? `Revoke ${selected?.name}?` : "Sample key revoked";
  const visibleKeys = keys.filter(key => status === "all" || key.status === status);
  return <>
    <DemoBar state={state} onChange={setState} />
    <PageHeading title="API keys" description="Manage access for your apps and integrations.">
      <Button disabled={state === "error"} onClick={create}>Create API key +</Button>
    </PageHeading>
    <DataState state={state} title="API keys" emptyTitle="Create your first API key" onRetry={() => setState("populated")}
      emptyContent={<><p>A named key helps identify an integration. This demo does not issue credentials.</p>
        <div className="empty-action"><Button onClick={create}>Create sample key +</Button></div></>}>
      <section className="panel">
        <div className="table-head"><h2 ref={listHeading} tabIndex={-1}>Your API keys</h2>
          <span className="small muted">{keys.filter(key => key.status === "active").length} active · {keys.filter(key => key.status === "revoked").length} revoked</span></div>
        <div className="filters"><div><label htmlFor="key-status">Key status </label><select id="key-status" value={status} onChange={event => setStatus(event.target.value as typeof status)}>
          <option value="active">Active</option><option value="revoked">Revoked</option><option value="all">All keys</option>
        </select></div></div>
        <div className="table-scroll" role="region" aria-label="API keys table" tabIndex={0}>
          <table className="api-key-table"><thead><tr>{["NAME", "KEY", "STATUS", "CREATED (LOCAL)", "LAST USED (LOCAL)"].map(label => <th scope="col" key={label}>{label}</th>)}
            <th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{visibleKeys.map(key => <tr key={key.id}>
              <td>{key.name}</td><td className="muted">{key.maskedIdentifier}</td>
              <td><span className={`status badge ${key.status}`}>{key.status === "active" ? "Active" : "Revoked"}</span>
                {key.revokedAt && <div className="small muted">Revoked <time dateTime={key.revokedAt}>{formatLocalTime(key.revokedAt)}</time></div>}</td>
              <td><time dateTime={key.createdAt}>{formatLocalTime(key.createdAt)}</time></td>
              <td>{key.lastUsed.status === "used" ? <time dateTime={key.lastUsed.at}>{formatLocalTime(key.lastUsed.at)}</time>
                : key.lastUsed.status === "never" ? "Never used" : "Unavailable"}</td>
              <td><div className="key-actions"><Link className="text-link" to={`/dashboard/usage?period=all&key=${encodeURIComponent(key.id)}`} aria-label={`View usage for ${key.name}`}>View usage</Link>
                {key.status === "active" && <Button className="danger" aria-label={`Revoke ${key.name}`} onClick={() => { setSelected(key); setError(""); setAction("revoke"); }}>Revoke</Button>}</div></td>
            </tr>)}</tbody></table>
        </div>
        {!visibleKeys.length && <p className="section-note">No {status === "all" ? "" : status} keys in this view.</p>}
        <p className="section-note">Keep keys in your server environment. Use a separate, recognizable name for each integration. Demo metadata lasts until reload or sign-out.</p>
      </section>
      <section className="notice"><h2><MetricIcon name="keys" />Connecting your first integration?</h2>
        <p>A verified API base URL and runnable quickstart are not available yet. No sample key on this page authenticates requests.</p>
        <p>Lost a secret? Create a replacement, update your integration, then revoke the old key. Secrets cannot be retrieved after closing the creation dialog.</p>
        <Link className="text-link" to="/docs">Documentation status</Link>
      </section>
    </DataState>
    {action && <Dialog title={title} onClose={close} fallbackFocus={() => listHeading.current}>
      {(action === "create" || action === "revoke") && <div className="field"><label htmlFor="key-operation-preview">Key operation preview</label><select id="key-operation-preview" disabled={pending} value={scenario} onChange={event => setScenario(event.target.value as typeof scenario)}>
        <option value="success">Success</option><option value="error">Operation error</option><option value="loading">Keep pending</option>
      </select></div>}
      {action === "create" && <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <p>Name this nonfunctional sample for the integration that would use it. No real credential will be issued.</p>
        <div className="field"><label htmlFor="key-name">Key name</label><input id="key-name" autoFocus required maxLength={60} pattern=".*\S.*"
          disabled={pending} placeholder="For example, Production" value={name} onChange={event => setName(event.target.value)} /></div>
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create demo key"}</Button>
      </form>}
      {action === "created" && <>
        <p>Created a sample for “{name.trim()}”. NONFUNCTIONAL demo only: this is not a valid API credential.</p>
        <div className="demo-key">{secret}</div><CopyButton text={secret} label="Copy sample key" />
        <p>Save the sample before closing if you want to try copying it. This is the only time it is shown. Closing, navigating away or reloading clears the full sample; only masked metadata remains until reload or sign-out.</p>
      </>}
      {action === "revoke" && <>
        <p>Revoking “{selected?.name}” removes it from the active demo list and keeps its history. This cannot be undone in this demo session.</p>
        <p>For a live integration, revocation stops new requests using that key. Create a replacement and update the integration first to avoid interruption. Effective server revocation and in-flight request behavior still require backend verification.</p>
        <p>Demo only: no real credential or integration is affected.</p>
        <Button className="danger" disabled={pending} onClick={() => void submit()}>{pending ? "Revoking…" : "Confirm demo revocation"}</Button>
      </>}
      {action === "revoked" && <p>“{selected?.name}” is revoked in this demo. Its metadata and usage link remain in revoked history. No real key was changed.</p>}
      {pending && <p role="status">Demo operation pending. Close to cancel.</p>}
      {error && <p role="alert">{error}</p>}
    </Dialog>}
  </>;
}
