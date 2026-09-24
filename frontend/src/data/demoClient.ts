import { demoSnapshot } from "./demoSnapshot";
import type { DemoSnapshot, Preferences } from "./viewModels";

export type DemoScenario = "success" | "loading" | "empty" | "error" | "uncertain";
export type DemoResult<T> =
  | { status: "success"; data: T }
  | { status: "empty" }
  | { status: "error" | "uncertain"; message: string };

type Options = {
  scenario?: DemoScenario;
  delayMs?: number;
  signal?: AbortSignal;
};

export function waitForDemo({ scenario = "success", delayMs = 200, signal }: Options): Promise<void> {
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("Invalid demo delay");
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Demo operation cancelled", "AbortError"));
    };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener("abort", abort, { once: true });
    // The loading preview intentionally stays pending until the caller aborts it.
    if (scenario !== "loading") {
      timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, delayMs);
    }
  });
}

// One instance per demo session. No persistence, network calls or Supabase access.
export function createDemoClient(seed: DemoSnapshot = demoSnapshot) {
  const state = structuredClone(seed);

  async function respond<T>(operation: () => T, options: Options): Promise<DemoResult<T>> {
    await waitForDemo(options);
    // Covers cancellation between timer resolution and the continuation.
    if (options.signal?.aborted) throw new DOMException("Demo operation cancelled", "AbortError");
    switch (options.scenario) {
      case "empty": return { status: "empty" };
      case "error": return { status: "error", message: "Simulated failure. No demo changes were saved." };
      case "uncertain": return { status: "uncertain", message: "Simulated unconfirmed outcome. No real operation was sent." };
      default: return { status: "success", data: structuredClone(operation()) };
    }
  }

  return {
    read: (options: Options = {}) => respond(() => state, options),
    savePreferences: (preferences: Preferences, options: Options = {}) => {
      // Capture the submitted values; subsequent edits must not alter an in-flight save.
      const submitted = structuredClone(preferences);
      return respond(() => {
        state.preferences = submitted;
        return state.preferences;
      }, options);
    },
  };
}
