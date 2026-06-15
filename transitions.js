/* =====================================================
   DR.Care — Page Transitions + Loading Tips  v2.0
   ===================================================== */
(function () {
  'use strict';

  window._drTransition = true;

  /* ── Tips pool ────────────────────────────────────── */
  const TIPS = [
    { icon: '🚗', text: 'غسيل خارجي متكامل في 20 دقيقة فقط — سريع وأنيق!' },
    { icon: '✨', text: 'Deep Cleaning يزيل البقع العنيدة ويجدد تألق عربيتك من الصفر' },
    { icon: '💡', text: 'احجز الخميس أو الجمعة بدري — الأوقات بتنتهي بسرعة' },
    { icon: '🛡️', text: 'منظفاتنا آمنة على الطلاء ومحضّرة خصيصاً للأسواق المصرية' },
    { icon: '⭐', text: 'عملاؤنا بيقيّموننا 4.9 من 5 — معاك في كل خطوة' },
    { icon: '🏷️', text: 'شارك كود الإحالة واكسب نقاط مع كل حجز لصاحبك' },
    { icon: '📱', text: 'أضف DR.Care للشاشة الرئيسية للحجز في ثواني من أي مكان' },
    { icon: '🔧', text: 'غسيل الموتور يحمي المحرك من الغبار ويطيل عمره' },
    { icon: '🌟', text: 'باقة Inside & Outside — الأكثر طلباً وتقييماً من عملائنا' },
    { icon: '⏰', text: 'مواعيد العمل: يومياً الساعة 12 ظهراً حتى 10 مساءً' },
    { icon: '💰', text: 'أسعار ثابتة وواضحة — بدون أي رسوم مخفية أو مفاجآت' },
    { icon: '🎯', text: 'الجنوط والإطارات؟ عندنا باقة متخصصة لتلميعهم من جديد' },
  ];

  function randomTip() {
    const seen  = JSON.parse(sessionStorage.getItem('dr_seen_tips') || '[]');
    const unseen = TIPS.filter((_, i) => !seen.includes(i));
    const pool  = unseen.length ? unseen : TIPS;
    const idx   = TIPS.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    const next  = [...seen, idx].slice(-TIPS.length);
    sessionStorage.setItem('dr_seen_tips', JSON.stringify(next));
    return TIPS[idx];
  }

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

  /* ── Page-load: complete bar + tip ──────────────── */
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

  /* ── Tip toast on page enter (1 s delay) ────────── */
  function showEntryTip () {
    const tip   = randomTip();
    const toast = document.createElement('div');

    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.cssText = [
      'position:fixed', 'bottom:28px', 'inset-inline-start:50%',
      'transform:translateX(-50%) translateY(120px)',
      'z-index:9500',
      'background:rgba(22,20,16,.97)',
      'border:1px solid rgba(255,210,31,.22)',
      'border-radius:18px',
      'padding:16px 20px 16px 18px',
      'max-width:360px', 'width:calc(100% - 40px)',
      'display:flex', 'align-items:flex-start', 'gap:14px',
      'box-shadow:0 20px 56px rgba(0,0,0,.65),0 0 0 1px rgba(255,210,31,.06)',
      'opacity:0',
      'transition:transform .45s cubic-bezier(.22,1,.36,1), opacity .35s ease',
      'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)',
    ].join(';');

    toast.innerHTML = `
      <span style="font-size:1.9rem;line-height:1;flex-shrink:0;margin-top:2px">${tip.icon}</span>
      <div style="flex:1;min-width:0">
        <p style="font-size:.58rem;font-weight:900;letter-spacing:.14em;color:#ffd21f;margin:0 0 5px;font-family:Montserrat,Arial,sans-serif">DR.CARE · تلميح</p>
        <p style="font-size:.82rem;color:rgba(245,240,232,.9);line-height:1.65;margin:0;font-weight:600">${tip.text}</p>
      </div>
      <button style="background:none;border:none;color:rgba(160,144,112,.5);cursor:pointer;font-size:.95rem;padding:0 0 0 4px;flex-shrink:0;align-self:flex-start;line-height:1" aria-label="إغلاق التلميح">✕</button>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity   = '1';
    }));

    const dismiss = () => {
      toast.style.transform = 'translateX(-50%) translateY(120px)';
      toast.style.opacity   = '0';
      clearTimeout(timer);
      setTimeout(() => toast.remove(), 480);
    };

    const timer = setTimeout(dismiss, 5000);
    toast.querySelector('button').addEventListener('click', dismiss);
  }

  setTimeout(showEntryTip, 1100);

  /* ── Transition overlay (appended to <html>) ────── */
  function createExitOverlay () {
    const tip     = randomTip();
    const overlay = document.createElement('div');
    overlay.id    = 'drTransOverlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99997',
      'pointer-events:none',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(10,8,0,.78)',
      'backdrop-filter:blur(14px)', '-webkit-backdrop-filter:blur(14px)',
      'opacity:0', 'transition:opacity .22s ease',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:rgba(18,16,10,.98)',
      'border:1px solid rgba(255,210,31,.18)',
      'border-radius:26px',
      'padding:28px 28px 24px',
      'text-align:center',
      'max-width:300px', 'width:calc(100% - 40px)',
      'box-shadow:0 32px 80px rgba(0,0,0,.85),0 0 0 1px rgba(255,210,31,.06)',
      'transform:translateY(28px) scale(.94)',
      'opacity:0',
      'transition:transform .38s cubic-bezier(.22,1,.36,1) .06s,opacity .28s ease .06s',
    ].join(';');

    card.innerHTML = `
      <!-- Brand badge -->
      <div style="margin-bottom:20px">
        <span style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,210,31,.1);border:1px solid rgba(255,210,31,.22);border-radius:30px;padding:5px 14px;font-size:.6rem;font-weight:900;letter-spacing:.14em;color:#ffd21f;font-family:Montserrat,Arial,sans-serif">
          🚗 DR.CARE
        </span>
      </div>

      <!-- Animated car wash scene -->
      <div style="position:relative;height:64px;margin-bottom:20px;overflow:hidden">
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px">
          <div style="display:flex;gap:10px;margin-bottom:5px">
            <span style="font-size:.95rem;animation:drDrop 1s ease-in-out infinite 0s">💧</span>
            <span style="font-size:.75rem;animation:drDrop 1s ease-in-out infinite .25s">💧</span>
            <span style="font-size:.85rem;animation:drDrop 1s ease-in-out infinite .5s">💧</span>
            <span style="font-size:.7rem;animation:drDrop 1s ease-in-out infinite .75s">💧</span>
          </div>
          <span style="font-size:2.6rem;line-height:1;display:block;animation:drCarBob .9s ease-in-out infinite">🚗</span>
        </div>
      </div>

      <!-- Inner progress bar -->
      <div style="background:rgba(255,255,255,.07);border-radius:4px;height:4px;margin-bottom:22px;overflow:hidden">
        <div id="drInnerBar" style="height:100%;width:0%;background:linear-gradient(90deg,#c9a200,#ffd21f,#ffe566,#ffd21f);background-size:200% 100%;animation:drBarShimmer 1.4s linear infinite;border-radius:4px;transition:width 4.5s cubic-bezier(.04,.9,.12,1)"></div>
      </div>

      <!-- Tip -->
      <div style="margin-bottom:20px;padding:14px 10px;background:rgba(255,210,31,.04);border-radius:14px;border:1px solid rgba(255,210,31,.1)">
        <span style="font-size:2rem;display:block;margin-bottom:8px;line-height:1">${tip.icon}</span>
        <p style="font-size:.62rem;font-weight:900;letter-spacing:.1em;color:rgba(255,210,31,.7);margin:0 0 6px;font-family:Montserrat,Arial,sans-serif">تلميح · DR.CARE</p>
        <p style="color:rgba(245,240,232,.88);font-size:.8rem;line-height:1.7;font-weight:600;margin:0">${tip.text}</p>
      </div>

      <!-- Loading text + countdown -->
      <div style="display:flex;align-items:center;justify-content:center;gap:8px">
        <span id="drLoadDots" style="font-size:.65rem;font-weight:700;letter-spacing:.06em;color:rgba(255,210,31,.45);font-family:Montserrat,Arial,sans-serif">جاري التحميل</span>
        <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:rgba(255,210,31,.1);border:1px solid rgba(255,210,31,.2);font-size:.78rem;font-weight:900;color:#ffd21f;font-family:Montserrat,Arial,sans-serif" id="drCountdown">5</span>
      </div>
    `;

    overlay.appendChild(card);
    /* Append to <html> so body's page-exit animation doesn't affect it */
    document.documentElement.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      requestAnimationFrame(() => {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.opacity   = '1';

        /* Start inner bar fill */
        setTimeout(() => {
          const bar = document.getElementById('drInnerBar');
          if (bar) bar.style.width = '96%';
        }, 60);

        /* Animated dots */
        let d = 0;
        const dotsEl = document.getElementById('drLoadDots');
        const dotsForms = ['جاري التحميل', 'جاري التحميل .', 'جاري التحميل ..', 'جاري التحميل ...'];
        setInterval(() => { if (dotsEl) dotsEl.textContent = dotsForms[d++ % 4]; }, 500);

        /* Countdown 5 → 1 */
        let count = 5;
        const countEl = document.getElementById('drCountdown');
        const tick = setInterval(() => {
          count--;
          if (countEl) countEl.textContent = count > 0 ? count : '✓';
          if (count <= 0) clearInterval(tick);
        }, 1000);
      });
    });

    /* Drop + car bob keyframes */
    if (!document.getElementById('drDropKF')) {
      const st = document.createElement('style');
      st.id = 'drDropKF';
      st.textContent = [
        '@keyframes drDrop{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-7px)}}',
        '@keyframes drCarBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
      ].join('');
      document.head.appendChild(st);
    }
  }

  /* ── Click handler ─────────────────────────────── */
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
    if (dest.pathname === location.pathname && dest.search === location.search && dest.hash) return;

    e.preventDefault();
    leaving = true;

    /* Remove page-load bar if still fading */
    document.getElementById('drLoadBar')?.remove();

    /* Exit loading bar — appended to <html> */
    const navBar = makeBar('width:0%;transition:none;');
    navBar.style.animation = 'drBarShimmer 1.2s linear infinite';
    document.documentElement.appendChild(navBar);
    requestAnimationFrame(() => {
      navBar.style.transition = 'width 4.6s cubic-bezier(.05,.8,.2,1)';
      navBar.style.width      = '88%';
    });

    /* Overlay + tip */
    createExitOverlay();

    /* Body exit animation */
    document.body.classList.add('page-exit');

    setTimeout(() => { window.location.href = href; }, 5000);
  }, true);

  /* ── Shimmer keyframe injected once ─────────────── */
  if (!document.getElementById('drBarKF')) {
    const st = document.createElement('style');
    st.id = 'drBarKF';
    st.textContent = '@keyframes drBarShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
    document.head.appendChild(st);
  }

})();
