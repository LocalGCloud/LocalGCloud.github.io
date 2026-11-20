export function bindCloudLauncher() {
  const link = document.querySelector('[data-my-cloud]');
  const dialog = document.querySelector('[data-my-cloud-dialog]');
  let loaded, launching;
  const load = (source) => new Promise((resolve, reject) => {
    const url = new URL(source, location.href);
    const base = document.querySelector('[data-desktop-shell]')?.dataset.base || '/';
    if (url.origin !== location.origin || !url.pathname.startsWith(base + (link.dataset.myCloudAssets || '_astro/'))) return reject();
    const script = document.createElement('script');
    script.type = 'module'; script.src = url.href;
    const finish = (ok) => { clearTimeout(timer); script.remove(); ok ? resolve() : reject(); };
    const timer = setTimeout(finish, 8000);
    script.onload = () => finish(true);
    script.onerror = () => finish();
    document.head.append(script);
  });
  const warm = () => {
    loaded ||= Promise.all([load(link.dataset.myCloudScript), load(link.dataset.copyScript).catch(() => {})]);
    loaded.catch(() => { loaded = undefined; });
    return loaded;
  };
  async function open() {
    if (launching) return;
    launching = true;
    try {
      await warm();
      dialog.dispatchEvent(new CustomEvent('lc:my-cloud-open'));
    } catch {
      loaded = undefined;
      dialog.innerHTML = '<form method="dialog"><h2 id="my-cloud-title">Start LocalCloud</h2><p>We couldn’t check localhost:5380. Already running? <a target="_blank" rel="noopener noreferrer">Open the console</a>. Otherwise run:</p><pre id="my-cloud-status"></pre><button>Close</button></form>';
      dialog.querySelector('a').href = link.href;
      dialog.querySelector('pre').textContent = link.dataset.setupCommand;
      if (!dialog.open) dialog.showModal();
    } finally { launching = false; }
  }
  for (const type of ['pointerenter', 'focus', 'touchstart']) link.addEventListener(type, () => warm().catch(() => {}), { once: true, passive: true });
  link.addEventListener('click', event => {
    if (!dialog?.showModal || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open();
  });
  return { open, warm };
}

const shell = typeof document === 'undefined' ? null : document.querySelector('[data-desktop-shell]');
if (shell) shell.bindCloudLauncher = bindCloudLauncher;
