export const demoVideoPath = 'brand/localcloud-launch.mp4';

export function visitorShortcuts(base: string) {
  return {
    mcp: { label: 'MCP', href: base + 'docs/mcp/', icon: 'mcp.svg', demo: false },
    demo: { label: 'Demo', href: base + demoVideoPath, icon: 'demo.svg', demo: true },
    contact: { label: 'Talk to a human', href: base + 'contact/#contact-form', icon: 'contact.svg', demo: false },
  };
}
