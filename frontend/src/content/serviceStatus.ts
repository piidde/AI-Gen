import { catalogue, snapshot } from "./catalogue.ts";
import { availabilityLabel } from "./modelFamilies.ts";

// Incidents come from the published backend feed (GET /v1/status). An empty feed means
// nothing has been reported, never that every service is verified healthy.
export type Incident = {
  id: string; title: string; impact: string; modelIds: string[]; service: string;
  startedAt: string; updatedAt: string; resolvedAt: string | null;
  timeline: { at: string; message: string }[];
};

export const catalogueNotices = catalogue.filter(model => model.availability !== "unknown").map(model => ({
  modelId: model.upstreamId, label: availabilityLabel(model), checkedOn: snapshot.checkedOn,
}));

export type Update = { slug: string; title: string; publishedAt: string; summary: string; paragraphs: readonly string[] };

// Published product announcements, newest first. Add entries here when there is real news.
export const updates: readonly Update[] = [];
