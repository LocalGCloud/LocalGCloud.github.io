import { agentCompatibilityMarkdown } from '../../data/agenticMarkdown';

export function GET() {
  return new Response(agentCompatibilityMarkdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
