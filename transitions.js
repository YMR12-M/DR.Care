/* =====================================================
   DR.Care — Page-load Bar + Loading Tips  v3.0
   (exit overlay + navigation delay removed)
   ===================================================== */
(function () {
  'use strict';

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

  /* ── Shimmer keyframe injected once ─────────────── */
  if (!document.getElementById('drBarKF')) {
    const st = document.createElement('style');
    st.id = 'drBarKF';
    st.textContent = '@keyframes drBarShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
    document.head.appendChild(st);
  }

})();
