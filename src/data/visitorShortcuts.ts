export const demoWatchUrl = 'https://featurette.watch/v/116012973972254589';
export const demoVideoUrl = 'https://featurette.watch/raw/116012973972254589';

export function visitorShortcuts(base: string) {
  return {
    mcp: { label: 'MCP', href: base + 'docs/mcp/', icon: 'mcp.svg', demo: false },
    demo: { label: 'Demo', href: demoWatchUrl, icon: 'demo.svg', demo: true },
    contact: { label: 'Talk to a human', href: base + 'contact/#contact-form', icon: 'contact.svg', demo: false },
  };
}
