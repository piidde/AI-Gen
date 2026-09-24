import type { UsageRequest } from './viewModels';

// Fictional seven-day activity for the landing-page excerpt, not live usage.
// Chart totals and recent rows are derived from this same request history.
export function homeDashboardRequests(now = new Date()): UsageRequest[] {
  return [12, 18, 15, 25, 21, 28, 24].flatMap((count, dayIndex) =>
    Array.from({ length: count }, (_, index): UsageRequest => {
      const started = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + dayIndex);
      const availableMs = dayIndex === 6 ? now.getTime() - started.getTime() : 86_400_000;
      started.setTime(started.getTime() + Math.floor(availableMs * (index + 1) / (count + 1)));
      const image = index % 3 === 1;
      return {
        id: `req_preview_${dayIndex}_${index}`, startedAt: started.toISOString(),
        completedAt: started.toISOString(), durationMs: 1250,
        modelId: image ? 'sample-image' : 'sample-text',
        modelName: image ? 'Sample image model' : 'Sample text model',
        keyId: 'key-production', keyName: 'Production', outcome: 'completed',
        inputTokens: image ? null : 120 + index, outputTokens: image ? null : 60 + index,
        cachedInputTokens: image ? null : 0, imageCount: image ? 1 : null,
        billing: { status: 'charged', credits: image ? '0.024' : '0.012', rateVersion: 'demo-v1' },
        error: null,
      };
    }),
  );
}
