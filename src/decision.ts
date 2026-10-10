import OpenAI from 'openai';

export type ProjectBrief = {
  name: string;
  problem: string;
  audience?: string;
  features?: string;
  evidence?: string;
  length?: number;
};

export type DecisionReview = {
  focus: string;
  focusConfidence: number;
  readinessScore: number;
  readinessConfidence: number;
  evidenceProbability: number;
  nextStep: string;
  nextStepConfidence: number;
};

export async function reviewDemo(project: ProjectBrief, apiKey: string) {
  const client = new OpenAI({ apiKey });
  const features = String(project.features || '')
    .split(/[\n;]+|,\s*(?=plus\b)/i)
    .map(value => value.replace(/^(?:plus|and|then)\s+/i, '').trim())
    .filter(Boolean);
  const featureChoices = features.map((feature, index) => ({ value: `feature_${index}`, description: feature }));
  if (featureChoices.length === 0) {
    featureChoices.push({ value: 'problem_context', description: 'Lead with the user problem; no working features were supplied.' });
    featureChoices.push({ value: 'evidence_context', description: 'Lead with the supplied evidence or clearly label that evidence is missing.' });
  } else {
    featureChoices.push({ value: 'problem_context', description: 'Lead with the user problem before showing a stated working feature.' });
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
        choices: featureChoices
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
      },
      {
        type: 'choice', name: 'next_rehearsal_step',
        instructions: 'Choose the single most useful immediate rehearsal action for this demo from the supplied brief. Prefer prepare_proof when no direct, visible proof is described; frame_limitations when the audience could mistake a prototype or estimate for a proven capability; otherwise choose rehearse_feature so the presenter can practice the demonstrated interaction end to end.',
        choices: [
          { value: 'prepare_proof', description: 'Prepare one visible proof point, test result, or interaction to show.' },
          { value: 'frame_limitations', description: 'Make the prototype boundaries clear before presenting a claim.' },
          { value: 'rehearse_feature', description: 'Practice the lead feature as a complete, timed interaction.' }
        ]
      }
    ]
  });

  const focusAnswer = decision.answers.find(answer => answer.name === 'lead_moment');
  const readinessAnswer = decision.answers.find(answer => answer.name === 'demo_readiness');
  const evidenceAnswer = decision.answers.find(answer => answer.name === 'concrete_evidence');
  const nextStepAnswer = decision.answers.find(answer => answer.name === 'next_rehearsal_step');
  const choice = focusAnswer?.type === 'choice' ? focusAnswer : null;
  const readiness = readinessAnswer?.type === 'score' ? readinessAnswer : null;
  const evidence = evidenceAnswer?.type === 'predicate' ? evidenceAnswer : null;
  const nextStepChoice = nextStepAnswer?.type === 'choice' ? nextStepAnswer : null;
  const focusIndex = typeof choice?.choice === 'string' ? choice.choice.match(/^feature_(\d+)$/)?.[1] : undefined;
  const focusFeature = focusIndex === undefined ? '' : features[Number(focusIndex)] || '';
  const leadMoment = focusFeature || 'the main experience';
  const nextStepByChoice: Record<string, string> = {
    prepare_proof: `Prepare one visible proof point for ${leadMoment} before you start.`,
    frame_limitations: `State the prototype limitation before showing ${leadMoment}, so the audience knows what it does and does not prove.`,
    rehearse_feature: `Rehearse ${leadMoment} as a complete interaction, then repeat it with a timer.`
  };

  return {
    focusFeature,
    review: {
      focus: focusFeature || 'Start with the problem',
      focusConfidence: choice?.confidence ?? 0,
      readinessScore: readiness?.score ?? 0,
      readinessConfidence: readiness?.confidence ?? 0,
      evidenceProbability: evidence?.probability ?? 0,
      nextStep: nextStepByChoice[String(nextStepChoice?.choice)] || nextStepByChoice.rehearse_feature,
      nextStepConfidence: nextStepChoice?.confidence ?? 0
    } satisfies DecisionReview
  };
}
