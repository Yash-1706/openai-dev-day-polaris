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
