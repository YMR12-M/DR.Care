/* =====================================================
   DR.Care — Page-load Bar  v4.0
   (loading tips + exit overlay removed)
   ===================================================== */
(function () {
  'use strict';

  /* ── Gold bar factory ────────────────────────────── */
  const BAR_STYLE = [
    'position:fixed', 'top:0', 'inset-inline-start:0', 'height:3px',
    'background:linear-gradient(90deg,#c9a200 0%,#ffd21f 50%,#ffe566 80%,#ffd21f 100%)',
    'background-size:200% 100%',
    'box-shadow:0 0 14px rgba(255,210,31,.75),0 0 4px rgba(255,210,31,.5)',
    'z-index:999999', 'pointer-events:none',
    'border-radius:0 2px 2px 0', 'will-change:width,opacity',
  ].join(';');

  function makeBar (extraCSS) {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = BAR_STYLE + ';' + extraCSS;
    return el;
  }

  /* ── Page-load: complete bar ─────────────────────── */
  const loadBar = makeBar('width:0%;transition:none;');
  document.body.appendChild(loadBar);

  requestAnimationFrame(() => {
    /* Shimmer + fill */
    loadBar.style.animation = 'drBarShimmer 1.2s linear infinite';
    loadBar.style.transition = 'width .6s cubic-bezier(.08,.82,.17,1)';
    loadBar.style.width      = '100%';
    setTimeout(() => {
      loadBar.style.transition = 'opacity .35s ease';
      loadBar.style.opacity    = '0';
      loadBar.style.animation  = 'none';
      setTimeout(() => loadBar.remove(), 380);
    }, 640);
  });

  /* ── Shimmer keyframe injected once ─────────────── */
  if (!document.getElementById('drBarKF')) {
    const st = document.createElement('style');
    st.id = 'drBarKF';
    st.textContent = '@keyframes drBarShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
    document.head.appendChild(st);
  }

})();
