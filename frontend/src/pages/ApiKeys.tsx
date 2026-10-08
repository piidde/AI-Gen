import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import CopyButton from "../components/CopyButton";
import Dialog from "../components/Dialog";
import FilterSelect from "../components/FilterSelect";
import { MetricIcon } from "../components/Icon";
import PageHeading from "../components/PageHeading";
import { apiFetch, errorMessage, toApiKey, useApiResource, type ApiKeyDto, type CreatedApiKeyDto } from "../data/api";
import type { ApiKey } from "../data/viewModels";
import { formatLocalTime } from "../lib/formatting";

export default function ApiKeys() {
  const list = useApiResource<{ data: ApiKeyDto[] }>("/v1/api-keys");
  const keys = list.data?.data.map(toApiKey) ?? [];
  const [status, setStatus] = useState<"active" | "revoked" | "all">("active");
  const [action, setAction] = useState<"create" | "created" | "revoke" | "revoked" | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<ApiKey | null>(null);
  // The secret exists only while the creation dialog is open; it is never stored elsewhere.
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef<AbortController | null>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => operation.current?.abort(), []);
  function close() {
    // A started create/revoke may still complete on the server; reload to show the truth.
    if (operation.current) list.reload();
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
      if (action === "create") {
        const created = await apiFetch<CreatedApiKeyDto>("/v1/api-keys", { method: "POST", body: { name: name.trim() }, signal: controller.signal });
        if (controller.signal.aborted) return;
        setSecret(created.secret); setStatus("active"); setAction("created");
      } else if (selected) {
        await apiFetch(`/v1/api-keys/${encodeURIComponent(selected.id)}`, { method: "DELETE", signal: controller.signal });
        if (controller.signal.aborted) return;
        setAction("revoked");
      }
      list.reload();
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause, "The operation could not be completed. Reload the list to check the current state."));
    } finally {
      if (!controller.signal.aborted) { operation.current = null; setPending(false); }
    }
  }
  const title = pending ? action === "create" ? "Creating key…" : "Revoking key…"
    : error ? action === "create" ? "Creation failed" : "Revocation failed"
    : action === "create" ? "Create an API key" : action === "created" ? "API key created"
    : action === "revoke" ? `Revoke ${selected?.name}?` : "API key revoked";
  const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  const visibleKeys = keys.filter(key => status === "all" || key.status === status);
  return <>
    <PageHeading title="API keys" description="Manage access for your apps and integrations.">
      <Button onClick={create}>Create API key +</Button>
    </PageHeading>
    {list.loading && !list.data && <p role="status">Loading API keys…</p>}
    {list.error && <section className="notice error" role="alert"><p>{list.error}</p><Button className="secondary" onClick={list.reload}>Try again</Button></section>}
    {list.data && (keys.length === 0 ? <section className="empty">
      <h2>Create your first API key</h2>
      <p>A named key helps identify an integration. Use it as a Bearer token from your server.</p>
      <div className="empty-action"><Button onClick={create}>Create API key +</Button></div>
    </section> : <section className="panel">
        <div className="table-head"><h2 ref={listHeading} tabIndex={-1}>Your API keys</h2>
          <span className="small muted">{keys.filter(key => key.status === "active").length} active · {keys.filter(key => key.status === "revoked").length} revoked</span></div>
        <div className="filters"><div><span>Key status </span><FilterSelect id="key-status" label="Key status" value={status} onChange={value => setStatus(value as typeof status)}
          options={[{ value: "active", label: "Active" }, { value: "revoked", label: "Revoked" }, { value: "all", label: "All keys" } ]} /></div><span id="key-timezone" className="small muted">Times shown in {timezone}</span></div>
        <div className="table-scroll" role="region" aria-label="API keys table" aria-describedby="key-timezone" tabIndex={0}>
          <table className="api-key-table"><thead><tr>{["NAME", "KEY", "STATUS", "CREATED", "LAST USED"].map(label => <th scope="col" key={label}>{label}</th>)}
            <th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{visibleKeys.map(key => <tr key={key.id}>
              <td>{key.name}</td><td className="muted">{key.maskedIdentifier}</td>
              <td><span className={`status badge ${key.status}`}>{key.status === "active" ? "Active" : "Revoked"}</span>
                {key.revokedAt && <div className="small muted">Revoked <time dateTime={key.revokedAt}>{formatLocalTime(key.revokedAt, false)}</time></div>}</td>
              <td><time dateTime={key.createdAt}>{formatLocalTime(key.createdAt, false)}</time></td>
              <td>{key.lastUsed.status === "used" ? <time dateTime={key.lastUsed.at}>{formatLocalTime(key.lastUsed.at, false)}</time>
                : key.lastUsed.status === "never" ? "Never used" : "Unavailable"}</td>
              <td><div className="key-actions"><Link className="text-link" to={`/dashboard/usage?period=all&key=${encodeURIComponent(key.id)}`} aria-label={`View requests for ${key.name}`}>View requests</Link>
                {key.status === "active" && <Button className="danger" aria-label={`Revoke ${key.name}`} onClick={() => { setSelected(key); setError(""); setAction("revoke"); }}>Revoke</Button>}</div></td>
            </tr>)}</tbody></table>
        </div>
        {!visibleKeys.length && <p className="section-note">No {status === "all" ? "" : status} keys in this view.</p>}
        <p className="section-note">Keep keys in your server environment, never in browser or mobile code. Use a separate, recognizable name for each integration.</p>
      </section>)}
      <section className="notice"><h2><MetricIcon name="keys" />Connecting your first integration?</h2>
        <p>Send the key as <code>Authorization: Bearer &lt;key&gt;</code> to the endpoints in the documentation.</p>
        <p>Lost a secret? Create a replacement, update your integration, then revoke the old key. Secrets cannot be retrieved after closing the creation dialog.</p>
        <Link className="text-link" to="/docs">API documentation</Link>
      </section>
    {action && <Dialog title={title} onClose={close} fallbackFocus={() => listHeading.current}>
      {action === "create" && <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <p>Name the key after the integration that will use it.</p>
        <div className="field"><label htmlFor="key-name">Key name</label><input id="key-name" autoFocus required maxLength={60} pattern=".*\S.*"
          disabled={pending} placeholder="For example, Production" value={name} onChange={event => setName(event.target.value)} /></div>
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create key"}</Button>
      </form>}
      {action === "created" && <>
        <p>Created “{name.trim()}”. Copy the secret now and store it in your server environment.</p>
        <div className="demo-key" data-testid="new-api-key">{secret}</div><CopyButton text={secret} label="Copy API key" />
        <p>This is the only time the full key is shown. Closing this dialog, navigating away or reloading removes it from this page.</p>
      </>}
      {action === "revoke" && <>
        <p>Revoking “{selected?.name}” immediately stops new requests that use it. Its history stays visible. This cannot be undone.</p>
        <p>Create a replacement and update the integration first to avoid interruption.</p>
        <Button className="danger" disabled={pending} onClick={() => void submit()}>{pending ? "Revoking…" : "Revoke key"}</Button>
      </>}
      {action === "revoked" && <p>“{selected?.name}” is revoked. Requests using it are now rejected.</p>}
      {pending && <p role="status">Working… Closing does not undo a request that already reached the server.</p>}
      {error && <p role="alert">{error}</p>}
    </Dialog>}
  </>;
}
