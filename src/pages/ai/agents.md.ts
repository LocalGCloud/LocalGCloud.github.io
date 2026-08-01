import { agentsExecutionGuide } from '../../data/agenticMarkdown';

export function GET() {
  return new Response(agentsExecutionGuide, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'inline; filename="agents.md"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
