export function getSafeNext(value: string | null): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    // URL parsers can strip tabs/newlines and change the destination's meaning.
    !/[\u0000-\u001f\u007f]/.test(value)
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
