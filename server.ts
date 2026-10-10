import 'dotenv/config';
import express from 'express';
import { reviewDemo } from './src/decision.js';

const app = express();
app.use(express.json({ limit: '40kb' }));
app.get('/api/status', (_req, res) => res.json({ ai: Boolean(process.env.OPENAI_API_KEY) }));

app.post('/api/generate', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI generation is not configured.' });
  const { project } = req.body ?? {};
  if (typeof project?.name !== 'string' || !project.name.trim() || typeof project?.problem !== 'string' || !project.problem.trim()) return res.status(400).json({ error: 'Project name and problem are required.' });

  try {
    res.json(await reviewDemo(project, process.env.OPENAI_API_KEY));
  } catch (error) {
    console.error('DemoPilot Decisions API request failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(502).json({ error: 'Could not choose a demo focus right now. Your project is saved; try again.' });
  }
});

const port = Number(process.env.DEMOPILOT_API_PORT || 4329);
app.listen(port, () => console.log(`DemoPilot API listening on http://localhost:${port}`));
