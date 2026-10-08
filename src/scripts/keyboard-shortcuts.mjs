// Existing help and guide-navigation behavior, deferred until keyboard interaction.
(function() {
          var base = document.querySelector('[data-base]')?.dataset?.base || '/';
          var searchInput = document.getElementById('search-input');
          var gKeyBuffer = null;
          function navigate(href) {
            var url = new URL(href, window.location.href);
            var view = new URL(window.location.href).searchParams.get('view');
            if (view === 'classic' || view === 'mobile') url.searchParams.set('view', view);
            href = url.href;
            var event = new CustomEvent('lc:navigate', { detail: { href: href }, cancelable: true });
            if (document.dispatchEvent(event)) window.location.href = href;
          }

          // Help modal
          var helpModal = document.createElement('div');
          helpModal.className = 'kbd-help';
          helpModal.hidden = true;
          helpModal.setAttribute('role', 'dialog');
          helpModal.setAttribute('aria-label', 'Keyboard shortcuts');
          helpModal.innerHTML = '<div class="kbd-help__backdrop"></div><div class="kbd-help__panel"><h2>Keyboard Shortcuts</h2><table><tbody><tr><td><kbd>/</kbd></td><td>Focus search</td></tr><tr><td><kbd>Cmd+K</kbd></td><td>Open search</td></tr><tr><td><kbd>J</kbd></td><td>Next page</td></tr><tr><td><kbd>K</kbd></td><td>Previous page</td></tr><tr><td><kbd>G</kbd> <kbd>H</kbd></td><td>Go home</td></tr><tr><td><kbd>G</kbd> <kbd>D</kbd></td><td>Go to docs</td></tr><tr><td><kbd>G</kbd> <kbd>S</kbd></td><td>Go to services</td></tr><tr><td><kbd>?</kbd></td><td>Show this help</td></tr><tr><td><kbd>Esc</kbd></td><td>Close modals</td></tr></tbody></table><button type="button" class="kbd-help__close" aria-label="Close">Got it</button></div>';
          document.body.appendChild(helpModal);

          helpModal.querySelector('.kbd-help__backdrop')?.addEventListener('click', function() {
            helpModal.hidden = true;
          });
          helpModal.querySelector('.kbd-help__close')?.addEventListener('click', function() {
            helpModal.hidden = true;
          });

          function closeHelp() { helpModal.hidden = true; }

          document.addEventListener('keydown', function(e) {
            // Don't trigger shortcuts when typing in inputs
            var tag = document.activeElement?.tagName?.toLowerCase();
            var isEditing = tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;

            // Escape closes help, including when another control has focus.
            if (e.key === 'Escape') {
              closeHelp();
              return;
            }

            // / to focus search (not in inputs)
            if (e.key === '/' && !isEditing) {
              e.preventDefault();
              if (searchInput) {
                if (typeof window.__lcSearch !== 'undefined') window.__lcSearch.open();
                setTimeout(function() { searchInput.focus(); }, 60);
              }
              return;
            }

            // ? to show help (not in inputs)
            if (e.key === '?' && !isEditing && !e.metaKey && !e.ctrlKey) {
              e.preventDefault();
              helpModal.hidden = !helpModal.hidden;
              return;
            }

            // G + key navigation (vim-style)
            if (e.key === 'g' && !isEditing && !e.metaKey && !e.ctrlKey) {
              if (gKeyBuffer) { clearTimeout(gKeyBuffer); gKeyBuffer = null; }
              gKeyBuffer = setTimeout(function() { gKeyBuffer = null; }, Math.max(0, 500 - (Date.now() - (e.lcCapturedAt || Date.now()))));
              return;
            }

            if (gKeyBuffer) {
              clearTimeout(gKeyBuffer);
              gKeyBuffer = null;
              if (e.key === 'h') { navigate(base); return; }
              if (e.key === 'd') { navigate(base + 'docs/'); return; }
              if (e.key === 's') { navigate(base + 'services/'); return; }
              return;
            }

            // J/K for doc pagination (not in inputs)
            if ((e.key === 'j' || e.key === 'k') && !isEditing && !e.metaKey && !e.ctrlKey && !e.altKey) {
              var nextLink = document.querySelector('.docs-pagination__link--next');
              var prevLink = document.querySelector('.docs-pagination__link--previous');
              if (e.key === 'j' && nextLink) { nextLink.click(); return; }
              if (e.key === 'k' && prevLink) { prevLink.click(); return; }
            }
          });

        })();
