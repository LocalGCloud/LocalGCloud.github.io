import { agentDocsMarkdown } from '../../data/agenticMarkdown';

export function GET() {
  return new Response(agentDocsMarkdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
