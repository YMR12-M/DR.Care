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
    { code: 'inside-out', name: 'غسيل داخلي وخارجي',         price: 150, description: 'غسيل خارجي وداخلي شامل مع تنشيف.' },
    { code: 'outside',   name: 'غسيل خارجي فقط',             price: 100, description: 'غسيل خارجي كامل مع تنشيف مايكروفايبر.' },
    { code: 'deep',      name: 'غسيل متخصص (Deep Cleaning)', price: 250, description: 'تنظيف عميق داخلي وخارجي بمعدات متخصصة.' },
    { code: 'cover',     name: 'غسيل غطاء السيارة',          price: 50,  description: 'غسيل وتنظيف غطاء السيارة بالكامل.' },
    { code: 'rims',      name: 'غسيل وتنظيف جنوط السيارة',  price: 100, description: 'تنظيف الجنوط والإطارات بمواد متخصصة.' },
    { code: 'engine',    name: 'غسيل موتور السيارة',         price: 100, description: 'تنظيف حجرة المحرك بأمان.' },
    { code: 'chemical',  name: 'الغسيل الكيماوي',            price: 0,   description: 'السعر يتحدد حسب حالة العربية والشغل المطلوب.' },
    { code: 'carpet',   name: 'غسيل سجاد',                  price: 0,   description: 'تنظيف وتغليف — 15 جنيه للمتر.' },
    { code: 'blanket',  name: 'غسيل بطاطين',                price: 80,  description: 'تنظيف وتغليف — 80 جنيه للقطعة.' }
  ],
  carTypes: [
    { code: 'sedan',  name: 'سيدان',       extra: 0 },
    { code: 'suv',    name: 'SUV',          extra: 60 },
    { code: 'van',    name: 'فان',          extra: 90 },
    { code: 'pickup', name: 'نقل خفيف',    extra: 120 }
  ],
  branches:        ['قليوب — شارع العروبة'],
  paymentMethods:  ['كاش', 'Instapay'],
  instapayNumber:  '01037957593'
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

// ─── Toast notification system ─────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✓', error: '✕', info: '★' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast__icon">${icons[type] || icons.info}</span><span class="toast__msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}
window.showToast = showToast;

// ─── Header scroll + Booking CTA bar ──────────────
const bookingCTA = document.getElementById('bookingCTA');
const bookingSection = document.getElementById('booking');
let _ctaHidden = true;

window.addEventListener('scroll', () => {
  siteHeader?.classList.toggle('is-scrolled', window.scrollY > 16);
  if (bookingCTA && bookingSection) {
    const bookingRect = bookingSection.getBoundingClientRect();
    const heroBottom  = document.getElementById('home')?.getBoundingClientRect().bottom ?? 0;
    const shouldShow  = heroBottom < 0 && bookingRect.top > 0;
    if (shouldShow && _ctaHidden) { bookingCTA.classList.add('visible');    _ctaHidden = false; }
    if (!shouldShow && !_ctaHidden) { bookingCTA.classList.remove('visible'); _ctaHidden = true; }
  }
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
    'inside-out'
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
  const numEl = document.getElementById('instapayNumberDisplay');
  if (numEl) numEl.textContent = appConfig.instapayNumber;
  updateEstimate();
  /* Sync car type cards + price calc after config loads */
  requestAnimationFrame(() => {
    if (carType?.value) carType.dispatchEvent(new Event('change', { bubbles: true }));
    window._calcPopulateHook?.();
  });
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
      paymentMethods: data.paymentMethods?.length  ? data.paymentMethods : fallbackConfig.paymentMethods,
      instapayNumber: data.instapayNumber           || fallbackConfig.instapayNumber
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

// ─── Instapay Screenshot Toggle ────────────────────
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

paymentScreenshot?.addEventListener('change', () => {
  const file = paymentScreenshot.files[0];
  if (!file) return;
  const zone = document.querySelector('label.upload-zone[for="paymentScreenshot"], label.upload-zone[for]');
  if (zone) {
    zone.classList.add('has-file');
    const main = zone.querySelector('.upload-zone__main');
    const sub  = zone.querySelector('.upload-zone__sub');
    if (main) main.textContent = `✓ ${file.name}`;
    if (sub)  sub.textContent  = `${(file.size / 1024).toFixed(0)} KB`;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    screenshotPreview.innerHTML = `<img src="${e.target.result}" alt="إيصال الدفع">`;
  };
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

// ─── Appointment Slots ────────────────────────────
let _availableSlots = {};  // { 'YYYY-MM-DD': [{id, time, available}] }

const apptDate    = document.getElementById('apptDate');
const apptTime    = document.getElementById('apptTime');
const apptFallback = document.getElementById('apptFallback');

const formatSlotDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const formatSlotTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'م' : 'ص';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2,'0')} ${suffix}`;
};

const populateSlotDates = () => {
  if (!apptDate) return;
  apptDate.innerHTML = '<option value="">— اختار يوم —</option>';
  const dateGrid = document.getElementById('dateSlotGrid');
  if (dateGrid) dateGrid.innerHTML = '';

  const availableDates = Object.keys(_availableSlots).sort().filter(date =>
    _availableSlots[date].some(s => s.available > 0)
  );

  availableDates.forEach((date, i) => {
    const opt = document.createElement('option');
    opt.value = date; opt.textContent = formatSlotDate(date);
    apptDate.appendChild(opt);

    if (!dateGrid) return;
    const d = new Date(date + 'T00:00:00');
    const dayName  = d.toLocaleDateString('ar-EG', { weekday: 'short' });
    const dayNum   = d.getDate();
    const monthLbl = d.toLocaleDateString('ar-EG', { month: 'short' });
    const count    = _availableSlots[date].filter(s => s.available > 0).length;

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'date-slot-btn';
    btn.dataset.date = date;
    btn.setAttribute('aria-label', `${formatSlotDate(date)} — ${count} وقت متاح`);
    btn.innerHTML = `<span class="date-slot-btn__day">${dayName}</span><span class="date-slot-btn__num">${dayNum}</span><span class="date-slot-btn__month">${monthLbl}</span>`;
    btn.style.transitionDelay = `${i * 40}ms`;
    btn.addEventListener('click', () => {
      dateGrid.querySelectorAll('.date-slot-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      apptDate.value = date;
      apptDate.dispatchEvent(new Event('change', { bubbles: true }));
    });
    dateGrid.appendChild(btn);
  });

  requestAnimationFrame(() => {
    if (dateGrid) dateGrid.querySelectorAll('.date-slot-btn').forEach(b => b.style.transitionDelay = '');
  });
};

const populateSlotTimes = (dateStr) => {
  const grid      = document.getElementById('timeSlotGrid');
  const hidden    = document.getElementById('apptTime');
  const slotLabel = document.getElementById('timeSlotLabel');
  if (!grid || !hidden) return;

  if (slotLabel) slotLabel.style.display = '';
  hidden.value = '';
  grid.innerHTML = '';

  const slots = (_availableSlots[dateStr] || []).filter(s => s.available > 0);
  if (!slots.length) {
    grid.innerHTML = '<p class="time-slot-empty">لا يوجد مواعيد متاحة في هذا اليوم</p>';
    return;
  }

  slots.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'time-slot-btn';
    btn.dataset.time = s.time;
    btn.textContent = formatSlotTime(s.time);
    btn.style.transitionDelay = `${i * 40}ms`;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      hidden.value = s.time;
    });
    grid.appendChild(btn);
  });

  /* Stagger entrance */
  requestAnimationFrame(() => grid.querySelectorAll('.time-slot-btn').forEach(b => b.style.transitionDelay = ''));
};

const loadAppointmentSlots = async () => {
  if (!apptDate) return;
  try {
    const res = await fetch('api/slots.php');
    if (!res.ok) return;
    const data = await res.json();
    const slots = data.slots || {};
    const hasDates = Object.keys(slots).length > 0;
    _availableSlots = slots;

    if (hasDates) {
      populateSlotDates();
      if (apptFallback) apptFallback.style.display = 'none';
      if (document.getElementById('apptDateLabel')) document.getElementById('apptDateLabel').style.display = '';
      apptDate.addEventListener('change', () => {
        const d = apptDate.value;
        const tLabel = document.getElementById('timeSlotLabel');
        if (d) {
          populateSlotTimes(d);
          if (tLabel) tLabel.style.display = '';
        } else {
          const grid = document.getElementById('timeSlotGrid');
          const hidden = document.getElementById('apptTime');
          if (grid)   grid.innerHTML = '';
          if (hidden) hidden.value = '';
          if (tLabel) tLabel.style.display = 'none';
        }
      });
    }
  } catch (_) { /* slots API unavailable — fallback to static note */ }
};

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

    /* Build appointment from slot picker if used */
    if (apptDate && apptDate.value && apptTime && apptTime.value) {
      payload.appointment = `${apptDate.value}T${apptTime.value}`;
    } else {
      payload.appointment = payload.appointment ? normalize(payload.appointment) : null;
    }
    payload.email = payload.email || null;
    payload.notes = payload.notes || null;
    payload.plateNumber = payload.plateNumber || null;
    if (appliedCoupon) payload.couponCode = appliedCoupon.code;

    // Instapay screenshot
    if (payload.paymentMethod === 'Instapay') {
      const screenshot = await getScreenshotBase64();
      if (screenshot === false) return;
      if (!screenshot) { setMessage('رجاء ارفع إيصال الدفع (Instapay)', 'error'); return; }
      payload.paymentScreenshot = screenshot;
    }

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

      bookingForm.reset();
      populateForm();
      setMinimumAppointment();
      appliedCoupon = null;

      /* Redirect to success page with details */
      const params = new URLSearchParams({
        pkg: data.booking?.package_name || servicePackage?.options[servicePackage.selectedIndex]?.text || '',
        car: carType?.options[carType.selectedIndex]?.text || '',
        pay: paymentMethod?.value || '',
      });
      if (payload.appointment) params.set('appt', payload.appointment);
      setTimeout(() => {
        window.location.href = `booking-success.html?${params}`;
      }, 600);
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
loadAppointmentSlots();
// Check customer session and update nav
async function checkCustomerSession() {
  try {
    const res = await fetch('api/customer-login.php?action=check', { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    const link = document.getElementById('customerLoginLink');
    if (!link) return;

    const hint = document.getElementById('navAccountHint');
    if (data.authenticated) {
      link.href = 'customer-profile.html';
      link.classList.add('is-authenticated');
      if (hint) hint.style.display = '';

      // Pre-fill booking form
      const form = document.getElementById('bookingForm');
      const set  = (name, val) => {
        if (!val) return;
        const el = form?.querySelector(`[name="${name}"]`);
        if (el && !el.value) { el.value = val; el.classList.add('prefilled'); }
      };
      set('name',  data.name);
      set('email', data.email);
      set('phone', data.phone);
    } else {
      link.href = 'customer-login.html';
      link.classList.remove('is-authenticated');
      if (hint) hint.style.display = 'none';
    }
  } catch (e) {
    // silent
  }
}

checkCustomerSession();

// ─── Nav social dropdown ────────────────────────────
(function () {
  const btn  = document.getElementById('navSocialBtn');
  const drop = document.getElementById('navSocialDrop');
  if (!btn || !drop) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !drop.hidden;
    drop.hidden = open;
    btn.setAttribute('aria-expanded', String(!open));
  });

  document.addEventListener('click', () => {
    if (!drop.hidden) { drop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drop.hidden) { drop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  });
})();

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

// ─── Package Card Selection Highlight ─────────────
(function () {
  const cards = document.querySelectorAll('[data-select-package]');
  const pkgSelect = document.getElementById('servicePackage');
  if (!cards.length || !pkgSelect) return;

  const updateSelection = () => {
    const val = pkgSelect.value;
    cards.forEach(card => {
      const pkg = card.closest('[data-package-card]');
      if (!pkg) return;
      const match = pkg.dataset.packageCard === val;
      pkg.classList.toggle('selected', match);
    });
  };

  cards.forEach(btn => {
    btn.addEventListener('click', () => {
      const pkg = btn.dataset.selectPackage;
      if (pkgSelect) {
        pkgSelect.value = pkg;
        pkgSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      updateSelection();
      const bookingEl = document.getElementById('booking');
      if (bookingEl) {
        const top = bookingEl.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      showToast('تم اختيار الباقة — أكمل الحجز', 'info');
    });
  });

  pkgSelect.addEventListener('change', updateSelection);
  updateSelection();
})();

// ─── Counter — pulse on finish ─────────────────────
(function () {
  const els = document.querySelectorAll('[data-counter]');
  els.forEach(el => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !e.target.dataset.pulsed) {
          e.target.dataset.pulsed = '1';
          setTimeout(() => {
            e.target.classList.add('counted');
            e.target.addEventListener('animationend', () => e.target.classList.remove('counted'), { once: true });
          }, 1450);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.6 });
    obs.observe(el);
  });
})();

// ─── Instapay copy button feedback ────────────────
document.getElementById('copyInstapayBtn')?.addEventListener('click', function () {
  const numEl = document.getElementById('instapayNumberDisplay');
  if (!numEl) return;
  navigator.clipboard?.writeText(numEl.textContent.trim()).then(() => {
    this.classList.add('copied');
    const orig = this.innerHTML;
    this.textContent = '✓ تم النسخ';
    setTimeout(() => { this.innerHTML = orig; this.classList.remove('copied'); }, 2000);
    showToast('تم نسخ رقم Instapay', 'success');
  }).catch(() => {});
});

// ─── Page Transitions ─── (delegated to transitions.js)
// transitions.js sets window._drTransition = true when active.
// This fallback only runs when transitions.js is not loaded.
if (!window._drTransition) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript') || a.target === '_blank') return;
    try {
      const dest = new URL(href, location.href);
      if (dest.origin !== location.origin) return;
    } catch { return; }
    e.preventDefault();
    document.body.classList.add('page-exit');
    setTimeout(() => { window.location.href = href; }, 280);
  }, true);
}

// ─── Ripple Effect on Buttons ────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn, .auth-btn, .nav-cta, .cp-tab, .tab-btn, .package-action, .time-slot-btn');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
});

// ─── Real-time Booking Form Validation ───────────
(function () {
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');

  const addHint = (input, msg, ok) => {
    let hint = input.parentElement?.querySelector('.field-hint');
    if (!hint) {
      hint = document.createElement('span');
      hint.className = 'field-hint';
      input.parentElement?.appendChild(hint);
    }
    hint.textContent = msg;
    hint.className = `field-hint show field-hint--${ok ? 'ok' : 'error'}`;
    input.classList.toggle('field-valid',   ok);
    input.classList.toggle('field-invalid', !ok);
  };

  const clearHint = (input) => {
    const hint = input.parentElement?.querySelector('.field-hint');
    if (hint) hint.className = 'field-hint';
    input.classList.remove('field-valid', 'field-invalid');
  };

  emailInput?.addEventListener('blur', () => {
    const v = emailInput.value.trim();
    if (!v) { clearHint(emailInput); return; }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    addHint(emailInput, ok ? '✓ بريد صحيح' : 'صيغة البريد الإلكتروني غير صحيحة', ok);
  });
  emailInput?.addEventListener('input', () => { if (emailInput.value === '') clearHint(emailInput); });

  phoneInput?.addEventListener('blur', () => {
    const v = phoneInput.value.trim();
    if (!v) { clearHint(phoneInput); return; }
    const ok = /^01[0125][0-9]{8}$/.test(v);
    addHint(phoneInput, ok ? '✓ رقم صحيح' : 'يجب أن يبدأ بـ 01 ويكون 11 رقم', ok);
  });
  phoneInput?.addEventListener('input', () => { if (phoneInput.value === '') clearHint(phoneInput); });
})();

// ─── Extended Scroll Reveal ───────────────────────
(function () {
  const extraObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        extraObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal-left, .reveal-right, .reveal-scale').forEach(el => extraObs.observe(el));
})();

// ─── Car Type Visual Cards + Smart Recommendation ─
(function () {
  const grid   = document.getElementById('carTypeGrid');
  const select = document.getElementById('carType');
  if (!grid || !select) return;

  const recommend = {
    sedan:  { pkg: 'inside-out', text: 'الغسيل الداخلي والخارجي مثالي لعربيتك' },
    suv:    { pkg: 'inside-out', text: 'الغسيل الشامل مع تركيز على الجنوط والإطارات' },
    van:    { pkg: 'deep',       text: 'Deep Cleaning الأنسب للمساحات الداخلية الكبيرة' },
    pickup: { pkg: 'outside',    text: 'الغسيل الخارجي يكفي لأغلب أحوال نقل الخفيف' },
  };

  const pkgRecommend    = document.getElementById('pkgRecommend');
  const pkgRecommendCar = document.getElementById('pkgRecommendCar');
  const pkgRecommendTxt = document.getElementById('pkgRecommendText');

  const syncCards = (value) => {
    grid.querySelectorAll('.car-type-card').forEach(card => {
      const match = card.dataset.car === value;
      card.classList.toggle('selected', match);
      card.setAttribute('aria-pressed', String(match));
    });
  };

  const applyRecommendation = (carCode) => {
    const rec = recommend[carCode];
    if (!rec || !pkgRecommend) return;
    const nameEl = grid.querySelector(`[data-car="${carCode}"] .car-type-card__name`);
    if (pkgRecommendCar) pkgRecommendCar.textContent = nameEl?.textContent || carCode;
    if (pkgRecommendTxt) pkgRecommendTxt.textContent = rec.text;
    pkgRecommend.style.display = '';
    const sp = document.getElementById('servicePackage');
    if (sp && rec.pkg && sp.querySelector(`option[value="${rec.pkg}"]`)) {
      sp.value = rec.pkg;
      sp.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  grid.querySelectorAll('.car-type-card').forEach(card => {
    card.addEventListener('click', () => {
      const code = card.dataset.car;
      syncCards(code);
      select.value = code;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      applyRecommendation(code);
    });
  });

  select.addEventListener('change', () => syncCards(select.value));
})();

// ─── Multi-Step Booking Form Navigation ────────────
(function () {
  const panels = [
    document.getElementById('bfPanel1'),
    document.getElementById('bfPanel2'),
    document.getElementById('bfPanel3'),
  ];
  const stepEls = [
    document.getElementById('bfInd1'),
    document.getElementById('bfInd2'),
    document.getElementById('bfInd3'),
  ];
  const lineEls = [
    document.getElementById('bfLine1'),
    document.getElementById('bfLine2'),
  ];

  if (!panels[0]) return;

  let current = 0;

  const goTo = (next, back = false) => {
    panels[current].classList.remove('active');
    panels[current].classList.remove('going-back');
    panels[next].classList.toggle('going-back', back);
    panels[next].classList.add('active');
    current = next;

    stepEls.forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i < current) s.classList.add('done');
      else if (i === current) s.classList.add('active');
    });
    lineEls.forEach((l, i) => l.classList.toggle('done', i < current));

    const bookingEl = document.getElementById('booking');
    if (bookingEl) {
      const top = bookingEl.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  document.getElementById('bfNext1')?.addEventListener('click', () => {
    const ct = document.getElementById('carType');
    const sp = document.getElementById('servicePackage');
    if (!ct?.value) { showToast('اختار نوع العربية الأول', 'error'); return; }
    if (!sp?.value) { showToast('اختار الباقة المناسبة', 'error'); return; }
    goTo(1);
  });

  document.getElementById('bfBack2')?.addEventListener('click', () => goTo(0, true));

  document.getElementById('bfNext2')?.addEventListener('click', () => {
    const hasDates = Object.keys(_availableSlots).length > 0;
    const dateVal  = document.getElementById('apptDate')?.value;
    const timeVal  = document.getElementById('apptTime')?.value;
    if (hasDates && !dateVal) { showToast('اختار يوم الموعد', 'error'); return; }
    if (hasDates && dateVal && !timeVal) { showToast('اختار وقت الموعد', 'error'); return; }
    goTo(2);
  });

  document.getElementById('bfBack3')?.addEventListener('click', () => goTo(1, true));
})();

// ─── Promo Banner Countdown + Dismiss ─────────────
(function () {
  const banner   = document.getElementById('promoBanner');
  const closeBtn = document.getElementById('promoBannerClose');
  const timerEl  = document.getElementById('promoTimer');
  if (!banner) return;

  if (sessionStorage.getItem('promo-dismissed')) {
    banner.classList.add('hidden');
    return;
  }

  closeBtn?.addEventListener('click', () => {
    banner.classList.add('hidden');
    sessionStorage.setItem('promo-dismissed', '1');
  });

  const tick = () => {
    if (!timerEl) return;
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const diff = Math.max(0, end - now);
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    timerEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  tick();
  setInterval(tick, 1000);
})();

// ─── Next Appointment Widget ───────────────────────
(function () {
  const widget = document.getElementById('nextApptWidget');
  const valEl  = document.getElementById('nextApptValue');
  if (!widget) return;

  fetch('api/customer-login.php?action=check', { credentials: 'same-origin' })
    .then(r => r.json()).catch(() => null)
    .then(data => {
      if (!data?.authenticated) return null;
      return fetch('api/bookings.php?action=list', { credentials: 'same-origin' }).then(r => r.json()).catch(() => null);
    })
    .then(data => {
      if (!data?.bookings?.length) return;
      const now = Date.now();
      const upcoming = data.bookings
        .filter(b => b.status !== 'cancelled' && b.status !== 'completed')
        .filter(b => !b.appointment || new Date(b.appointment) > now)
        .sort((a, b) => new Date(a.appointment || 0) - new Date(b.appointment || 0))[0];
      if (!upcoming) return;
      if (valEl) {
        const appt = upcoming.appointment ? new Date(upcoming.appointment) : null;
        valEl.textContent = appt
          ? appt.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
          : (upcoming.package_name || 'حجز قادم');
      }
      widget.style.display = 'flex';
    })
    .catch(() => {});
})();

// ─── Live Price Calculator ─────────────────────────
(function () {
  const calcPkg    = document.getElementById('calcPackage');
  const calcCarRow = document.getElementById('calcCarRow');
  const calcResult = document.getElementById('calcResult');
  const calcDur    = document.getElementById('calcDuration');
  const calcDurVal = document.getElementById('calcDurationVal');
  const calcBtn    = document.getElementById('calcBookBtn');
  if (!calcPkg || !calcResult) return;

  let calcCar = 'sedan';

  const durMap = {
    'inside-out': '~45 دقيقة', outside: '~20 دقيقة', deep: '~90 دقيقة',
    cover: '~30 دقيقة', rims: '~30 دقيقة', engine: '~45 دقيقة',
    chemical: 'يتحدد حسب الحالة', carpet: 'يتحدد حسب المتر', blanket: '~60 دقيقة',
  };

  const updateCalc = () => {
    const code = calcPkg.value;
    const pkg  = appConfig.packages.find(p => p.code === code);
    const car  = appConfig.carTypes.find(c => c.code === calcCar);
    if (!pkg) { calcResult.textContent = 'اختار الباقة'; return; }
    if (pkg.price === 0) {
      calcResult.textContent = code === 'carpet' ? '15 ج / متر' : 'حسب الشغل';
    } else {
      const total = Number(pkg.price) + Number(car?.extra ?? 0);
      const newTxt = `${total.toLocaleString('ar-EG')} جنيه`;
      if (calcResult.textContent !== newTxt) {
        calcResult.textContent = newTxt;
        calcResult.classList.remove('bump');
        void calcResult.offsetWidth;
        calcResult.classList.add('bump');
      }
    }
    if (calcDur && calcDurVal) {
      const dur = durMap[code];
      if (dur) { calcDurVal.textContent = dur; calcDur.style.display = 'flex'; }
      else      { calcDur.style.display = 'none'; }
    }
  };

  const populateCalcSelect = () => {
    if (!appConfig.packages.length) return;
    calcPkg.innerHTML = appConfig.packages.map(p =>
      `<option value="${p.code}">${p.name}${p.price > 0 ? ` — ${p.price} جنيه` : ''}</option>`
    ).join('');
    updateCalc();
  };

  calcPkg.addEventListener('change', updateCalc);

  calcCarRow?.querySelectorAll('.price-calc__car-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      calcCarRow.querySelectorAll('.price-calc__car-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      calcCar = btn.dataset.calcCar;
      updateCalc();
      /* Sync booking form car type cards */
      const ct = document.getElementById('carType');
      if (ct) { ct.value = calcCar; ct.dispatchEvent(new Event('change', { bubbles: true })); }
      document.querySelectorAll('.car-type-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.car === calcCar);
        c.setAttribute('aria-pressed', String(c.dataset.car === calcCar));
      });
    });
  });

  calcBtn?.addEventListener('click', () => {
    const code = calcPkg?.value;
    if (code) {
      const sp = document.getElementById('servicePackage');
      if (sp) { sp.value = code; sp.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* Populate once config loads */
  if (appConfig.packages.length) {
    populateCalcSelect();
  } else {
    setTimeout(populateCalcSelect, 1500);
  }
  /* Also re-populate after loadConfig fires populateForm */
  const _origPopulateForm = populateForm;
  window._calcPopulateHook = populateCalcSelect;
})();

// ─── Estimated Duration in Time Slot Header ────────
(function () {
  const durMap = {
    'inside-out': '~45 دقيقة', outside: '~20 دقيقة', deep: '~90 دقيقة',
    cover: '~30 دقيقة', rims: '~30 دقيقة', engine: '~45 دقيقة',
    chemical: 'يتحدد', carpet: 'يتحدد', blanket: '~60 دقيقة',
  };

  const updateDurationHint = () => {
    const sp = document.getElementById('servicePackage');
    const label = document.getElementById('timeSlotLabel');
    if (!sp || !label) return;

    let hint = label.querySelector('.slot-duration-hint');
    const dur = durMap[sp.value];
    if (!dur) { if (hint) hint.remove(); return; }

    if (!hint) {
      hint = document.createElement('p');
      hint.className = 'slot-duration-hint';
      label.insertBefore(hint, label.querySelector('.form-label-text')?.nextSibling || label.firstChild);
    }
    hint.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> وقت الخدمة المتوقع: <strong>${dur}</strong>`;
  };

  document.getElementById('servicePackage')?.addEventListener('change', updateDurationHint);
})();

// ─── Auto-fill from Previous Booking ──────────────
(function () {
  const bfPanel3 = document.getElementById('bfPanel3');
  if (!bfPanel3) return;

  fetch('api/bookings.php?action=list', { credentials: 'same-origin' })
    .then(r => r.json()).catch(() => null)
    .then(data => {
      const last = data?.bookings?.[0];
      if (!last) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-ghost';
      btn.style.cssText = 'font-size:.8rem;padding:8px 14px;margin-bottom:16px;width:100%;';
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.26"/></svg> استخدم نفس بيانات حجزك الأخير`;
      btn.addEventListener('click', () => {
        const set = (id, val) => {
          if (!val) return;
          const el = document.getElementById(id);
          if (el && !el.value) { el.value = val; el.classList.add('prefilled'); }
        };
        set('name',  last.customer_name);
        set('email', last.customer_email);
        set('phone', last.customer_phone);
        if (last.branch) {
          const br = document.getElementById('branch');
          if (br) br.value = last.branch;
        }
        if (last.plate_number) set('plateNumber', last.plate_number);
        showToast('تم ملء بياناتك من حجزك الأخير', 'success');
        btn.remove();
      });

      const firstField = bfPanel3.querySelector('.form-section-title');
      if (firstField) firstField.after(btn);
    })
    .catch(() => {});
})();

// ─── First-Time Onboarding Tooltip ────────────────
(function () {
  if (localStorage.getItem('onboarded')) return;
  const bookingEl = document.getElementById('booking');
  if (!bookingEl) return;

  const tip = document.createElement('div');
  tip.className = 'onboarding-tip';
  tip.textContent = '👇 احجز غسلتك هنا بسهولة';
  tip.setAttribute('aria-hidden', 'true');
  tip.setAttribute('role', 'presentation');
  document.body.appendChild(tip);

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      tip.remove();
      localStorage.setItem('onboarded', '1');
      obs.disconnect();
    }
  }, { threshold: 0.4 });
  obs.observe(bookingEl);

  setTimeout(() => { tip.style.opacity = '0'; tip.style.transition = 'opacity .4s'; setTimeout(() => tip.remove(), 400); }, 6000);
})();
