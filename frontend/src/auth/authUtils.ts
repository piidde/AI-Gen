export function getSafeNext(value: string | null): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("\0")
  ) {
    return value;
  }
  return "/dashboard";
}

export function getAuthCallbackUrl(next: string): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Authentication could not be completed.";
}
