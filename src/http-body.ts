import { HttpError } from "./errors.js";

// Count bytes while reading: Content-Length is optional and never trusted alone.
export async function readBoundedText(
  response: Pick<Response, "body" | "headers">,
  maxBytes: number,
  tooLarge: HttpError,
  unreadable: HttpError,
): Promise<string> {
  const reader = response.body?.getReader();
  if (Number(response.headers.get("content-length") ?? 0) > maxBytes) {
    if (reader) { try { await reader.cancel(); } finally { reader.releaseLock(); } }
    throw tooLarge;
  }
  if (!reader) return "";
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw tooLarge;
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } catch (cause) {
    try { await reader.cancel(); } catch { /* Preserve the original rejection. */ }
    throw cause instanceof HttpError ? cause : unreadable;
  } finally {
    reader.releaseLock();
  }
}

export async function readBoundedJson(response: Response, maxBytes: number): Promise<unknown> {
  const invalid = new HttpError(502, "provider_response_invalid", "The provider returned an unreadable response.");
  const text = await readBoundedText(response, maxBytes,
    new HttpError(502, "provider_response_too_large", "The provider response exceeds the configured size limit."), invalid);
  try { return JSON.parse(text) as unknown; } catch { throw invalid; }
}
