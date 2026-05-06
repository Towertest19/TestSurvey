import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const defaultSurveyCatalog = JSON.parse(await readFile(new URL('../data/default-surveys.json', import.meta.url), 'utf8'));

test('uses Vue as the dedicated framework instead of global inline scripts', () => {
  assert.match(app, /from 'https:\/\/unpkg\.com\/vue@3\.4\.38\/dist\/vue\.esm-browser\.prod\.js'/);
  assert.doesNotMatch(html, /<script(?![^>]+src=)[^>]*>\s*[^<]/i);
  assert.match(html, /type="module" src="src\/main\.js"/);
});

test('locks down browser features while allowing local JSON defaults', () => {
  const csp = html.match(/Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] ?? '';
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.match(csp, /connect-src 'self'/);
  assert.doesNotMatch(csp, /'unsafe-inline'|'unsafe-eval'/);
});

test('keeps app internals module-scoped with no intentional global state exposure', () => {
  assert.doesNotMatch(app, /(?:window|globalThis)\.[A-Za-z_$][\w$]*\s*=/);
  assert.doesNotMatch(app, /localStorage|sessionStorage/);
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

test('loads local default survey catalog with a 10-question JavaScript questionnaire', () => {
  assert.match(app, /const DEFAULT_SURVEY_SOURCE = 'data\/default-surveys\.json'/);
  assert.match(app, /async function loadSurveyCatalog/);
  assert.match(app, /fallbackSurveyCatalog/);
  assert.match(html, /v-model="selectedSurveyId"/);

  const jsSurvey = defaultSurveyCatalog.surveys.find((survey) => survey.id === 'javascript-basics-10');
  assert.ok(jsSurvey, 'missing JavaScript default survey');
  assert.equal(jsSurvey.questions.length, 10);

  for (const [index, question] of jsSurvey.questions.entries()) {
    assert.ok(question.prompt.trim(), `question ${index + 1} needs a prompt`);
    assert.ok(question.explanation.trim(), `question ${index + 1} needs an explanation`);
    assert.ok(question.options.length >= 2 && question.options.length <= 6, `question ${index + 1} has invalid option count`);
    assert.ok(Number.isInteger(question.correctIndex), `question ${index + 1} needs an integer correctIndex`);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < question.options.length, `question ${index + 1} correctIndex out of range`);
    assert.equal(new Set(question.options.map((option) => option.toLocaleLowerCase())).size, question.options.length);
  }
});
