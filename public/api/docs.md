# DemoPilot HTTP API

Base URL: https://openai-dev-day-polaris.vercel.app

OpenAPI 3.1 document: [openapi.json](/openapi.json)

Both endpoints return JSON. The API is intended for DemoPilot's browser UI and integrations that have user-provided authorization to process a project brief. It does not expose or accept the OpenAI API key.

## GET /api/status

Reports whether an OpenAI key is configured on the server.

Response:
`200 OK`
```json
{ "ai": true }
```

The `ai` value is a boolean. A false value means use DemoPilot's deterministic mode.

## POST /api/generate

Requests a Decisions API review for a demo brief. Maximum request body: 40 KiB.

Headers:
`Content-Type: application/json`

Request:
```json
{
  "project": {
    "name": "QueueLess",
    "problem": "Students cannot tell which canteen queue is shortest.",
    "audience": "Students between classes",
    "features": "Wait-time badges; wait-time reporting form",
    "evidence": "Badges are visible in the prototype. Estimates are based on reports, not live vendor data.",
    "length": 60
  }
}
```

Required fields:
- `project.name`: non-empty string
- `project.problem`: non-empty string

Optional fields:
- `project.audience`: string
- `project.features`: string listing features the user says are working
- `project.evidence`: string describing concrete proof and limitations
- `project.length`: requested demo duration in seconds (45, 60, or 90 recommended)

Example response:
```json
{
  "focusFeature": "Wait-time badges",
  "review": {
    "focus": "Wait-time badges",
    "focusConfidence": 0.92,
    "readinessScore": 2,
    "readinessConfidence": 0.86,
    "evidenceProbability": 0.9,
    "nextStep": "Rehearse the lead feature as a complete interaction, then repeat it with a timer.",
    "nextStepConfidence": 0.84
  }
}
```

Values above are illustrative, not audited metrics or guaranteed outputs. The Decisions API chooses from user-supplied feature options and assesses readiness based on the brief; DemoPilot creates the script and plan itself from the brief.

Errors:
- `400`: invalid JSON, missing project, or empty name/problem
- `413`: request body exceeds 40 KiB
- `502`: upstream Decisions API request failed
- `503`: server has no `OPENAI_API_KEY`

For AI errors, the UI falls back to the deterministic planner. No API key should be sent by the client. Configure it only in the server environment.

## Local development

`npm run dev` starts Vite on port 5173 and Express on port 4329 by default. Vite proxies `/api` to Express. Set `DEMOPILOT_API_PORT` to change the Express port. Set `OPENAI_API_KEY` in local `.env` to enable AI.


## Response and input notes

- `readinessScore` is a number on a 0 to 3 scale. The levels are 0 Not specified, 1 Feature stated, 2 Evidence described, 3 Ready to rehearse. Values may be fractional because the model returns an expected score.
- Confidence and probability fields are between 0 and 1 and are model estimates, not measured outcomes.
- When the model chooses to lead with the problem instead of a feature, `focusFeature` is `""` and `review.focus` is `"Start with the problem"`.
- `review.nextStep` is one of three templates: prepare one visible proof point, state the prototype limitation first, or rehearse the lead feature as a complete interaction. It names the focus feature, or "the main experience" when none was chosen.
- Separate features with newlines or semicolons. Plain commas do not split features.
- `length` is passed through unvalidated; 45, 60 and 90 are the values the UI offers. There is no server default.
- Error bodies have the shape `{ "error": "message" }`. Check order: 503 (no key configured) comes first, then 413 (body over 40 KiB), then 400 (invalid JSON or missing name or problem), then 502 (upstream failure).
