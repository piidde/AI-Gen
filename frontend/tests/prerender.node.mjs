import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assembleDocument } from '../scripts/prerender.mjs';

test('prerender assembly rejects missing or duplicate template markers', () => {
  for (const template of ['<head></head><div id="root" class="changed"></div>', '<head></head><div id="root"></div><div id="root"></div>', '<div id="root"></div>']) {
    assert.throws(() => assembleDocument(template, '<title>Page</title>', '<h1>Page</h1>', true), /template/);
  }
});
test('assembly inserts content and metadata without replacing user content dollar patterns', () => {
  const html = assembleDocument('<head></head><div id="root"></div>', '<title>Page $&</title>', '<h1>Page $&</h1>', true);
  assert.ok(html.includes('<title>Page $&</title>'));
  assert.ok(html.includes('<h1>Page $&</h1>'));
  assert.ok(html.includes('data-prerendered="true"'));
});
