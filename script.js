/* =====================================================
   DR.Care — Main Script v2.0
   ===================================================== */

'use strict';

// ─── DOM References ────────────────────────────────
const siteHeader     = document.getElementById('siteHeader');
const menuToggle     = document.querySelector('.menu-toggle');
const mainNav        = document.getElementById('mainNav');
const bookingForm    = document.getElementById('bookingForm');
const servicePackage = document.getElementById('servicePackage');
const carType        = document.getElementById('carType');
const branch         = document.getElementById('branch');
const paymentMethod  = document.getElementById('paymentMethod');
const appointment    = document.getElementById('appointment');
const email          = document.getElementById('email');
const estimateValue  = document.getElementById('estimateValue');
const formMessage    = document.getElementById('formMessage');
const submitBtn      = document.getElementById('submitBtn');

// PWA Elements
const pwaInstallBanner = document.getElementById('pwaInstallBanner');
const pwaInstallBtn    = document.getElementById('pwaInstallBtn');
const pwaDismissBtn    = document.getElementById('pwaDismissBtn');
const offlineToast     = document.getElementById('offlineToast');

// ─── Fallback Config ────────────────────────────────
const fallbackConfig = {
  packages: [
    { code: 'quick',  name: 'غسلة سريعة',      price: 150, description: 'غسيل خارجي، فوم، تنشيف، وتنظيف زجاج.' },
    { code: 'full',   name: 'Full Care',        price: 280, description: 'غسيل خارجي وداخلي، تنظيف تابلوه، تعطير، وتلميع إطارات.' },
    { code: 'detail', name: 'دكتور العربية',    price: 650, description: 'تنظيف عميق، واكس حماية، عناية بالفرش.' },
    { code: 'fleet',  name: 'باقات الشركات',   price: 0,   description: 'عقود شهرية للأساطيل ومكاتب الإيجار.' }
  ],
  carTypes: [
    { code: 'sedan',  name: 'سيدان',       extra: 0 },
    { code: 'suv',    name: 'SUV',          extra: 60 },
    { code: 'van',    name: 'فان',          extra: 90 },
    { code: 'pickup', name: 'نقل خفيف',    extra: 120 }
  ],
  branches: ['القاهرة الجديدة', 'مدينة نصر', 'الشيخ زايد'],
  paymentMethods: ['كاش', 'Instapay', 'Vodafone Cash', 'بطاقة بنكية']
};

let appConfig = { ...fallbackConfig };
let deferredInstallPrompt = null;

// ─── Utils ─────────────────────────────────────────
const formatPrice = (value) =>
  `${Number(value).toLocaleString('ar-EG')} جنيه`;

const setMessage = (message, type) => {
  if (!formMessage) return;
  formMessage.textContent = message;
  formMessage.className = 'form-message' + (type ? ` is-${type}` : '');
};

// ─── PWA — Service Worker ──────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Use ensureBookingAllowed() which shows the prompt once per session
      if (!(await ensureBookingAllowed())) return;
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Registered:', reg.scope);

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotice();
          }
        });
      });
    } catch (err) {
      console.warn('[SW] Registration failed:', err);
    }
  });

  // Receive messages from SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_COMPLETE') {
      setMessage('تم مزامنة الطلبات المعلقة بنجاح.', 'success');
    }
  });
}

function showUpdateNotice() {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;top:88px;inset-inline-start:50%;transform:translateX(50%);
    z-index:200;padding:12px 20px;border-radius:50px;
    background:#1a1a1a;border:1px solid var(--yellow-line);
    font-size:0.88rem;font-weight:700;color:var(--white);
    box-shadow:0 20px 60px rgba(0,0,0,0.6);cursor:pointer;
    display:flex;gap:10px;align-items:center;
  `;
  toast.innerHTML = '<span style="color:var(--yellow)">↻</span> تحديث متاح — اضغط للتحديث';
  toast.addEventListener('click', () => window.location.reload());
  document.body.appendChild(toast);
}

// ─── PWA — Install Banner ──────────────────────────
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  // Show banner after 3 seconds if not dismissed
  const dismissed = sessionStorage.getItem('pwa-dismissed');
  if (!dismissed && pwaInstallBanner) {
    setTimeout(() => pwaInstallBanner.classList.add('visible'), 3000);
  }
});

pwaInstallBtn?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  pwaInstallBanner?.classList.remove('visible');
  if (outcome === 'accepted') {
    console.log('[PWA] Installed by user');
  }
});

pwaDismissBtn?.addEventListener('click', () => {
  pwaInstallBanner?.classList.remove('visible');
  sessionStorage.setItem('pwa-dismissed', '1');
});

window.addEventListener('appinstalled', () => {
  pwaInstallBanner?.classList.remove('visible');
  deferredInstallPrompt = null;
});

// ─── Offline / Online Detection ───────────────────
function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  if (!offlineToast) return;

  if (!isOnline) {
    offlineToast.textContent = 'وضع عدم الاتصال — بعض الميزات غير متاحة';
    offlineToast.classList.remove('online');
    offlineToast.classList.add('show');
  } else {
    offlineToast.textContent = 'تم استعادة الاتصال';
    offlineToast.classList.add('online', 'show');
    setTimeout(() => offlineToast.classList.remove('show'), 3000);
  }
}

window.addEventListener('offline', updateOnlineStatus);
window.addEventListener('online', updateOnlineStatus);

// ─── Header scroll ─────────────────────────────────
window.addEventListener('scroll', () => {
  siteHeader?.classList.toggle('is-scrolled', window.scrollY > 16);
}, { passive: true });

// ─── Mobile Menu ───────────────────────────────────
const closeMenu = () => {
  mainNav?.classList.remove('open');
  document.body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
};

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    document.body.classList.toggle('menu-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

// ─── Scroll Reveal Animation ───────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// ─── Form Config ────────────────────────────────────
const renderSelect = (select, items, getValue, getLabel, selectedValue) => {
  if (!select) return;
  select.innerHTML = items.map((item) => {
    const value = getValue(item);
    const label = getLabel(item);
    const selected = value === selectedValue ? ' selected' : '';
    return `<option value="${value}"${selected}>${label}</option>`;
  }).join('');
};

const normalize = (value) => String(value ?? '').trim();

const isValidOption = (value, items) =>
  items.some((item) => {
    if (typeof item === 'string') return item === value;
    return item?.code === value;
  });

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validateBookingPayload = (payload) => {
  if (!payload.name || payload.name.length < 2) {
    return 'اكتب اسمك الكامل عشان نقدر نتابع الحجز.';
  }

  if (!/^01[0125][0-9]{8}$/.test(payload.phone)) {
    return 'اكتب رقم موبايل مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015.';
  }

  if (!isValidOption(payload.servicePackage, appConfig.packages)) {
    return 'اختار باقة صحيحة من القائمة.';
  }

  if (!isValidOption(payload.carType, appConfig.carTypes)) {
    return 'اختار نوع عربية صحيح من القائمة.';
  }

  if (!isValidOption(payload.branch, appConfig.branches)) {
    return 'اختار فرعاً صالحاً.';
  }

  if (!isValidOption(payload.paymentMethod, appConfig.paymentMethods)) {
    return 'اختار طريقة دفع صالحة.';
  }

  if (!payload.email || !isValidEmail(payload.email)) {
    return 'اكتب بريد إلكتروني صالح، مثل your@gmail.com.';
  }

  if (payload.appointment) {
    const appointmentDate = new Date(payload.appointment);
    const minDate = new Date(Date.now() + 15 * 60 * 1000);
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate < minDate) {
      return 'الميعاد لازم يكون بعد 15 دقيقة من الآن.';
    }
  }

  if (payload.plateNumber && !/^[\p{L}\p{N}\s-]{1,20}$/u.test(payload.plateNumber)) {
    return 'رقم اللوحة يحتوي حروف أو أرقام غير مصرح بها.';
  }

  if (payload.notes.length > 280) {
    return 'الملاحظات يجب أن تكون 280 حرف أو أقل.';
  }

  return '';
};

const getPackage = () =>
  appConfig.packages.find((p) => p.code === servicePackage?.value) ?? appConfig.packages[0];

const getCarType = () =>
  appConfig.carTypes.find((c) => c.code === carType?.value) ?? appConfig.carTypes[0];

/* ── CSRF token ── */
let _csrfToken = '';
const refreshCsrf = async () => {
  try {
    const r = await fetch('api/csrf.php', { credentials: 'same-origin' });
    const d = await r.json();
    _csrfToken = d.token || '';
  } catch { _csrfToken = ''; }
};
refreshCsrf();

/* ── Coupon state ── */
let appliedCoupon = null;

const updateEstimate = () => {
  if (!estimateValue) return;
  const pkg      = getPackage();
  const car      = getCarType();
  const subtotal = Number(pkg?.price ?? 0) + Number(car?.extra ?? 0);
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const total    = Math.max(0, subtotal - discount);
  const newText  = pkg?.code === 'fleet' ? 'حسب التعاقد' : formatPrice(total);

  if (estimateValue.textContent !== newText) {
    estimateValue.textContent = newText;
    estimateValue.classList.remove('bump');
    void estimateValue.offsetWidth;
    estimateValue.classList.add('bump');
  }
};

/* ── Coupon apply ── */
const couponCodeEl = document.getElementById('couponCode');
const couponMsgEl  = document.getElementById('couponMsg');
const applyCouponBtn = document.getElementById('applyCouponBtn');

applyCouponBtn?.addEventListener('click', async () => {
  const code = (couponCodeEl?.value || '').trim().toUpperCase();
  if (!code) { couponMsgEl.textContent = 'أدخل كود الخصم'; couponMsgEl.className = 'coupon-msg error'; return; }

  applyCouponBtn.disabled = true; applyCouponBtn.textContent = '...';
  try {
    const pkg      = getPackage();
    const car      = getCarType();
    const subtotal = Number(pkg?.price ?? 0) + Number(car?.extra ?? 0);
    const res  = await fetch('api/coupons.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ action: 'validate', code, subtotal })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      appliedCoupon = null;
      couponMsgEl.textContent = data.message || 'كود غير صالح';
      couponMsgEl.className   = 'coupon-msg error';
    } else {
      appliedCoupon = data;
      const label = data.discount_type === 'percent'
        ? `خصم ${data.discount_value}%`
        : `خصم ${formatPrice(data.discount_value)}`;
      couponMsgEl.textContent = `✓ تم تطبيق ${label} — وفّرت ${formatPrice(data.discount)}`;
      couponMsgEl.className   = 'coupon-msg ok';
      updateEstimate();
    }
  } catch { couponMsgEl.textContent = 'خطأ في الاتصال'; couponMsgEl.className = 'coupon-msg error'; }
  finally  { applyCouponBtn.disabled = false; applyCouponBtn.textContent = 'تطبيق'; }
});

/* Reset coupon when package/car changes */
[servicePackage, carType].forEach(el => el?.addEventListener('change', () => {
  if (appliedCoupon) {
    appliedCoupon = null;
    if (couponCodeEl) couponCodeEl.value = '';
    if (couponMsgEl)  { couponMsgEl.textContent = ''; couponMsgEl.className = 'coupon-msg'; }
  }
}));

const populateForm = () => {
  renderSelect(
    servicePackage,
    appConfig.packages,
    (p) => p.code,
    (p) => p.price > 0 ? `${p.name} — ${formatPrice(p.price)}` : p.name,
    'full'
  );
  renderSelect(
    carType,
    appConfig.carTypes,
    (c) => c.code,
    (c) => c.extra > 0 ? `${c.name} (+ ${formatPrice(c.extra)})` : c.name,
    'sedan'
  );
  renderSelect(branch, appConfig.branches, (b) => b, (b) => b, appConfig.branches[0]);
  renderSelect(paymentMethod, appConfig.paymentMethods, (m) => m, (m) => m, appConfig.paymentMethods[0]);
  updateEstimate();
};

const loadConfig = async () => {
  try {
    const response = await fetch('api/packages.php', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Config fetch failed');
    const data = await response.json();
    appConfig = {
      packages:       data.packages?.length       ? data.packages       : fallbackConfig.packages,
      carTypes:       data.carTypes?.length        ? data.carTypes       : fallbackConfig.carTypes,
      branches:       data.branches?.length        ? data.branches       : fallbackConfig.branches,
      paymentMethods: data.paymentMethods?.length  ? data.paymentMethods : fallbackConfig.paymentMethods
    };
  } catch {
    appConfig = { ...fallbackConfig };
  }
  populateForm();
};

// ─── Package Card Buttons ──────────────────────────
document.querySelectorAll('[data-select-package]').forEach((button) => {
  button.addEventListener('click', (e) => {
    const code = button.dataset.selectPackage;
    if (servicePackage) {
      servicePackage.value = code;
      updateEstimate();
    }
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Intercept main booking CTA(s)
document.querySelectorAll('a[href="#booking"], .nav-cta').forEach((el) => {
  el.addEventListener('click', async (e) => {
    // If link is an anchor to booking on same page, check session first
    if (!(await ensureBookingAllowed())) {
      e.preventDefault();
    }
  });
});

// Ensure booking is allowed: only prompt when user attempts booking
async function ensureBookingAllowed({ forceAlert = false } = {}) {
  try {
    const res = await fetch('api/customer-login.php?action=check', { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (data.authenticated) return true;

    if (!sessionStorage.getItem('bookingPromptShown') || forceAlert) {
      sessionStorage.setItem('bookingPromptShown', '1');
      setMessage('عشان تعمل حجز لازم تسجل أو تسجل دخول أولاً.', 'error');
      const returnTo = encodeURIComponent('index.html#booking');
      setTimeout(() => { window.location.href = `customer-login.html?return=${returnTo}`; }, 900);
    }
    return false;
  } catch (e) {
    if (!sessionStorage.getItem('bookingPromptShown') || forceAlert) {
      sessionStorage.setItem('bookingPromptShown', '1');
      setMessage('تعذر التحقق من الجلسة — سجّل الدخول ثم حاول الحجز.', 'error');
      setTimeout(() => { window.location.href = 'customer-login.html'; }, 900);
    }
    return false;
  }
}

[servicePackage, carType].forEach((el) => el?.addEventListener('change', updateEstimate));

// ─── Appointment min date ──────────────────────────
const setMinimumAppointment = () => {
  if (!appointment) return;
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 30);
  appointment.min = now.toISOString().slice(0, 16);
};

// ─── Booking Form Submit ───────────────────────────
if (bookingForm) {
  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!(await ensureBookingAllowed({ forceAlert: true }))) {
      return;
    }

    if (!navigator.onLine) {
      setMessage('لا يوجد اتصال بالإنترنت. حاول مرة أخرى لما ترجع أونلاين.', 'error');
      return;
    }

    const formData = new FormData(bookingForm);
    const payload = Object.fromEntries(formData.entries());
    const egyptPhone = /^01[0125][0-9]{8}$/;

    payload.name        = normalize(payload.name);
    payload.email       = normalize(payload.email);
    payload.phone       = normalize(payload.phone);
    payload.notes       = normalize(payload.notes);
    payload.plateNumber = normalize(payload.plateNumber);

    const clientError = validateBookingPayload({
      ...payload,
      appointment: normalize(payload.appointment)
    });

    if (clientError) {
      setMessage(clientError, 'error');
      return;
    }

    payload.appointment = payload.appointment ? normalize(payload.appointment) : null;
    payload.email = payload.email || null;
    payload.notes = payload.notes || null;
    payload.plateNumber = payload.plateNumber || null;
    if (appliedCoupon) payload.couponCode = appliedCoupon.code;

    // Ensure fresh CSRF token before sending
    await refreshCsrf();

    // Loading state
    setMessage('جاري تسجيل الطلب...', null);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الإرسال...';
    }

    try {
      const response = await fetch('api/bookings.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-Token': _csrfToken
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || 'تعذر تسجيل الطلب حاليا.');

      setMessage(
        `✓ تم تسجيل الحجز رقم ${data.booking.id} بنجاح. السعر: ${data.booking.totalLabel}.`,
        'success'
      );
      bookingForm.reset();
      populateForm();
      setMinimumAppointment();
      appliedCoupon = null;

      // Redirect to bookings page after 2 seconds
      setTimeout(() => {
        window.location.href = 'customer-bookings.html';
      }, 2000);
    } catch (error) {
      // Try to queue booking for background sync
      try {
        if (window.drcareIDB && typeof window.drcareIDB.saveOutbox === 'function') {
          await window.drcareIDB.saveOutbox(payload);
          // register sync
          if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const reg = await navigator.serviceWorker.ready;
            try { await reg.sync.register('sync-bookings'); } catch(e) { /* ignore */ }
          }
          setMessage('تم حفظ الحجز مؤقتاً وسيتم مزامنته عند استعادة الاتصال.', 'success');
          bookingForm.reset();
          populateForm();
          setMinimumAppointment();
          return;
        }
      } catch (e) {
        // fallthrough to show error
      }

      setMessage(`${error.message} — شغّل المشروع من PHP server عشان الحجز يتسجل.`, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تأكيد الحجز';
      }
    }
  });
}

// ─── Init ──────────────────────────────────────────
loadConfig();
setMinimumAppointment();
// Check customer session and update nav
async function checkCustomerSession() {
  try {
    const res = await fetch('api/customer-login.php?action=check', { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    const link = document.getElementById('customerLoginLink');
    if (!link) return;

    if (data.authenticated) {
      link.textContent = data.name ? `مرحبا ${data.name}` : 'حسابي';
      link.href = 'customer-profile.html';
      link.classList.add('is-authenticated');

      if (!document.getElementById('customerLogoutLink')) {
        const logout = document.createElement('a');
        logout.id = 'customerLogoutLink';
        logout.href = 'api/customer-login.php?action=logout';
        logout.textContent = 'خروج';
        logout.className = 'nav-logout';
        logout.addEventListener('click', async (e) => {
          e.preventDefault();
          await fetch(logout.href, { credentials: 'same-origin' });
          window.location.href = 'customer-login.html';
        });
        link.parentNode.insertBefore(logout, link.nextSibling);
      }
    } else {
      link.textContent = 'حسابي';
      link.href = 'customer-login.html';
      link.classList.remove('is-authenticated');
      const logout = document.getElementById('customerLogoutLink');
      if (logout) logout.remove();
    }
  } catch (e) {
    // silent
  }
}

checkCustomerSession();

// ─── Reviews ───────────────────────────────────────
const loadReviews = async () => {
  const grid    = document.getElementById('reviewsGrid');
  const summary = document.getElementById('reviewsSummary');
  if (!grid) return;

  try {
    const res  = await fetch('api/reviews.php', { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    const reviews = data.reviews || [];

    if (!reviews.length) {
      grid.innerHTML = `<div class="reviews-empty"><span>⭐</span><p>لا توجد تقييمات حتى الآن — كن أول من يقيّم!</p></div>`;
      return;
    }

    /* ── Summary stats ── */
    const avg    = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const counts = [5,4,3,2,1].map(n => reviews.filter(r => r.rating === n).length);
    const stars  = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

    if (summary) {
      summary.style.display = '';
      document.getElementById('avgRating').textContent = avg.toFixed(1);
      document.getElementById('avgStars').textContent  = stars(avg);
      document.getElementById('reviewCount').textContent = `${reviews.length} تقييم`;
      document.getElementById('ratingBars').innerHTML = [5,4,3,2,1].map((n, i) => {
        const pct = reviews.length ? Math.round((counts[i] / reviews.length) * 100) : 0;
        return `
          <div class="rating-bar-row">
            <span>${n}</span>
            <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
            <span>${counts[i]}</span>
          </div>`;
      }).join('');
    }

    /* ── Cards ── */
    const fmtDate = (v) => v ? new Date(v).toLocaleDateString('ar-EG', { year:'numeric', month:'long' }) : '';
    grid.innerHTML = reviews.map(r => `
      <article class="review-card reveal">
        <div class="review-card__stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        ${r.comment ? `<p class="review-card__text">${String(r.comment).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : ''}
        <div class="review-card__footer">
          <span class="review-card__pkg">${String(r.package_name || '').replace(/</g,'&lt;')}</span>
          <span class="review-card__date">${fmtDate(r.created_at)}</span>
        </div>
      </article>
    `).join('');

    /* Observe new reveal elements */
    grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  } catch {
    if (grid) grid.innerHTML = `<div class="reviews-empty"><span>⭐</span><p>تعذر تحميل التقييمات</p></div>`;
  }
};

loadReviews();

// ─── Scroll Progress Bar ────────────────────────────
const scrollProgressBar = document.getElementById('scrollProgress');
if (scrollProgressBar) {
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgressBar.style.transform = `scaleX(${total > 0 ? Math.min(window.scrollY / total, 1) : 0})`;
  }, { passive: true });
}

// ─── Counter Animation (hero stats) ─────────────────
const counterEls = document.querySelectorAll('[data-counter]');
if (counterEls.length) {
  const animateCounter = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target   = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimal || '0');
    const duration = 1400;
    const t0       = performance.now();
    const tick     = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counterObs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) animateCounter(e.target); }),
    { threshold: 0.6 }
  );
  counterEls.forEach(el => counterObs.observe(el));
}
