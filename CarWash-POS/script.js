'use strict';
/* global QRCode */

const API = '../api/pos.php';

/* ── DOM refs ── */
const posConn        = document.getElementById('posConn');
const posConnLabel   = document.getElementById('posConnLabel');
const posForm        = document.getElementById('posForm');
const packageGrid    = document.getElementById('packageGrid');
const invoiceEmpty   = document.getElementById('invoiceEmpty');
const invoiceCard    = document.getElementById('invoiceCard');
const resetBtn       = document.getElementById('resetBtn');
const newInvoiceBtn  = document.getElementById('newInvoiceBtn');
const printBtn       = document.getElementById('printBtn');
const carTypeEl      = document.getElementById('carType');
const submitBtn      = document.getElementById('submitBtn');
const posClock       = document.getElementById('posClock');
const todayStats     = document.getElementById('todayStats');
const statCount      = document.getElementById('statCount');
const statRevenue    = document.getElementById('statRevenue');
const posBottom      = document.getElementById('posBottom');
const logBody        = document.getElementById('logBody');
const logCount       = document.getElementById('logCount');

let selectedPackage  = null;
let appliedCoupon    = null; // { code, discount } after validation
let manualDiscAmount = 0;
let manualDiscType   = 'fixed';

const STATUS_LABELS = {
  new: 'جديد', confirmed: 'مؤكد',
  in_service: 'قيد التنفيذ', completed: 'تم التسليم', cancelled: 'ملغي'
};

/* ── Clock ── */
const updateClock = () => {
  if (!posClock) return;
  posClock.textContent = new Date().toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });
};
updateClock();
setInterval(updateClock, 1000);

/* ── Format helpers ── */
const fmt = (v) => v === 0 ? 'حسب التعاقد' : `${Number(v).toLocaleString('ar-EG')} جنيه`;
const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtTime = (v) => v ? new Date(v).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' }) : '—';

/* ── Get token ── */
const getToken = () => document.getElementById('posToken')?.value.trim() || '';

/* ── Server connection check ── */
const checkConnection = async () => {
  try {
    const res  = await fetch(API, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (data.ok) {
      posConn.className       = 'pos-conn connected';
      posConnLabel.textContent = 'متصل بالخادم';
      posForm.style.opacity   = '1';
      posForm.style.pointerEvents = 'auto';
      /* Load today's log + staff list once connected */
      fetchTodayLog();
      fetchStaff();
    } else throw new Error();
  } catch {
    posConn.className       = 'pos-conn error';
    posConnLabel.textContent = 'تعذر الاتصال';
    posForm.style.opacity   = '0.45';
    posForm.style.pointerEvents = 'none';
  }
};

/* ── Bottom tabs ── */
document.querySelectorAll('.pos-bottom-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pos-bottom-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.pos-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById(`tab-${tab}`).style.display = '';
  });
});

/* ── Render log row ── */
const renderLogRow = (b) => {
  const discBadge = (b.discount_amount > 0)
    ? `<small style="display:block;color:#6fcf47;font-size:0.68rem">-${fmt(b.discount_amount)}</small>`
    : '';
  return `
  <tr>
    <td><span class="pos-log-id">#${esc(b.id)}</span></td>
    <td>${esc(b.name)}</td>
    <td>${esc(b.plate_number || '—')}</td>
    <td>${esc(b.package_name)}</td>
    <td><span class="pos-log-price">${fmt(b.total_price)}</span>${discBadge}</td>
    <td><span class="pos-badge ${esc(b.status)}">${STATUS_LABELS[b.status] || b.status}</span></td>
    <td>${fmtTime(b.created_at)}</td>
    <td>
      <select class="pos-status-select" data-id="${b.id}" aria-label="حالة الطلب">
        ${Object.entries(STATUS_LABELS).map(([v,l]) =>
          `<option value="${v}"${b.status===v?' selected':''}>${l}</option>`
        ).join('')}
      </select>
    </td>
    <td><button class="pos-reprint-btn" data-id="${b.id}" title="إعادة طباعة" aria-label="طباعة">🖨️</button></td>
  </tr>`;
};

/* ── Fetch today's log ── */
const fetchTodayLog = async () => {
  const token = getToken();
  if (!token) return;
  try {
    const res  = await fetch(`${API}?action=today`, { headers: { Accept: 'application/json', 'X-POS-Token': token } });
    const data = await res.json();
    if (!data.ok) return;

    const bookings = data.bookings || [];
    const revenue  = data.revenue  || 0;

    /* Update header stats */
    if (todayStats) {
      todayStats.style.display = '';
      statCount.textContent    = bookings.length;
      statRevenue.textContent  = bookings.length ? fmt(revenue) : '—';
    }

    /* Update log tab */
    if (logCount) logCount.textContent = bookings.length;
    if (posBottom) posBottom.style.display = '';

    if (!logBody) return;
    logBody.innerHTML = bookings.length
      ? bookings.map(renderLogRow).join('')
      : `<tr><td colspan="9" class="pos-log-empty" style="padding:28px">لا توجد فواتير اليوم بعد</td></tr>`;

  } catch { /* silent */ }
};

/* ── Active staff list (for the cashier dropdown) ── */
const posStaffEl = document.getElementById('posStaff');
const fetchStaff = async () => {
  const token = getToken();
  if (!token || !posStaffEl) return;
  try {
    const res  = await fetch(`${API}?action=staff`, { headers: { Accept: 'application/json', 'X-POS-Token': token } });
    const data = await res.json();
    if (!data.ok) return;
    const current = posStaffEl.value;
    posStaffEl.innerHTML = '<option value="">— اختياري —</option>' +
      (data.staff || []).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    posStaffEl.value = current; /* keep the cashier's selection across reloads/log refreshes */
  } catch { /* silent — dropdown just stays empty, doesn't block invoicing */ }
};

/* ── Sound notification ── */
const beep = (freq = 880, dur = 130, vol = 0.12) => {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; gain.gain.value = vol;
    osc.start(); osc.stop(ctx.currentTime + dur / 1000);
    osc.onended = () => ctx.close();
  } catch { /* audio unsupported — silent */ }
};

/* ── Generic status update handler ── */
const handleStatusChange = async (sel) => {
  const id    = sel.dataset.id;
  const token = getToken();
  if (!token) { alert('أدخل رمز الموظف أولاً'); return; }
  try {
    const res  = await fetch(API, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token, id: Number(id), status: sel.value })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { alert(data.message || 'خطأ'); sel.value = sel.getAttribute('data-prev') || 'new'; return; }
    const badge = sel.closest('tr')?.querySelector('.pos-badge');
    if (badge) { badge.className = `pos-badge ${sel.value}`; badge.textContent = STATUS_LABELS[sel.value] || sel.value; }
    if (sel.value === 'completed') beep(1046, 80); // C6
    else if (sel.value === 'cancelled') beep(330, 200, 0.08); // E4 low
    else beep(660, 80); // E5
  } catch { alert('خطأ في الاتصال'); }
};

/* ── Status change from log ── */
document.getElementById('logBody')?.addEventListener('change', (e) => {
  const sel = e.target.closest('.pos-status-select');
  if (sel) handleStatusChange(sel);
});

document.getElementById('logBody')?.addEventListener('mousedown', e => {
  const sel = e.target.closest('.pos-status-select');
  if (sel) sel.setAttribute('data-prev', sel.value);
});

document.getElementById('logBody')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.pos-reprint-btn');
  if (btn) reprintInvoice(Number(btn.dataset.id));
});

/* ── Reprint invoice from history ── */
const reprintInvoice = async (id) => {
  const token = getToken();
  if (!token) { alert('أدخل رمز الموظف أولاً'); return; }
  try {
    const res  = await fetch(`${API}?action=detail&id=${id}`, { headers: { Accept: 'application/json', 'X-POS-Token': token } });
    const data = await res.json();
    if (!data.ok) { alert(data.message || 'تعذّر جلب الفاتورة'); return; }
    const b = data.booking;
    // Reconstruct booking fields for showInvoice
    b.pkg_price  = Number(b.pkg_price)       || 0;
    b.car_extra  = Number(b.car_extra_price) || 0;
    b.discount_amount = Number(b.discount_amount) || 0;
    showInvoice(b);
    invoiceCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => window.print(), 400);
  } catch { alert('خطأ في الاتصال'); }
};

/* ── History (all invoices) ── */
document.getElementById('loadHistoryBtn')?.addEventListener('click', async () => {
  const token = getToken();
  const el    = document.getElementById('historyResults');
  const meta  = document.getElementById('historyMeta');
  if (!token) { alert('أدخل رمز الموظف أولاً'); return; }
  if (meta)  meta.textContent = '⏳ جاري التحميل...';
  try {
    const res  = await fetch(`${API}?action=history&limit=200`, {
      headers: { Accept: 'application/json', 'X-POS-Token': token }
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      if (meta) meta.textContent = data.message || 'خطأ';
      return;
    }
    const bks = data.bookings || [];
    if (meta) meta.textContent = `${bks.length} فاتورة من إجمالي ${data.total}`;
    if (!el) return;
    if (!bks.length) { el.innerHTML = '<p class="pos-log-empty" style="padding:32px;text-align:center">لا توجد فواتير مسجلة</p>'; return; }
    el.innerHTML = `
      <table class="pos-log-table">
        <thead><tr><th>#</th><th>العميل</th><th>اللوحة</th><th>الباقة</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th><th>تحديث</th><th></th></tr></thead>
        <tbody>${bks.map(renderLogRow).join('')}</tbody>
      </table>`;
  } catch { if (meta) meta.textContent = 'خطأ في الاتصال'; }
});

/* ── Search ── */
document.getElementById('searchBtn')?.addEventListener('click', async () => {
  const q     = document.getElementById('searchQuery')?.value.trim();
  const token = getToken();
  const el    = document.getElementById('searchResults');
  if (!q) { if (el) el.innerHTML = '<p class="pos-log-empty" style="padding:24px;text-align:center">أدخل كلمة البحث</p>'; return; }
  if (!token) { alert('أدخل رمز الموظف أولاً'); return; }

  if (el) el.innerHTML = '<p class="pos-log-empty" style="padding:24px;text-align:center">⏳ جاري البحث...</p>';
  try {
    const res  = await fetch(`${API}?action=search&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json', 'X-POS-Token': token } });
    const data = await res.json();
    if (!res.ok || !data.ok) { if (el) el.innerHTML = `<p class="pos-log-empty" style="padding:24px;text-align:center">${data.message || 'خطأ'}</p>`; return; }
    const bks = data.bookings || [];
    if (!el) return;
    if (!bks.length) { el.innerHTML = '<p class="pos-log-empty" style="padding:24px;text-align:center">لا توجد نتائج</p>'; return; }
    el.innerHTML = `
      <table class="pos-log-table">
        <thead><tr><th>#</th><th>العميل</th><th>اللوحة</th><th>الباقة</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th><th>تحديث الحالة</th><th></th></tr></thead>
        <tbody>${bks.map(renderLogRow).join('')}</tbody>
      </table>`;
    /* Enable status changes in search results too */
  } catch { if (el) el.innerHTML = '<p class="pos-log-empty" style="padding:24px;text-align:center">خطأ في الاتصال</p>'; }
});

document.getElementById('searchQuery')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('searchBtn')?.click();
});

/* Delegate status + reprint for history and search */
['historyResults', 'searchResults'].forEach(containerId => {
  const container = document.getElementById(containerId);
  container?.addEventListener('change', (e) => {
    const sel = e.target.closest('.pos-status-select');
    if (sel) handleStatusChange(sel);
  });
  container?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pos-reprint-btn');
    if (btn) reprintInvoice(Number(btn.dataset.id));
  });
});

/* ── Live packages/prices (admin-editable via api/packages.php) ──
   Falls back to a hardcoded copy if the API is unreachable, so the
   till keeps working through a brief network blip. */
const PACKAGE_ICONS = {
  'inside-out': '🚿', outside: '✨', deep: '💎', cover: '🛡️',
  rims: '⭕', engine: '⚙️', chemical: '🧪', carpet: '🧺', blanket: '🛏️',
};
const FALLBACK_PACKAGES = [
  { code: 'inside-out', name: 'داخلي وخارجي',  price: 150 },
  { code: 'outside',    name: 'خارجي فقط',      price: 100 },
  { code: 'deep',       name: 'غسيل متخصص',     price: 250 },
  { code: 'cover',      name: 'غطاء السيارة',    price: 50  },
  { code: 'rims',       name: 'غسيل الجنوط',     price: 100 },
  { code: 'engine',     name: 'غسيل الموتور',    price: 100 },
  { code: 'chemical',   name: 'غسيل كيماوي',     price: 0   },
  { code: 'carpet',     name: 'غسيل سجاد',       price: 0   },
  { code: 'blanket',    name: 'غسيل بطاطين',     price: 80  },
];

const renderPackageCard = (p) => {
  const isVariable = p.code === 'carpet' || p.code === 'chemical';
  const priceHtml = isVariable
    ? `<div class="pkg-price pkg-price--contract">${p.code === 'carpet' ? '15 ج / متر' : 'حسب الشغل'}</div>`
    : `<div class="pkg-price"><small>ج</small>${Number(p.price)}</div>`;
  return `
    <button type="button" class="package-card" data-code="${esc(p.code)}" data-price="${Number(p.price)}" aria-pressed="false" title="${esc(p.name)}">
      <span class="pkg-icon">${PACKAGE_ICONS[p.code] || '🧴'}</span>
      <strong>${esc(p.name)}</strong>
      ${priceHtml}
    </button>`;
};

const renderPackageGrid = (packages) => {
  if (!packageGrid) return;
  const carPkgs    = packages.filter(p => p.code !== 'carpet' && p.code !== 'blanket');
  const fabricPkgs = packages.filter(p => p.code === 'carpet' || p.code === 'blanket');
  packageGrid.innerHTML = `
    <div class="pos-pkg-cat">
      <div class="pos-pkg-cat__head"><span>🚗</span><span>خدمات غسيل السيارات</span></div>
      <div class="pos-pkg-cards">${carPkgs.map(renderPackageCard).join('')}</div>
    </div>
    <div class="pos-pkg-cat">
      <div class="pos-pkg-cat__head"><span>🧺</span><span>غسيل سجاد وبطاطين</span></div>
      <div class="pos-pkg-cards pos-pkg-cards--2">${fabricPkgs.map(renderPackageCard).join('')}</div>
    </div>`;
};

const fetchPackages = async () => {
  try {
    const res  = await fetch('../api/packages.php', { headers: { Accept: 'application/json' } });
    const data = await res.json();
    renderPackageGrid(data.ok && data.packages?.length ? data.packages : FALLBACK_PACKAGES);
  } catch {
    renderPackageGrid(FALLBACK_PACKAGES);
  }
};

/* ── Package selection ── */
packageGrid?.addEventListener('click', (e) => {
  const card = e.target.closest('.package-card');
  if (!card) return;
  document.querySelectorAll('.package-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
  card.classList.add('selected');
  card.setAttribute('aria-pressed', 'true');
  selectedPackage = { code: card.dataset.code, name: card.querySelector('strong').textContent.trim(), price: Number(card.dataset.price) };
  updateLivePrice();
});

/* ── Speed: jump straight to customer name after picking a package ── */
packageGrid?.addEventListener('click', (e) => {
  if (e.target.closest('.package-card')) document.getElementById('customerName')?.focus();
});

/* ── Speed: Enter moves to the next field instead of submitting early ── */
['customerName', 'plateNumber', 'customerPhone', 'customerEmail'].forEach((id, i, ids) => {
  document.getElementById(id)?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const nextId = ids[i + 1] || 'carType';
    document.getElementById(nextId)?.focus();
  });
});

/* ── Live price bar ── */
const priceBar = document.createElement('div');
priceBar.id        = 'priceBar';
priceBar.className = 'pos-price-bar empty';
priceBar.innerHTML = '<span>اختار الباقة ونوع السيارة لحساب السعر</span>';
document.querySelector('.actions-row').insertAdjacentElement('beforebegin', priceBar);

const updateLivePrice = () => {
  if (!selectedPackage) { priceBar.className = 'pos-price-bar empty'; priceBar.innerHTML = '<span>اختار الباقة ونوع السيارة لحساب السعر</span>'; return; }
  const opt      = carTypeEl.options[carTypeEl.selectedIndex];
  const carExtra = Number(opt?.dataset.extra || 0);
  const carLabel = opt?.text.replace(/\s*\(.*\)/, '').trim() || '';
  const base     = selectedPackage.price + carExtra;
  const isVariable = selectedPackage.code === 'carpet' || selectedPackage.code === 'chemical';

  // Calculate discounts
  let totalDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  if (manualDiscAmount > 0) {
    totalDiscount += manualDiscType === 'percent'
      ? Math.round(base * Math.min(manualDiscAmount, 100) / 100)
      : Math.min(manualDiscAmount, base);
  }
  totalDiscount = Math.min(totalDiscount, base);
  const finalTotal = base - totalDiscount;

  const priceLabel = isVariable
    ? (selectedPackage.code === 'carpet' ? '15 ج / متر' : 'حسب الشغل')
    : (finalTotal === 0 ? 'حسب الشغل' : finalTotal.toLocaleString('ar-EG') + ' جنيه');

  priceBar.className = 'pos-price-bar';
  priceBar.innerHTML = `
    <div class="pos-price-bar__details">
      <span>${selectedPackage.name}</span>
      ${carExtra > 0 && !isVariable ? `<span>${carLabel} (+${carExtra.toLocaleString('ar-EG')} ج)</span>` : ''}
      ${totalDiscount > 0 && !isVariable ? `<span style="color:#6fcf47">خصم -${totalDiscount.toLocaleString('ar-EG')} ج</span>` : ''}
    </div>
    <strong class="pos-price-bar__total" style="${totalDiscount>0&&!isVariable?'color:#6fcf47':''}">${priceLabel}</strong>`;
};

carTypeEl?.addEventListener('change', updateLivePrice);

/* ── Coupon validation ── */
document.getElementById('couponApplyBtn')?.addEventListener('click', async () => {
  const code  = document.getElementById('couponInput')?.value.trim().toUpperCase();
  const msg   = document.getElementById('couponMsg');
  const token = getToken();
  if (!code) return;
  if (!token) { alert('أدخل رمز الموظف أولاً'); return; }

  const opt      = carTypeEl.options[carTypeEl.selectedIndex];
  const carExtra = Number(opt?.dataset.extra || 0);
  const base     = (selectedPackage?.price || 0) + carExtra;

  msg.style.display = '';
  msg.className = 'pos-coupon-msg';
  msg.textContent = '⏳ جاري التحقق...';

  try {
    const res  = await fetch(`${API}?action=coupon&code=${encodeURIComponent(code)}&total=${base}`, {
      headers: { Accept: 'application/json', 'X-POS-Token': token }
    });
    const data = await res.json();
    if (!data.ok) {
      msg.className = 'pos-coupon-msg pos-coupon-msg--error';
      msg.textContent = '✕ ' + (data.message || 'كود غير صالح');
      appliedCoupon = null;
    } else {
      appliedCoupon = { code, discount: data.discount, type: data.coupon.discount_type, value: data.coupon.discount_value };
      msg.className = 'pos-coupon-msg pos-coupon-msg--ok';
      msg.textContent = `✓ خصم ${data.coupon.discount_type === 'percent' ? data.coupon.discount_value + '%' : data.discount + ' جنيه'} — ${data.coupon.discount_type === 'percent' ? 'نسبة' : 'ثابت'}`;
      document.getElementById('couponClearBtn').style.display = '';
      document.getElementById('couponApplyBtn').style.display = 'none';
    }
  } catch {
    msg.className = 'pos-coupon-msg pos-coupon-msg--error';
    msg.textContent = '✕ خطأ في الاتصال';
    appliedCoupon = null;
  }
  updateLivePrice();
});

document.getElementById('couponClearBtn')?.addEventListener('click', () => {
  appliedCoupon = null;
  const input = document.getElementById('couponInput');
  if (input) input.value = '';
  const msg = document.getElementById('couponMsg');
  msg.style.display = 'none'; msg.textContent = '';
  document.getElementById('couponClearBtn').style.display = 'none';
  document.getElementById('couponApplyBtn').style.display = '';
  updateLivePrice();
});

/* ── Manual discount ── */
document.getElementById('manualDiscAmount')?.addEventListener('input', (e) => {
  manualDiscAmount = Math.max(0, parseFloat(e.target.value) || 0);
  updateLivePrice();
});
document.getElementById('manualDiscType')?.addEventListener('change', (e) => {
  manualDiscType = e.target.value;
  updateLivePrice();
});

/* ── Form submit ── */
posForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedPackage) { alert('اختار الباقة أولاً'); return; }

  const token         = getToken();
  const name          = document.getElementById('customerName').value.trim();
  const plate         = document.getElementById('plateNumber').value.trim();
  const phone         = document.getElementById('customerPhone').value.trim();
  const email         = document.getElementById('customerEmail').value.trim();
  const branch        = document.getElementById('branch').value;
  const paymentMethod = document.getElementById('paymentMethod').value;
  const carType       = carTypeEl.value;
  const notes         = document.getElementById('posNotes')?.value.trim() || '';

  submitBtn.disabled  = true;
  submitBtn.textContent = 'جاري الإنشاء...';

  try {
    const body = {
      token, name, phone, email,
      packageCode: selectedPackage.code, carType, branch, paymentMethod,
      plateNumber: plate, notes,
      staffId: posStaffEl?.value || '',
      coupon_code:          appliedCoupon?.code     || '',
      manual_discount:      manualDiscAmount         || 0,
      manual_discount_type: manualDiscType,
    };
    const res  = await fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { alert(data.message || 'حدث خطأ'); return; }
    showInvoice(data.booking);
    /* Refresh today's stats */
    fetchTodayLog();
  } catch { alert('تعذر الاتصال بالخادم'); }
  finally {
    submitBtn.disabled  = false;
    submitBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> إنشاء الفاتورة`;
  }
});

/* ── Show invoice ── */
const showInvoice = (b) => {
  const now     = new Date(b.created_at);
  const dateStr = now.toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
  document.getElementById('invoiceNumBadge').textContent  = `#${b.id}`;
  document.getElementById('invoiceDate').textContent      = dateStr;
  document.getElementById('invoiceName').textContent      = b.name;
  document.getElementById('invoicePlate').textContent     = b.plate_number  || '—';
  document.getElementById('invoicePhone').textContent     = b.phone;
  document.getElementById('invoiceBranch').textContent    = b.branch;
  document.getElementById('invoiceCarType').textContent   = b.car_type_name;
  document.getElementById('invoicePayment').textContent   = b.payment_method;
  document.getElementById('subtotalValue').textContent    = b.pkg_price > 0 ? fmt(b.pkg_price) : '—';
  document.getElementById('carExtraValue').textContent    = b.car_extra > 0 ? fmt(b.car_extra) : '—';
  document.getElementById('totalValue').textContent       = fmt(b.total_price);

  // Discount row
  const discRow   = document.getElementById('discountRow');
  const discLabel = document.getElementById('discountLabel');
  const discVal   = document.getElementById('discountValue');
  const discAmt   = Number(b.discount_amount) || 0;
  if (discRow) {
    discRow.style.display = discAmt > 0 ? '' : 'none';
    if (discLabel) discLabel.textContent = b.discount_note ? `خصم (${b.discount_note})` : 'خصم';
    if (discVal)   discVal.textContent   = discAmt > 0 ? `-${fmt(discAmt)}` : '—';
  }

  document.getElementById('invoiceItems').innerHTML = `
    <div class="item-row item-header"><span>الخدمة</span><span>السعر</span><span>الكمية</span><span>الإجمالي</span></div>
    <div class="item-row"><span>${b.package_name}</span><span>${b.pkg_price>0?fmt(b.pkg_price):'—'}</span><span>١</span><span>${b.pkg_price>0?fmt(b.pkg_price):'—'}</span></div>
    ${b.car_extra > 0 ? `<div class="item-row"><span>إضافة (${b.car_type_name})</span><span>${fmt(b.car_extra)}</span><span>١</span><span>${fmt(b.car_extra)}</span></div>` : ''}`;

  // QR code → claim page with booking token
  const qrWrap = document.getElementById('invoiceQr');
  if (qrWrap) {
    qrWrap.innerHTML = '';
    const claimToken = b.claim_token;
    if (window.QRCode && claimToken) {
      const qrUrl = `${location.origin}/app/claim?token=${claimToken}`;
      qrWrap.style.display = '';
      const qrDiv = document.createElement('div');
      qrWrap.appendChild(qrDiv);
      new QRCode(qrDiv, { text: qrUrl, width: 108, height: 108, colorDark: '#0a0800', colorLight: '#ffd21f' });
      const label = document.createElement('p');
      label.textContent = 'سكّن QR لمتابعة حجزك أونلاين';
      label.style.cssText = 'font-size:.62rem;color:#9e9689;margin-top:8px;font-family:Cairo,sans-serif';
      qrWrap.appendChild(label);
    } else {
      qrWrap.style.display = 'none';
    }
  }

  invoiceEmpty.style.display = 'none';
  invoiceCard.style.display  = 'block';
  invoiceCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

/* ── Reset ── */
const resetForm = () => {
  posForm.reset();
  selectedPackage  = null;
  appliedCoupon    = null;
  manualDiscAmount = 0;
  manualDiscType   = 'fixed';
  document.querySelectorAll('.package-card').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
  priceBar.className = 'pos-price-bar empty';
  priceBar.innerHTML = '<span>اختار الباقة ونوع السيارة لحساب السعر</span>';
  const msg = document.getElementById('couponMsg');
  if (msg) { msg.style.display = 'none'; msg.textContent = ''; }
  const clearBtn = document.getElementById('couponClearBtn');
  const applyBtn = document.getElementById('couponApplyBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  if (applyBtn) applyBtn.style.display = '';
  invoiceCard.style.display  = 'none';
  invoiceEmpty.style.display = '';
  const qrWrap = document.getElementById('invoiceQr');
  if (qrWrap) { qrWrap.innerHTML = ''; qrWrap.style.display = 'none'; }
};

resetBtn?.addEventListener('click', resetForm);
newInvoiceBtn?.addEventListener('click', resetForm);

/* ── Print ── */
printBtn?.addEventListener('click', () => window.print());

/* ── Stats tab ── */
const statsDate = document.getElementById('statsDate');
if (statsDate) statsDate.value = new Date().toISOString().slice(0, 10);

const renderStatsSection = (title, rows, totalRev) => {
  if (!rows.length) return `<div class="pos-stats-section"><p class="pos-stats-section__title">${title}</p><p style="color:#9e9689;font-size:.8rem;padding:8px 0">لا توجد بيانات</p></div>`;
  const max = Math.max(...rows.map(r => Number(r.rev)));
  const items = rows.map(r => {
    const pct = max > 0 ? Math.round(Number(r.rev) / max * 100) : 0;
    const share = totalRev > 0 ? Math.round(Number(r.rev) / totalRev * 100) : 0;
    return `
      <div class="pos-stat-row">
        <div class="pos-stat-row__label">
          <span>${esc(r.label)}</span>
          <small>${r.cnt} فاتورة · ${share}%</small>
        </div>
        <div class="pos-stat-row__bar-wrap">
          <div class="pos-stat-row__bar" style="width:${pct}%"></div>
        </div>
        <span class="pos-stat-row__val">${fmt(Number(r.rev))}</span>
      </div>`;
  }).join('');
  return `<div class="pos-stats-section"><p class="pos-stats-section__title">${title}</p>${items}</div>`;
};

document.getElementById('loadStatsBtn')?.addEventListener('click', async () => {
  const token = getToken();
  const date  = statsDate?.value || new Date().toISOString().slice(0, 10);
  const meta  = document.getElementById('statsMeta');
  const content = document.getElementById('statsContent');
  if (!token) { alert('أدخل رمز الموظف أولاً'); return; }
  if (meta) meta.textContent = '⏳ جاري التحميل...';
  try {
    const res  = await fetch(`${API}?action=stats&date=${date}`, { headers: { Accept: 'application/json', 'X-POS-Token': token } });
    const data = await res.json();
    if (!data.ok) { if (meta) meta.textContent = data.message || 'خطأ'; return; }

    const totalRev = data.by_package.reduce((s, r) => s + Number(r.rev), 0);
    if (meta) meta.textContent = totalRev > 0 ? `إجمالي الإيراد: ${fmt(totalRev)}` : 'لا توجد بيانات لهذا اليوم';

    if (content) content.innerHTML = `<div class="pos-stats-grid">
      ${renderStatsSection('📦 توزيع الباقات', data.by_package, totalRev)}
      ${renderStatsSection('🚗 توزيع أنواع السيارات', data.by_car, totalRev)}
      ${renderStatsSection('💳 طرق الدفع', data.by_payment, totalRev)}
    </div>`;
  } catch { if (meta) meta.textContent = 'خطأ في الاتصال'; }
});

/* ── Load log when token is entered ── */
let _tokenDebounce;
document.getElementById('posToken')?.addEventListener('input', () => {
  clearTimeout(_tokenDebounce);
  _tokenDebounce = setTimeout(() => {
    if (getToken().length >= 4) { fetchTodayLog(); fetchStaff(); }
  }, 400);
});

/* ── Init ── */
posForm.style.opacity      = '0.45';
posForm.style.pointerEvents = 'none';
fetchPackages(); /* public endpoint, no token needed — load regardless of connection state */
checkConnection();
