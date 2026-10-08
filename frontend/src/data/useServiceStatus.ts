import type { Incident } from "../content/serviceStatus";
import { apiFetchPublic, useApiResource, type StatusDto } from "./api";

export type LiveStatus = { incidents: Incident[]; updatedAt: string | null; checkedAt: string };

export function useServiceStatus() {
  return useApiResource<LiveStatus>("/v1/status", async (path, signal) => {
    const status = await apiFetchPublic<StatusDto>(path, { signal });
    return { checkedAt: status.checked_at, updatedAt: status.updated_at, incidents: status.incidents.map(incident => ({
      id: incident.id, title: incident.title, impact: incident.impact, modelIds: incident.model_ids, service: incident.service,
      startedAt: incident.started_at, updatedAt: incident.updated_at, resolvedAt: incident.resolved_at, timeline: incident.timeline,
    })) };
  });
}
