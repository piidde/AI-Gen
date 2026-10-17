export type AnnouncementCategory = "feature" | "important" | "platform";

export type AnnouncementDto = {
  id: string; title: string; body: string; category: AnnouncementCategory; published_at: string; updated_at: string;
};

export const categoryLabels: Record<AnnouncementCategory, string> = {
  feature: "New feature",
  important: "Important",
  platform: "Platform update",
};

// Per-browser "seen" marker for the navigation dot; losing it only re-shows the dot.
const SEEN_KEY = "takewing.announcements.seen";

export function readSeenAt(): string | null {
  try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
}

export function markSeen(publishedAt: string): void {
  try { localStorage.setItem(SEEN_KEY, publishedAt); } catch { /* storage unavailable */ }
}
