const resetTimers = new WeakMap();

export function initCopyButtons(scope = document) {
  scope.querySelectorAll('.copy-btn').forEach((btn) => {
    if (btn.dataset.copyReady === 'true') return;
    btn.dataset.copyReady = 'true';
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      if (!text) return;
      const idleTitle = btn.getAttribute('aria-label') || 'Copy to clipboard';
      const label = btn.querySelector('.copy-label');
      const activeTimer = resetTimers.get(btn);
      if (activeTimer) window.clearTimeout(activeTimer);
      let copied = false;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch { copied = false; }
      // BaseLayout records code_copied only on success.
      if (copied) btn.dispatchEvent(new CustomEvent('lc:copied', { bubbles: true }));
      btn.classList.toggle('is-copied', copied);
      if (label) label.textContent = copied ? 'Copied!' : 'Copy failed';
      btn.title = copied ? 'Copied to clipboard' : 'Copy failed — select the command and copy it manually';
      const timer = window.setTimeout(() => {
        btn.classList.remove('is-copied');
        if (label) label.textContent = 'Copy';
        btn.title = idleTitle;
        resetTimers.delete(btn);
      }, copied ? 2000 : 5000);
      resetTimers.set(btn, timer);
    });
  });
}

if (typeof document !== 'undefined') {
  initCopyButtons();
  document.addEventListener('astro:page-load', () => initCopyButtons());
  document.addEventListener('lc:copy-bind', () => initCopyButtons());
}
