import { useState } from "react";
import Button from "../components/Button";
import { DemoBar, DataState } from "../components/DemoState";
import type { DemoState } from "../components/DemoState";
import Dialog from "../components/Dialog";
import { MetricIcon } from "../components/Icon";
import PageHeading from "../components/PageHeading";
import { apiKeys } from "../demo/fixtures";

export default function ApiKeys() {
  const [state, setState] = useState<DemoState>("populated");
  const [action, setAction] = useState<
    "create" | "created" | "revoke" | "revoked" | null
  >(null);
  const [name, setName] = useState("");
  const [keyName, setKeyName] = useState("");
  const create = () => {
    setName("");
    setAction("create");
  };
  const title =
    action === "create"
      ? "Create a sample API key"
      : action === "created"
        ? "Sample creation result"
        : action === "revoke"
          ? `Revoke ${keyName}?`
          : "Revocation preview";
  return (
    <>
      <DemoBar state={state} onChange={setState} />
      <PageHeading
        title="API keys"
        description="Manage access for your apps and integrations."
      >
        <Button disabled={state === "error"} onClick={create}>
          Create API key +
        </Button>
      </PageHeading>
      <DataState
        state={state}
        title="API keys"
        emptyTitle="Create your first API key"
        onRetry={() => setState("populated")}
        emptyContent={
          <>
            <p>
              A named key helps identify an integration. This demo does not
              issue credentials.
            </p>
            <div className="empty-action">
              <Button onClick={create}>Create sample key +</Button>
            </div>
          </>
        }
      >
        <section className="panel">
          <div className="table-head">
            <h2>Your API keys</h2>
            <span className="small muted">2 active · 1 revoked</span>
          </div>
          <div
            className="table-scroll"
            role="region"
            aria-label="API keys table"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  {["NAME", "KEY", "STATUS", "CREATED", "LAST USED"].map(
                    (label) => (
                      <th scope="col" key={label}>
                        {label}
                      </th>
                    ),
                  )}
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.suffix}>
                    <td>{key.name}</td>
                    <td className="muted">•••• •••• {key.suffix}</td>
                    <td>
                      <span
                        className={`status badge ${key.status.toLowerCase()}`}
                      >
                        {key.status}
                      </span>
                    </td>
                    <td>{key.created}</td>
                    <td>{key.lastUsed}</td>
                    <td>
                      {key.status === "Active" ? (
                        <Button
                          className="danger"
                          aria-label={`Revoke ${key.name}`}
                          onClick={() => {
                            setKeyName(key.name);
                            setAction("revoke");
                          }}
                        >
                          Revoke
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-note">
            Keep keys in your server environment. Use a separate, recognizable
            name for each integration.
          </p>
        </section>
        <section className="notice">
          <h2>
            <MetricIcon name="keys" />
            Connecting your first integration?
          </h2>
          <p>
            The quickstart will cover authentication and your first request.
            Generation happens through your own app or API client.
          </p>
        </section>
      </DataState>
      {action && (
        <Dialog title={title} onClose={() => setAction(null)}>
          {action === "create" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim()) setAction("created");
              }}
            >
              <p>
                Name this sample for the integration that would use it. No
                credential will be issued.
              </p>
              <div className="field">
                <label htmlFor="key-name">Key name</label>
                <input
                  id="key-name"
                  autoFocus
                  required
                  maxLength={60}
                  pattern=".*\S.*"
                  placeholder="For example, Production"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <Button type="submit">Preview creation</Button>
            </form>
          )}
          {action === "created" && (
            <>
              <p>
                Creation preview for “{name.trim()}”. Display-once behavior and
                key format are not finalized.
              </p>
              <div className="demo-key">DEMO-ONLY-NOT-A-VALID-API-KEY</div>
              <p>No key was created. The sample list is unchanged.</p>
            </>
          )}
          {action === "revoke" && (
            <>
              <p>
                The production flow will explain the impact on the integration.
                Exact revocation behavior still needs confirmation.
              </p>
              <p>
                Demo only: this will not change a real key or the sample list.
              </p>
              <div className="dialog-actions">
                <Button className="danger" onClick={() => setAction("revoked")}>
                  Simulate revoke
                </Button>
              </div>
            </>
          )}
          {action === "revoked" && (
            <p>
              The confirmation preview is complete. No key was revoked; the
              sample list is unchanged.
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}
