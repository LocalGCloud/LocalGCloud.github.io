export const myCloudURL = 'http://localhost:5380/';

export async function probeMyCloud(signal) {
  try {
    // shortcut: no-cors hides HTTP status; check response.ok when the console exposes CORS.
    const response = await fetch(myCloudURL, {
      method: 'HEAD', mode: 'no-cors', credentials: 'omit', cache: 'no-store', redirect: 'follow',
      referrerPolicy: 'no-referrer', targetAddressSpace: 'loopback', signal,
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
  dialog.innerHTML = `<form method="dialog" class="my-cloud-dismiss"><button type="submit" class="my-cloud-close" aria-label="Close My cloud">×</button></form>
    <div class="my-cloud-body"><div class="my-cloud-orbit" aria-hidden="true">☁</div><h2 id="my-cloud-title">Your cloud, right here.</h2>
    <p id="my-cloud-status" role="status" data-my-cloud-status></p>
    <section data-my-cloud-setup hidden aria-labelledby="my-cloud-setup-title">
      <h3 id="my-cloud-setup-title">Bring your cloud online</h3>
      <p>Install and start LocalCloud, then your console lives at <strong>localhost:5380</strong>. Requires Homebrew and running Docker. Already installed? Run just the second line.</p>
      <div class="my-cloud-command">
      <pre tabindex="0" aria-label="Install and start LocalCloud commands"><code></code></pre>
      <button type="button" class="copy-btn" aria-label="Copy install and start commands" data-analytics-label="my-cloud-setup"><span class="copy-label" aria-live="polite">Copy</span></button></div>
      <p class="my-cloud-note">If starting fails, run <code>lc doctor</code> to check your setup. <a data-my-cloud-guide>Setup guide</a></p>
    </section>
    <div class="my-cloud-actions"><a class="btn-primary" data-my-cloud-open target="_blank" rel="noopener noreferrer" aria-live="polite">Open console ↗</a>
      <button type="button" class="btn-secondary" data-my-cloud-retry>Check again</button></div></div>`;
  const openLink = dialog.querySelector('[data-my-cloud-open]');
  openLink.href = myCloudURL;
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
    openLink.classList.remove('is-running');
    openLink.textContent = 'Open console ↗';
    retry.disabled = true;
    retry.textContent = 'Checking…';
    const responding = await probeMyCloud(controller.signal);
    clearTimeout(timer);
    if (pending !== controller) return;
    pending = undefined;
    status.textContent = responding
      ? 'Your cloud is responding at localhost:5380. You can open it now.'
      : 'Looks like your local LocalCloud container isn’t running, or your browser couldn’t reach it.';
    setup.hidden = responding;
    openLink.classList.toggle('is-running', responding);
    openLink.textContent = responding ? '✓ Working now · Open console ↗' : 'Open console ↗';
    retry.disabled = false;
    retry.textContent = 'Check again';
    return responding;
  };
  retry.addEventListener('click', check);
  const stop = () => { pending?.abort(); pending = undefined; };
  dialog.addEventListener('close', stop);
  dialog.addEventListener('cancel', stop);
  return async (event) => {
    const tab = event?.detail?.tab;
    const responding = await check();
    if (responding && tab && !tab.closed) { tab.location.replace(myCloudURL); return; }
    tab?.close();
    if (responding === undefined) return;
    bindCopyButtons(dialog);
    if (!dialog.open) dialog.showModal();
  };
}

if (typeof document !== 'undefined') {
  const open = initMyCloud(() => document.dispatchEvent(new CustomEvent('lc:copy-bind')));
  if (open) document.querySelector('[data-my-cloud-dialog]').addEventListener('lc:my-cloud-open', open);
}
