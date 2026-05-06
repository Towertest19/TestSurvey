# SurveyForge Sample Builder

SurveyForge is a small browser survey/test sample that lets users build their own questions, take the survey, and review their score.

## Framework choice

This project uses Vue 3 from a browser ES module because Vue is a good fit for a lightweight survey builder:

- reactive form state keeps builder, take, and review screens synchronized without exposing app state on `window`;
- template bindings make dynamic questions and options easy to understand for people customizing the sample;
- no build step is required, so the project remains easy to copy, host, and modify;
- default survey templates live in `data/default-surveys.json`, with an in-app fallback if that local file cannot be fetched.

## Tamper-resistance model

Browser-only tests cannot be made fully tamper-proof because users control their browser and developer tools. This sample reduces casual tampering by:

- keeping survey logic in module scope rather than intentional globals;
- using a restrictive Content Security Policy that blocks inline scripts, object embeds, framing, form posts, and non-local fetch/XHR calls while still allowing local JSON defaults;
- validating question structure before take mode and again before scoring;
- freezing submitted score results and checking whether survey structure changed during grading.

For high-stakes quizzes, exams, or anything that grants rewards, keep answer keys and scoring on a trusted server.

## Default survey data

The local default catalog is stored in `data/default-surveys.json`. This build includes `javascript-basics-10`, a 10-question JavaScript questionnaire. If a browser cannot load the JSON file, the app falls back to an embedded copy so the sample still works offline or from restrictive static hosting setups.

## Run locally

```bash
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173/> in a browser.

## Sanity checks

```bash
npm run sanity
```
