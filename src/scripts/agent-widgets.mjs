// Loaded only while the agent presentation contains an interactive widget.
export function setupAgentCaptcha() {
  const card = document.querySelector('.lc-agent-captcha');
  const grid = document.getElementById('lc-captcha-grid');
  const verifyBtn = document.getElementById('lc-captcha-verify');
  const resetBtn = document.getElementById('lc-captcha-reset');
  const aboutBtn = document.getElementById('lc-captcha-about');
  const feedback = document.getElementById('lc-captcha-feedback');

  if (!card || !grid || !verifyBtn || !feedback || card.dataset.captchaReady) return;
  card.dataset.captchaReady = 'true';

  // Cycle ordering for neighboring flips:
  // [0, 1, 2, 5, 8, 7, 6, 3, 4]
  const CYCLE = [0, 1, 2, 5, 8, 7, 6, 3, 4];
  function neighbor(index) {
    const pos = CYCLE.indexOf(index);
    return CYCLE[(pos + 1) % CYCLE.length];
  }

  // Initial state: 238 (0b011101110 -> 6 green, 3 unlit)
  const INITIAL_STATE = 238;
  let state = INITIAL_STATE;
  let verifyClicks = 0;

  const tiles = grid.querySelectorAll('.lc-agent-captcha__tile');

  function render() {
    let greenCount = 0;
    tiles.forEach((tile, i) => {
      const isLit = Boolean(state & (1 << i));
      if (isLit) greenCount++;
      tile.setAttribute('data-on', String(isLit));
      tile.setAttribute('aria-pressed', String(isLit));
      tile.setAttribute('aria-label', `Tile ${i + 1}, ${isLit ? 'green' : 'unlit'}`);
    });

    if (state === 511) {
      card.classList.add('is-verified');
      feedback.className = 'lc-agent-captcha__feedback is-verified';
      feedback.textContent = 'Agent puzzle solved.';
    } else {
      card.classList.remove('is-verified');
      if (feedback.classList.contains('is-verified') || feedback.classList.contains('is-error')) {
        feedback.className = 'lc-agent-captcha__feedback';
      }
      feedback.innerHTML = `<span>${greenCount}</span><span aria-hidden="true"> / 9</span><span class="sr-only"> of 9 green</span>`;
    }
  }

  function toggleTile(index) {
    if (state === 511) return; // already solved
    const next = neighbor(index);
    state = state ^ (1 << index) ^ (1 << next);
    render();
  }

  tiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      const index = Number(tile.dataset.tileIndex);
      toggleTile(index);
    });
  });

  verifyBtn.addEventListener('click', () => {
    if (state === 511) {
      card.classList.add('is-verified');
      feedback.className = 'lc-agent-captcha__feedback is-verified';
      feedback.textContent = 'Agent puzzle solved.';
      return;
    }

    feedback.className = 'lc-agent-captcha__feedback is-error';
    feedback.textContent = verifyClicks === 0 ? 'Human detected.' : 'Still human.';
    verifyClicks++;
  });

  resetBtn?.addEventListener('click', () => {
    state = INITIAL_STATE;
    verifyClicks = 0;
    feedback.className = 'lc-agent-captcha__feedback';
    render();
  });

  aboutBtn?.addEventListener('click', () => {
    feedback.className = 'lc-agent-captcha__feedback';
    feedback.textContent = 'Every move flips two tiles. Nine green is impossible.';
  });

  function solve() {
    state = 511;
    render();
  }


  // Expose programmatic API for agents/console
  window.__lcAgentSolve = solve;

  render();
}

export function setupTerminalTabs() {
  document.querySelectorAll('.agent-terminal').forEach((term) => {
    if (term.dataset.tabsReady) return;
    term.dataset.tabsReady = 'true';
    const tabs = [...term.querySelectorAll('[role="tab"]')];
    const panes = term.querySelectorAll('[role="tabpanel"]');
    function activate(tab) {
      tabs.forEach((item) => {
        item.setAttribute('aria-selected', String(item === tab));
        item.tabIndex = item === tab ? 0 : -1;
      });
      panes.forEach((pane) => { pane.hidden = pane.id !== tab.getAttribute('aria-controls'); });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', (event) => {
        const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault(); activate(tabs[next]); tabs[next].focus();
      });
    });
  });
}

function setupAgentWidgets() {
  if (document.documentElement.dataset.audience !== 'agents') return;
  setupAgentCaptcha();
  setupTerminalTabs();
}
setupAgentWidgets();
window.addEventListener('lc:audience-change', setupAgentWidgets);
document.addEventListener('astro:page-load', setupAgentWidgets);
document.addEventListener('lc:page-mounted', setupAgentWidgets);
