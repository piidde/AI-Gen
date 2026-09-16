import type { ReactNode } from "react";
import Button from "./Button";

export type DemoState = "populated" | "empty" | "error" | "save-error";
export function DemoBar({
  state,
  onChange,
  settings = false,
}: {
  state: DemoState;
  onChange: (value: DemoState) => void;
  settings?: boolean;
}) {
  return (
    <div className="demo-bar">
      <span>LOCAL DEMO · FICTIONAL DATA · NO LIVE ACCOUNT</span>
      <label>
        Demo state{" "}
        <select
          value={state}
          onChange={(event) => onChange(event.target.value as DemoState)}
        >
          <option value="populated">Populated</option>
          {settings ? (
            <option value="save-error">Save error simulation</option>
          ) : (
            <option value="empty">Empty</option>
          )}
          <option value="error">Load error</option>
        </select>
      </label>
    </div>
  );
}
export function DataState({
  state,
  onRetry,
  title,
  emptyTitle,
  children,
  emptyContent,
}: {
  state: DemoState;
  onRetry: () => void;
  title: string;
  emptyTitle: string;
  children: ReactNode;
  emptyContent?: ReactNode;
}) {
  if (state === "error")
    return (
      <section className="notice error" role="alert">
        <h2>{title} couldn’t be loaded</h2>
        <p>
          This is a simulated loading error. No live account information is
          available.
        </p>
        <Button className="secondary" onClick={onRetry}>
          Try again
        </Button>
      </section>
    );
  if (state === "empty")
    return (
      <section className="empty">
        <h2>{emptyTitle}</h2>
        {emptyContent ?? <p>There are no entries in this demo state.</p>}
      </section>
    );
  return children;
}
