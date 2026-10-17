import { agentOverviewMarkdown } from '../../data/agentModeExamples';

export function GET() {
  return new Response(agentOverviewMarkdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
