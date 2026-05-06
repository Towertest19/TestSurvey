# SurveyForge Sample Builder

SurveyForge is a small browser survey/test sample that lets users build their own questions, take the survey, and review their score.

## Framework choice

This project uses Vue 3 from a browser ES module because Vue is a good fit for a lightweight survey builder:

- reactive form state keeps builder, take, and review screens synchronized without exposing app state on `window`;
- template bindings make dynamic questions and options easy to understand for people customizing the sample;
- no build step is required, so the project remains easy to copy, host, and modify.

## Tamper-resistance model

Browser-only tests cannot be made fully tamper-proof because users control their browser and developer tools. This sample reduces casual tampering by:

- keeping survey logic in module scope rather than intentional globals;
- using a restrictive Content Security Policy that blocks inline scripts, object embeds, framing, form posts, and network calls;
- validating question structure before take mode and again before scoring;
- freezing submitted score results and checking whether survey structure changed during grading.

For high-stakes quizzes, exams, or anything that grants rewards, keep answer keys and scoring on a trusted server.

## Run locally

```bash
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173/> in a browser.

## Sanity checks

```bash
npm run sanity
```
