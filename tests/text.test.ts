import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HttpError } from "../src/errors.js";
import { chatCompletionChunks, chatUsage, responsesUsage, SseParser, streamedOutcome } from "../src/text.js";
import { DEFAULT_INSTRUCTIONS, estimatedInputTokens, validateChat, validateResponses } from "../src/validation.js";
import { ADMIN, configureCatalog, freshDb, rpc } from "./db-helpers.js";

const code = (fn: () => unknown) => {
  try { fn(); } catch (error) { return (error as HttpError).code; }
  throw new Error("expected a rejection");
};

test("chat accepts SDK and harness shapes, flattens text parts and refuses tools and images", () => {
  const request = validateChat({
    model: "gpt-5.5", stream: true, stream_options: { include_usage: true }, metadata: { trace: "x" }, n: 1,
    messages: [{ role: "system", content: "Be brief." }, { role: "user", content: [{ type: "text", text: "a" }, { type: "text", text: "b" }] }],
  });
  assert.equal(request.messages[1]!.content, "a\nb");
  assert.equal(request.requestedMaxTokens, null);
  assert.equal(request.stream, true);
  assert.equal(request.includeUsage, true);
  assert.deepEqual(request.options, {});
  assert.equal(code(() => validateChat({ model: "m", messages: [{ role: "user", content: "x" }], tools: [] })), "tools_require_responses_api");
  assert.equal(code(() => validateChat({ model: "m", messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "https://x" } }] }] })), "image_input_unsupported");
  assert.equal(code(() => validateChat({ model: "m", messages: [{ role: "user", content: "x" }], n: 2 })), "invalid_request");
  assert.equal(validateChat({ model: "m", messages: [{ role: "user", content: "x" }], max_completion_tokens: 64, temperature: 0.2 }).requestedMaxTokens, 64);
});

test("responses keep client state out, force store=false and add neutral instructions", () => {
  const request = validateResponses({
    model: "gpt-5.6-sol", stream: true, store: true, metadata: { a: 1 },
    input: [
      { type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] },
      { type: "function_call", call_id: "c1", name: "f", arguments: "{}" },
      { type: "function_call_output", call_id: "c1", output: "ok" },
      { role: "assistant", content: "done" },
    ],
    tools: [{ type: "function", name: "f", parameters: { type: "object", properties: {} } }],
  });
  assert.equal(request.body.store, false);
  assert.equal(request.body.instructions, DEFAULT_INSTRUCTIONS);
  assert.equal("metadata" in request.body, false);
  assert.equal(request.itemCount, 4);
  assert.equal(validateResponses({ model: "m", input: "x", instructions: "Codex prompt" }).body.instructions, "Codex prompt");
  assert.equal(code(() => validateResponses({ model: "m", input: "x", previous_response_id: "resp_1" })), "previous_response_unsupported");
  assert.equal(code(() => validateResponses({ model: "m", input: "x", tools: [{ type: "web_search" }] })), "hosted_tool_unsupported");
  assert.equal(code(() => validateResponses({ model: "m", input: [{ type: "message", role: "user", content: [{ type: "input_image", image_url: "x" }] }] })), "image_input_unsupported");
  assert.equal(code(() => validateResponses({ model: "m", input: [{ type: "computer_call" }] })), "invalid_request");
});

test("the input estimate grows with payload bytes and items", () => {
  const small = estimatedInputTokens({ input: "hi" }, 1);
  const large = estimatedInputTokens({ input: "x".repeat(10_000) }, 1);
  assert.ok(small >= 1_024);
  assert.ok(large - small >= 4_990);
  assert.ok(estimatedInputTokens({ input: "hi" }, 10) > small);
});

test("the recorded provider stream yields usage only from response.completed, regardless of chunking", () => {
  const fixture = readFileSync(new URL("./fixtures/responses-stream.txt", import.meta.url), "utf8");
  for (const size of [1, 7, 64, 1_000, fixture.length]) {
    const parser = new SseParser();
    const events = [];
    for (let i = 0; i < fixture.length; i += size) events.push(...parser.push(fixture.slice(i, i + size)));
    const outcome = streamedOutcome(events);
    assert.equal(outcome.failed, false);
    assert.deepEqual(responsesUsage(outcome.completed), { input: 60, output: 18 });
  }
  const cut = fixture.slice(0, fixture.indexOf("event: response.completed"));
  const truncated = streamedOutcome(new SseParser().push(cut));
  assert.equal(truncated.completed, null);
  const failed = streamedOutcome(new SseParser().push('event: response.failed\ndata: {"type":"response.failed","response":{"status":"failed"}}\n\n'));
  assert.equal(failed.failed, true);
  assert.equal(responsesUsage({ status: "incomplete", usage: { input_tokens: 1, output_tokens: 1 } }), null);
});

test("streamed chat re-emits one billed completion as OpenAI chunks", () => {
  const completion = { id: "c1", created: 1, model: "gemini-3-flash", choices: [{ index: 0, message: { role: "assistant", content: "1 2 3" }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 3 } };
  assert.deepEqual(chatUsage(completion), { input: 5, output: 3 });
  const chunks = chatCompletionChunks(completion, true);
  assert.equal(chunks.at(-1), "data: [DONE]\n\n");
  const parsed = chunks.slice(0, -1).map((chunk) => JSON.parse(chunk.slice(6)));
  assert.equal(parsed[0].choices[0].delta.content, "1 2 3");
  assert.equal(parsed[1].choices[0].finish_reason, "stop");
  assert.deepEqual(parsed[2].usage, completion.usage);
  assert.equal(chatCompletionChunks(completion, false).length, 3);
});

test("verified GPT models expose the Responses API and token limits; others stay chat-only", async () => {
  const db = await freshDb();
  await configureCatalog(db);
  const models = await rpc<Array<{ id: string; responses_api: boolean; max_input_tokens: number; max_output_tokens: number }>>(db, "tw_list_models");
  const gpt = models.find((model) => model.id === "gpt-5.5")!;
  assert.equal(gpt.responses_api, true);
  assert.equal(gpt.max_input_tokens, 100000);
  assert.equal(gpt.max_output_tokens, 8000);
  assert.equal(models.find((model) => model.id === "nano-banana-2")!.responses_api, false);
  await rpc(db, "tw_admin_set_responses_api", ADMIN, "provider regression", "gpt-5.5", false);
  assert.equal((await rpc<Array<{ id: string; responses_api: boolean }>>(db, "tw_list_models")).find((model) => model.id === "gpt-5.5")!.responses_api, false);
});
