import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json({ limit: '40kb' }));
app.get('/api/status', (_req, res) => res.json({ ai: Boolean(process.env.OPENAI_API_KEY) }));

app.post('/api/generate', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI generation is not configured.' });
  const { project } = req.body ?? {};
  if (!project?.name || !project?.problem) return res.status(400).json({ error: 'Project name and problem are required.' });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const features = String(project.features || '').split(/[\n;]+|,\s*(?=plus\b)/i).map((value: string) => value.replace(/^(?:plus|and|then)\s+/i, '').trim()).filter(Boolean);
    const choices = features.map((feature: string, index: number) => ({ value: `feature_${index}`, description: feature }));
    if (choices.length === 0) {
      choices.push({ value: 'problem_context', description: 'Lead with the user problem; no working features were supplied.' });
      choices.push({ value: 'evidence_context', description: 'Lead with the supplied evidence or clearly label that evidence is missing.' });
    } else {
      choices.push({ value: 'problem_context', description: 'Lead with the user problem before showing a stated working feature.' });
    }

    const decision = await client.decisions.create({
      model: 'gpt-6-luna',
      input: JSON.stringify({
        project_name: project.name,
        problem: project.problem,
        audience: project.audience || 'Not specified',
        working_features: features,
        evidence_and_limitations: project.evidence || 'No proof or limitations supplied',
        requested_demo_seconds: project.length
      }),
      questions: [
        {
          type: 'choice', name: 'lead_moment',
          instructions: 'Choose the best opening moment for a short, credible product demo. Prefer a specific working feature that can be shown and has supporting evidence. Never choose a feature unless it appears in working_features. Choose problem_context only when the problem itself should lead before the feature walkthrough.',
          choices
        },
        {
          type: 'score', name: 'demo_readiness',
          instructions: 'Score only the demo readiness supported by this brief, not the product idea or its market potential.',
          levels: [
            { label: 'Not specified', description: 'No working feature or usable proof is described.' },
            { label: 'Feature stated', description: 'At least one working feature is named, but visible proof is thin.' },
            { label: 'Evidence described', description: 'A working feature and concrete visible or testable evidence are described.' },
            { label: 'Ready to rehearse', description: 'The feature, its proof, and important limitations are all clear enough to present honestly.' }
          ]
        },
        {
          type: 'predicate', name: 'concrete_evidence',
          instructions: 'Does the brief provide a concrete thing the presenter can show or verify, such as an implemented interface, a successful interaction, or a test result? Do not count the problem statement or an unsupported outcome as evidence.'
        }
      ]
    });

    const focusAnswer = decision.answers.find(answer => answer.name === 'lead_moment');
    const readinessAnswer = decision.answers.find(answer => answer.name === 'demo_readiness');
    const evidenceAnswer = decision.answers.find(answer => answer.name === 'concrete_evidence');
    const choice = focusAnswer?.type === 'choice' ? focusAnswer : null;
    const readiness = readinessAnswer?.type === 'score' ? readinessAnswer : null;
    const evidence = evidenceAnswer?.type === 'predicate' ? evidenceAnswer : null;
    const focusIndex = choice?.choice.match(/^feature_(\d+)$/)?.[1];
    const focusFeature = focusIndex === undefined ? '' : features[Number(focusIndex)] || '';

    res.json({
      focusFeature,
      review: {
        focus: focusFeature || 'Start with the problem',
        focusConfidence: choice?.confidence ?? 0,
        readinessScore: readiness?.score ?? 0,
        readinessConfidence: readiness?.confidence ?? 0,
        evidenceProbability: evidence?.probability ?? 0
      }
    });
  } catch (error) {
    console.error('DemoPilot Decisions API request failed:', error);
    res.status(500).json({ error: 'Could not choose a demo focus right now. Your project is saved; try again.' });
  }
});

const port = Number(process.env.DEMOPILOT_API_PORT || 4329);
app.listen(port, () => console.log(`DemoPilot API listening on http://localhost:${port}`));
