import openaiIcon from "../assets/openai.svg";
import geminiIcon from "../assets/gemini.svg";
import nanoBananaIcon from "../assets/nanobanana.svg";
import codexIcon from "../assets/codex.svg";
import vscodeIcon from "../assets/vscode.svg";

// Official brand marks (LobeHub icon set, MIT; see THIRD-PARTY-NOTICES.txt).
const logos = { openai: openaiIcon, gemini: geminiIcon, nanobanana: nanoBananaIcon, codex: codexIcon, vscode: vscodeIcon } as const;
export type LogoKey = keyof typeof logos;

/** Maps a provider, family or model name to its brand mark; undefined if none applies. */
export function logoFor(name: string): LogoKey | undefined {
  if (/nano\s*banana/i.test(name)) return "nanobanana";
  if (/gemini|google/i.test(name)) return "gemini";
  if (/gpt|openai/i.test(name)) return "openai";
  return undefined;
}

export function ProviderLogo({ name, size = 18 }: { name: string; size?: number }) {
  const key = logoFor(name);
  return key ? <img className={`provider-logo provider-logo-${key}`} src={logos[key]} alt="" width={size} height={size} /> : null;
}

/** Inline brand name preceded by its logo, e.g. in running text. */
export function Mention({ name, label = name }: { name: string; label?: string }) {
  return <span className="mention"><ProviderLogo name={name} size={16} />{label}</span>;
}

/** Mark of a developer tool the API works with (Codex, VS Code); decorative next to its name. */
export function ToolLogo({ tool, size = 18 }: { tool: "codex" | "vscode"; size?: number }) {
  return <img className={`provider-logo provider-logo-${tool}`} src={logos[tool]} alt="" width={size} height={size} />;
}
