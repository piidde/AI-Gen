export type ConfirmedFunnelOutcomeKind =
  | "signup_completed"
  | "first_credit_purchase"
  | "first_api_request";

export type ConfirmedFunnelOutcome = {
  /** Stable opaque identifier used only for client-side duplicate suppression. */
  id: string;
  kind: ConfirmedFunnelOutcomeKind;
};

/**
 * Future backend integration boundary. Implementations must return only outcomes
 * already confirmed by the trusted server, never browser clicks or redirects.
 */
export interface ConfirmedFunnelOutcomeSource {
  readConfirmedOutcomes(signal?: AbortSignal): Promise<unknown>;
}

export type ReferralCategory = "direct" | "internal" | "external";

export type FunnelEvent =
  | {
      name: "public_landing";
      parameters: { landing_path: string; referral: ReferralCategory };
    }
  | { name: ConfirmedFunnelOutcomeKind; parameters: Record<string, never> };

/** Return true only when the event was accepted for measurement. */
export type FunnelEventEmitter = (event: FunnelEvent) => boolean;

export function pathWithoutQuery(path: string): string {
  const value = path.split(/[?#]/, 1)[0] ?? "/";
  return value.startsWith("/") ? value : "/";
}

function classifyReferral(referrer: string, siteOrigin: string): ReferralCategory {
  if (!referrer) return "direct";
  try {
    return new URL(referrer).origin === new URL(siteOrigin).origin ? "internal" : "external";
  } catch {
    return "external";
  }
}

export function createPublicLandingEvent(input: {
  path: string;
  referrer: string;
  siteOrigin: string;
}): FunnelEvent {
  return {
    name: "public_landing",
    parameters: {
      landing_path: pathWithoutQuery(input.path),
      referral: classifyReferral(input.referrer, input.siteOrigin),
    },
  };
}

export function createFunnelConsumer(emit: FunnelEventEmitter): {
  recordPublicLanding(input: { path: string; referrer: string; siteOrigin: string }): boolean;
  consumeConfirmedOutcomes(source: ConfirmedFunnelOutcomeSource, signal?: AbortSignal): Promise<void>;
} {
  const consumedOutcomeIds = new Set<string>();

  return {
    recordPublicLanding({ path, referrer, siteOrigin }) {
      return emit(createPublicLandingEvent({ path, referrer, siteOrigin }));
    },

    async consumeConfirmedOutcomes(source, signal) {
      const outcomes = await source.readConfirmedOutcomes(signal);
      if (signal?.aborted || !Array.isArray(outcomes)) return;
      for (const outcome of outcomes) {
        if (signal?.aborted) return;
        if (!isConfirmedOutcome(outcome)) continue;
        if (consumedOutcomeIds.has(outcome.id)) continue;
        if (emit({ name: outcome.kind, parameters: {} })) consumedOutcomeIds.add(outcome.id);
      }
    },
  };
}

function isConfirmedOutcome(value: unknown): value is ConfirmedFunnelOutcome {
  if (!value || typeof value !== "object") return false;
  const outcome = value as Partial<ConfirmedFunnelOutcome>;
  return typeof outcome.id === "string" && outcome.id.length > 0 &&
    (outcome.kind === "signup_completed" ||
      outcome.kind === "first_credit_purchase" ||
      outcome.kind === "first_api_request");
}
