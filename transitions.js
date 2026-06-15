/* =====================================================
   DR.Care — Page Transitions + Loading Bar  v1.0
   Shared across all pages.
   ===================================================== */
(function () {
  'use strict';

  // Tell other scripts not to add their own transition handlers
  window._drTransition = true;

  // ── Helpers ─────────────────────────────────────────
  const BAR_BASE = [
    'position:fixed', 'top:0', 'inset-inline-start:0',
    'height:3px', 'background:linear-gradient(90deg,#c9a200,#ffd21f 60%,#ffe566)',
    'box-shadow:0 0 12px rgba(255,210,31,.7),0 0 4px rgba(255,210,31,.5)',
    'z-index:999999', 'pointer-events:none', 'border-radius:0 2px 2px 0',
    'will-change:width,opacity',
  ].join(';');

  function makeBar (extraStyle) {
    const el = document.createElement('div');
    el.id = 'drLoadBar';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = BAR_BASE + ';' + extraStyle;
    return el;
  }

  // ── Page Load — complete the bar ─────────────────────
  const loadBar = makeBar('width:0%;opacity:1;transition:none;');
  document.body.appendChild(loadBar);

  requestAnimationFrame(() => {
    // Ramp up quickly to simulate "page fully loaded"
    loadBar.style.transition = 'width .6s cubic-bezier(.08,.82,.17,1)';
    loadBar.style.width = '100%';

    // Then fade out
    setTimeout(() => {
      loadBar.style.transition = 'opacity .35s ease';
      loadBar.style.opacity = '0';
      setTimeout(() => loadBar.remove(), 380);
    }, 620);
  });

  // ── Click — intercept link navigation ───────────────
  let leaving = false;

  document.addEventListener('click', (e) => {
    if (leaving) return;

    const a = e.target.closest('a[href]');
    if (!a) return;

    const href = a.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript') ||
      a.target === '_blank'
    ) return;

    let dest;
    try { dest = new URL(href, location.href); } catch { return; }
    if (dest.origin !== location.origin) return;
    // Same page with only hash change → skip
    if (dest.pathname === location.pathname && dest.search === location.search && dest.hash) return;

    e.preventDefault();
    leaving = true;

    // Remove page-load bar if still showing
    document.getElementById('drLoadBar')?.remove();

    // Exit progress bar (fills to ~70%)
    const navBar = makeBar('width:0%;opacity:1;transition:none;');
    document.body.appendChild(navBar);
    requestAnimationFrame(() => {
      navBar.style.transition = 'width .32s cubic-bezier(.3,.8,.4,1)';
      navBar.style.width = '70%';
    });

    // Exit animation on body
    document.body.classList.add('page-exit');

    setTimeout(() => { window.location.href = href; }, 280);
  }, true);

})();
