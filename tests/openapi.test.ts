import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createOpenApiDocument } from "../src/openapi.js";

const document = createOpenApiDocument("https://api.example.test");
const paths = document.paths as Record<string, Record<string, any>>;

test("every implemented HTTP route has an operation, responses and required path parameters", () => {
  const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
  const registered = [...source.matchAll(/app\.(get|post|delete)\("([^"]+)"/g)].map((match) => [match[1], match[2].replace(/:([A-Za-z]+)/g, "{$1}")]);
  assert.equal(Object.keys(paths).length, new Set(registered.map(([, route]) => route)).size);
  const ids = new Set<string>();
  for (const [method, route] of registered) {
    const operation = paths[route][method];
    assert.ok(operation, `${method} ${route}`);
    assert.ok(Object.keys(operation.responses).some((status) => /^2\d\d$/.test(status)), route);
    assert.ok(operation.responses.default, route);
    assert.ok(!ids.has(operation.operationId), `duplicate ${operation.operationId}`);
    ids.add(operation.operationId);
    for (const match of route.matchAll(/\{([^}]+)\}/g)) {
      assert.ok(operation.parameters.some((param: any) => param.in === "path" && param.name === match[1] && param.required === true), route);
    }
    if (method === "post") assert.ok(operation.requestBody?.content["application/json"].schema, route);
  }
});

test("all references and authentication schemes resolve", () => {
  function visit(value: any): void {
    if (!value || typeof value !== "object") return;
    if (value.$ref) {
      assert.ok(value.$ref.startsWith("#/"));
      let target: any = document;
      for (const segment of value.$ref.slice(2).split("/")) target = target?.[segment];
      assert.ok(target, `unresolved ${value.$ref}`);
    }
    if (Array.isArray(value.security)) {
      for (const requirement of value.security) for (const name of Object.keys(requirement)) {
        assert.ok(name in document.components.securitySchemes, name);
      }
    }
    for (const item of Object.values(value)) visit(item);
  }
  visit(document);
  assert.equal(document.openapi, "3.1.0");
  assert.deepEqual(document.servers, [{ url: "https://api.example.test" }]);
});

test("generation, customer management and signed webhooks declare distinct credentials", () => {
  assert.deepEqual(paths["/v1/chat/completions"].post.security, [{ takewingKey: [] }]);
  assert.deepEqual(paths["/v1/generations"].post.security, [{ takewingKey: [] }]);
  assert.deepEqual(paths["/v1/requests/{id}"].get.security, [{ takewingKey: [] }, { supabaseToken: [] }]);
  assert.deepEqual(paths["/v1/api-keys"].post.security, [{ supabaseToken: [] }]);
  assert.deepEqual(paths["/v1/internal/ops"].get.security, [{ supabaseToken: [] }]);
  assert.deepEqual(paths["/stripe/webhook"].post.security, [{ stripeSignature: [] }]);
  assert.deepEqual(paths["/v1/models"].get.security, []);
});

test("idempotency, output limits, expiry and streamed media contracts are explicit", () => {
  for (const route of ["/v1/generations", "/v1/billing/checkout", "/v1/internal/accounts/{id}/credits"]) {
    const header = paths[route].post.parameters.find((param: any) => param.name === "Idempotency-Key");
    assert.equal(header.required, true);
    assert.equal(header.schema.minLength, 8);
    assert.equal(header.schema.maxLength, 128);
  }
  const chat = document.components.schemas.ChatRequest as any;
  assert.equal(chat.additionalProperties, false);
  assert.deepEqual(chat.oneOf.map((option: any) => option.required), [["max_tokens"], ["max_completion_tokens"]]);
  assert.equal(chat.properties.messages.maxItems, 100);
  assert.ok(paths["/v1/chat/completions"].post.responses["501"]);
  assert.ok(paths["/v1/requests/{id}/result"].get.responses["410"]);
  assert.ok(paths["/v1/files/{requestId}/{index}"].get.responses["200"].content["application/octet-stream"]);
  assert.equal((document.components.schemas.MediaManifest as any).properties.kind.const, "media");
  assert.equal((document.components.schemas.Credits as any).properties.available_credits_micros.type, "string");
});
