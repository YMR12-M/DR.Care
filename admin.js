/* =====================================================
   DR.Care — Admin Script v3.0
   ===================================================== */

'use strict';

/* ── CSRF token ── */
let _adminCsrf = '';
async function loadSlotsForBooking(bookingId) {
  const select = document.getElementById(`slot-select-${bookingId}`);
  if (!select) return;
  select.innerHTML = '<option value="">جاري التحميل...</option>';
  try {
    const res  = await adminFetch('api/slots.php?admin=1');
    const data = await res.json().catch(() => ({}));
    const slots = (data.all_slots || []).filter(s => s.is_active);
    if (!slots.length) {
      select.innerHTML = '<option value="">لا توجد مواعيد متاحة</option>';
      return;
    }
    select.innerHTML = '<option value="">اختر موعداً...</option>' + slots.map(s => {
      const dt    = new Date(s.slot_date + 'T' + s.slot_time);
      const label = dt.toLocaleDateString('ar-EG', { weekday: 'short', month: 'short', day: 'numeric' }) + ' — ' + s.slot_time;
      const avail = s.max_bookings - s.booked_count;
      return `<option value="${s.slot_date}T${s.slot_time}">${label} (${avail} متاح)</option>`;
    }).join('');
  } catch { select.innerHTML = '<option value="">خطأ في التحميل</option>'; }
}

async function assignSlotToBooking(bookingId) {
  const select = document.getElementById(`slot-select-${bookingId}`);
  const btn    = document.getElementById(`slot-btn-${bookingId}`);
  if (!select || !btn) return;
  const appt = select.value;
  if (!appt) { showToast('اختر موعداً أولاً', 'error'); return; }
  btn.disabled = true; btn.textContent = '...';
  try {
    await fetchAdminCsrf();
    const res  = await adminFetch('api/bookings.php', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingId, appointment: appt })
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok) { showToast('تم تحديد الموعد ✓', 'success'); fetchBookings(); }
    else showToast(data.message || 'حدث خطأ', 'error');
  } catch { showToast('خطأ في الاتصال', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'تحديد الموعد'; }
}

const fetchAdminCsrf = async () => {
  try {
    const r = await fetch('api/csrf.php', { credentials: 'same-origin' });
    const d = await r.json();
    _adminCsrf = d.token || '';
  } catch { _adminCsrf = ''; }
};
const adminFetch = (url, opts = {}) => {
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (_adminCsrf) headers['X-CSRF-Token'] = _adminCsrf;
  return fetch(url, { credentials: 'same-origin', ...opts, headers });
};

// ─── DOM References ────────────────────────────────
const bookingsBody          = document.getElementById('bookingsBody');
const totalBookings         = document.getElementById('totalBookings');
const newBookings           = document.getElementById('newBookings');
const expectedRevenue       = document.getElementById('expectedRevenue');
const refreshBookings       = document.getElementById('refreshBookings');
const downloadJson          = document.getElementById('downloadJson');
const searchInput           = document.getElementById('searchInput');
const branchFilter          = document.getElementById('branchFilter');
const paymentFilter         = document.getElementById('paymentFilter');
const filterButtons         = document.getElementById('filterButtons');
const resultsCount          = document.getElementById('resultsCount');
const todayBookings         = document.getElementById('todayBookings');
const monthBookings         = document.getElementById('monthBookings');
const todayRevenue          = document.getElementById('todayRevenue');
const monthRevenue          = document.getElementById('monthRevenue');
const bookingDetailsModal   = document.getElementById('bookingDetailsModal');
const bookingDetailsContent = document.getElementById('bookingDetailsContent');
const modalCloseBtn         = document.getElementById('modalCloseBtn');
const siteHeader            = document.getElementById('siteHeader');
const toastBar              = document.getElementById('toastBar');
const toastText             = document.getElementById('toastText');

// ─── Constants ─────────────────────────────────────
const STATUS_LABELS = {
  new:        'جديد',
  confirmed:  'مؤكد',
  in_service: 'قيد التنفيذ',
  completed:  'تم التسليم',
  cancelled:  'ملغي'
};

const PAYMENT_LABELS = { pending: 'انتظار', paid: 'مدفوع', waived: 'معفو' };
const PAYMENT_COLORS = { pending: '#e67e22', paid: '#27ae60', waived: '#7f8c8d' };

// ─── State ─────────────────────────────────────────
let allBookings          = [];
let currentFilter        = 'all';
let currentSearch        = '';
let currentBranchFilter  = 'all';
let currentPaymentFilter = 'all';
let currentDateFrom      = '';
let currentDateTo        = '';

// ─── Utils ─────────────────────────────────────────
const formatPrice = (v) => `${Number(v).toLocaleString('ar-EG')} جنيه`;

const escapeHtml = (v) =>
  String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

// ─── Toast ─────────────────────────────────────────
let toastTimer;
const showToast = (msg, type = '') => {
  if (!toastBar || !toastText) return;
  toastText.textContent = msg;
  toastBar.className = `toast-bar show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastBar.classList.remove('show'); }, 3500);
};

// ─── Header scroll ─────────────────────────────────
window.addEventListener('scroll', () => {
  siteHeader?.classList.toggle('is-scrolled', window.scrollY > 16);
}, { passive: true });

// ─── Stats Rendering ───────────────────────────────
const renderStats = (bookings) => {
  const active = bookings.filter((b) => b.status !== 'cancelled');
  const revenue = active.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  
  // Count unique customers by email
  const uniqueCustomers = new Set(
    bookings
      .filter((b) => b.email)
      .map((b) => b.email.toLowerCase())
  ).size;

  const totalCustomersEl = document.getElementById('totalCustomers');
  if (totalCustomersEl) totalCustomersEl.textContent = uniqueCustomers.toLocaleString('ar-EG');
  
  if (totalBookings)   totalBookings.textContent = bookings.length.toLocaleString('ar-EG');
  if (newBookings)     newBookings.textContent   = bookings.filter((b) => b.status === 'new').length.toLocaleString('ar-EG');
  if (expectedRevenue) expectedRevenue.textContent = formatPrice(revenue);
};

// ─── Filter & Search ───────────────────────────────
const getFilteredBookings = () => {
  let list = allBookings;

  if (currentFilter !== 'all') {
    list = list.filter((b) => b.status === currentFilter);
  }

  if (currentBranchFilter !== 'all') {
    list = list.filter((b) => b.branch === currentBranchFilter);
  }

  if (currentPaymentFilter !== 'all') {
    list = list.filter((b) => b.payment_method === currentPaymentFilter);
  }

  if (currentDateFrom) {
    const [fy, fm, fd] = currentDateFrom.split('-').map(Number);
    const from = new Date(fy, fm - 1, fd, 0, 0, 0, 0); // local midnight — no UTC offset confusion
    list = list.filter((b) => b.created_at && new Date(b.created_at) >= from);
  }

  if (currentDateTo) {
    const [ty, tm, td] = currentDateTo.split('-').map(Number);
    const to = new Date(ty, tm - 1, td, 23, 59, 59, 999); // local end-of-day
    list = list.filter((b) => b.created_at && new Date(b.created_at) <= to);
  }

  if (currentSearch.trim()) {
    const q = currentSearch.trim().toLowerCase();
    list = list.filter((b) =>
      b.name?.toLowerCase().includes(q) ||
      b.phone?.includes(q) ||
      String(b.id).includes(q) ||
      b.package_name?.toLowerCase().includes(q) ||
      b.branch?.toLowerCase().includes(q) ||
      b.payment_method?.toLowerCase().includes(q) ||
      b.plate_number?.toLowerCase().includes(q)
    );
  }

  return list;
};

// ─── Table Rendering ───────────────────────────────
const renderTable = () => {
  const filtered  = getFilteredBookings();
  const isCompact = document.getElementById('compactMode')?.checked;

  if (resultsCount) {
    resultsCount.textContent = filtered.length
      ? `${filtered.length.toLocaleString('ar-EG')} من ${allBookings.length.toLocaleString('ar-EG')}`
      : '';
  }

  if (!filtered.length) {
    bookingsBody.innerHTML = `
      <div class="table-empty">
        <span>${allBookings.length ? '🔍' : '📋'}</span>
        <p>${allBookings.length ? 'لا توجد نتائج لهذا الفلتر.' : 'لا توجد طلبات حتى الآن.'}</p>
      </div>`;
    return;
  }

  const relTime = (v) => {
    if (!v) return '—';
    const diff = Date.now() - new Date(v).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)   return 'الآن';
    if (m < 60)  return `منذ ${m} د`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `منذ ${h} س`;
    return new Date(v).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  bookingsBody.className = `bk-list${isCompact ? ' bk-list--compact' : ''}`;
  bookingsBody.innerHTML = filtered.map((b) => {
    const payColor = PAYMENT_COLORS[b.payment_status] || PAYMENT_COLORS.pending;
    const payLabel = PAYMENT_LABELS[b.payment_status] || 'انتظار';
    const appt     = b.appointment
      ? new Date(b.appointment).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;

    return `
    <div class="bk-card bk-card--${escapeHtml(b.status)}" role="listitem" data-booking-id="${b.id}">
      <div class="bk-card__bar" aria-hidden="true"></div>

      <div class="bk-card__body">
        <!-- Row 1: ID · Name · Status · Time -->
        <div class="bk-card__top">
          <span class="bk-id">#${escapeHtml(b.id)}</span>
          <strong class="bk-name">${escapeHtml(b.name)}</strong>
          <span class="bk-badge bk-badge--${escapeHtml(b.status)}">${STATUS_LABELS[b.status] || b.status}</span>
          <span class="bk-time">${relTime(b.created_at)}</span>
        </div>

        <!-- Row 2: Package · Branch · Price · Phone -->
        <div class="bk-card__meta">
          <span class="bk-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            ${escapeHtml(b.package_name)} · <span style="color:var(--muted-2)">${escapeHtml(b.car_type_name)}</span>
          </span>
          <span class="bk-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(b.branch)}
          </span>
          <span class="bk-meta-item bk-price">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            ${formatPrice(b.total_price)}
            <span class="bk-pay-dot" style="background:${payColor}" title="${payLabel}"></span>
          </span>
          <a class="bk-meta-item bk-phone" href="tel:${escapeHtml(b.phone)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${escapeHtml(b.phone)}
          </a>
          ${appt ? `<span class="bk-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${appt}
          </span>` : ''}
        </div>
      </div>

      <!-- Actions -->
      <div class="bk-card__actions">
        <select class="bk-status-select" data-booking-id="${b.id}" aria-label="حالة الطلب #${b.id}">
          ${Object.entries(STATUS_LABELS).map(([val, lbl]) =>
            `<option value="${val}"${b.status === val ? ' selected' : ''}>${lbl}</option>`
          ).join('')}
        </select>
        <button class="bk-view-btn details-btn" type="button" data-booking-id="${b.id}" aria-label="عرض تفاصيل #${b.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          عرض
        </button>
      </div>
    </div>`;
  }).join('');

  /* Store prev value for rollback on cancel */
  bookingsBody.querySelectorAll('.bk-status-select').forEach(sel =>
    sel.setAttribute('data-prev-value', sel.value)
  );
};

const getBookingById = (id) => allBookings.find((booking) => String(booking.id) === String(id));

const closeBookingDetails = () => {
  if (!bookingDetailsModal) return;
  bookingDetailsModal.classList.remove('open');
  bookingDetailsModal.setAttribute('aria-hidden', 'true');
};

const showBookingDetails = (booking) => {
  if (!bookingDetailsModal || !bookingDetailsContent || !booking) return;

  const waPhone   = (booking.phone || '').replace(/[^0-9]/g, '');
  const waLink    = waPhone ? `https://wa.me/2${waPhone}` : null;
  const emailLink = booking.email ? `mailto:${encodeURIComponent(booking.email)}` : null;
  const fmtDate   = (v) => v ? new Date(v).toLocaleString('ar-EG', { dateStyle:'long', timeStyle:'short' }) : '—';
  const badge     = `<span class="status-badge ${escapeHtml(booking.status)}">${STATUS_LABELS[booking.status] || booking.status}</span>`;

  bookingDetailsContent.innerHTML = `
    <div class="modal-header">
      <div>
        <p class="modal-header__kicker">Booking Details</p>
        <h2 id="detailTitle">طلب #${escapeHtml(booking.id)}</h2>
        <p class="modal-header__summary">${escapeHtml(booking.package_name)} · ${escapeHtml(booking.car_type_name)} · ${escapeHtml(booking.branch)}</p>
      </div>
      <div class="modal-header__price">
        <strong>${formatPrice(booking.total_price)}</strong>
        <small>${badge}</small>
      </div>
    </div>

    <div class="modal-body">
      <div class="modal-info-grid">
        <div class="modal-cell">
          <label>اسم العميل</label>
          <value>${escapeHtml(booking.name)}</value>
        </div>
        <div class="modal-cell">
          <label>الموبايل</label>
          <value><a href="tel:${escapeHtml(booking.phone)}">${escapeHtml(booking.phone)}</a></value>
        </div>
        <div class="modal-cell">
          <label>البريد الإلكتروني</label>
          <value>${emailLink ? `<a href="${emailLink}">${escapeHtml(booking.email)}</a>` : '—'}</value>
        </div>
        <div class="modal-cell">
          <label>رقم اللوحة</label>
          <value>${escapeHtml(booking.plate_number || '—')}</value>
        </div>
        <div class="modal-cell" style="grid-column:1/-1">
          <label>الموعد</label>
          <value style="display:block;margin-bottom:8px">${booking.appointment ? fmtDate(booking.appointment) : 'لم يُحدد بعد'}</value>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <select id="slot-select-${booking.id}"
              style="flex:1;min-width:200px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:var(--panel-2);color:var(--text);font-size:0.9rem">
              <option value="">جاري التحميل...</option>
            </select>
            <button id="slot-btn-${booking.id}" onclick="assignSlotToBooking(${booking.id})" class="btn-sm btn-primary">تحديد الموعد</button>
          </div>
        </div>
        <div class="modal-cell">
          <label>طريقة الدفع</label>
          <value>${escapeHtml(booking.payment_method || '—')}</value>
        </div>
        ${booking.payment_screenshot ? `
        <div class="modal-cell modal-cell--wide">
          <label>إيصال Instapay</label>
          <div style="margin-top:8px">
            <a href="${booking.payment_screenshot}" target="_blank" rel="noreferrer">
              <img src="${booking.payment_screenshot}" alt="إيصال الدفع"
                style="max-width:100%;max-height:300px;border-radius:10px;border:2px solid var(--line);cursor:zoom-in;object-fit:contain;display:block">
            </a>
            <p style="font-size:.75rem;color:var(--muted);margin-top:6px">اضغط على الصورة لعرضها بالحجم الكامل</p>
          </div>
        </div>` : ''}
        <div class="modal-cell">
          <label>تاريخ الإنشاء</label>
          <value>${fmtDate(booking.created_at)}</value>
        </div>
        <div class="modal-cell">
          <label>المصدر</label>
          <value>${escapeHtml(booking.source || 'web')}</value>
        </div>
        ${booking.notes ? `
        <div class="modal-cell modal-cell--wide">
          <label>ملاحظات</label>
          <value style="white-space:pre-wrap;font-weight:400;color:var(--muted)">${escapeHtml(booking.notes)}</value>
        </div>` : ''}
      </div>

      <p class="modal-section-title">حالة الدفع</p>
      <div class="modal-actions" style="margin-bottom:12px">
        ${Object.entries(PAYMENT_LABELS).map(([ps, pl]) =>
          `<button type="button" class="quick-action${booking.payment_status === ps ? ' active' : ''}" data-payment-status="${ps}" data-booking-id="${booking.id}" style="border-color:${PAYMENT_COLORS[ps]};${booking.payment_status === ps ? `background:${PAYMENT_COLORS[ps]};color:#fff;` : ''}">${pl}</button>`
        ).join('')}
      </div>

      ${waLink ? `
      <p class="modal-section-title">📱 واتساب — رسائل جاهزة</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        ${[
          { label: '✅ تأكيد الحجز',        msg: `مرحباً ${booking.name}،\nتم تأكيد حجزك رقم #${booking.id} لـ ${booking.package_name} في فرع ${booking.branch}.\nموعدك: ${booking.appointment ? new Date(booking.appointment).toLocaleString('ar-EG',{dateStyle:'long',timeStyle:'short'}) : 'سيتم تحديده'}\nشكراً لاختيارك DR.Care 🚗✨` },
          { label: '🚗 العربية جاهزة',       msg: `مرحباً ${booking.name}،\nعربيتك جاهزة للاستلام من فرع ${booking.branch} ✅\nالسعر الإجمالي: ${Number(booking.total_price).toLocaleString('ar-EG')} جنيه\nشكراً لثقتك في DR.Care 🙏` },
          { label: '⏰ تذكير الموعد',        msg: `مرحباً ${booking.name}،\nتذكير بموعدك في DR.Care غداً 📅\nالخدمة: ${booking.package_name}\nالفرع: ${booking.branch}\nفي انتظارك 🚗` },
          { label: '⭐ طلب تقييم',          msg: `مرحباً ${booking.name}،\nشكراً لاختيارك DR.Care! 🌟\nنتمنى أن تكون الخدمة أعجبتك.\nيسعدنا لو شاركتنا تقييمك من خلال: ${window.location.origin}/mobile-bookings.html` },
        ].map(t => {
          const encoded = encodeURIComponent(t.msg);
          return `<a href="${waLink}?text=${encoded}" target="_blank" rel="noreferrer"
            style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(37,211,102,0.08);border:1px solid rgba(37,211,102,0.25);border-radius:10px;font-size:.82rem;font-weight:700;color:#25d366;text-decoration:none;transition:.2s"
            onmouseover="this.style.background='rgba(37,211,102,0.15)'" onmouseout="this.style.background='rgba(37,211,102,0.08)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            ${t.label}
          </a>`;
        }).join('')}
        ${emailLink ? `<a href="${emailLink}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--panel-2);border:1px solid var(--line-2);border-radius:10px;font-size:.82rem;font-weight:700;color:var(--muted);text-decoration:none">✉️ إرسال بريد إلكتروني</a>` : ''}
      </div>` : ''}

      <p class="modal-section-title">تغيير الحالة</p>
      <div class="modal-actions">
        ${Object.entries(STATUS_LABELS).map(([s, l]) =>
          `<button type="button" class="quick-action" data-status="${s}" data-booking-id="${booking.id}">${l}</button>`
        ).join('')}
      </div>
    </div>
  `;

  bookingDetailsModal.dataset.currentBookingId = booking.id;
  bookingDetailsModal.classList.add('open');
  bookingDetailsModal.setAttribute('aria-hidden', 'false');
  loadSlotsForBooking(booking.id);
};

// ─── Full Render ────────────────────────────────────
const renderAdminFilters = (bookings) => {
  const branches = Array.from(new Set(bookings.map((b) => b.branch).filter(Boolean)));
  const payments = Array.from(new Set(bookings.map((b) => b.payment_method).filter(Boolean)));

  if (branchFilter) {
    branchFilter.innerHTML = [
      '<option value="all">كل الفروع</option>',
      ...branches.map((branch) => `<option value="${escapeHtml(branch)}">${escapeHtml(branch)}</option>`)
    ].join('');
    branchFilter.value = currentBranchFilter;
  }

  if (paymentFilter) {
    paymentFilter.innerHTML = [
      '<option value="all">كل طرق الدفع</option>',
      ...payments.map((payment) => `<option value="${escapeHtml(payment)}">${escapeHtml(payment)}</option>`)
    ].join('');
    paymentFilter.value = currentPaymentFilter;
  }
};

const renderReports = (bookings) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const safeDate = (value) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  };

  const todayBookingsCount = bookings.filter((booking) => {
    const created = safeDate(booking.created_at);
    return created && created >= startOfToday;
  }).length;

  const monthBookingsCount = bookings.filter((booking) => {
    const created = safeDate(booking.created_at);
    return created && created >= startOfMonth;
  }).length;

  const sumRevenue = (filterFn) => bookings.reduce((sum, booking) => {
    const created = safeDate(booking.created_at);
    if (!created || !filterFn(created) || booking.status === 'cancelled') return sum;
    return sum + Number(booking.total_price || 0);
  }, 0);

  const todayRevenueValue = sumRevenue((date) => date >= startOfToday);
  const monthRevenueValue = sumRevenue((date) => date >= startOfMonth);

  if (todayBookings) todayBookings.textContent = todayBookingsCount.toLocaleString('ar-EG');
  if (monthBookings) monthBookings.textContent = monthBookingsCount.toLocaleString('ar-EG');
  if (todayRevenue) todayRevenue.textContent = formatPrice(todayRevenueValue);
  if (monthRevenue) monthRevenue.textContent = formatPrice(monthRevenueValue);
};

/* ── Charts ── */
const _chartInstances = {};
const CHART_DEFAULTS = {
  color: '#ffd21f',
  gridColor: 'rgba(255,255,255,0.06)',
  textColor: '#9e9689',
  font: { family: 'Cairo, sans-serif', size: 11 }
};

const destroyChart = (id) => { if (_chartInstances[id]) { _chartInstances[id].destroy(); delete _chartInstances[id]; } };

const makeChart = (id, config) => {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas) return;
  _chartInstances[id] = new Chart(canvas, config);
};

const renderCharts = (bookings) => {
  Chart.defaults.color = CHART_DEFAULTS.textColor;
  Chart.defaults.font  = CHART_DEFAULTS.font;

  /* ── Chart 1: Last 7 days ── */
  const days = [], dayCounts = [], dayRevenues = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }));
    const prefix = d.toISOString().slice(0, 10);
    const bk = bookings.filter(b => (b.created_at || '').startsWith(prefix));
    dayCounts.push(bk.length);
    dayRevenues.push(bk.filter(b => b.status !== 'cancelled').reduce((s, b) => s + Number(b.total_price || 0), 0));
  }
  makeChart('chartDays', {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        { label: 'حجوزات', data: dayCounts, backgroundColor: 'rgba(255,210,31,0.75)', borderRadius: 6, yAxisID: 'y' },
        { label: 'إيراد (ج)', data: dayRevenues, type: 'line', borderColor: '#6fcf47', backgroundColor: 'rgba(111,207,71,0.12)', tension: 0.4, pointRadius: 3, yAxisID: 'y2' }
      ]
    },
    options: {
      responsive: true, interaction: { mode: 'index' },
      plugins: { legend: { labels: { boxWidth: 10, font: CHART_DEFAULTS.font } } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor } },
        y:  { grid: { color: CHART_DEFAULTS.gridColor }, beginAtZero: true, ticks: { stepSize: 1 } },
        y2: { position: 'left', grid: { display: false }, beginAtZero: true, display: false }
      }
    }
  });

  /* ── Chart 2: Status doughnut ── */
  const STATUS_COLORS = { new:'#ffd21f', confirmed:'#5ba4f5', in_service:'#f5a623', completed:'#6fcf47', cancelled:'#f0533e' };
  const statusData = Object.entries(STATUS_LABELS).map(([s]) => bookings.filter(b => b.status === s).length);
  makeChart('chartStatus', {
    type: 'doughnut',
    data: {
      labels: Object.values(STATUS_LABELS),
      datasets: [{ data: statusData, backgroundColor: Object.keys(STATUS_LABELS).map(s => STATUS_COLORS[s]), borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: CHART_DEFAULTS.font } } }
    }
  });

  /* ── Chart 3: Revenue by branch ── */
  const branchMap = {};
  bookings.filter(b => b.status !== 'cancelled').forEach(b => {
    if (b.branch) branchMap[b.branch] = (branchMap[b.branch] || 0) + Number(b.total_price || 0);
  });
  const branchEntries = Object.entries(branchMap).sort((a, b) => b[1] - a[1]);
  makeChart('chartBranch', {
    type: 'bar',
    data: {
      labels: branchEntries.map(([k]) => k),
      datasets: [{ label: 'الإيراد (ج)', data: branchEntries.map(([, v]) => v), backgroundColor: ['rgba(255,210,31,0.8)', 'rgba(91,164,245,0.8)', 'rgba(111,207,71,0.8)'], borderRadius: 6 }]
    },
    options: {
      responsive: true, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor }, beginAtZero: true },
        y: { grid: { display: false } }
      }
    }
  });

  /* ── Chart 4: Package popularity ── */
  const pkgMap = {};
  bookings.forEach(b => { if (b.package_name) pkgMap[b.package_name] = (pkgMap[b.package_name] || 0) + 1; });
  const pkgEntries = Object.entries(pkgMap).sort((a, b) => b[1] - a[1]);
  makeChart('chartPackages', {
    type: 'bar',
    data: {
      labels: pkgEntries.map(([k]) => k),
      datasets: [{ label: 'عدد الطلبات', data: pkgEntries.map(([, v]) => v), backgroundColor: 'rgba(255,210,31,0.75)', borderRadius: 6 }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: CHART_DEFAULTS.gridColor }, beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
};

const renderBookings = (bookings) => {
  allBookings = bookings;
  /* Keep poller baseline in sync so new bookings after initial load are detected */
  if (bookings.length > 0) {
    _lastBookingId = Math.max(_lastBookingId, Number(bookings[0].id));
  }
  renderAdminFilters(bookings);
  renderStats(bookings);
  renderReports(bookings);
  renderTable();
  if (document.getElementById('chartsPanel')?.style.display !== 'none') renderCharts(bookings);
};

// ─── Fetch Bookings ─────────────────────────────────
const fetchBookings = async () => {
  showToast('جاري تحميل الطلبات...', '');

  const response = await fetch('api/bookings.php', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin'
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.message || 'تعذر تحميل الطلبات.');

  renderBookings(data.bookings || []);
  showToast(`✓ تم تحميل ${(data.bookings || []).length} طلب`, 'success');
};

// ─── Update Payment Status ──────────────────────────
const updatePaymentStatus = async (bookingId, paymentStatus) => {
  await fetchAdminCsrf();
  const response = await adminFetch('api/bookings.php', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bookingId, payment_status: paymentStatus })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'تعذر تحديث حالة الدفع.');
  showToast(`✓ تم تحديث الدفع: ${PAYMENT_LABELS[paymentStatus] || paymentStatus}`, 'success');
  await fetchBookings();
};

// ─── Update Status ──────────────────────────────────
const updateStatus = async (bookingId, status) => {
  await fetchAdminCsrf();
  const response = await adminFetch('api/bookings.php', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bookingId, status })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'تعذر تحديث الحالة.');

  showToast('✓ تم تحديث حالة الطلب', 'success');

  /* Push notification — targeted to the booking's customer only */
  const statusLabels = { new:'جديد', confirmed:'مؤكد', in_service:'قيد التنفيذ', completed:'تم التسليم', cancelled:'ملغي' };
  const booking      = allBookings.find(b => Number(b.id) === Number(bookingId));
  const customerId   = booking?.customer_id ? Number(booking.customer_id) : null;
  fetch('api/push-send.php', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      title:       'DR.Care — تحديث الطلب',
      body:        `حالة طلبك رقم #${bookingId} أصبحت: ${statusLabels[status] || status}`,
      url:         '/customer-bookings.html',
      customer_id: customerId,
    })
  }).catch(() => {});

  await fetchBookings();
};

// ─── Event Listeners ────────────────────────────────
refreshBookings?.addEventListener('click', async () => {
  try { await fetchBookings(); }
  catch (error) { showToast(error.message, 'error'); }
});

downloadJson?.addEventListener('click', () => {
  if (!allBookings.length) {
    showToast('لا توجد بيانات لتحميلها.', 'error');
    return;
  }
  const blob = new Blob([JSON.stringify(allBookings, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `dr-care-bookings-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

bookingsBody?.addEventListener('change', async (event) => {
  if (!event.target.matches('.bk-status-select')) return;
  const select = event.target;
  const prev   = select.getAttribute('data-prev-value') || '';
  const id     = select.dataset.bookingId;
  if (!confirm(`تغيير حالة الطلب #${id} إلى "${STATUS_LABELS[select.value]}"؟`)) {
    select.value = prev; return;
  }
  try {
    await updateStatus(id, select.value);
    select.setAttribute('data-prev-value', select.value);
  } catch (error) {
    showToast(error.message, 'error');
    select.value = prev;
  }
});

bookingsBody?.addEventListener('click', (event) => {
  const button = event.target.closest('.details-btn, .bk-view-btn');
  if (!button) return;
  const booking = getBookingById(button.dataset.bookingId);
  if (booking) showBookingDetails(booking);
});

bookingsBody?.addEventListener('mousedown', (event) => {
  if (event.target.matches('.bk-status-select')) {
    event.target.setAttribute('data-prev-value', event.target.value);
  }
});

bookingDetailsModal?.addEventListener('click', async (event) => {
  if (event.target.matches('[data-close-modal]') || event.target === bookingDetailsModal) {
    closeBookingDetails();
    return;
  }

  const action = event.target.closest('.quick-action');
  if (!action) return;
  const bookingId = action.dataset.bookingId;

  if (action.dataset.paymentStatus) {
    try {
      await updatePaymentStatus(bookingId, action.dataset.paymentStatus);
      const booking = getBookingById(bookingId);
      if (booking) showBookingDetails(booking);
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  if (action.dataset.status) {
    try {
      await updateStatus(bookingId, action.dataset.status);
      const booking = getBookingById(bookingId);
      if (booking) showBookingDetails(booking);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
});

modalCloseBtn?.addEventListener('click', (event) => {
  event.preventDefault();
  closeBookingDetails();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeBookingDetails();
});

// Filter buttons
filterButtons?.addEventListener('click', (event) => {
  const btn = event.target.closest('.filter-btn');
  if (!btn) return;

  currentFilter = btn.dataset.filter;
  filterButtons.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
});

// Search
let searchDebounce;
searchInput?.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentSearch = searchInput.value;
    renderTable();
  }, 250);
});

branchFilter?.addEventListener('change', () => {
  currentBranchFilter = branchFilter.value;
  renderTable();
});

paymentFilter?.addEventListener('change', () => {
  currentPaymentFilter = paymentFilter.value;
  renderTable();
});

// ─── Date Range Filter ─────────────────────────────
const dateFromEl       = document.getElementById('dateFrom');
const dateToEl         = document.getElementById('dateTo');
const clearDateRangeEl = document.getElementById('clearDateRange');

const updateClearDateBtn = () => {
  if (clearDateRangeEl) clearDateRangeEl.style.display = (currentDateFrom || currentDateTo) ? '' : 'none';
};

const updateDatePresetBtns = (activePreset = null) => {
  document.querySelectorAll('[data-preset]').forEach(b => {
    b.classList.toggle('active', b.dataset.preset === activePreset);
  });
};

dateFromEl?.addEventListener('change', () => {
  currentDateFrom = dateFromEl.value;
  updateClearDateBtn();
  updateDatePresetBtns();
  renderTable();
});

dateToEl?.addEventListener('change', () => {
  currentDateTo = dateToEl.value;
  updateClearDateBtn();
  updateDatePresetBtns();
  renderTable();
});

clearDateRangeEl?.addEventListener('click', () => {
  currentDateFrom = ''; currentDateTo = '';
  if (dateFromEl) dateFromEl.value = '';
  if (dateToEl)   dateToEl.value   = '';
  updateClearDateBtn();
  updateDatePresetBtns();
  renderTable();
});

document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const now = new Date();
    /* Use LOCAL date parts — toISOString() gives UTC which can be yesterday/tomorrow */
    const fmtLocal = (d) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const preset = btn.dataset.preset;
    let from;

    if (preset === 'today') {
      from = fmtLocal(now);
    } else if (preset === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      from = fmtLocal(d);
    } else if (preset === 'month') {
      from = fmtLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    }

    const to = fmtLocal(now);
    if (dateFromEl) dateFromEl.value = from;
    if (dateToEl)   dateToEl.value   = to;
    currentDateFrom = from; currentDateTo = to;
    updateClearDateBtn();
    updateDatePresetBtns(preset);
    renderTable();
  });
});

// ─── Service Worker ────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ─── New Booking Notifier ───────────────────────────
let _lastBookingId = 0;
let _notifGranted  = false;

const _beep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.5);
  } catch {
    /* optional */
  }
};

const _showDesktopNotif = (booking) => {
  if (!_notifGranted) return;
  new Notification('🚗 حجز جديد — DR.Care', {
    body: `#${booking.id} • ${booking.name} • ${booking.package_name} • ${booking.total_price?.toLocaleString('ar-EG')} جنيه`,
    icon: '/icons/icon-192.png',
    dir: 'rtl', lang: 'ar', tag: 'drcare-new-booking'
  });
};

const _updateTabTitle = (count) => {
  document.title = count > 0 ? `(${count}) DR.Care | لوحة الإدارة` : 'DR.Care | لوحة الإدارة';
};

const startBookingPoller = () => {
  if ('Notification' in window && Notification.permission === 'granted') _notifGranted = true;
  else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => { _notifGranted = p === 'granted'; });
  }

  let newCount = 0;

  const poll = async () => {
    try {
      const res  = await fetch('api/bookings.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const bookings = data.bookings || [];
      if (!bookings.length) return;

      const latestId = Number(bookings[0].id);

      if (_lastBookingId === 0) {
        /* First load — just set baseline */
        _lastBookingId = latestId;
        return;
      }

      const newer = bookings.filter(b => Number(b.id) > _lastBookingId && b.status === 'new');
      if (newer.length > 0) {
        newCount += newer.length;
        _lastBookingId = latestId;
        _beep();
        newer.forEach(_showDesktopNotif);
        _updateTabTitle(newCount);
        showToast(`🚗 ${newer.length > 1 ? newer.length + ' حجوزات جديدة' : 'حجز جديد — ' + newer[0].name}`, 'success');
        await fetchBookings();
      }
    } catch {
    /* optional */
  }
  };

  poll(); /* run immediately on start so baseline is set right away */
  setInterval(poll, 30000);

  /* Reset badge when user focuses the tab */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { newCount = 0; _updateTabTitle(0); }
  });
};

// ─── Session Check ────────────────────────────────
const checkAdminSession = async () => {
  try {
    const response = await fetch('api/admin-login.php?action=check', {
      credentials: 'same-origin'
    });
    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = 'login.html';
      return;
    }

    const usernameEl = document.getElementById('adminUsername');
    const chipEl     = document.getElementById('adminChip');
    if (usernameEl) usernameEl.textContent = data.username || '';
    if (chipEl)     chipEl.style.display   = 'inline-flex';

    await fetchBookings();
  } catch (error) {
    showToast('خطأ في التحقق من الجلسة: ' + error.message, 'error');
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('api/admin-login.php', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      }).catch(() => {});
      window.location.href = 'login.html';
    });
  }

  /* compact mode toggle */
  document.getElementById('compactMode')?.addEventListener('change', renderTable);

  await fetchAdminCsrf();
  await checkAdminSession();
  startBookingPoller();

  /* ── Charts panel ── */
  const chartsPanel   = document.getElementById('chartsPanel');
  const toggleChartsBtn = document.getElementById('toggleChartsBtn');
  let chartsVisible   = false;
  toggleChartsBtn?.addEventListener('click', () => {
    chartsVisible = !chartsVisible;
    if (chartsPanel) chartsPanel.style.display = chartsVisible ? '' : 'none';
    if (chartsVisible) renderCharts(allBookings);
    toggleChartsBtn.classList.toggle('panel-active', chartsVisible);
  });

  /* ── Customers panel ── */
  const customersPanel    = document.getElementById('customersPanel');
  const toggleCustomersBtn= document.getElementById('toggleCustomersBtn');
  let customersVisible    = false;
  let allCustomers        = [];

  const renderCustomersTable = (list) => {
    const tbody = document.getElementById('customersBody');
    const countEl = document.getElementById('customerCount');
    if (countEl) countEl.textContent = `${list.length} عميل`;
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="table-empty"><span>👥</span><p>لا يوجد عملاء</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(c => {
      const initials = (c.name || '—').charAt(0).toUpperCase();
      const waPhone  = (c.phone || '').replace(/[^0-9]/g, '');
      const waLink   = waPhone ? `https://wa.me/2${waPhone}` : null;
      const joined   = c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'short' }) : '—';
      return `
        <tr>
          <td style="display:flex;align-items:center;gap:10px">
            <div style="width:34px;height:34px;border-radius:50%;background:var(--yellow);color:#0a0800;font-weight:900;display:grid;place-items:center;font-size:.85rem;flex-shrink:0">${escapeHtml(initials)}</div>
            <strong>${escapeHtml(c.name || '—')}</strong>
          </td>
          <td><a href="mailto:${escapeHtml(c.email)}" style="color:var(--muted)">${escapeHtml(c.email)}</a></td>
          <td>${escapeHtml(c.phone || '—')}</td>
          <td style="font-weight:800;color:var(--yellow)">${c.booking_count || 0}</td>
          <td style="font-weight:700">${formatPrice(c.total_spent || 0)}</td>
          <td style="color:var(--muted)">${joined}</td>
          <td>
            ${waLink ? `<a href="${waLink}" target="_blank" rel="noreferrer" class="details-btn" style="background:rgba(37,211,102,.12);color:#25d366;border-color:rgba(37,211,102,.3)">واتساب</a>` : '—'}
          </td>
        </tr>`;
    }).join('');
  };

  const fetchCustomers = async () => {
    const res  = await fetch('api/customers.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    allCustomers = data.customers || [];
    renderCustomersTable(allCustomers);
  };

  toggleCustomersBtn?.addEventListener('click', () => {
    customersVisible = !customersVisible;
    if (customersPanel) customersPanel.style.display = customersVisible ? '' : 'none';
    toggleCustomersBtn.classList.toggle('panel-active', customersVisible);
    if (customersVisible) fetchCustomers();
  });

  document.getElementById('customerSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderCustomersTable(q ? allCustomers.filter(c =>
      (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q)
    ) : allCustomers);
  });

  /* ── Coupons ── */
  const couponsPanel     = document.getElementById('couponsPanel');
  const bookingsTable    = document.querySelector('.table-wrap');
  const toggleCouponsBtn = document.getElementById('toggleCouponsBtn');
  const couponCreateForm = document.getElementById('couponCreateForm');
  const showCouponFormBtn= document.getElementById('showCouponFormBtn');
  const cancelCouponFormBtn = document.getElementById('cancelCouponFormBtn');
  const createCouponBtn  = document.getElementById('createCouponBtn');
  const couponFormMsg    = document.getElementById('couponFormMsg');

  let couponsVisible = false;

  const fetchCoupons = async () => {
    const res  = await fetch('api/coupons.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    const tbody = document.getElementById('couponsBody');
    if (!tbody) return;
    const list = data.coupons || [];
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="table-empty"><span>🎫</span><p>لا توجد كوبونات</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(c => {
      const type    = c.discount_type === 'percent' ? `${c.discount_value}%` : `${c.discount_value} ج`;
      const uses    = c.max_uses ? `${c.used_count} / ${c.max_uses}` : `${c.used_count} / ∞`;
      const expires = c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-EG') : '—';
      const active  = c.is_active ? '<span style="color:var(--success);font-weight:700">نشط</span>' : '<span style="color:var(--error)">متوقف</span>';
      return `
        <tr>
          <td><strong style="font-family:var(--font-en);letter-spacing:.05em">${escapeHtml(c.code)}</strong></td>
          <td>${c.discount_type === 'percent' ? 'نسبة' : 'مبلغ ثابت'}</td>
          <td><strong style="color:var(--yellow)">${type}</strong></td>
          <td>${c.min_order > 0 ? formatPrice(c.min_order) : '—'}</td>
          <td>${uses}</td>
          <td>${expires}</td>
          <td>${active}</td>
          <td style="display:flex;gap:6px">
            <button class="details-btn" data-toggle-coupon="${c.id}" data-active="${c.is_active}">${c.is_active ? 'إيقاف' : 'تفعيل'}</button>
            <button class="details-btn" data-delete-coupon="${c.id}" style="color:var(--error)">حذف</button>
          </td>
        </tr>`;
    }).join('');
  };

  toggleCouponsBtn?.addEventListener('click', () => {
    couponsVisible = !couponsVisible;
    if (couponsPanel)    couponsPanel.style.display    = couponsVisible ? '' : 'none';
    if (bookingsTable)   bookingsTable.style.display   = couponsVisible ? 'none' : '';
    const filterBar = document.querySelector('.filter-bar');
    if (filterBar)       filterBar.style.display       = couponsVisible ? 'none' : '';
    toggleCouponsBtn.classList.toggle('panel-active', couponsVisible);
    if (couponsVisible) fetchCoupons();
  });

  /* ── Reviews ── */
  const reviewsPanel     = document.getElementById('reviewsPanel');
  const toggleReviewsBtn = document.getElementById('toggleReviewsBtn');
  const reviewsBadge     = document.getElementById('reviewsBadge');
  let reviewsVisible     = false;
  let reviewsLoaded      = false;

  const renderStars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  const fetchReviews = async () => {
    const listEl   = document.getElementById('reviewsList');
    const summaryEl= document.getElementById('reviewsSummary');
    if (!listEl) return;
    listEl.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted)">جاري التحميل...</div>';
    try {
      const res  = await fetch('api/reviews.php?admin=1', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { listEl.innerHTML = '<div style="padding:24px;color:var(--error)">فشل تحميل التقييمات</div>'; return; }
      const reviews = data.reviews || [];
      reviewsLoaded = true;

      if (summaryEl) {
        const avg = reviews.length ? (reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length).toFixed(1) : '—';
        summaryEl.textContent = reviews.length ? `${reviews.length} تقييم — متوسط ${avg} ★` : 'لا توجد تقييمات';
      }
      if (reviewsBadge) { reviewsBadge.textContent = reviews.length; reviewsBadge.style.display = reviews.length ? '' : 'none'; }

      if (!reviews.length) {
        listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);font-size:.9rem"><span style="font-size:2rem;display:block;margin-bottom:8px">⭐</span>لا توجد تقييمات حتى الآن</div>';
        return;
      }

      listEl.innerHTML = reviews.map(r => `
        <div style="background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:18px 20px" data-review-id="${r.id}">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">
            <div>
              <span style="color:var(--yellow);font-size:1.1rem;letter-spacing:2px">${renderStars(Number(r.rating))}</span>
              <span style="font-size:.75rem;color:var(--muted);margin-right:8px">${r.rating}/5</span>
            </div>
            <div style="font-size:.75rem;color:var(--muted);text-align:left">
              <strong style="color:var(--white)">${escapeHtml(r.customer_name || '—')}</strong> ·
              ${escapeHtml(r.package_name || '')} · ${escapeHtml(r.branch || '')} ·
              ${r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' }) : ''}
            </div>
          </div>
          ${r.comment ? `<p style="font-size:.88rem;color:var(--muted);margin-bottom:12px;line-height:1.65">${escapeHtml(r.comment)}</p>` : '<p style="font-size:.82rem;color:var(--muted-2);margin-bottom:12px;font-style:italic">بدون تعليق</p>'}
          ${r.admin_reply ? `
            <div style="background:rgba(255,210,31,.06);border:1px solid var(--yellow-line);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:10px;font-size:.82rem;color:var(--muted)">
              <strong style="color:var(--yellow);display:block;margin-bottom:4px">رد الإدارة:</strong>
              ${escapeHtml(r.admin_reply)}
            </div>` : ''}
          <div style="display:flex;gap:8px;align-items:flex-start">
            <textarea class="search-input review-reply-input" data-review-id="${r.id}" rows="2" placeholder="اكتب رد الإدارة..." style="flex:1;resize:vertical;min-height:60px;font-family:inherit;font-size:.82rem;padding:8px 12px">${escapeHtml(r.admin_reply || '')}</textarea>
            <button class="details-btn review-reply-save" data-review-id="${r.id}" style="align-self:flex-end;white-space:nowrap">حفظ الرد</button>
          </div>
        </div>`).join('');
    } catch {
      listEl.innerHTML = '<div style="padding:24px;color:var(--error)">خطأ في الاتصال</div>';
    }
  };

  toggleReviewsBtn?.addEventListener('click', () => {
    reviewsVisible = !reviewsVisible;
    if (reviewsPanel) reviewsPanel.style.display = reviewsVisible ? '' : 'none';
    toggleReviewsBtn.classList.toggle('panel-active', reviewsVisible);
    if (reviewsVisible && !reviewsLoaded) fetchReviews();
  });

  /* Save reply (delegated) */
  document.getElementById('reviewsList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.review-reply-save');
    if (!btn) return;
    const reviewId  = btn.dataset.reviewId;
    const textarea  = document.querySelector(`.review-reply-input[data-review-id="${reviewId}"]`);
    const reply     = textarea?.value.trim() || '';
    btn.disabled    = true; btn.textContent = '...';
    try {
      await fetchAdminCsrf();
      const res  = await adminFetch('api/reviews.php', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(reviewId), reply })
      });
      const data = await res.json().catch(() => ({}));
      showToast(data.ok ? (reply ? '✓ تم حفظ الرد' : '✓ تم حذف الرد') : (data.message || 'فشل الحفظ'), data.ok ? 'success' : 'error');
      if (data.ok) { reviewsLoaded = false; fetchReviews(); }
    } catch { showToast('خطأ في الاتصال', 'error'); }
    finally { btn.disabled = false; btn.textContent = 'حفظ الرد'; }
  });

  /* Anniversary notifications */
  document.getElementById('anniversaryNotifyBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('anniversaryNotifyBtn');
    btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...';
    try {
      await fetchAdminCsrf();
      const res  = await adminFetch('api/anniversary-notify.php', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        showToast(data.sent > 0 ? `🎂 تم إرسال ${data.sent} إشعار ذكرى` : 'لا توجد ذكريات اليوم', 'success');
      } else {
        showToast(data.message || 'فشل الإرسال', 'error');
      }
    } catch { showToast('خطأ في الاتصال', 'error'); }
    finally { btn.disabled = false; btn.textContent = '🎂 ذكريات اليوم'; }
  });

  showCouponFormBtn?.addEventListener('click', () => { if (couponCreateForm) couponCreateForm.style.display = ''; });
  cancelCouponFormBtn?.addEventListener('click', () => { if (couponCreateForm) couponCreateForm.style.display = 'none'; });

  createCouponBtn?.addEventListener('click', async () => {
    const body = {
      action:         'create',
      code:           document.getElementById('cc_code')?.value.trim().toUpperCase(),
      discount_type:  document.getElementById('cc_type')?.value,
      discount_value: document.getElementById('cc_value')?.value,
      min_order:      document.getElementById('cc_min')?.value || 0,
      max_uses:       document.getElementById('cc_max_uses')?.value || null,
      expires_at:     document.getElementById('cc_expires')?.value || null,
    };
    const res  = await fetch('api/coupons.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (couponFormMsg) { couponFormMsg.textContent = data.message || ''; couponFormMsg.style.color = res.ok && data.ok ? 'var(--success)' : 'var(--error)'; }
    if (res.ok && data.ok) { if (couponCreateForm) couponCreateForm.style.display = 'none'; fetchCoupons(); }
  });

  document.getElementById('couponsTable')?.addEventListener('click', async (e) => {
    const toggleBtn = e.target.closest('[data-toggle-coupon]');
    const deleteBtn = e.target.closest('[data-delete-coupon]');

    if (toggleBtn) {
      const id     = toggleBtn.dataset.toggleCoupon;
      const active = toggleBtn.dataset.active === '1' ? 0 : 1;
      await fetch('api/coupons.php', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(id), is_active: active }) });
      fetchCoupons();
    }
    if (deleteBtn && confirm('هل تريد حذف هذا الكوبون؟')) {
      const id = deleteBtn.dataset.deleteCoupon;
      await fetch('api/coupons.php', { method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(id) }) });
      fetchCoupons();
    }
  });

  /* ══════════════════════════════════════════
     SLOTS PANEL
  ══════════════════════════════════════════ */
  const slotsPanel     = document.getElementById('slotsPanel');
  const toggleSlotsBtn = document.getElementById('toggleSlotsBtn');
  let slotsVisible     = false;

  const SLOT_TIMES = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00','18:00'
  ];
  const fmtTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'م' : 'ص'}`;
  };
  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

  /* Build time picker toggle pills */
  const slotTimePicker = document.getElementById('slotTimePicker');
  const updateTimeCount = () => {
    const n   = document.querySelectorAll('.slot-time-pill--active').length;
    const el  = document.getElementById('slotSelectedCount');
    if (!el) return;
    if (n) { el.textContent = n; el.removeAttribute('data-empty'); }
    else   { el.textContent = ''; el.setAttribute('data-empty', ''); }
  };
  if (slotTimePicker) {
    slotTimePicker.innerHTML = SLOT_TIMES.map(t => {
      const [h, m] = t.split(':').map(Number);
      const ampm   = h >= 12 ? 'م' : 'ص';
      const h12    = h % 12 || 12;
      return `<button type="button" class="slot-time-pill" data-time="${t}">
        ${h12}:${String(m).padStart(2,'0')}
        <span class="pill-sub">${ampm}</span>
      </button>`;
    }).join('');
    slotTimePicker.addEventListener('click', e => {
      const pill = e.target.closest('.slot-time-pill');
      if (!pill) return;
      pill.classList.toggle('slot-time-pill--active');
      updateTimeCount();
    });
  }

  /* Stepper */
  document.getElementById('slotDecBtn')?.addEventListener('click', () => {
    const inp  = document.getElementById('slotMaxInput');
    const disp = document.getElementById('slotMaxDisplay');
    const val  = Math.max(1, parseInt(inp.value || '1', 10) - 1);
    inp.value = val; disp.textContent = val;
  });
  document.getElementById('slotIncBtn')?.addEventListener('click', () => {
    const inp  = document.getElementById('slotMaxInput');
    const disp = document.getElementById('slotMaxDisplay');
    const val  = Math.min(20, parseInt(inp.value || '1', 10) + 1);
    inp.value = val; disp.textContent = val;
  });

  const renderSlots = (slots) => {
    const tbody = document.getElementById('slotsBody');
    if (!tbody) return;
    if (!slots.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="table-empty"><span>📅</span><p>لا توجد مواعيد بعد</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = slots.map(s => {
      const full = s.booked_count >= s.max_bookings;
      const pct  = s.max_bookings > 0 ? Math.round((s.booked_count / s.max_bookings) * 100) : 0;
      return `<tr>
        <td>${fmtDate(s.slot_date)}</td>
        <td style="font-family:var(--font-en)">${fmtTime(s.slot_time)}</td>
        <td>
          <span style="font-weight:800;color:${full ? 'var(--error)' : 'var(--success)'}">${s.booked_count}</span>
          <span style="color:var(--muted-2)"> / ${s.max_bookings}</span>
          <div style="margin-top:4px;height:3px;border-radius:2px;background:var(--line);overflow:hidden;width:80px">
            <div style="height:100%;width:${pct}%;background:${full ? 'var(--error)' : 'var(--yellow)'}"></div>
          </div>
        </td>
        <td>${full
          ? '<span class="bk-badge bk-badge--cancelled">مكتمل</span>'
          : '<span class="bk-badge bk-badge--new">متاح</span>'
        }</td>
        <td>
          <button class="bk-view-btn" data-delete-slot="${s.id}"
            style="color:var(--error);border-color:rgba(240,83,62,.25);background:rgba(240,83,62,.06)">حذف</button>
        </td>
      </tr>`;
    }).join('');
  };

  const fetchSlots = async () => {
    try {
      const res  = await adminFetch('api/slots.php?admin=1');
      const data = await res.json().catch(() => ({}));
      renderSlots(data.all_slots || []);
    } catch (_) {}
  };

  toggleSlotsBtn?.addEventListener('click', () => {
    slotsVisible = !slotsVisible;
    if (slotsPanel) slotsPanel.style.display = slotsVisible ? '' : 'none';
    toggleSlotsBtn.classList.toggle('panel-active', slotsVisible);
    if (slotsVisible) fetchSlots();
  });

  document.getElementById('addSlotBtn')?.addEventListener('click', async () => {
    const dateVal = document.getElementById('slotDateInput')?.value;
    const maxVal  = parseInt(document.getElementById('slotMaxInput')?.value || '1', 10);
    const checked = [...document.querySelectorAll('.slot-time-pill--active')].map(p => p.dataset.time);

    if (!dateVal) { showToast('اختار يوم أولاً', 'error'); return; }
    if (!checked.length) { showToast('اختار وقت واحد على الأقل', 'error'); return; }

    const btn = document.getElementById('addSlotBtn');
    btn.disabled = true; btn.innerHTML = '...';
    try {
      await fetchAdminCsrf();
      const res  = await adminFetch('api/slots.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateVal, times: checked, max_bookings: maxVal })
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        showToast(`تمت إضافة ${data.added} موعد`, 'success');
        document.querySelectorAll('.slot-time-pill--active').forEach(p => p.classList.remove('slot-time-pill--active'));
        updateTimeCount();
        fetchSlots();
      } else {
        showToast(data.message || 'خطأ', 'error');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:middle;margin-left:5px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> إضافة مواعيد';
    }
  });

  document.getElementById('slotsTable')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-slot]');
    if (!btn) return;
    if (!confirm('حذف هذا الموعد؟')) return;
    const id = btn.dataset.deleteSlot;
    await adminFetch(`api/slots.php?id=${id}`, { method: 'DELETE' });
    fetchSlots();
  });
});
