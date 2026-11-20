const demoVideoPath = 'brand/localcloud-launch.mp4';

export function visitorShortcuts(base: string) {
  return {
    mcp: { id: 'mcp', label: 'MCP', href: base + 'docs/mcp/', glyph: 'plug' },
    demo: { id: 'demo', label: 'Demo', href: base + demoVideoPath, glyph: 'monitor-play' },
    contact: { id: 'contact', label: 'Talk to a human', href: base + 'contact/#contact-form', glyph: 'headset' },
    quickstart: { id: 'quickstart', label: 'Quickstart', href: base + 'docs/#install-the-cli', glyph: 'quick-guide' },
    changelog: { id: 'changelog', label: 'Changelog', href: base + 'changelog/', glyph: 'history' },
  };
}
