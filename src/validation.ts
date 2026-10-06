import { z } from "zod";
import { HttpError } from "./errors.js";

const messageSchema = z.object({
  role: z.enum(["system", "developer", "user", "assistant"]),
  content: z.string().max(250_000),
}).strict();

export const chatRequestSchema = z.object({
  model: z.string().min(1).max(120),
  messages: z.array(messageSchema).min(1).max(100),
  max_tokens: z.number().int().min(1).max(100_000).optional(),
  max_completion_tokens: z.number().int().min(1).max(100_000).optional(),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().gt(0).max(1).optional(),
  stop: z.union([z.string().max(500), z.array(z.string().max(500)).max(4)]).optional(),
  seed: z.number().int().optional(),
}).strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const generationRequestSchema = z.object({
  model: z.string().min(1).max(120),
  input: z.record(z.string(), z.unknown()),
}).strict();

export function validateChat(raw: unknown): { request: ChatRequest; maxOutputTokens: number } {
  const parsed = chatRequestSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "invalid_request", "The chat request contains invalid or unsupported fields.");
  if (parsed.data.stream === true) throw new HttpError(501, "streaming_not_enabled", "Streaming is not enabled until the upstream stream format and billing are verified.");
  if (parsed.data.max_tokens !== undefined && parsed.data.max_completion_tokens !== undefined) {
    throw new HttpError(400, "invalid_request", "Set either max_tokens or max_completion_tokens, not both.");
  }
  const maxOutputTokens = parsed.data.max_completion_tokens ?? parsed.data.max_tokens;
  if (maxOutputTokens === undefined) throw new HttpError(400, "max_tokens_required", "Set max_tokens to reserve a bounded maximum cost.");
  return { request: parsed.data, maxOutputTokens };
}

export function estimatedInputTokens(messages: ChatRequest["messages"]): number {
  const bytes = new TextEncoder().encode(JSON.stringify(messages)).byteLength;
  const estimated = Math.ceil(bytes * 2) + messages.length * 16;
  if (!Number.isSafeInteger(estimated) || estimated > 100_000) {
    throw new HttpError(413, "input_too_large", "The estimated input exceeds the API limit.");
  }
  return estimated;
}

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
