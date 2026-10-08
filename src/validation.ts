import { z } from "zod";
import { HttpError } from "./errors.js";

const toolsMoved = new HttpError(400, "tools_require_responses_api",
  "Tool calling is available on /v1/responses with a coding model (GPT). Chat completions accept text only.");
const imagesUnsupported = new HttpError(400, "image_input_unsupported", "Image and file input are not supported yet.");

// Text parts are flattened; anything else (images, audio, files) has no byte-bounded token cost.
const textPart = z.object({ type: z.literal("text"), text: z.string().max(250_000) }).passthrough();
const messageSchema = z.object({
  role: z.enum(["system", "developer", "user", "assistant"]),
  content: z.union([z.string().max(250_000), z.array(z.unknown()).min(1).max(200)]),
  name: z.string().max(64).optional(),
}).passthrough();

const chatSchema = z.object({
  model: z.string().min(1).max(120),
  messages: z.array(messageSchema).min(1).max(500),
  max_tokens: z.number().int().min(1).max(1_000_000).optional(),
  max_completion_tokens: z.number().int().min(1).max(1_000_000).optional(),
  stream: z.boolean().optional(),
  stream_options: z.object({ include_usage: z.boolean().optional() }).passthrough().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().gt(0).max(1).optional(),
  stop: z.union([z.string().max(500), z.array(z.string().max(500)).max(4)]).optional(),
  seed: z.number().int().optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  n: z.number().int().optional(),
}).passthrough();

export type ChatMessage = { role: "system" | "developer" | "user" | "assistant"; content: string; name?: string };
export type ChatRequest = {
  model: string; messages: ChatMessage[]; requestedMaxTokens: number | null; stream: boolean; includeUsage: boolean;
  options: Record<string, unknown>;
};

// Accepts what OpenAI SDKs and simple harnesses send; unknown harmless fields are dropped
// rather than rejected. Tools are refused explicitly because the provider ignores or
// stalls on them for chat completions (verified 2026-10-08).
export function validateChat(raw: unknown): ChatRequest {
  if (raw && typeof raw === "object" && ["tools", "tool_choice", "functions", "function_call"].some((key) => key in raw)) throw toolsMoved;
  const parsed = chatSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "invalid_request", "The chat request contains invalid fields.");
  const data = parsed.data;
  if (data.n !== undefined && data.n !== 1) throw new HttpError(400, "invalid_request", "Only n=1 is supported.");
  if (data.max_tokens !== undefined && data.max_completion_tokens !== undefined && data.max_tokens !== data.max_completion_tokens) {
    throw new HttpError(400, "invalid_request", "Set either max_tokens or max_completion_tokens, not both.");
  }
  const messages = data.messages.map((message): ChatMessage => {
    let content: string;
    if (typeof message.content === "string") content = message.content;
    else {
      const parts = z.array(textPart).safeParse(message.content);
      if (!parts.success) throw imagesUnsupported;
      content = parts.data.map((part) => part.text).join("\n");
    }
    return { role: message.role, content, ...(message.name ? { name: message.name } : {}) };
  });
  const options: Record<string, unknown> = {};
  for (const key of ["temperature", "top_p", "stop", "seed", "presence_penalty", "frequency_penalty"] as const) {
    if (data[key] !== undefined) options[key] = data[key];
  }
  return {
    model: data.model, messages, requestedMaxTokens: data.max_completion_tokens ?? data.max_tokens ?? null,
    stream: data.stream === true, includeUsage: data.stream_options?.include_usage === true, options,
  };
}

const responseContentPart = z.object({ type: z.enum(["input_text", "output_text", "refusal", "text"]) }).passthrough();
const responseItem = z.object({ type: z.string().max(64).optional(), role: z.string().max(32).optional() }).passthrough();
const responseTool = z.object({ type: z.string().max(64) }).passthrough();

const responsesSchema = z.object({
  model: z.string().min(1).max(120),
  input: z.union([z.string().max(4_000_000), z.array(responseItem).min(1).max(5_000)]),
  instructions: z.string().max(1_000_000).nullable().optional(),
  tools: z.array(responseTool).max(256).optional(),
  tool_choice: z.unknown().optional(),
  parallel_tool_calls: z.boolean().optional(),
  max_output_tokens: z.number().int().min(1).max(1_000_000).nullable().optional(),
  reasoning: z.object({}).passthrough().nullable().optional(),
  text: z.object({}).passthrough().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  top_p: z.number().gt(0).max(1).nullable().optional(),
  include: z.array(z.string().max(120)).max(20).nullable().optional(),
  prompt_cache_key: z.string().max(200).optional(),
  stream: z.boolean().optional(),
  previous_response_id: z.string().nullable().optional(),
  background: z.boolean().nullable().optional(),
}).passthrough();

export type ResponsesRequest = { model: string; requestedMaxTokens: number | null; stream: boolean; body: Record<string, unknown>; itemCount: number };

// Neutral default so the provider does not inject its 4k-token Codex prompt (measured
// 2026-10-08); clients such as Codex send their own instructions.
export const DEFAULT_INSTRUCTIONS = "You are a helpful assistant.";
const CLIENT_TOOL_TYPES = new Set(["function", "custom", "local_shell"]);
const ITEM_TYPES = new Set(["message", "function_call", "function_call_output", "custom_tool_call", "custom_tool_call_output",
  "local_shell_call", "local_shell_call_output", "reasoning"]);

// Server-side state and provider-hosted tools are refused: we cannot store
// conversations, and hosted tools carry provider charges outside token usage.
export function validateResponses(raw: unknown): ResponsesRequest {
  const parsed = responsesSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "invalid_request", "The responses request contains invalid fields.");
  const data = parsed.data;
  if (data.previous_response_id) throw new HttpError(400, "previous_response_unsupported", "previous_response_id is not supported; send the full input with store=false.");
  if (data.background) throw new HttpError(400, "background_unsupported", "Background responses are not supported.");
  for (const tool of data.tools ?? []) {
    if (!CLIENT_TOOL_TYPES.has(tool.type)) throw new HttpError(400, "hosted_tool_unsupported", `The ${tool.type} tool is not supported; use function tools.`);
  }
  const items = typeof data.input === "string" ? [] : data.input;
  for (const item of items) {
    const type = item.type ?? (item.role ? "message" : undefined);
    if (!type || !ITEM_TYPES.has(type)) throw new HttpError(400, "invalid_request", "The input contains an unsupported item type.");
    if (type === "message" && Array.isArray(item.content) && !z.array(responseContentPart).safeParse(item.content).success) throw imagesUnsupported;
  }
  const body: Record<string, unknown> = {
    model: data.model, input: data.input, instructions: data.instructions || DEFAULT_INSTRUCTIONS, store: false,
  };
  for (const key of ["tools", "tool_choice", "parallel_tool_calls", "reasoning", "text", "temperature", "top_p", "include", "prompt_cache_key"] as const) {
    if (data[key] !== undefined && data[key] !== null) body[key] = data[key];
  }
  return { model: data.model, requestedMaxTokens: data.max_output_tokens ?? null, stream: data.stream === true, body, itemCount: Math.max(1, items.length) };
}

// Upper-bound style estimate for the reservation: about two bytes per token, plus
// per-item framing and the provider's own small prompt overhead (up to ~300 tokens
// measured). Settlement always uses the provider's reported usage.
export function estimatedInputTokens(payload: unknown, items: number): number {
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  return Math.ceil(bytes / 2) + items * 16 + 1_024;
}

export const generationRequestSchema = z.object({
  model: z.string().min(1).max(120),
  input: z.record(z.string(), z.unknown()),
}).strict();

type JsonSchema = {
  type?: string;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  additionalProperties?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
};

function parseSupportedSchema(value: unknown, depth = 0): JsonSchema {
  if (depth > 8 || !value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "invalid_model_settings", "The model parameter schema is not supported.");
  }
  const object = value as Record<string, unknown>;
  const allowedKeys = new Set(["type", "enum", "required", "properties", "items", "additionalProperties", "minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems", "description", "title"]);
  if (Object.keys(object).some((key) => !allowedKeys.has(key))) throw new HttpError(400, "invalid_model_settings", "The model parameter schema uses an unsupported rule.");
  const types = new Set(["string", "number", "integer", "boolean", "array", "object"]);
  if (typeof object.type !== "string" || !types.has(object.type)) throw new HttpError(400, "invalid_model_settings", "Every model parameter needs a supported type.");
  if (object.enum !== undefined && !Array.isArray(object.enum)) throw new HttpError(400, "invalid_model_settings", "Enum values must be an array.");
  if (object.additionalProperties !== undefined && typeof object.additionalProperties !== "boolean") throw new HttpError(400, "invalid_model_settings", "additionalProperties must be boolean.");
  if (object.type === "object") {
    if (!object.properties || typeof object.properties !== "object" || Array.isArray(object.properties)) throw new HttpError(400, "invalid_model_settings", "Object parameters need a properties map.");
    for (const property of Object.values(object.properties as Record<string, unknown>)) parseSupportedSchema(property, depth + 1);
    if (object.required !== undefined && (!Array.isArray(object.required) || object.required.some((item) => typeof item !== "string" || !(item in (object.properties as Record<string, unknown>))))) {
      throw new HttpError(400, "invalid_model_settings", "Required parameter names must exist in properties.");
    }
  }
  if (object.type === "array") {
    if (object.items === undefined) throw new HttpError(400, "invalid_model_settings", "Array parameters need an item schema.");
    parseSupportedSchema(object.items, depth + 1);
  }
  return value as JsonSchema;
}

function checkSchema(value: unknown, schema: JsonSchema, path: string, depth: number): void {
  if (depth > 8) throw new HttpError(503, "model_schema_invalid", "The model input schema is unavailable.");
  if (schema.enum && !schema.enum.some((item) => Object.is(item, value))) {
    throw new HttpError(400, "invalid_model_input", `The field ${path} has an unsupported value.`);
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "invalid_model_input", `The field ${path} must be an object.`);
    const object = value as Record<string, unknown>;
    const properties = schema.properties ?? {};
    for (const required of schema.required ?? []) if (!(required in object)) throw new HttpError(400, "invalid_model_input", `The field ${path}.${required} is required.`);
    if (schema.additionalProperties !== true && Object.keys(object).some((key) => !(key in properties))) {
      throw new HttpError(400, "invalid_model_input", `The field ${path} contains an unsupported property.`);
    }
    for (const [key, item] of Object.entries(object)) {
      const propertySchema = properties[key];
      if (propertySchema) checkSchema(item, propertySchema, `${path}.${key}`, depth + 1);
      if (/(url|image|reference|video)/i.test(key) && typeof item === "string" && /^https?:\/\//i.test(item)) {
        throw new HttpError(400, "remote_media_url_not_supported", "Remote reference URLs are disabled until safe fetching is implemented.");
      }
    }
    return;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value) || value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? 20)) {
      throw new HttpError(400, "invalid_model_input", `The field ${path} has an invalid number of items.`);
    }
    if (schema.items) value.forEach((item, index) => checkSchema(item, schema.items!, `${path}[${index}]`, depth + 1));
    return;
  }
  if (schema.type === "string") {
    if (typeof value !== "string" || value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? 100_000)) {
      throw new HttpError(400, "invalid_model_input", `The field ${path} must be a string within its configured length.`);
    }
    if (/(url|image|reference|video)/i.test(path) && /^https?:\/\//i.test(value)) {
      throw new HttpError(400, "remote_media_url_not_supported", "Remote reference URLs are disabled until safe fetching is implemented.");
    }
    return;
  }
  if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value) || (schema.type === "integer" && !Number.isInteger(value))
      || (schema.minimum !== undefined && value < schema.minimum) || (schema.maximum !== undefined && value > schema.maximum)) {
      throw new HttpError(400, "invalid_model_input", `The field ${path} is outside its configured range.`);
    }
    return;
  }
  if (schema.type === "boolean" && typeof value !== "boolean") throw new HttpError(400, "invalid_model_input", `The field ${path} must be a boolean.`);
  if (schema.type && !["string", "number", "integer", "boolean", "array", "object"].includes(schema.type)) {
    throw new HttpError(503, "model_schema_invalid", "The model input schema is unavailable.");
  }
}

export function validateModelInput(value: Record<string, unknown>, schema: unknown): void {
  let parsed: JsonSchema;
  try { parsed = parseSupportedSchema(schema); }
  catch (error) {
    if (error instanceof HttpError) throw new HttpError(503, "model_schema_invalid", "The model input schema is unavailable.");
    throw error;
  }
  if (parsed.type !== "object" || !parsed.properties) {
    throw new HttpError(503, "model_schema_invalid", "The model input schema is unavailable.");
  }
  checkSchema(value, parsed, "input", 0);
}

export function validateParameterSchema(schema: unknown): void {
  const parsed = parseSupportedSchema(schema);
  if (parsed.type !== "object" || !parsed.properties) throw new HttpError(400, "invalid_model_settings", "The model parameter schema must be an object schema.");
}
