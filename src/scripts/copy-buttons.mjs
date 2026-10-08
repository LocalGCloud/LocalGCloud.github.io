const resetTimers = new WeakMap();

export function initCopyButtons(scope = document) {
  scope.querySelectorAll('[data-install-toggle]').forEach((toggle) => {
    if (toggle.dataset.installReady === 'true') return;
    const box = toggle.closest('.field-install');
    const code = box?.querySelector('code');
    const copy = box?.querySelector('.copy-btn');
    if (!code || !copy) return;
    toggle.dataset.installReady = 'true';
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      const useCurl = copy.dataset.copy === box.dataset.installHomebrew;
      const command = useCurl ? box.dataset.installCurl : box.dataset.installHomebrew;
      code.textContent = command;
      copy.dataset.copy = command;
      copy.dataset.analyticsLabel = useCurl ? 'hero-install-script' : 'hero-install-homebrew';
      toggle.querySelector('[data-install-toggle-label]').textContent = useCurl ? 'Brew' : 'curl';
      toggle.title = useCurl ? 'Use Homebrew install command' : 'Use curl install command';
      toggle.setAttribute('aria-label', toggle.title);
      window.clearTimeout(resetTimers.get(copy));
      resetTimers.delete(copy);
      copy.classList.remove('is-copied');
      copy.querySelector('.copy-label').textContent = 'Copy';
      copy.title = copy.getAttribute('aria-label');
    });
  });
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
      if (btn.dataset.copy !== text) return;
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
