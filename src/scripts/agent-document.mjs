// Loaded on demand; the document and its animation survive content-only navigation.
export function initAgentDocument() {
  const root = document.documentElement;
  if (root.dataset.agentDocumentReady) return;
  root.dataset.agentDocumentReady = 'true';
  const saved = new WeakMap();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let choice;
  try { choice = localStorage.getItem('lc-agent-rain'); } catch {}
  const rain = document.createElement('div');
  rain.className = 'agent-rain';
  rain.setAttribute('aria-hidden', 'true');
  const glyphs = '01<>[]{}=/+アカサタナハマヤラワリテクウ';
  for (let i = 0; i < 36; i++) {
    const column = document.createElement('span');
    column.className = 'agent-rain__column';
    column.textContent = Array.from({ length: 14 + i * 7 % 22 }, (_, j) => glyphs[(i * 13 + j * 7 + j * j) % glyphs.length]).join('\n');
    column.dataset.head = glyphs[i * 11 % glyphs.length];
    column.style.cssText = `--x:${(i + .5) / 36 * 100}%;--duration:${20 + i * 3 % 17}s;--delay:-${i * 17 % 37}s`;
    rain.append(column);
  }
  document.querySelector('.desktop-background')?.append(rain);
  const motion = () => {
    const agent = root.dataset.audience === 'agents';
    const moving = choice === 'play' || choice !== 'pause' && !reduced.matches;
    rain.hidden = !agent;
    rain.dataset.running = String(agent && moving && !document.hidden);
    const button = document.querySelector('[data-agent-rain-toggle]');
    if (button) { button.textContent = moving ? 'Pause rain' : 'Play rain'; }
  };
  const sync = () => {
    const agent = root.dataset.audience === 'agents';
    const main = document.querySelector('[data-desktop-main]');
    if (agent && main) main.hidden = false;
    document.querySelectorAll('[data-code-tabs] [data-panel-index]').forEach(panel => {
      if (agent) { panel.hidden = false; panel.classList.remove('is-hidden'); panel.setAttribute('role', 'region'); }
      else {
        const tab = document.getElementById(panel.getAttribute('aria-labelledby'));
        panel.hidden = tab?.getAttribute('aria-selected') !== 'true';
        panel.classList.toggle('is-hidden', panel.hidden);
        panel.setAttribute('role', 'tabpanel');
      }
    });
    document.querySelectorAll('details').forEach(detail => {
      if (!detail.querySelector('pre') && !detail.classList.contains('mobile-service-context')) return;
      if (agent) { if (!saved.has(detail)) saved.set(detail, detail.open); detail.open = true; }
      else if (saved.has(detail)) { detail.open = saved.get(detail); saved.delete(detail); }
    });
    const markdown = document.querySelector('[data-agent-markdown]');
    const href = document.querySelector('link[rel="alternate"][type="text/markdown"]')?.getAttribute('href');
    if (markdown) { markdown.hidden = !href; if (href) markdown.href = href; }
    document.querySelectorAll('[data-agent-nav]').forEach(link => {
      const base = document.querySelector('[data-desktop-shell]')?.dataset.base || '/';
      const active = link.pathname === base ? location.pathname === base : location.pathname.startsWith(link.pathname);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    motion();
  };
  document.querySelector('[data-agent-rain-toggle]')?.addEventListener('click', () => {
    choice = rain.dataset.running === 'true' ? 'pause' : 'play';
    try { localStorage.setItem('lc-agent-rain', choice); } catch {}
    motion();
  });
  document.addEventListener('visibilitychange', motion);
  document.addEventListener('astro:page-load', sync);
  document.addEventListener('lc:page-mounted', sync);
  window.addEventListener('lc:audience-change', sync);
  reduced.addEventListener('change', motion);
  sync();
}
if (typeof document !== 'undefined') initAgentDocument();
