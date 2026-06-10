/* =====================================================
   DR.Care — Mobile Script v2.0
   Full feature parity with desktop — booking, reviews,
   coupons, PWA install, offline detection, SW, session
   ===================================================== */

'use strict';

/* ── CSRF & secure fetch ── */
let _csrfToken = '';

const fetchCsrf = async () => {
  try {
    const r = await fetch('api/csrf.php', { credentials: 'same-origin' });
    const d = await r.json();
    _csrfToken = d.token || '';
  } catch { _csrfToken = ''; }
};

const secureFetch = (url, opts = {}) => {
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (_csrfToken) headers['X-CSRF-Token'] = _csrfToken;
  return fetch(url, { credentials: 'same-origin', ...opts, headers });
};

/* ── DOM refs ── */
const bookingForm    = document.getElementById('bookingForm');
const servicePackage = document.getElementById('servicePackage');
const carType        = document.getElementById('carType');
const branch         = document.getElementById('branch');
const paymentMethod  = document.getElementById('paymentMethod');
const appointment    = document.getElementById('appointment');
const estimateValue  = document.getElementById('estimateValue');
const formMessage    = document.getElementById('formMessage');
const submitBtn      = document.getElementById('submitBtn');
const mHeader        = document.getElementById('mHeader');
const packagesGrid   = document.getElementById('packagesGrid');
const stickyCta      = document.getElementById('stickyCta');
const scrollTopBtn   = document.getElementById('scrollTopBtn');
const mAccountBtn    = document.getElementById('mAccountBtn');
const offlineToast   = document.getElementById('offlineToast');
const pwaInstallBanner = document.getElementById('pwaInstallBanner');
const pwaInstallBtn    = document.getElementById('pwaInstallBtn');
const pwaDismissBtn    = document.getElementById('pwaDismissBtn');

/* ── Fallback config ── */
const fallbackConfig = {
  packages: [
    { code: 'inside-out', name: 'غسيل داخلي وخارجي',         price: 150 },
    { code: 'outside',   name: 'غسيل خارجي فقط',             price: 100 },
    { code: 'deep',      name: 'غسيل متخصص (Deep Cleaning)', price: 250 },
    { code: 'cover',     name: 'غسيل غطاء السيارة',          price: 50  },
    { code: 'rims',      name: 'غسيل وتنظيف جنوط السيارة',  price: 100 },
    { code: 'engine',    name: 'غسيل موتور السيارة',         price: 100 },
    { code: 'chemical',  name: 'الغسيل الكيماوي',            price: 0   },
    { code: 'carpet',   name: 'غسيل سجاد',                  price: 0   },
    { code: 'blanket',  name: 'غسيل بطاطين',                price: 80  }
  ],
  carTypes: [
    { code: 'sedan',  name: 'سيدان',      extra: 0   },
    { code: 'suv',    name: 'SUV',         extra: 60  },
    { code: 'van',    name: 'فان',         extra: 90  },
    { code: 'pickup', name: 'نقل خفيف',   extra: 120 }
  ],
  branches:       ['قليوب — شارع العروبة'],
  paymentMethods: ['كاش', 'Instapay'],
  instapayNumber: '01037957593'
};

let appConfig     = { ...fallbackConfig };
let appliedCoupon = null;
let deferredInstallPrompt = null;

/* ── Helpers ── */
const formatPrice = (v) =>
  v === 0 ? 'حسب التعاقد' : `${Number(v).toLocaleString('ar-EG')} جنيه`;

const setMessage = (text, type) => {
  if (!formMessage) return;
  formMessage.textContent = text;
  formMessage.className = 'm-form-message' + (type ? ` is-${type}` : '');
  if (type === 'error' && navigator.vibrate) navigator.vibrate(200);
};

const renderSelect = (el, items, getValue, getLabel, selected) => {
  if (!el) return;
  el.innerHTML = items.map(item => {
    const v = getValue(item);
    const l = getLabel(item);
    const s = v === selected ? ' selected' : '';
    return `<option value="${v}"${s}>${l}</option>`;
  }).join('');
};

const normalize = (v) => String(v ?? '').trim();
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const getPackage = () =>
  appConfig.packages.find(p => p.code === servicePackage?.value) ?? appConfig.packages[0];
const getCarType = () =>
  appConfig.carTypes.find(c => c.code === carType?.value) ?? appConfig.carTypes[0];

/* ── Price estimate ── */
const updateEstimate = () => {
  if (!estimateValue) return;
  const pkg      = getPackage();
  const car      = getCarType();
  const subtotal = Number(pkg?.price ?? 0) + Number(car?.extra ?? 0);
  const discount = appliedCoupon ? (appliedCoupon.discount || 0) : 0;
  const total    = Math.max(0, subtotal - discount);
  const newText  = pkg?.code === 'carpet' ? '15 ج / متر'
                 : (pkg?.price === 0)    ? 'حسب الشغل'
                 : formatPrice(total);

  if (estimateValue.textContent !== newText) {
    estimateValue.textContent = newText;
    estimateValue.classList.remove('bump');
    void estimateValue.offsetWidth;
    estimateValue.classList.add('bump');
  }
};

/* ── Update package card visual selection ── */
const updatePackageCards = (code) => {
  document.querySelectorAll('[data-package-card]').forEach(card => {
    card.classList.toggle('m-pkg-card--selected', card.dataset.packageCard === code);
  });
};

/* ── Config loader ── */
const populateForm = (selected = 'inside-out') => {
  renderSelect(servicePackage, appConfig.packages,
    p => p.code,
    p => p.price > 0 ? `${p.name} — ${formatPrice(p.price)}` : p.name,
    selected);
  renderSelect(carType, appConfig.carTypes,
    c => c.code,
    c => c.extra > 0 ? `${c.name} (+${c.extra} جنيه)` : c.name,
    'sedan');
  renderSelect(branch,        appConfig.branches,       b => b, b => b, appConfig.branches[0]);
  renderSelect(paymentMethod, appConfig.paymentMethods, m => m, m => m, appConfig.paymentMethods[0]);
  const numEl = document.getElementById('instapayNumberDisplay');
  if (numEl) numEl.textContent = appConfig.instapayNumber;
  updateEstimate();
  if (servicePackage?.value) updatePackageCards(servicePackage.value);
};

const loadConfig = async () => {
  try {
    const res  = await fetch('api/packages.php', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    appConfig = {
      packages:       data.packages?.length      ? data.packages       : fallbackConfig.packages,
      carTypes:       data.carTypes?.length       ? data.carTypes       : fallbackConfig.carTypes,
      branches:       data.branches?.length       ? data.branches       : fallbackConfig.branches,
      paymentMethods: data.paymentMethods?.length ? data.paymentMethods : fallbackConfig.paymentMethods,
      instapayNumber: data.instapayNumber          || fallbackConfig.instapayNumber
    };
  } catch {
    appConfig = { ...fallbackConfig };
  }
  populateForm();
};

/* ── Minimum appointment ── */
const setMinimumAppointment = () => {
  if (!appointment) return;
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 30);
  appointment.min = now.toISOString().slice(0, 16);
};

/* ── Session check ── */
const prefillBookingForm = (data) => {
  const set = (name, val) => {
    if (!val) return;
    const el = bookingForm?.querySelector(`[name="${name}"]`);
    if (el && !el.value) { el.value = val; el.classList.add('prefilled'); }
  };
  set('name',  data.name);
  set('email', data.email);
  set('phone', data.phone);
};

const checkSession = async () => {
  try {
    const res  = await fetch('api/customer-login.php?action=check', { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (data.authenticated) {
      if (mAccountBtn) {
        mAccountBtn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        mAccountBtn.classList.add('m-btn--account-icon');
        mAccountBtn.href = 'mobile-profile.html';
      }
      /* Show animated hint — always visible while logged in */
      const hint = document.getElementById('accountHint');
      if (hint) {
        hint.style.display = '';
        hint.setAttribute('aria-hidden', 'false');
      }
      prefillBookingForm(data);
    }
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
};

const requireLogin = async () => {
  const ok = await checkSession();
  if (ok) return true;
  setMessage('عشان تعمل حجز لازم تسجل أو تسجل دخول أولاً.', 'error');
  const returnTo = encodeURIComponent('mobile.html#booking');
  setTimeout(() => { window.location.href = `customer-login.html?return=${returnTo}`; }, 900);
  return false;
};

/* ── Coupon ── */
const couponCodeEl   = document.getElementById('couponCode');
const couponMsgEl    = document.getElementById('couponMsg');
const applyCouponBtn = document.getElementById('applyCouponBtn');

const resetCoupon = () => {
  appliedCoupon = null;
  if (couponCodeEl) couponCodeEl.value = '';
  if (couponMsgEl)  { couponMsgEl.textContent = ''; couponMsgEl.className = 'm-coupon-msg'; }
};

applyCouponBtn?.addEventListener('click', async () => {
  const code = (couponCodeEl?.value || '').trim().toUpperCase();
  if (!code) {
    couponMsgEl.textContent = 'أدخل كود الخصم';
    couponMsgEl.className   = 'm-coupon-msg error';
    return;
  }

  applyCouponBtn.disabled    = true;
  applyCouponBtn.textContent = '...';

  try {
    const pkg      = getPackage();
    const car      = getCarType();
    const subtotal = Number(pkg?.price ?? 0) + Number(car?.extra ?? 0);
    const res  = await fetch('api/coupons.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ action: 'validate', code, subtotal })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      appliedCoupon = null;
      couponMsgEl.textContent = data.message || 'كود غير صالح';
      couponMsgEl.className   = 'm-coupon-msg error';
    } else {
      appliedCoupon = data;
      const label = data.discount_type === 'percent'
        ? `خصم ${data.discount_value}%`
        : `خصم ${formatPrice(data.discount_value)}`;
      couponMsgEl.textContent = `✓ تم تطبيق ${label} — وفّرت ${formatPrice(data.discount)}`;
      couponMsgEl.className   = 'm-coupon-msg ok';
      updateEstimate();
    }
  } catch {
    couponMsgEl.textContent = 'خطأ في الاتصال';
    couponMsgEl.className   = 'm-coupon-msg error';
  } finally {
    applyCouponBtn.disabled    = false;
    applyCouponBtn.textContent = 'تطبيق';
  }
});

[servicePackage, carType].forEach(el => el?.addEventListener('change', () => {
  if (appliedCoupon) resetCoupon();
  updateEstimate();
}));

/* ── Instapay screenshot toggle ── */
const screenshotField   = document.getElementById('screenshotField');
const paymentScreenshot = document.getElementById('paymentScreenshot');
const screenshotPreview = document.getElementById('screenshotPreview');

paymentMethod?.addEventListener('change', () => {
  const isInstapay = paymentMethod.value === 'Instapay';
  if (screenshotField) screenshotField.style.display = isInstapay ? '' : 'none';
  if (!isInstapay && paymentScreenshot) {
    paymentScreenshot.value = '';
    screenshotPreview.innerHTML = '';
    const zone = document.querySelector('label.upload-zone');
    if (zone) {
      zone.classList.remove('has-file');
      const main = zone.querySelector('.upload-zone__main');
      const sub  = zone.querySelector('.upload-zone__sub');
      if (main) main.textContent = 'اضغط لرفع إيصال الدفع';
      if (sub)  sub.textContent  = 'PNG أو JPG — الحد الأقصى 3MB';
    }
  }
});

paymentScreenshot?.addEventListener('change', () => {
  const file = paymentScreenshot.files[0];
  if (!file) return;
  const zone = document.querySelector('label.upload-zone');
  if (zone) {
    zone.classList.add('has-file');
    const main = zone.querySelector('.upload-zone__main');
    const sub  = zone.querySelector('.upload-zone__sub');
    if (main) main.textContent = `✓ ${file.name}`;
    if (sub)  sub.textContent  = `${(file.size / 1024).toFixed(0)} KB`;
  }
  const reader = new FileReader();
  reader.onload = (e) => { screenshotPreview.innerHTML = `<img src="${e.target.result}" alt="إيصال الدفع">`; };
  reader.readAsDataURL(file);
});

const getScreenshotBase64 = () => new Promise((resolve) => {
  const file = paymentScreenshot?.files[0];
  if (!file) return resolve(null);
  if (file.size > 3 * 1024 * 1024) { setMessage('حجم الصورة كبير — الحد الأقصى 3MB', 'error'); return resolve(false); }
  const reader = new FileReader();
  reader.onload = (e) => resolve(e.target.result);
  reader.readAsDataURL(file);
});

document.getElementById('copyInstapayBtn')?.addEventListener('click', () => {
  const num = document.getElementById('instapayNumberDisplay')?.textContent || '';
  navigator.clipboard.writeText(num).then(() => {
    const btn = document.getElementById('copyInstapayBtn');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✓ تم النسخ';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  });
});

/* ── Per-field validation ── */
const fieldValidators = {
  name:  v => v.length < 2           ? 'اكتب اسمك الكريم (حرفين على الأقل).' : '',
  email: v => !isValidEmail(v)        ? 'اكتب بريد إلكتروني صالح.'           : '',
  phone: v => !/^01[0125][0-9]{8}$/.test(v) ? 'اكتب رقم موبايل مصري صحيح.' : '',
};

const validateField = (input) => {
  const validator = fieldValidators[input.name];
  if (!validator) return;
  const label = input.closest('.m-form__label');
  if (!label) return;
  let errEl = label.querySelector('.m-field-error');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'm-field-error';
    errEl.setAttribute('aria-live', 'polite');
    label.appendChild(errEl);
  }
  const msg = validator(input.value.trim());
  label.classList.toggle('has-error', Boolean(msg));
  errEl.textContent = msg;
};

bookingForm?.querySelectorAll('input[required]').forEach(input => {
  input.addEventListener('blur',  () => validateField(input));
  input.addEventListener('input', () => {
    if (input.closest('.m-form__label')?.classList.contains('has-error')) validateField(input);
  });
});

/* ── Package card click → select + scroll ── */
packagesGrid?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-select-package]');
  if (!btn) return;
  const code = btn.dataset.selectPackage;
  if (servicePackage) {
    servicePackage.value = code;
    updateEstimate();
  }
  updatePackageCards(code);
  document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ── Form submit ── */
bookingForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!navigator.onLine) {
    setMessage('لا يوجد اتصال بالإنترنت. حاول مرة أخرى لما ترجع أونلاين.', 'error');
    return;
  }

  if (!(await requireLogin())) return;

  const fd  = new FormData(bookingForm);
  const raw = Object.fromEntries(fd.entries());

  const payload = {
    name:           normalize(raw.name),
    email:          normalize(raw.email),
    phone:          normalize(raw.phone),
    notes:          normalize(raw.notes) || null,
    plateNumber:    normalize(raw.plateNumber) || null,
    appointment:    (_mApptDate?.value && _mApptTime?.value)
                    ? `${_mApptDate.value}T${_mApptTime.value}`
                    : (normalize(raw.appointment) || null),
    servicePackage: raw.servicePackage,
    carType:        raw.carType,
    branch:         raw.branch,
    paymentMethod:  raw.paymentMethod
  };

  if (appliedCoupon) payload.couponCode = appliedCoupon.code;

  // Client-side validation
  if (!payload.name || payload.name.length < 2) {
    setMessage('اكتب اسمك الكامل عشان نقدر نتابع الحجز.', 'error'); return;
  }
  if (!/^01[0125][0-9]{8}$/.test(payload.phone)) {
    setMessage('اكتب رقم موبايل مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015.', 'error'); return;
  }
  if (!payload.email || !isValidEmail(payload.email)) {
    setMessage('اكتب بريد إلكتروني صالح، مثل your@gmail.com.', 'error'); return;
  }
  if (payload.appointment && !(_mApptDate?.value && _mApptTime?.value)) {
    const apptDate = new Date(payload.appointment);
    if (isNaN(apptDate) || apptDate < new Date(Date.now() + 15 * 60 * 1000)) {
      setMessage('الميعاد لازم يكون بعد 15 دقيقة من الآن.', 'error'); return;
    }
  }

  if (payload.paymentMethod === 'Instapay') {
    const screenshot = await getScreenshotBase64();
    if (screenshot === false) return;
    if (!screenshot) { setMessage('لازم ترفع صورة إيصال الدفع (Instapay) عشان يتم تأكيد الحجز.', 'error'); return; }
    payload.paymentScreenshot = screenshot;
  }

  await fetchCsrf();
  if (!_csrfToken) {
    setMessage('خطأ في التحقق من الأمان، يرجى تحديث الصفحة.', 'error');
    return;
  }

  setMessage('جاري تسجيل الطلب...', null);
  submitBtn.disabled = true;
  submitBtn.classList.add('m-btn--loading');
  submitBtn.textContent = 'جاري الإرسال...';

  try {
    const res  = await secureFetch('api/bookings.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'تعذر تسجيل الطلب الآن.');

    setMessage(
      `✓ تم تسجيل الحجز رقم ${data.booking.id} بنجاح. السعر: ${data.booking.totalLabel}.`,
      'success'
    );
    bookingForm.reset();
    appliedCoupon = null;
    populateForm();
    setMinimumAppointment();
    resetCoupon();

    setTimeout(() => { window.location.href = 'mobile-bookings.html'; }, 2000);

  } catch (error) {
    // Try background sync via IDB if available
    try {
      if (window.drcareIDB && typeof window.drcareIDB.saveOutbox === 'function') {
        await window.drcareIDB.saveOutbox(payload);
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const reg = await navigator.serviceWorker.ready;
          try { await reg.sync.register('sync-bookings'); } catch {}
        }
        setMessage('تم حفظ الحجز مؤقتاً وسيتم مزامنته عند استعادة الاتصال.', 'success');
        bookingForm.reset();
        populateForm();
        setMinimumAppointment();
        return;
      }
    } catch {}

    setMessage(error.message || 'حدث خطأ أثناء تسجيل الطلب.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('m-btn--loading');
    submitBtn.textContent = 'تأكيد الحجز';
  }
});

/* ── Reviews ── */
const loadReviews = async () => {
  const grid    = document.getElementById('reviewsGrid');
  const summary = document.getElementById('reviewsSummary');
  if (!grid) return;

  try {
    const res  = await fetch('api/reviews.php', { headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    const reviews = data.reviews || [];

    if (!reviews.length) {
      grid.innerHTML = `
        <div class="m-reviews-empty">
          <span>⭐</span>
          <p>لا توجد تقييمات حتى الآن — كن أول من يقيّم!</p>
        </div>`;
      return;
    }

    // Summary stats
    const avg    = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const counts = [5,4,3,2,1].map(n => reviews.filter(r => r.rating === n).length);
    const stars  = n => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

    if (summary) {
      summary.style.display = '';
      document.getElementById('avgRating').textContent  = avg.toFixed(1);
      document.getElementById('avgStars').textContent   = stars(avg);
      document.getElementById('reviewCount').textContent = `${reviews.length} تقييم`;
      document.getElementById('ratingBars').innerHTML   = [5,4,3,2,1].map((n, i) => {
        const pct = reviews.length ? Math.round((counts[i] / reviews.length) * 100) : 0;
        return `
          <div class="m-rating-bar-row">
            <span>${n}</span>
            <div class="m-rating-bar-track"><div class="m-rating-bar-fill" style="width:${pct}%"></div></div>
            <span>${counts[i]}</span>
          </div>`;
      }).join('');
    }

    // Review cards
    const fmtDate = v => v ? new Date(v).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }) : '';
    const esc     = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    grid.innerHTML = reviews.map(r => `
      <article class="m-review-card reveal">
        <div class="m-review-card__stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        ${r.comment ? `<p class="m-review-card__text">${esc(r.comment)}</p>` : ''}
        <div class="m-review-card__footer">
          <span class="m-review-card__pkg">${esc(r.package_name || '')}</span>
          <span class="m-review-card__date">${fmtDate(r.created_at)}</span>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  } catch {
    if (grid) grid.innerHTML = `
      <div class="m-reviews-empty">
        <span>⭐</span>
        <p>تعذر تحميل التقييمات حالياً</p>
      </div>`;
  }
};

/* ── Scroll reveal ── */
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  }),
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── Sticky header + scroll-to-top ── */
const onScroll = () => {
  mHeader?.classList.toggle('is-scrolled', window.scrollY > 10);
  scrollTopBtn?.classList.toggle('visible', window.scrollY > 320);
};

window.addEventListener('scroll', onScroll, { passive: true });
scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ── Sticky CTA visibility ── */
if (stickyCta) {
  let heroVisible    = true;
  let bookingVisible = false;

  const updateCta = () => {
    const show = !heroVisible && !bookingVisible;
    stickyCta.classList.toggle('visible', show);
    stickyCta.setAttribute('aria-hidden', String(!show));
  };

  const heroEl    = document.getElementById('home');
  const bookingEl = document.getElementById('booking');

  if (heroEl)    new IntersectionObserver(([e]) => { heroVisible    = e.isIntersecting; updateCta(); }, { threshold: 0.15 }).observe(heroEl);
  if (bookingEl) new IntersectionObserver(([e]) => { bookingVisible = e.isIntersecting; updateCta(); }, { threshold: 0.15 }).observe(bookingEl);

  document.getElementById('stickyCTABtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* ── PWA install ── */
const isInStandaloneMode = () =>
  ('standalone' in navigator && navigator.standalone) ||
  window.matchMedia('(display-mode: standalone)').matches;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);

const PWA_DISMISSED_KEY = 'drcare-pwa-dismissed';

function showInstallBanner() {
  if (isInStandaloneMode()) return;
  if (sessionStorage.getItem(PWA_DISMISSED_KEY)) return;
  if (!pwaInstallBanner) return;
  pwaInstallBanner.hidden = false;
  requestAnimationFrame(() => pwaInstallBanner.classList.add('visible'));
}

function hideInstallBanner() {
  if (!pwaInstallBanner) return;
  pwaInstallBanner.classList.remove('visible');
  setTimeout(() => { pwaInstallBanner.hidden = true; }, 350);
}

/* Capture beforeinstallprompt and auto-show banner after 3s */
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (!isInStandaloneMode()) {
    setTimeout(showInstallBanner, 3000);
  }
});

/* Install handler — shared by footer + drawer buttons + banner */
async function handleInstall() {
  if (isInStandaloneMode()) return;
  if (deferredInstallPrompt) {
    hideInstallBanner();
    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') deferredInstallPrompt = null;
    return;
  }
  /* Fallback: show one-line toast with platform-specific hint */
  const toast = document.getElementById('iosInstallGuide');
  const msg   = toast?.querySelector('span');
  if (!toast || !msg) return;
  if (isIOS) {
    msg.innerHTML = 'اضغط <strong>Share</strong> ثم <strong>«إضافة إلى الشاشة الرئيسية»</strong>';
  } else {
    msg.innerHTML = 'افتح قائمة المتصفح <strong>⋮</strong> واختار <strong>«تثبيت التطبيق»</strong>';
  }
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 6000);
}

pwaInstallBtn?.addEventListener('click', handleInstall);

pwaDismissBtn?.addEventListener('click', () => {
  hideInstallBanner();
  sessionStorage.setItem(PWA_DISMISSED_KEY, '1');
});

document.getElementById('footerInstallBtn')?.addEventListener('click', handleInstall);
document.getElementById('drawerInstallBtn')?.addEventListener('click', handleInstall);

document.getElementById('iosGuideClose')?.addEventListener('click', () => {
  const toast = document.getElementById('iosInstallGuide');
  if (toast) toast.hidden = true;
});

/* Auto-show iOS guide after 4s if not installed */
if (isIOS && !isInStandaloneMode() && !sessionStorage.getItem(PWA_DISMISSED_KEY)) {
  setTimeout(() => {
    const toast = document.getElementById('iosInstallGuide');
    if (!toast) return;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 8000);
  }, 4000);
}

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideInstallBanner();
  document.getElementById('drawerInstallItem')?.remove();
});

/* ── Offline / Online detection ── */
/* Only activate after page load + 2s so the Service Worker is ready
   and navigator.onLine false on local-WiFi doesn't trigger a false alarm. */
let _offlineDetectionReady = false;
window.addEventListener('load', () => setTimeout(() => { _offlineDetectionReady = true; }, 2000));

const checkServerReachable = () =>
  fetch('api/packages.php', { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' })
    .then(() => true).catch(() => false);

async function updateOnlineStatus() {
  if (!offlineToast || !_offlineDetectionReady) return;
  if (!navigator.onLine) {
    const reachable = await checkServerReachable();
    if (reachable) return;
    offlineToast.textContent = 'وضع عدم الاتصال — بعض الميزات غير متاحة';
    offlineToast.classList.remove('online');
    offlineToast.classList.add('show');
  } else {
    offlineToast.textContent = 'تم استعادة الاتصال ✓';
    offlineToast.classList.add('online', 'show');
    setTimeout(() => offlineToast.classList.remove('show', 'online'), 3000);
  }
}

window.addEventListener('offline', updateOnlineStatus);
window.addEventListener('online',  updateOnlineStatus);

/* ── Service Worker registration ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            const toast = document.createElement('div');
            toast.style.cssText = `
              position:fixed;top:80px;left:50%;transform:translateX(-50%);
              z-index:200;padding:10px 18px;border-radius:50px;
              background:var(--panel-3);border:1px solid var(--yellow-line);
              font-size:0.82rem;font-weight:700;color:var(--white);
              box-shadow:var(--shadow);cursor:pointer;display:flex;gap:8px;align-items:center;
              white-space:nowrap;
            `;
            toast.innerHTML = '<span style="color:var(--yellow)">↻</span> تحديث متاح — اضغط للتحديث';
            toast.addEventListener('click', () => window.location.reload());
            document.body.appendChild(toast);
          }
        });
      });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          setMessage('تم مزامنة الطلبات المعلقة بنجاح.', 'success');
        }
      });
    } catch { /* SW unavailable — graceful degradation */ }
  });
}

// ─── Appointment Slots ────────────────────────────────
let _mAvailableSlots = {};

const _mApptDate    = document.getElementById('apptDate');
const _mApptTime    = document.getElementById('apptTime');
const _mApptFallback = document.getElementById('apptFallback');

const _mFmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
const _mFmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'م' : 'ص'}`;
};

const _mPopulateDates = () => {
  if (!_mApptDate) return;
  _mApptDate.innerHTML = '<option value="">— اختار يوم —</option>';
  Object.keys(_mAvailableSlots).sort().forEach(date => {
    if (!_mAvailableSlots[date].some(s => s.available > 0)) return;
    const opt = document.createElement('option');
    opt.value = date;
    opt.textContent = _mFmtDate(date);
    _mApptDate.appendChild(opt);
  });
};

const _mPopulateTimes = (dateStr) => {
  if (!_mApptTime) return;
  _mApptTime.innerHTML = '<option value="">— اختار وقت —</option>';
  (_mAvailableSlots[dateStr] || []).filter(s => s.available > 0).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.time;
    opt.textContent = _mFmtTime(s.time);
    _mApptTime.appendChild(opt);
  });
};

const loadAppointmentSlots = async () => {
  if (!_mApptDate) return;
  try {
    const res  = await fetch('api/slots.php');
    if (!res.ok) return;
    const data = await res.json();
    const slots = data.slots || {};
    if (!Object.keys(slots).length) return;
    _mAvailableSlots = slots;
    _mPopulateDates();
    if (_mApptFallback) _mApptFallback.style.display = 'none';
    const dateLabel = document.getElementById('apptDateLabel');
    if (dateLabel) dateLabel.style.display = '';
    _mApptDate.addEventListener('change', () => {
      const d      = _mApptDate.value;
      const tLabel = document.getElementById('apptTimeLabel');
      if (d) {
        _mPopulateTimes(d);
        if (tLabel) tLabel.style.display = '';
      } else {
        if (_mApptTime) _mApptTime.innerHTML = '<option value="">— اختار وقت —</option>';
        if (tLabel) tLabel.style.display = 'none';
      }
    });
  } catch (_) { /* fallback to static note */ }
};

/* ── Init ── */
fetchCsrf();
loadConfig();
loadAppointmentSlots();
setMinimumAppointment();
checkSession();
loadReviews();
onScroll();

// ── Scroll Progress Bar ───────────────────────────────
const mScrollBar = document.getElementById('scrollProgress');
if (mScrollBar) {
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    mScrollBar.style.transform = `scaleX(${total > 0 ? Math.min(window.scrollY / total, 1) : 0})`;
  }, { passive: true });
}

// ── Counter Animation (hero stats) ───────────────────
const mCounterEls = document.querySelectorAll('[data-counter]');
if (mCounterEls.length) {
  const mAnimate = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target   = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimal || '0');
    const duration = 1200;
    const t0       = performance.now();
    const tick     = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const mCountObs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) mAnimate(e.target); }),
    { threshold: 0.6 }
  );
  mCounterEls.forEach(el => mCountObs.observe(el));
}
