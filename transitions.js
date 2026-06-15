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
      'background:rgba(10,8,0,.65)',
      'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)',
      'opacity:0', 'transition:opacity .18s ease',
    ].join(';');

    const card = document.createElement('div');
    card.style.cssText = [
      'background:rgba(22,20,16,.97)',
      'border:1px solid rgba(255,210,31,.2)',
      'border-radius:22px',
      'padding:34px 40px',
      'text-align:center',
      'max-width:280px', 'width:calc(100% - 48px)',
      'box-shadow:0 28px 70px rgba(0,0,0,.75)',
      'transform:translateY(24px) scale(.94)',
      'opacity:0',
      'transition:transform .32s cubic-bezier(.22,1,.36,1) .08s, opacity .26s ease .08s',
    ].join(';');

    card.innerHTML = `
      <span style="font-size:2.8rem;display:block;margin-bottom:14px;line-height:1">${tip.icon}</span>
      <span style="display:block;font-size:.62rem;font-weight:900;letter-spacing:.14em;color:#ffd21f;margin-bottom:10px;font-family:Montserrat,Arial,sans-serif">DR.CARE</span>
      <p style="color:rgba(245,240,232,.92);font-size:.86rem;line-height:1.7;font-weight:600;margin:0">${tip.text}</p>
    `;

    overlay.appendChild(card);
    /* Append to <html> so body's page-exit animation doesn't affect it */
    document.documentElement.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      requestAnimationFrame(() => {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.opacity   = '1';
      });
    });
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
      navBar.style.transition = 'width .34s cubic-bezier(.3,.8,.4,1)';
      navBar.style.width      = '72%';
    });

    /* Overlay + tip */
    createExitOverlay();

    /* Body exit animation */
    document.body.classList.add('page-exit');

    setTimeout(() => { window.location.href = href; }, 310);
  }, true);

  /* ── Shimmer keyframe injected once ─────────────── */
  if (!document.getElementById('drBarKF')) {
    const st = document.createElement('style');
    st.id = 'drBarKF';
    st.textContent = '@keyframes drBarShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
    document.head.appendChild(st);
  }

})();
