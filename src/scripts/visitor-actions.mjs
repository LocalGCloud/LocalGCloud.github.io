const layoutKey = 'lc-desktop-layout';
const shortcut = '[data-desktop-shortcut],[data-my-cloud]';
const shortcutId = link => link.dataset.desktopShortcut || 'cloud';

function launchDemo(trigger) {
  let dialog = document.querySelector('[data-demo-player]');
  if (!dialog) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = trigger.dataset.openDemo;
    document.head.append(styles);
    dialog = document.createElement('dialog');
    dialog.className = 'demo-player';
    dialog.setAttribute('data-demo-player', '');
    dialog.setAttribute('aria-labelledby', 'demo-title');
    dialog.innerHTML = `<header><h2 id="demo-title">LocalCloud demo</h2><button type="button" autofocus aria-label="Close demo">×</button></header>
      <video controls playsinline preload="none" width="1280" height="720" aria-labelledby="demo-title"></video>
      <p><a target="_blank" rel="noopener noreferrer">Open video ↗</a></p>`;
    dialog.querySelector('a').href = trigger.href;
    const close = () => dialog.close();
    dialog.querySelector('button').addEventListener('click', close);
    document.addEventListener('lc:page-mounted', close);
    window.addEventListener('lc:view-change', close);
    window.addEventListener('lc:audience-change', close);
    const video = dialog.querySelector('video');
    dialog.addEventListener('close', () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    document.body.append(dialog);
  }
  if (dialog.open) return;
  dialog.showModal();
  const video = dialog.querySelector('video');
  video.src = trigger.href;
  video.play().catch(() => {});
}

const shell = document.querySelector('[data-desktop-shell]');
shell.desktopAction = trigger => {
  if (trigger?.dataset.openDemo) return launchDemo(trigger);
  const toggle = shell.shortcutLayout ??= setupLayout(shell);
  if (trigger) toggle();
};

function setupLayout(root) {
  const toggle = root.querySelector('[data-arrange-icons]');
  const rails = [...root.querySelectorAll('.desktop-shortcuts')];
  const links = rail => [...rail.children].filter(link => link.matches(shortcut));
  const defaults = rails.map(links);
  const byId = new Map(defaults.flat().map(link => [shortcutId(link), link]));
  const currentLayout = () => rails.map(rail => links(rail).map(shortcutId));
  function restore(stored) {
    const seen = new Set();
    if (Array.isArray(stored)) rails.forEach((rail, side) => {
      if (!Array.isArray(stored[side])) return;
      for (const id of stored[side]) {
        const link = byId.get(id);
        if (!link || seen.has(link)) continue;
        seen.add(link);
        rail.append(link);
      }
    });
    defaults.forEach((group, side) => rails[side].append(...group.filter(link => !seen.has(link))));
  }
  try { restore(JSON.parse(localStorage.getItem(layoutKey))); } catch {}

  let controls, selected, drag;
  const directions = { ArrowLeft: ['←', 'Move left'], ArrowUp: ['↑', 'Move up'], ArrowDown: ['↓', 'Move down'], ArrowRight: ['→', 'Move right'] };
  const arranging = () => root.hasAttribute('data-desktop-arranging');
  const name = link => link.querySelector('span')?.textContent.trim() || link.textContent.trim();
  const write = value => {
    try { value ? localStorage.setItem(layoutKey, JSON.stringify(currentLayout())) : localStorage.removeItem(layoutKey); } catch {}
  };
  function destination(link, key) {
    if (!link) return;
    const side = rails.indexOf(link.parentElement);
    const group = links(rails[side]);
    const index = group.indexOf(link);
    if (key === 'ArrowLeft' && side === 1) return [0, index];
    if (key === 'ArrowRight' && side === 0) return [1, index];
    if (key === 'ArrowUp' && index > 0) return [side, index - 1];
    if (key === 'ArrowDown' && index < group.length - 1) return [side, index + 1];
  }
  function select(link) {
    selected?.removeAttribute('data-shortcut-selected');
    selected = link;
    selected?.setAttribute('data-shortcut-selected', '');
    controls.querySelector('p').textContent = link ? name(link) : 'Drag or select a shortcut';
    for (const button of controls.querySelectorAll('[data-move]')) button.disabled = !destination(link, button.dataset.move);
  }
  function move(link, side, index) {
    const rail = rails[side];
    const siblings = links(rail).filter(candidate => candidate !== link);
    rail.insertBefore(link, siblings[index] ?? null);
    select(link);
    const position = links(rail).indexOf(link) + 1;
    controls.querySelector('[role=status]').textContent = `${name(link)} moved to the ${side ? 'right' : 'left'}, position ${position}.`;
    write(true);
  }
  function showControls() {
    controls = document.createElement('section');
    controls.className = 'desktop-arrange-controls';
    controls.setAttribute('aria-label', 'Arrange desktop icons');
    controls.innerHTML = `<p></p><div>${Object.entries(directions).map(([key,[symbol,label]]) => `<button type="button" data-move="${key}" aria-label="${label}">${symbol}</button>`).join('')}</div>
      <button type="button" data-reset-layout>Restore layout</button><span class="sr-only" role="status"></span>`;
    controls.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button?.hasAttribute('data-reset-layout')) {
        restore(null);
        select();
        write(false);
        controls.querySelector('[role=status]').textContent = 'Default shortcut layout restored.';
      } else {
        const target = destination(selected, button?.dataset.move);
        if (target) { move(selected, ...target); selected.focus(); }
      }
    });
    toggle.after(controls);
  }
  function clearDrag() {
    drag?.link.classList.remove('is-dragging');
    rails.forEach(rail => rail.classList.remove('is-drop-target'));
    drag = undefined;
  }
  function setMode(enabled) {
    if (!controls) showControls();
    clearDrag();
    root.toggleAttribute('data-desktop-arranging', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? 'Done arranging' : 'Arrange icons';
    controls.hidden = !enabled;
    select();
  }
  root.addEventListener('click', event => {
    const link = event.target.closest(shortcut);
    if (!link || !arranging()) return;
    event.preventDefault();
    event.stopPropagation();
    select(link);
  }, true);
  root.addEventListener('keydown', event => {
    if (!arranging()) return;
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      setMode(false);
      toggle.focus();
      return;
    }
    const link = event.target.closest(shortcut);
    if (!link || !event.key.startsWith('Arrow')) return;
    event.preventDefault();
    const target = destination(link, event.key);
    if (target) { move(link, ...target); link.focus(); }
  });
  root.addEventListener('dragstart', event => {
    if (arranging() && event.target.closest(shortcut)) event.preventDefault();
  });
  root.addEventListener('pointerdown', event => {
    const link = event.target.closest(shortcut);
    if (arranging() && link && event.button === 0 && !drag) {
      drag = { link, pointer: event.pointerId, x: event.clientX, y: event.clientY, active: false };
    }
  });
  root.addEventListener('pointermove', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
      drag.active = true;
      drag.link.setPointerCapture(event.pointerId);
      drag.link.classList.add('is-dragging');
    }
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.desktop-shortcuts');
    rails.forEach(rail => rail.classList.toggle('is-drop-target', rail === target));
  });
  window.addEventListener('pointerup', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    const {link, active} = drag;
    clearDrag();
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const side = rails.indexOf(element?.closest('.desktop-shortcuts'));
    if (!active || side < 0) return;
    const target = element.closest(shortcut);
    if (target === link) return;
    const remaining = links(rails[side]).filter(candidate => candidate !== link);
    let index = remaining.indexOf(target);
    if (index < 0) index = remaining.length;
    else {
      const bounds = target.getBoundingClientRect();
      if (event.clientY > bounds.top + bounds.height / 2) index++;
    }
    move(link, side, index);
  });
  window.addEventListener('pointercancel', event => {
    if (drag?.pointer === event.pointerId) clearDrag();
  });
  for (const event of ['lc:audience-change', 'lc:view-change']) {
    window.addEventListener(event, () => { if (arranging()) setMode(false); });
  }
  return () => setMode(!arranging());
}
