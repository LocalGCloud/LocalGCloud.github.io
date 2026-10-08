export const myCloudURL = 'http://localhost:5380/';

export async function probeMyCloud(signal) {
  try {
    // ponytail: reachability only; verify readiness when the gateway exposes CORS.
    const response = await fetch(myCloudURL, {
      method: 'HEAD', mode: 'no-cors', credentials: 'omit', cache: 'no-store', redirect: 'error',
      referrerPolicy: 'no-referrer', signal,
    });
    return response.type === 'opaque' || response.ok;
  } catch { return false; }
}

export function initMyCloud(bindCopyButtons) {
  const link = document.querySelector('[data-my-cloud]');
  const dialog = document.querySelector('[data-my-cloud-dialog]');
  if (!link || !dialog || typeof dialog.showModal !== 'function' || dialog.dataset.ready) return;
  dialog.dataset.ready = 'true';
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet'; stylesheet.href = link.dataset.myCloudStyles; document.head.append(stylesheet);
  dialog.innerHTML = `<header class="my-cloud-titlebar"><form method="dialog"><button type="submit" class="my-cloud-close" aria-label="Close My cloud" title="Close window"></button></form><span id="my-cloud-title">local.cloud — My cloud</span></header>
    <div class="my-cloud-body"><p id="my-cloud-status" role="status" data-my-cloud-status></p>
    <div class="my-cloud-actions"><a class="btn-primary" data-my-cloud-open target="_blank" rel="noopener noreferrer">Open console ↗</a>
      <button type="button" class="btn-secondary" data-my-cloud-retry>Check again</button></div>
    <section data-my-cloud-setup hidden aria-labelledby="my-cloud-setup-title">
      <h2 id="my-cloud-setup-title">Quick setup</h2>
      <p>Requires Homebrew and running Docker. Copy these commands into your terminal. Already installed? Run just the second line.</p>
      <pre tabindex="0" aria-label="Install and start LocalCloud commands"><code></code></pre>
      <button type="button" class="copy-btn btn-secondary" aria-label="Copy install and start commands" data-analytics-label="my-cloud-setup"><span class="copy-label" aria-live="polite">Copy</span></button>
      <p class="my-cloud-note">If starting fails, run <code>lc doctor</code> to check your setup. <a data-my-cloud-guide>Setup guide</a></p>
    </section></div>`;
  dialog.querySelector('[data-my-cloud-open]').href = myCloudURL;
  dialog.querySelector('[data-my-cloud-guide]').href = link.dataset.setupGuide;
  dialog.querySelector('code').textContent = link.dataset.setupCommand;
  dialog.querySelector('.copy-btn').dataset.copy = link.dataset.setupCommand;
  const status = dialog.querySelector('[data-my-cloud-status]');
  const setup = dialog.querySelector('[data-my-cloud-setup]');
  const retry = dialog.querySelector('[data-my-cloud-retry]');
  let pending;
  const check = async () => {
    pending?.abort();
    const controller = pending = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    status.textContent = 'Checking localhost:5380… Allow local network access if your browser asks.';
    setup.hidden = true;
    retry.disabled = true;
    const responding = await probeMyCloud(controller.signal);
    clearTimeout(timer);
    if (pending !== controller || !dialog.open) return;
    status.textContent = responding
      ? 'localhost:5380 is responding. Open your console below.'
      : 'Looks like your local LocalCloud container isn’t running. Install LocalCloud or start it manually below.';
    setup.hidden = responding;
    retry.disabled = false;
  };
  retry.addEventListener('click', check);
  dialog.addEventListener('close', () => pending?.abort());
  dialog.addEventListener('cancel', () => pending?.abort());
  return () => { bindCopyButtons(dialog); dialog.showModal(); check(); };
}

if (typeof document !== 'undefined') {
  const open = initMyCloud(() => document.dispatchEvent(new CustomEvent('lc:copy-bind')));
  if (open) document.querySelector('[data-my-cloud-dialog]').addEventListener('lc:my-cloud-open', open);
}
