export function GET(): Response {
  return Response.json({ ai: Boolean(process.env.OPENAI_API_KEY) });
}
