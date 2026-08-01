import { agentsMdTemplate } from '../../../data/agenticMarkdown';

export function GET() {
  return new Response(agentsMdTemplate, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="AGENTS.md"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
