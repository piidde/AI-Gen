import { useEffect, useRef, useState } from "react";
import { copyText } from "../lib/clipboard";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const operation = useRef(0);
  useEffect(() => {
    setPending(false);
    setMessage("");
    return () => { operation.current++; };
  }, [text]);
  async function copy() {
    const current = ++operation.current;
    setPending(true);
    setMessage("");
    const result = await copyText(text, navigator.clipboard);
    if (operation.current !== current) return;
    setPending(false);
    setMessage(result.message);
  }
  return <div>
    <button type="button" className="text-link" disabled={pending} onClick={() => void copy()}>
      {pending ? "Copying…" : label}
    </button>
    <span role="status">{message ? ` ${message}` : ""}</span>
  </div>;
}
