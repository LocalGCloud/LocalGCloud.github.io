(function() {
  if (typeof window.posthog === 'undefined') return;

  // Copy events follow a successful clipboard write.
  document.addEventListener('lc:copied', function(e) {
    var labelled = e.target.closest && e.target.closest('[data-analytics-label]');
    posthog.capture('code_copied', {
      page_path: window.location.pathname,
      page_title: document.title,
      copy_target: labelled ? labelled.getAttribute('data-analytics-label') : null,
    });
  });

  // Track labelled actions and GitHub links.
  document.addEventListener('click', function(e) {
    var cta = e.target.closest('a[data-analytics-label]');
    if (cta) {
      posthog.capture('cta_clicked', {
        page_path: window.location.pathname,
        cta_label: cta.getAttribute('data-analytics-label'),
        href: cta.getAttribute('href'),
      });
    }

    var ghLink = e.target.closest('a[href*="github.com"]');
    if (ghLink) {
      posthog.capture('github_click', {
        page_path: window.location.pathname,
      });
    }
  });

  // Count visible reading time.
  var lastTick = Date.now(), visibleMilliseconds = 0;
  var timeBuckets = [30, 120];

  var timeInterval = setInterval(function() {
    var now = Date.now(), delta = now - lastTick;
    lastTick = now;
    if (document.hidden || document.querySelector('[data-desktop-main]')?.hidden) return;
    // Suspended tabs can skip ticks; credit at most one visible polling interval.
    visibleMilliseconds += Math.min(delta, 5000);
    while (visibleMilliseconds / 1000 >= timeBuckets[0]) {
      posthog.capture('time_on_page', {
        seconds: timeBuckets.shift(),
        page_path: window.location.pathname,
        page_title: document.title,
      });
    }
        // Keep the inexpensive tick available for the next content-only page visit.
  }, 5000);

  document.addEventListener('astro:page-load', function() {
    lastTick = Date.now(); visibleMilliseconds = 0; timeBuckets = [30,120];
    if (window.lcAnalytics?.isOn()) posthog.capture('$pageview', { $current_url: location.href, $title: document.title });
    applyFabPreference();
  });

  // Load help/vim shortcuts only when a visitor uses them; the current search stays immediate.
    var pending = [], loading, gUntil = 0;
    document.addEventListener('keydown', function loadShortcuts(event) {
      var active = document.activeElement, now = Date.now();
      if (event.key === 'Escape' && loading) { pending = []; gUntil = 0; return; }
      if (event.metaKey || event.ctrlKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(active?.tagName) || active?.isContentEditable) return;
      if (!'g/?jk'.includes(event.key) && !(now < gUntil && 'hds'.includes(event.key))) { gUntil = 0; pending = []; return; }
      if (event.key === 'g') gUntil = now + 500;
      event.preventDefault();
      pending.push({ key: event.key, capturedAt: now });
      if (loading) return;
      loading = document.createElement('script');
      loading.type = 'module';
      loading.src = document.body.dataset.keyboardScript;
      loading.onload = function() {
        document.removeEventListener('keydown', loadShortcuts);
        pending.splice(0).forEach(function(item) {
          var replay = new KeyboardEvent('keydown', { key: item.key, bubbles: true });
          replay.lcCapturedAt = item.capturedAt;
          document.dispatchEvent(replay);
        });
      };
      loading.onerror = function() { pending = []; loading = undefined; };
      document.head.appendChild(loading);
    });
    // FAB dismiss (store preference in localStorage)
    function applyFabPreference() {
      var fab = document.querySelector('[data-feedback-fab]');
      try { if (fab && localStorage.getItem('lc-fab-dismissed')) fab.style.display = 'none'; } catch (e) {}
    }
    applyFabPreference();
    document.addEventListener('dblclick', function(event) {
      var fab = event.target.closest('[data-feedback-fab]');
      if (fab) {
        fab.style.display = 'none';
        try { localStorage.setItem('lc-fab-dismissed', '1'); } catch (e) {}
        posthog.capture('feedback_fab_dismissed', { page_path: window.location.pathname });
      }
    });
})();
