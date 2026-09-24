import { catalogue, snapshot } from "./catalogue.ts";
import { availabilityLabel } from "./modelFamilies.ts";

// Local view fixtures, not an operational feed or a proposed API contract.
export const statusScenarios = ["unavailable", "incident", "resolved", "stale", "loading"] as const;
export type StatusScenario = typeof statusScenarios[number];
export type Incident = {
  id: string; title: string; impact: string; modelIds: string[]; service: string;
  startedAt: string; updatedAt: string; resolvedAt: string | null;
  timeline: { at: string; message: string }[];
};
export type ServiceStatus = {
  state: StatusScenario; title: string; description: string;
  sourceUpdatedAt: string | null; incidents: Incident[];
};

export function readStatusScenario(search: string): StatusScenario {
  const value = new URLSearchParams(search).get("statusPreview");
  return statusScenarios.find(scenario => scenario === value) ?? "unavailable";
}

export function statusHref(search: string): string {
  const value = new URLSearchParams(search).get("statusPreview");
  return value && statusScenarios.some(scenario => scenario === value) ? `/status?statusPreview=${value}` : "/status";
}

const sampleIncident: Incident = {
  id: "sample-image-delays", title: "Sample incident: delayed image requests",
  impact: "In this fictional scenario, requests using gpt-image-2 may take longer or fail. Other models and services have no verified health data.",
  modelIds: ["gpt-image-2"], service: "Image generation",
  startedAt: "2026-09-18T08:00:00Z", updatedAt: "2026-09-18T08:20:00Z", resolvedAt: null,
  timeline: [
    { at: "2026-09-18T08:20:00Z", message: "Sample update: the cause is being investigated; recovery time is unknown." },
    { at: "2026-09-18T08:00:00Z", message: "Sample incident opened after elevated request delays." },
  ],
};

export function getServiceStatus(state: StatusScenario): ServiceStatus {
  if (state === "unavailable") return { state, title: "Service status is not connected", description: "Current service health is unknown. No live status source or incident publisher is connected.", sourceUpdatedAt: null, incidents: [] };
  if (state === "loading") return { state, title: "Loading status preview", description: "This is a static loading-state demonstration. Current service health is unknown while a source is pending.", sourceUpdatedAt: null, incidents: [] };
  if (state === "stale") return { state, title: "Status source is stale", description: "This fictional snapshot is out of date. Its last reported incident is historical information and cannot establish current health or recovery.", sourceUpdatedAt: "2026-09-18T08:20:00Z", incidents: [sampleIncident] };
  if (state === "resolved") {
    const resolvedAt = "2026-09-18T09:10:00Z";
    return { state, title: "Sample incident resolved", description: "Recovery is recorded only in this fictional scenario. Current live service health remains unknown.", sourceUpdatedAt: resolvedAt, incidents: [{ ...sampleIncident, updatedAt: resolvedAt, resolvedAt, timeline: [{ at: resolvedAt, message: "Sample resolution: request processing recovered in this demonstration." }, ...sampleIncident.timeline] }] };
  }
  return { state, title: "Sample service disruption", description: "A fictional incident affects one image model. This preview does not report a real outage or verify other services.", sourceUpdatedAt: sampleIncident.updatedAt, incidents: [sampleIncident] };
}

export const catalogueNotices = catalogue.filter(model => model.availability !== "unknown").map(model => ({
  modelId: model.upstreamId, label: availabilityLabel(model), checkedOn: snapshot.checkedOn,
}));

export const updates = [
  {
    slug: "sample-catalogue-reference", title: "Sample announcement: exploring model references",
    publishedAt: "2026-09-20T10:00:00Z", sample: true,
    summary: "An example product update describing a model reference catalogue.",
    paragraphs: ["This sample demonstrates the announcement format. It is not production news or a launch announcement.", "Model references let readers compare listed variants and inspect evidence gaps. A reference listing does not establish Takewing support, a working API ID or current availability."],
  },
  {
    slug: "sample-account-tools", title: "Sample announcement: account tools preview",
    publishedAt: "2026-09-17T10:00:00Z", sample: true,
    summary: "An example product update about the customer dashboard preview.",
    paragraphs: ["This is fictional editorial content for reviewing the updates archive, not a published release notice.", "The dashboard demonstrates account tools with sample data. Production billing, key management and other account operations require their verified backend integrations."],
  },
] as const;
