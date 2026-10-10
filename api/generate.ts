import { reviewDemo, type ProjectBrief } from '../src/decision.js';

const MAX_REQUEST_BYTES = 40 * 1024;

export async function POST(request: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'AI generation is not configured.' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: 'Project brief is too large.' }, { status: 413 });
  }

  let payload: { project?: Partial<ProjectBrief> };
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
      return Response.json({ error: 'Project brief is too large.' }, { status: 413 });
    }
    payload = JSON.parse(raw) as { project?: Partial<ProjectBrief> };
  } catch {
    return Response.json({ error: 'A valid JSON project brief is required.' }, { status: 400 });
  }

  const project = payload?.project;
  if (typeof project?.name !== 'string' || !project.name.trim() || typeof project.problem !== 'string' || !project.problem.trim()) {
    return Response.json({ error: 'Project name and problem are required.' }, { status: 400 });
  }

  try {
    const result = await reviewDemo({
      name: project.name.trim(),
      problem: project.problem.trim(),
      audience: typeof project.audience === 'string' ? project.audience : '',
      features: typeof project.features === 'string' ? project.features : '',
      evidence: typeof project.evidence === 'string' ? project.evidence : '',
      length: project.length
    }, process.env.OPENAI_API_KEY);
    return Response.json(result);
  } catch (error) {
    console.error('DemoPilot Decisions API request failed:', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({ error: 'Could not choose a demo focus right now. Your project is saved; try again.' }, { status: 502 });
  }
}
