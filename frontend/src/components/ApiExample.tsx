import { useState, type KeyboardEvent } from "react";

// Both requests mirror the documented examples on /docs.
const examples = [
  {
    id: "text",
    label: "Text",
    file: "chat.sh",
    code: `curl https://aiapi.deals/v1/chat/completions \\
  -H "Authorization: Bearer $AIAPI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "MODEL_ID",
    "messages": [{ "role": "user", "content": "Say hello." }],
    "max_tokens": 64
  }'`,
  },
  {
    id: "image",
    label: "Image",
    file: "image-job.sh",
    code: `curl https://aiapi.deals/v1/generations \\
  -H "Authorization: Bearer $AIAPI_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: my-unique-key-0001" \\
  -d '{
    "model": "MODEL_ID",
    "input": { "prompt": "A small red paper kite" }
  }'`,
  },
] as const;

export default function ApiExample() {
  const [active, setActive] = useState(0);
  const example = examples[active]!;
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = (active + (event.key === "ArrowRight" ? 1 : examples.length - 1)) % examples.length;
    setActive(next);
    document.getElementById(`api-example-tab-${examples[next]!.id}`)?.focus();
  };
  return <div className="home-code">
    <div className="home-code-bar">
      <div className="home-code-tabs" role="tablist" aria-label="Request examples">
        {examples.map((entry, index) => <button key={entry.id} id={`api-example-tab-${entry.id}`} type="button" role="tab"
          aria-selected={index === active} aria-controls="api-example-panel" tabIndex={index === active ? 0 : -1}
          onClick={() => setActive(index)} onKeyDown={onKeyDown}>{entry.label}</button>)}
      </div>
      <b>{example.file}</b>
    </div>
    <pre id="api-example-panel" role="tabpanel" aria-labelledby={`api-example-tab-${example.id}`} tabIndex={0}><code>{example.code}</code></pre>
  </div>;
}
