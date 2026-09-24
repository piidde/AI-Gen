import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFunnelConsumer,
  type ConfirmedFunnelOutcomeSource,
  type FunnelEvent,
} from "../src/seo/funnel.ts";

test("public landing attribution strips query data and reduces referrers to a category", () => {
  const events: FunnelEvent[] = [];
  const funnel = createFunnelConsumer(event => (events.push(event), true));

  funnel.recordPublicLanding({
    path: "/models?email=private@example.com&token=secret#details",
    referrer: "https://search.example/results?q=private",
    siteOrigin: "https://takewing.example",
  });

  assert.deepEqual(events, [{
    name: "public_landing",
    parameters: { landing_path: "/models", referral: "external" },
  }]);
  assert.equal(JSON.stringify(events).includes("private"), false);
  assert.equal(JSON.stringify(events).includes("secret"), false);
});

test("landing attribution distinguishes direct and same-origin navigation without emitting origins", () => {
  const events: FunnelEvent[] = [];
  const funnel = createFunnelConsumer(event => (events.push(event), true));

  funnel.recordPublicLanding({ path: "/", referrer: "", siteOrigin: "https://takewing.example" });
  funnel.recordPublicLanding({
    path: "/blog/image-pricing",
    referrer: "https://takewing.example/models?campaign=sensitive",
    siteOrigin: "https://takewing.example",
  });

  assert.deepEqual(events, [
    { name: "public_landing", parameters: { landing_path: "/", referral: "direct" } },
    { name: "public_landing", parameters: { landing_path: "/blog/image-pricing", referral: "internal" } },
  ]);
});

test("only confirmed outcomes read from the trusted boundary become funnel events", async () => {
  const events: FunnelEvent[] = [];
  const source: ConfirmedFunnelOutcomeSource = {
    readConfirmedOutcomes: async () => [
      { id: "signup:opaque-1", kind: "signup_completed" },
      { id: "purchase:opaque-1", kind: "first_credit_purchase" },
      { id: "request:opaque-1", kind: "first_api_request" },
    ],
  };

  await createFunnelConsumer(event => (events.push(event), true)).consumeConfirmedOutcomes(source);

  assert.deepEqual(events.map(event => event.name), [
    "signup_completed",
    "first_credit_purchase",
    "first_api_request",
  ]);
  assert.equal(JSON.stringify(events).includes("opaque"), false);
});

test("confirmed outcomes are deduplicated by stable opaque ID within a consumer", async () => {
  const events: FunnelEvent[] = [];
  const source: ConfirmedFunnelOutcomeSource = {
    readConfirmedOutcomes: async () => [
      { id: "purchase:opaque-1", kind: "first_credit_purchase" },
      { id: "purchase:opaque-1", kind: "first_credit_purchase" },
    ],
  };
  const funnel = createFunnelConsumer(event => (events.push(event), true));

  await funnel.consumeConfirmedOutcomes(source);
  await funnel.consumeConfirmedOutcomes(source);

  assert.deepEqual(events, [{ name: "first_credit_purchase", parameters: {} }]);
});

test("a denied emission is not marked consumed and can be emitted after consent", async () => {
  const events: FunnelEvent[] = [];
  let accepted = false;
  const source: ConfirmedFunnelOutcomeSource = {
    readConfirmedOutcomes: async () => [{ id: "request:opaque-1", kind: "first_api_request" }],
  };
  const funnel = createFunnelConsumer(event => {
    if (!accepted) return false;
    events.push(event);
    return true;
  });

  await funnel.consumeConfirmedOutcomes(source);
  accepted = true;
  await funnel.consumeConfirmedOutcomes(source);

  assert.deepEqual(events, [{ name: "first_api_request", parameters: {} }]);
});

test("runtime-invalid outcomes are ignored and abort after reading emits nothing", async () => {
  const events: FunnelEvent[] = [];
  const invalidSource: ConfirmedFunnelOutcomeSource = {
    readConfirmedOutcomes: async () => [
      { id: "unknown:1", kind: "clicked_checkout" },
      { id: "", kind: "signup_completed" },
      null,
    ],
  };
  const funnel = createFunnelConsumer(event => (events.push(event), true));
  await funnel.consumeConfirmedOutcomes(invalidSource);
  assert.deepEqual(events, []);

  const invalidCollectionSource: ConfirmedFunnelOutcomeSource = {
    readConfirmedOutcomes: async () => ({ kind: "signup_completed" }),
  };
  await funnel.consumeConfirmedOutcomes(invalidCollectionSource);
  assert.deepEqual(events, []);

  const controller = new AbortController();
  const abortingSource: ConfirmedFunnelOutcomeSource = {
    readConfirmedOutcomes: async () => {
      controller.abort();
      return [{ id: "signup:1", kind: "signup_completed" }];
    },
  };
  await funnel.consumeConfirmedOutcomes(abortingSource, controller.signal);
  assert.deepEqual(events, []);
});
