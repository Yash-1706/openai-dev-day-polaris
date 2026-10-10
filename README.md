# DemoPilot

DemoPilot turns a project brief into a timed, evidence-aware live demo plan. It includes a deterministic demo-mode planner and can use OpenAI when a key is configured on the server.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The dev command starts the React app and its local API server together.

## Optional AI generation

Copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The key is read only by the local server and never sent to browser code. Without it, DemoPilot clearly labels results as demo mode and builds a plan from the project details locally.

AI mode uses the OpenAI Decisions API (`gpt-6-luna`) to choose which stated working feature should lead the demo and score the evidence readiness. DemoPilot then builds the spoken plan from the project details, so the model chooses the emphasis without inventing product copy or capabilities. If the key or endpoint is unavailable, the app remains usable in demo mode.

The current project, generated plan, rehearsal checklist, and decision review are saved in browser local storage.

## Build

```sh
npm run build
```
