let shortcuts, player;
let desktopLinks = [];

export function mountVisitorShortcuts() {
  const next = document.querySelector('[data-home-shortcuts]');
  if (next === shortcuts) return;
  if (player?.open) player.close();
  desktopLinks.forEach(link => link.remove());
  desktopLinks = [];
  shortcuts = next;
  player = document.querySelector('[data-demo-player]');
  if (!shortcuts) return;

  const source = [...shortcuts.querySelectorAll('a')];
  const left = document.querySelector('.desktop-shortcuts-left');
  const right = document.querySelector('.desktop-shortcuts-right');
  if (left && right) {
    desktopLinks = source.map(link => {
      const copy = link.cloneNode(true);
      copy.classList.add('desktop-shortcut');
      return copy;
    });
    const [mcp, ...tools] = desktopLinks;
    left.append(mcp);
    right.prepend(...tools);
    shortcuts.setAttribute('data-shortcuts-ready', '');
  }

  for (const link of [...source, ...desktopLinks]) {
    if (link.hasAttribute('data-open-demo')) link.addEventListener('click', launchDemo);
  }
}

function launchDemo(event) {
  if (!player?.showModal || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  openDemo(player);
}

function openDemo(dialog) {
  if (dialog.open) return;
  const video = dialog.querySelector('video');
  if (!document.head.querySelector('[data-demo-styles]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = dialog.dataset.styles;
    style.setAttribute('data-demo-styles', '');
    document.head.append(style);
  }
  if (!dialog.dataset.ready) {
    dialog.addEventListener('close', () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    dialog.dataset.ready = 'true';
  }
  dialog.showModal();
  video.src = dialog.dataset.videoSrc;
  video.play().catch(() => {});
}
