import { useState } from "react";
import { Link } from "react-router-dom";
import CopyButton from "./CopyButton";
import Dialog from "./Dialog";
import { ProviderLogo, ToolLogo } from "./ProviderLogo";
const BASE = "https://aiapi.deals/v1";

const codexConfig = `model_provider = "aiapi"
model = "gpt-5.6-sol"

[model_providers.aiapi]
name = "AIAPI.deals"
base_url = "${BASE}"
wire_api = "responses"
env_key = "AIAPI_KEY"
supports_websockets = false`;

const sdkExample = `from openai import OpenAI

client = OpenAI(base_url="${BASE}", api_key="YOUR_API_KEY")
response = client.responses.create(
    model="gpt-5.6-sol",
    input="Write a haiku about APIs.",
)
print(response.output_text)`;

function Snippet({ code, label }: { code: string; label: string }) {
  return <div className="setup-snippet"><pre><code>{code}</code></pre><CopyButton text={code} label={label} /></div>;
}

/** Two setup buttons above the coding models; each opens the instructions in place. */
export default function CodingSetup() {
  const [open, setOpen] = useState<"codex" | "openai" | null>(null);
  return <>
    <button type="button" className="button setup-button" onClick={() => setOpen("codex")}>
      <span className="setup-logos" aria-hidden="true"><ToolLogo tool="codex" size={20} /><ToolLogo tool="vscode" size={20} /></span>
      Use with Codex (CLI &amp; VS Code)<span className="setup-arrow" aria-hidden="true">→</span>
    </button>
    <button type="button" className="button secondary setup-button" onClick={() => setOpen("openai")}>
      <span className="setup-logos" aria-hidden="true"><ProviderLogo name="OpenAI" size={20} /></span>
      Use with any OpenAI tool<span className="setup-arrow" aria-hidden="true">→</span>
    </button>
    {open === "codex" && <Dialog title="Use with Codex (CLI & VS Code)" onClose={() => setOpen(null)}>
      <div className="setup-dialog">
        <p>Coding models run Codex unchanged through the OpenAI Responses API with tool calling.</p>
        <ol>
          <li><Link className="text-link" to="/dashboard/api-keys">Create an API key</Link> and add credits.</li>
          <li>Add this to <code>~/.codex/config.toml</code>:<Snippet code={codexConfig} label="Copy config" /></li>
          <li>Set your key and start Codex:<Snippet code={'export AIAPI_KEY="YOUR_API_KEY"\ncodex'} label="Copy commands" /></li>
        </ol>
        <p><ToolLogo tool="vscode" size={16} /> The Codex extension for VS Code reads the same config file.</p>
        <p className="small muted">Works with the coding models (GPT). Hosted tools such as web search are not available.</p>
        <Link className="text-link" to="/docs#codex">Full guide in the docs ↗</Link>
      </div>
    </Dialog>}
    {open === "openai" && <Dialog title="Use with any OpenAI tool" onClose={() => setOpen(null)}>
      <div className="setup-dialog">
        <p>Your key is a normal OpenAI-compatible API key. Point any OpenAI SDK or harness at our base URL.</p>
        <dl className="setup-values">
          <dt>Base URL</dt><dd><code>{BASE}</code> <CopyButton text={BASE} label="Copy base URL" /></dd>
          <dt>API key</dt><dd><Link className="text-link" to="/dashboard/api-keys">Create one in the dashboard</Link></dd>
          <dt>Model</dt><dd><code>gpt-5.6-sol</code> or any coding model listed below</dd>
          <dt>API</dt><dd>Responses API for tool calling; chat completions for plain text</dd>
        </dl>
        <Snippet code={sdkExample} label="Copy example" />
        <Link className="text-link" to="/docs#responses">Full API reference ↗</Link>
      </div>
    </Dialog>}
  </>;
}
