import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

test('uses Vue as the dedicated framework instead of global inline scripts', () => {
  assert.match(app, /from 'https:\/\/unpkg\.com\/vue@3\.4\.38\/dist\/vue\.esm-browser\.prod\.js'/);
  assert.doesNotMatch(html, /<script(?![^>]+src=)[^>]*>\s*[^<]/i);
  assert.match(html, /type="module" src="src\/main\.js"/);
});

test('locks down browser features that enable common static-site tampering vectors', () => {
  const csp = html.match(/Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] ?? '';
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.match(csp, /connect-src 'none'/);
  assert.doesNotMatch(csp, /'unsafe-inline'|'unsafe-eval'/);
});

test('keeps app internals module-scoped with no intentional window/global exposure', () => {
  assert.doesNotMatch(app, /window\.|globalThis\.|localStorage|sessionStorage/);
  assert.match(app, /Object\.freeze/);
  assert.match(app, /function validateSurvey/);
  assert.match(app, /function checksumSurvey/);
});

test('builder enforces option and question guardrails used by the UI', () => {
  assert.match(app, /const MIN_OPTIONS = 2/);
  assert.match(app, /const MAX_OPTIONS = 6/);
  assert.match(html, /:disabled="question\.options\.length <= 2"/);
  assert.match(html, /:disabled="question\.options\.length >= 6"/);
  assert.match(html, /:disabled="questions\.length === 1"/);
});
