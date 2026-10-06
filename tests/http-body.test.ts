import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../src/errors.js";
import { readBoundedJson, readBoundedText } from "../src/http-body.js";

const tooLarge = new HttpError(413, "request_too_large", "too large");
const unreadable = new HttpError(400, "invalid_json", "unreadable");

function streamOf(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); },
    cancel() { cancelled = true; },
  });
  return { response: { body, headers: new Headers(headers) }, wasCancelled: () => cancelled };
}

test("accepts a body at exactly the limit", async () => {
  const { response } = streamOf([new TextEncoder().encode("abcde")]);
  assert.equal(await readBoundedText(response, 5, tooLarge, unreadable), "abcde");
});

test("rejects on a declared Content-Length without reading the body", async () => {
  const { response, wasCancelled } = streamOf([new TextEncoder().encode("x")], { "content-length": "99" });
  await assert.rejects(readBoundedText(response, 10, tooLarge, unreadable), tooLarge);
  assert.equal(wasCancelled(), true);
});

test("rejects a body that exceeds the limit although Content-Length is missing or understated", async () => {
  const chunks = [new TextEncoder().encode("12345"), new TextEncoder().encode("67890"), new TextEncoder().encode("1")];
  await assert.rejects(readBoundedText(streamOf(chunks).response, 10, tooLarge, unreadable), tooLarge);
  await assert.rejects(readBoundedText(streamOf(chunks, { "content-length": "3" }).response, 10, tooLarge, unreadable), tooLarge);
});

test("counts bytes, not characters, and decodes characters split across chunks", async () => {
  const bytes = new TextEncoder().encode("äö€"); // 2+2+3 bytes
  const split = [bytes.slice(0, 3), bytes.slice(3)];
  assert.equal(await readBoundedText(streamOf(split).response, 7, tooLarge, unreadable), "äö€");
  await assert.rejects(readBoundedText(streamOf(split).response, 6, tooLarge, unreadable), tooLarge);
});

test("an empty or missing body is an empty string and a read failure maps to the unreadable error", async () => {
  assert.equal(await readBoundedText({ body: null, headers: new Headers() }, 10, tooLarge, unreadable), "");
  const failing = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("socket reset")); } });
  await assert.rejects(readBoundedText({ body: failing, headers: new Headers() }, 10, tooLarge, unreadable), unreadable);
});

test("provider JSON: invalid or oversized responses are provider errors, valid ones parse", async () => {
  const json = (text: string, headers = {}) => new Response(text, { headers });
  assert.deepEqual(await readBoundedJson(json('{"a":1}'), 100), { a: 1 });
  await assert.rejects(readBoundedJson(json("not json"), 100), (e: HttpError) => e.code === "provider_response_invalid" && e.status === 502);
  await assert.rejects(readBoundedJson(json('{"a":"' + "x".repeat(200) + '"}'), 100), (e: HttpError) => e.code === "provider_response_too_large");
});
