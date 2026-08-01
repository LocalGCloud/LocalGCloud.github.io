import { agentServicesMarkdown } from '../../data/agenticMarkdown';

export function GET() {
  return new Response(agentServicesMarkdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
