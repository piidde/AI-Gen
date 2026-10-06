import { Link } from "react-router-dom";
import Brand from "../components/Brand";
import "../styles/docs.css";

const BASE = "https://aiapi.deals";

const sections = [
  { id: "quickstart", title: "Quickstart" },
  { id: "authentication", title: "Authentication" },
  { id: "models", title: "Models" },
  { id: "chat", title: "Chat completions" },
  { id: "media", title: "Image and video jobs" },
  { id: "results", title: "Results and files" },
  { id: "credits", title: "Credits and usage" },
  { id: "errors", title: "Errors" },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="docs-code">
      <code>{children}</code>
    </pre>
  );
}

export default function Docs() {
  return (
    <div className="docs">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="docs-top">
        <Brand />
        <nav className="docs-links" aria-label="Main navigation">
          <Link to="/models">Models &amp; pricing</Link>
          <Link to="/docs" aria-current="page">
            Docs
          </Link>
          <Link className="button" to="/login?next=%2Fdashboard%2Fapi-keys">
            Get an API key
          </Link>
        </nav>
      </header>

      <div className="docs-layout">
        <nav className="docs-toc" aria-label="On this page">
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main-content" className="docs-main" tabIndex={-1}>
          <h1 tabIndex={-1}>Documentation</h1>
          <p className="docs-lead">
            One JSON API for text, image and video models. Base URL:{" "}
            <code>{BASE}/v1</code>
          </p>

          <section id="quickstart">
            <h2>Quickstart</h2>
            <ol>
              <li>Create an API key in the dashboard.</li>
              <li>Pick a model from the list below.</li>
              <li>Send a request.</li>
            </ol>
            <Code>{`curl ${BASE}/v1/chat/completions \\
  -H "Authorization: Bearer $TAKEWING_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "MODEL_ID",
    "messages": [{ "role": "user", "content": "Say hello." }],
    "max_tokens": 64
  }'`}</Code>
          </section>

          <section id="authentication">
            <h2>Authentication</h2>
            <p>
              Send your key as a bearer token. Keep it on your server; never
              ship it in browser or mobile code. A key is shown once when you
              create it and can be revoked at any time.
            </p>
            <Code>{`Authorization: Bearer $TAKEWING_API_KEY`}</Code>
          </section>

          <section id="models">
            <h2>Models</h2>
            <p>
              List the models that are currently enabled and priced. No key is
              needed. Use the returned <code>id</code> as <code>model</code> in
              requests. See <Link to="/models">Models &amp; pricing</Link> for a
              readable view.
            </p>
            <Code>{`curl ${BASE}/v1/models`}</Code>
          </section>

          <section id="chat">
            <h2>Chat completions</h2>
            <p>
              <code>POST /v1/chat/completions</code> is a non-streaming subset
              of the OpenAI chat format.
            </p>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>model</code>
                  </td>
                  <td>An enabled text model.</td>
                </tr>
                <tr>
                  <td>
                    <code>messages</code>
                  </td>
                  <td>
                    1–100 items. <code>role</code> is <code>system</code>,{" "}
                    <code>developer</code>, <code>user</code> or{" "}
                    <code>assistant</code>; <code>content</code> is a string.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>max_tokens</code> / <code>max_completion_tokens</code>
                  </td>
                  <td>
                    Required; set exactly one. Credits are reserved against this
                    limit before the call.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>temperature</code>, <code>top_p</code>,{" "}
                    <code>stop</code>, <code>seed</code>
                  </td>
                  <td>Optional.</td>
                </tr>
              </tbody>
            </table>
            <p>
              Streaming (<code>stream: true</code>), tools, image input and
              other options are not supported and return an error. Send an{" "}
              <code>Idempotency-Key</code> (8–128 characters) to make retries
              safe: the same key and body returns the stored response; the same
              key with a different body returns <code>409</code>.
            </p>
          </section>

          <section id="media">
            <h2>Image and video jobs</h2>
            <p>
              Media runs asynchronously. <code>POST /v1/generations</code>{" "}
              requires an <code>Idempotency-Key</code> and returns{" "}
              <code>202</code> with a request ID, a status URL and a result URL.
              The fields allowed in <code>input</code> depend on the model.
            </p>
            <Code>{`curl ${BASE}/v1/generations \\
  -H "Authorization: Bearer $TAKEWING_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: my-unique-key-0001" \\
  -d '{
    "model": "MODEL_ID",
    "input": { "prompt": "A small red paper kite against a clear blue sky" }
  }'`}</Code>
            <p>Poll the request until it finishes:</p>
            <Code>{`curl ${BASE}/v1/requests/REQUEST_ID \\
  -H "Authorization: Bearer $TAKEWING_API_KEY"`}</Code>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>queued</code>, <code>submitting</code>,{" "}
                    <code>provider_pending</code>
                  </td>
                  <td>In progress. Keep polling.</td>
                </tr>
                <tr>
                  <td>
                    <code>succeeded</code>
                  </td>
                  <td>Result is ready.</td>
                </tr>
                <tr>
                  <td>
                    <code>failed</code>
                  </td>
                  <td>The request failed.</td>
                </tr>
                <tr>
                  <td>
                    <code>unknown</code>
                  </td>
                  <td>
                    The outcome could not be confirmed. Check the same request
                    ID later. Do not resubmit with a new key.
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>expired</code>
                  </td>
                  <td>The result is no longer stored.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section id="results">
            <h2>Results and files</h2>
            <p>
              Fetch a finished result with{" "}
              <code>GET /v1/requests/&#123;id&#125;/result</code>. Media results
              list files; download each with{" "}
              <code>GET /v1/files/&#123;requestId&#125;/&#123;index&#125;</code>{" "}
              using your key. Results are kept for two hours, then return{" "}
              <code>410</code>. Download what you need before then.
            </p>
          </section>

          <section id="credits">
            <h2>Credits and usage</h2>
            <p>
              <code>GET /v1/credits</code> returns available and reserved
              credits. <code>GET /v1/usage</code> returns a summary and your
              latest 100 requests. Both accept your API key.
            </p>
          </section>

          <section id="errors">
            <h2>Errors</h2>
            <p>
              Every error has the same shape and an <code>X-Request-Id</code>{" "}
              header:
            </p>
            <Code>{`{
  "error": {
    "message": "...",
    "type": "invalid_request_error",
    "code": "insufficient_credits",
    "request_id": "..."
  }
}`}</Code>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>authentication_required</code>,{" "}
                    <code>api_key_required</code>
                  </td>
                  <td>Missing or invalid credentials.</td>
                </tr>
                <tr>
                  <td>
                    <code>model_unavailable</code>
                  </td>
                  <td>The model is not enabled.</td>
                </tr>
                <tr>
                  <td>
                    <code>insufficient_credits</code>
                  </td>
                  <td>Top up your credits.</td>
                </tr>
                <tr>
                  <td>
                    <code>concurrency_limit</code>
                  </td>
                  <td>Too many requests in flight.</td>
                </tr>
                <tr>
                  <td>
                    <code>idempotency_conflict</code>
                  </td>
                  <td>The key was already used with different input.</td>
                </tr>
                <tr>
                  <td>
                    <code>result_not_ready</code>, <code>result_expired</code>
                  </td>
                  <td>Keep polling, or the result is gone.</td>
                </tr>
                <tr>
                  <td>
                    <code>provider_outcome_unknown</code>
                  </td>
                  <td>Check the request status before retrying.</td>
                </tr>
              </tbody>
            </table>
            <p>
              Need the machine-readable spec? Open{" "}
              <a href="/v1/openapi.json">/v1/openapi.json</a>.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
