import type { UsageRequest } from './viewModels';

const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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
        billing: { status: 'charged', credits: image ? '0.04' : '0.002', rateVersion: 'v1' },
        error: null,
      };
    }),
  );
}

// Daily series, totals and newest rows for the illustration; amounts are exact integer micros.
export function homeDashboardPreview(now = new Date()) {
  const requests = homeDashboardRequests(now);
  const micros = (request: UsageRequest) => request.billing.status === 'charged' ? BigInt(Math.round(Number(request.billing.credits) * 1_000_000)) : 0n;
  const decimal = (value: bigint) => `${value / 1_000_000n}.${(value % 1_000_000n).toString().padStart(6, '0')}`.replace(/\.?0+$/, '');
  const daily = Array.from({ length: 7 }, (_, index) => {
    const day = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index));
    const rows = requests.filter(request => localDay(new Date(request.startedAt)) === day);
    return { day, requests: rows.length, credits: decimal(rows.reduce((sum, row) => sum + micros(row), 0n)) };
  });
  return { daily, totals: { requests: requests.length, credits: decimal(requests.reduce((sum, row) => sum + micros(row), 0n)) },
    recent: [...requests].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 2) };
}
