/* ============================================
   النسخة التجريبية (عرض فقط) - النواة المشتركة

   بتعترض طلبات fetch لمسار الـ API وبترد عليها من بيانات وهمية متخزنة في
   localStorage عند الزائر نفسه. مفيش سيرفر ولا قاعدة بيانات: كل زائر معاه
   نسخته الخاصة، ومفيش أي حاجة بتتبعت لأي مكان.

   الملف ده مش بيتحمّل في النسخة الحقيقية خالص - بيتحط في index.html بتاع
   النسخة التجريبية بس (demo/inject.mjs). ومفيش أي تعديل على كود الواجهة.
   ============================================ */

function createDemo(cfg) {
  'use strict';

  var pad = function (n) {
    return String(n).padStart(2, '0');
  };

  var H = {
    pad: pad,
    now: function () {
      return Date.now();
    },
    // "YYYY-MM-DD HH:MM:SS" بتوقيت UTC (زي DATETIME من MySQL)
    utc: function (ms) {
      var d = new Date(ms);
      return (
        d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' +
        pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds())
      );
    },
    day: function (ms) {
      return H.utc(ms).slice(0, 10);
    },
    iso: function (ms) {
      return new Date(ms).toISOString();
    },
    // أيام نسبية لـ "النهارده" بتوقيت الزائر (YYYY-MM-DD)
    localDay: function (offset) {
      var d = new Date();
      d.setDate(d.getDate() + (offset || 0));
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    // رقم ثابت 0..999 من نص: عشان البيانات المتولّدة تبقى متكررة مش عشوائية
    hash: function (str) {
      var h = 2166136261;
      str = String(str);
      for (var i = 0; i < str.length; i += 1) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0) % 1000;
    },
    code: function (length, alphabet) {
      alphabet = alphabet || 'abcdefghijklmnopqrstuvwxyz0123456789';
      var out = '';
      for (var i = 0; i < length; i += 1) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      return out;
    },
    ok: function (body, status) {
      return { status: status || 200, body: body };
    },
    seq: function (db, kind) {
      db.seq = db.seq || {};
      db.seq[kind] = (db.seq[kind] || 0) + 1;
      return db.seq[kind];
    },
    clone: function (value) {
      return JSON.parse(JSON.stringify(value));
    },
  };

  var db = null;

  function load() {
    try {
      var raw = localStorage.getItem(cfg.key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.__v === cfg.version) return parsed;
      }
    } catch (e) {
      /* التخزين المحلي مقفول - هنكمّل من الذاكرة */
    }
    return null;
  }

  function save() {
    try {
      localStorage.setItem(cfg.key, JSON.stringify(db));
    } catch (e) {
      /* الكوتا خلصت أو التخزين مقفول - الجلسة الحالية شغّالة من الذاكرة */
    }
  }

  function reset() {
    db = { __v: cfg.version, seq: {} };
    cfg.seed(db, H);
    save();
  }

  db = load();
  if (!db) reset();

  /* ---------- اعتراض fetch ---------- */

  var prefixes = [].concat(cfg.prefix);
  var realFetch = window.fetch.bind(window);

  function matchPrefix(pathname) {
    for (var i = 0; i < prefixes.length; i += 1) {
      var p = prefixes[i];
      if (pathname === p || pathname.indexOf(p + '/') === 0) return pathname.slice(p.length) || '/';
    }
    return null;
  }

  function headerValue(headers, name) {
    if (!headers) return undefined;
    if (typeof headers.get === 'function') return headers.get(name);
    var lower = name.toLowerCase();
    for (var k in headers) if (k.toLowerCase() === lower) return headers[k];
    return undefined;
  }

  window.fetch = function (input, init) {
    var raw = typeof input === 'string' ? input : input && (input.url || input.href);
    var parsed;
    try {
      parsed = new URL(raw, window.location.origin);
    } catch (e) {
      return realFetch(input, init);
    }
    var path = parsed.origin === window.location.origin ? matchPrefix(parsed.pathname) : null;
    if (path === null) return realFetch(input, init);

    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var headers = (init && init.headers) || (input && input.headers) || {};
    var body = null;
    var rawBody = init && init.body;
    if (typeof rawBody === 'string' && rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        body = null;
      }
    }
    var query = {};
    parsed.searchParams.forEach(function (v, k) {
      query[k] = v;
    });

    var result;
    try {
      result = cfg.handle({ method: method, path: path, query: query, body: body, headers: headers, header: function (n) { return headerValue(headers, n); } }, db, H);
      if (!result) result = { status: 404, body: cfg.notFound ? cfg.notFound(path) : { message: 'المسار ده مش موجود في النسخة التجريبية' } };
      save();
    } catch (e) {
      if (window.console) console.error('[demo]', e);
      result = { status: 500, body: cfg.serverError ? cfg.serverError() : { message: 'حصل خطأ في النسخة التجريبية' } };
    }

    return new Promise(function (resolve) {
      setTimeout(function () {
        var h = Object.assign({ 'Content-Type': 'application/json' }, result.headers || {});
        var payload = result.status === 204 ? null : result.raw ? result.body : JSON.stringify(result.body);
        resolve(new Response(payload, { status: result.status, headers: h }));
      }, 40 + Math.floor(Math.random() * 80));
    });
  };

  /* ---------- شريط التجربة ---------- */

  var API = {
    db: function () {
      return db;
    },
    H: H,
    save: save,
    reset: function () {
      try {
        localStorage.removeItem(cfg.key);
      } catch (e) {
        /* لا شيء */
      }
      if (cfg.onReset) cfg.onReset();
      window.location.href = cfg.home || '/';
    },
    go: function (url) {
      save();
      window.location.href = url || cfg.home || '/';
    },
  };

  function mountBar() {
    if (document.getElementById('demo-bar')) return;
    var bar = cfg.bar || {};
    var style = document.createElement('style');
    style.textContent =
      '#demo-bar{position:fixed;left:10px;bottom:10px;z-index:2147483000;font-family:inherit;direction:rtl;font-size:13px;line-height:1.5}' +
      '#demo-bar *{box-sizing:border-box}' +
      '#demo-toggle{display:flex;align-items:center;gap:6px;background:#1c1c24;color:#fff;border:1px solid rgba(255,255,255,.28);' +
      'border-radius:999px;padding:7px 13px;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)}' +
      '#demo-toggle i{width:8px;height:8px;border-radius:50%;background:#f5b93a;display:inline-block}' +
      '#demo-panel{display:none;position:absolute;left:0;bottom:calc(100% + 8px);width:min(290px,calc(100vw - 20px));' +
      'background:#fff;color:#1c1c24;border:1px solid #d6d6dc;border-radius:14px;padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.3)}' +
      '#demo-panel p{margin:0 0 8px;font-size:12.5px;color:#454552}' +
      '#demo-panel button{display:block;width:100%;margin-top:6px;padding:9px 11px;border-radius:10px;border:1px solid #1c1c24;' +
      'background:#fff;color:#1c1c24;font:inherit;font-weight:700;text-align:right;cursor:pointer}' +
      '#demo-panel button.primary{background:#1c1c24;color:#fff}' +
      '#demo-panel small{display:block;margin-top:9px;font-size:11.5px;color:#6a6a78}' +
      // قواعد إضافية خاصة بكل مشروع (رفع الزرار فوق شريط سفلي مثلًا)
      (bar.css || '');
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'demo-bar';
    var actions = (bar.actions || [])
      .map(function (a, i) {
        return '<button type="button" class="' + (a.primary ? 'primary' : '') + '" data-i="' + i + '"></button>';
      })
      .join('');
    wrap.innerHTML =
      '<div id="demo-panel" role="dialog" aria-label="خيارات النسخة التجريبية">' +
      '<p></p>' + actions +
      '<button type="button" data-reset="1">إعادة ضبط البيانات</button><small></small></div>' +
      '<button id="demo-toggle" type="button" aria-expanded="false" aria-controls="demo-panel"><i></i><span></span></button>';
    // بعض الصفحات عليها transform على الـ body، وده بيخلّي position:fixed يتحسب من الصفحة
    // كلها مش من الشاشة — فممكن نركّب الزرار على <html> نفسه
    (bar.mountOnRoot ? document.documentElement : document.body).appendChild(wrap);

    var panel = wrap.querySelector('#demo-panel');
    var toggle = wrap.querySelector('#demo-toggle');
    toggle.querySelector('span').textContent = bar.label || 'نسخة تجريبية';
    panel.querySelector('p').textContent =
      bar.intro || 'ده عرض للتطبيق ببيانات وهمية متخزنة على جهازك بس.';
    panel.querySelector('small').textContent = bar.note || '';
    (bar.actions || []).forEach(function (a, i) {
      panel.querySelector('button[data-i="' + i + '"]').textContent = a.label;
    });

    function setOpen(open) {
      panel.style.display = open ? 'block' : 'none';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    toggle.addEventListener('click', function () {
      setOpen(panel.style.display !== 'block');
    });
    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      if (t.getAttribute('data-reset')) return API.reset();
      var idx = t.getAttribute('data-i');
      if (idx !== null && bar.actions[Number(idx)]) bar.actions[Number(idx)].run(API);
    });
    if (bar.openFirst && !sessionStorage.getItem(cfg.key + ':seen')) {
      try {
        sessionStorage.setItem(cfg.key + ':seen', '1');
      } catch (e) {
        /* لا شيء */
      }
      setOpen(true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBar);
  else mountBar();

  return API;
}
/* ============================================
   DR.Care - الباك إند التجريبي
   مغسلة وهمية كاملة (باقات ومواعيد وحجوزات وعملاء ونقاط وكوبونات وتقييمات
   وموظفين ومصروفات ونقطة بيع) متخزنة في localStorage الزائر.
   الردود مطابقة لملفات api/*.php (الشكل {ok, ...} ونفس رسائل الأخطاء)،
   وحالات الحجز بنفس api/BookingStateMachine.php.
   ============================================ */

(function () {
  'use strict';

  const DEMO_PASSWORD = 'DrCare@2026';
  const POS_TOKEN = '1234';
  const TZ = 'Africa/Cairo';
  const DAY = 86400000;

  /* ---------- الإعدادات (نسخة من api/config.php) ---------- */

  const CONFIG = {
    packages: [
      { code: 'inside-out', name: 'غسيل داخلي وخارجي', price: 150 },
      { code: 'outside', name: 'غسيل خارجي فقط', price: 100 },
      { code: 'deep', name: 'غسيل متخصص (Deep Cleaning)', price: 250 },
      { code: 'cover', name: 'غسيل غطاء السيارة', price: 50 },
      { code: 'rims', name: 'غسيل وتنظيف جنوط السيارة', price: 100 },
      { code: 'engine', name: 'غسيل موتور السيارة', price: 100 },
      { code: 'chemical', name: 'الغسيل الكيماوي', price: 0 },
      { code: 'carpet', name: 'غسيل سجاد', price: 0 },
      { code: 'blanket', name: 'غسيل بطاطين', price: 80 },
    ],
    carTypes: [
      { code: 'sedan', name: 'سيدان', extra: 0 },
      { code: 'suv', name: 'SUV', extra: 60 },
      { code: 'van', name: 'فان', extra: 90 },
      { code: 'pickup', name: 'نقل خفيف', extra: 120 },
    ],
    expenseCategories: ['salaries', 'maids', 'maintenance', 'electricity', 'rent', 'other'],
    branches: ['قليوب — شارع العروبة'],
    paymentMethods: ['كاش', 'Instapay'],
    instapayNumber: '01037957593',
  };

  const STATES = ['new', 'confirmed', 'in_service', 'completed', 'cancelled'];
  const TRANSITIONS = {
    new: { confirmed: ['admin', 'pos'], cancelled: ['admin', 'pos', 'customer'] },
    confirmed: { in_service: ['admin', 'pos'], cancelled: ['admin', 'pos', 'customer'] },
    in_service: { completed: ['admin', 'pos'], cancelled: ['admin', 'pos'] },
    completed: {},
    cancelled: {},
  };
  const canTransition = (from, to, actor) => from === to || Boolean(TRANSITIONS[from] && TRANSITIONS[from][to] && TRANSITIONS[from][to].indexOf(actor) >= 0);

  const REWARDS = [
    { id: 'r25', points: 25, type: 'percent', value: 5, label: 'خصم 5%', desc: 'صالح على أي باقة' },
    { id: 'r50', points: 50, type: 'percent', value: 10, label: 'خصم 10%', desc: 'صالح على أي باقة' },
    { id: 'r100', points: 100, type: 'percent', value: 20, label: 'خصم 20%', desc: 'صالح على أي باقة' },
    { id: 'r200', points: 200, type: 'fixed', value: 100, label: 'خصم 100 جنيه', desc: 'خصم مبلغ ثابت على الحجز' },
  ];

  // إيصال Instapay تجريبي (صورة صغيرة بدل الصورة الحقيقية)
  const RECEIPT_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480"><rect width="360" height="480" fill="#f4f1ea"/>' +
    '<rect x="24" y="24" width="312" height="432" rx="14" fill="#fff" stroke="#d9d3c4"/><text x="180" y="92" font-family="sans-serif" font-size="26" font-weight="700" text-anchor="middle" fill="#5b2d8e">InstaPay</text>' +
    '<text x="180" y="150" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#333">تم التحويل بنجاح</text><text x="180" y="220" font-family="sans-serif" font-size="34" font-weight="700" text-anchor="middle" fill="#111">إيصال تجريبي</text>' +
    '<text x="180" y="290" font-family="sans-serif" font-size="15" text-anchor="middle" fill="#666">صورة وهمية للنسخة التجريبية</text><text x="180" y="400" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#999">DR.Care demo</text></svg>');

  /* ---------- مساعدات ---------- */

  let H = null;
  const seq = (db, kind) => H.seq(db, kind);
  const pad = (n) => String(n).padStart(2, '0');
  const nowIso = () => new Date().toISOString();
  function cairoParts(date) {
    const parts = {};
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(date || new Date()).forEach((p) => { parts[p.type] = p.value; });
      return { date: parts.year + '-' + parts.month + '-' + parts.day, time: parts.hour + ':' + parts.minute };
    } catch (e) {
      const d = date || new Date();
      return { date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), time: pad(d.getHours()) + ':' + pad(d.getMinutes()) };
    }
  }
  const today = () => cairoParts().date;
  const localDateOf = (iso) => cairoParts(new Date(iso)).date;
  const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
  // لحظة (ISO بتوقيت UTC) لساعة محلية في القاهرة — مصر +2 أو +3 حسب التوقيت الصيفي
  function cairoInstant(day, time) {
    for (const offset of [3, 2]) {
      const guess = new Date(Date.parse(day + 'T' + time + ':00Z') - offset * 3600000);
      const back = cairoParts(guess);
      if (back.date === day && back.time === time) return guess.toISOString();
    }
    return new Date(Date.parse(day + 'T' + time + ':00Z') - 2 * 3600000).toISOString();
  }
  const ok = (body, status) => ({ status: status || 200, body: Object.assign({ ok: true }, body || {}) });
  const fail = (status, message, extra) => ({ status, body: Object.assign({ ok: false, message }, extra || {}) });
  const NAME_RE = /^[\p{L}\s]{2,80}$/u;
  const PHONE_RE = /^01[0125][0-9]{8}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PLATE_RE = /^[\p{L}\p{N}\s\-]{1,20}$/u;
  const APPT_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;
  const hex = (n) => { let s = ''; for (let i = 0; i < n; i += 1) s += Math.floor(Math.random() * 16).toString(16); return s; };
  const str = (v) => (v === undefined || v === null ? '' : String(v)).trim();
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const round2 = (v) => Math.round(v * 100) / 100;
  const findById = (list, id) => list.find((x) => x.id === Number(id)) || null;
  const carOf = (code) => CONFIG.carTypes.find((c) => c.code === code) || null;
  const activePackage = (db, code) => db.packages.find((p) => p.code === code && p.is_active) || null;
  function referralCode(db) {
    let code;
    do { code = hex(8).toUpperCase(); } while (db.customers.some((c) => c.referral_code === code));
    return code;
  }
  function logAudit(db, actorType, actorId, action, targetType, targetId, detail) {
    db.audit.push({ id: seq(db, 'audit'), actor_type: actorType, actor_id: actorId, action, target_type: targetType, target_id: targetId, detail: JSON.stringify(detail || {}), created_at: nowIso() });
  }
  function couponUsable(c, at) {
    return c && c.is_active && (!c.expires_at || c.expires_at >= at) && (c.max_uses === null || c.used_count < c.max_uses);
  }
  function couponDiscount(c, total) {
    return c.discount_type === 'percent' ? round2(total * c.discount_value / 100) : Math.min(c.discount_value, total);
  }
  const balanceOf = (db, customerId) => sum(db.loyalty.filter((l) => l.customer_id === customerId).map((l) => l.points));

  /* ---------- آثار تغيير الحالة (نقاط الولاء ومكافأة الإحالة) ---------- */

  function rewardReferral(db, customerId) {
    const ref = db.referrals.find((r) => r.referred_id === customerId && !r.rewarded);
    if (!ref) return;
    const at = nowIso();
    db.loyalty.push({ id: seq(db, 'loyalty'), customer_id: ref.referrer_id, points: 50, source: 'referral', booking_id: null, note: 'مكافأة إحالة صديق', created_at: at });
    db.loyalty.push({ id: seq(db, 'loyalty'), customer_id: customerId, points: 25, source: 'referral', booking_id: null, note: 'مكافأة الانضمام بإحالة', created_at: at });
    ref.rewarded = 1;
  }
  function applySideEffects(db, booking, from, to, at) {
    if (from === to || to !== 'completed' || !booking.customer_id) return;
    if (!db.loyalty.some((l) => l.booking_id === booking.id && l.source === 'booking')) {
      db.loyalty.push({ id: seq(db, 'loyalty'), customer_id: booking.customer_id, points: Math.max(5, Math.floor(booking.total_price / 10)), source: 'booking', booking_id: booking.id, note: 'حجز مكتمل: ' + booking.package_name, created_at: at || nowIso() });
    }
    rewardReferral(db, booking.customer_id);
  }
  function setStatus(db, booking, to) {
    const from = booking.status;
    booking.status = to;
    if (to === 'completed' || to === 'cancelled') booking.payment_screenshot = null;
    if (to === 'cancelled' && from !== 'cancelled') releaseSlot(db, booking);
    applySideEffects(db, booking, from, to);
  }
  function slotOf(db, appointment) {
    const m = APPT_RE.exec(appointment || '');
    return m ? db.slots.find((s) => s.slot_date === m[1] && s.slot_time === m[2]) || null : null;
  }
  function releaseSlot(db, booking) {
    const slot = slotOf(db, booking.appointment);
    if (slot && slot.booked_count > 0) slot.booked_count -= 1;
  }

  /* ---------- بيانات البداية ---------- */

  function seed(db, h) {
    H = h;
    const T = today();
    const nowMs = Date.now();
    ['packages', 'admins', 'customers', 'bookings', 'slots', 'reviews', 'coupons', 'referrals', 'loyalty', 'expenses', 'staff', 'payroll', 'audit', 'resets'].forEach((k) => { db[k] = []; });
    db.session = { customerId: null, adminId: null };
    const hash = (k) => H.hash(k);
    const pick = (arr, key) => arr[hash(key) % arr.length];
    const startAt = cairoInstant(addDays(T, -120), '10:00');

    CONFIG.packages.forEach((p, i) => db.packages.push({ id: seq(db, 'package'), code: p.code, name: p.name, price: p.price, is_active: 1, sort_order: i, created_at: startAt }));
    db.admins.push({ id: 1, username: 'admin', email: 'admin@drcare.demo', password: DEMO_PASSWORD, created_at: startAt, last_login: cairoInstant(addDays(T, -1), '21:10'), is_active: 1 });

    /* العملاء */
    const people = [
      ['كريم سامي', 'karim'], ['محمد عبد الرحمن', 'mohamed'], ['أحمد فتحي', 'ahmed'], ['مصطفى حسن', 'mostafa'], ['يوسف شريف', 'youssef'],
      ['عمر خالد', 'omar'], ['هاني جمال', 'hany'], ['إسلام رضا', 'eslam'], ['محمود السيد', 'mahmoud'], ['ريهام عادل', 'reham'],
      ['نورهان مجدي', 'nourhan'], ['شادي ماهر', 'shady'], ['طارق عزت', 'tarek'], ['بسمة فؤاد', 'basma'],
    ];
    const plates = ['ق ب ر 4721', 'م ط ع 3158', 'س ن د 9024', 'ر ه ج 6610', 'ل و ص 2387', 'ب ط م 7745', 'ع ف ق 1932', 'ن ر س 5506', 'د ل ي 8813', 'ه س ب 4402', 'ج ص ن 3079', 'ف ع ل 6624', 'ي م ق 1188', 'ص د ر 9351'];
    people.forEach((p, i) => {
      const joined = addDays(T, -110 + i * 6);
      db.customers.push({
        id: seq(db, 'customer'), email: p[1] + '@drcare.demo', phone: '010' + String(20480000 + i * 3571 + hash(p[1]) * 7).slice(0, 8), name: p[0],
        password: DEMO_PASSWORD, created_at: cairoInstant(joined, pad(10 + (i % 9)) + ':15'), last_login: cairoInstant(addDays(T, -(i % 6)), pad(9 + (i % 12)) + ':40'),
        is_active: 1, email_verified: 1, referral_code: (p[1].slice(0, 4) + hex(4)).toUpperCase(), referred_by_id: null,
        notes: null, car_type: pick(['سيدان', 'SUV', 'فان'], p[1]), car_color: pick(['أبيض', 'فضي', 'أسود', 'رمادي', 'أحمر'], p[1] + 'c'), car_plate: plates[i], source: 'web',
      });
    });
    const karim = db.customers[0];
    karim.referral_code = 'KARIM2026';
    const omar = db.customers.find((c) => c.name === 'عمر خالد');
    omar.referred_by_id = karim.id;
    db.referrals.push({ id: seq(db, 'referral'), referrer_id: karim.id, referred_id: omar.id, rewarded: 0, created_at: omar.created_at });
    const walkin = { id: seq(db, 'customer'), email: 'walkin_' + nowMs + '@drcare.local', phone: '01155550123', name: 'حسين عبد الله', password: hex(16), created_at: cairoInstant(addDays(T, -30), '12:00'), last_login: null, is_active: 1, email_verified: 0, referral_code: null, referred_by_id: null, notes: 'عميل دايم، بيحب الغسيل الكيماوي للفرش', car_type: 'SUV', car_color: 'أسود', car_plate: 'ط ق ع 5520', source: 'admin' };
    db.customers.push(walkin);

    /* الموظفين */
    [['سيد عبد العال', 'مشرف الغسيل', 6500], ['حمادة رمضان', 'عامل غسيل', 4500], ['إبراهيم ناجي', 'عامل غسيل', 4500], ['مينا جرجس', 'تلميع وتنظيف داخلي', 5000], ['أمل حسين', 'كاشير', 4800], ['عادل منير', 'عامل غسيل', 4200]].forEach((s, i) => {
      db.staff.push({ id: seq(db, 'staff'), name: s[0], phone: '0122' + String(3140000 + i * 1117).slice(0, 7), role: s[1], salary: s[2], is_active: i === 5 ? 0 : 1, created_at: cairoInstant(addDays(T, -118 + i), '09:00') });
    });
    const activeStaff = db.staff.filter((s) => s.is_active);

    /* الكوبونات */
    const coupon = (o) => db.coupons.push(Object.assign({ id: seq(db, 'coupon'), min_order: 0, max_uses: null, used_count: 0, expires_at: null, is_active: 1, created_at: startAt }, o));
    coupon({ code: 'WELCOME10', discount_type: 'percent', discount_value: 10, max_uses: 100, used_count: 0, expires_at: addDays(T, 60) + ' 23:59:59' });
    coupon({ code: 'FRIDAY50', discount_type: 'fixed', discount_value: 50, min_order: 200, used_count: 0 });
    coupon({ code: 'SUMMER25', discount_type: 'percent', discount_value: 25, used_count: 0, expires_at: addDays(T, -20) + ' 23:59:59' });
    coupon({ code: 'VIP100', discount_type: 'fixed', discount_value: 100, min_order: 300, max_uses: 10, used_count: 10, is_active: 0 });

    /* المواعيد: الأسبوع الجاي، كل ساعة، عربيتين في الساعة */
    const TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    for (let i = 0; i <= 6; i += 1) {
      const d = addDays(T, i);
      TIMES.forEach((t) => db.slots.push({ id: seq(db, 'slot'), slot_date: d, slot_time: t, max_bookings: 2, booked_count: 0, is_active: 1, created_at: startAt }));
    }

    /* الحجوزات */
    const weighted = ['inside-out', 'inside-out', 'inside-out', 'outside', 'outside', 'deep', 'rims', 'engine', 'cover', 'blanket', 'chemical'];
    const cars = ['sedan', 'sedan', 'sedan', 'suv', 'suv', 'van', 'pickup'];
    const walkNames = ['علي حسن', 'سامح كمال', 'وليد أنور', 'تامر صبري', 'حازم عاطف', 'رامي نبيل', 'أيمن فوزي', 'خالد عبده', 'جمال الدين محمود', 'أسامة لطفي', 'باسم يحيى', 'عصام رشدي'];
    const booking = (o) => {
      const pkg = db.packages.find((p) => p.code === o.package_code);
      const car = carOf(o.car_type_code);
      const base = pkg.price + car.extra;
      let discount = 0;
      let note = null;
      if (o.coupon) {
        const c = db.coupons.find((x) => x.code === o.coupon);
        discount = couponDiscount(c, base);
        note = 'كوبون: ' + o.coupon;
        c.used_count += 1;
      }
      const b = Object.assign({
        id: seq(db, 'booking'), email: null, notes: null, plate_number: null, appointment: null, customer_id: null, source: 'web',
        payment_status: 'pending', claim_token: null, payment_screenshot: null, admin_notes: null, pos_staff_id: null, branch: CONFIG.branches[0],
      }, o, {
        package_name: pkg.name, car_type_name: car.name, pkg_price: pkg.price, car_extra_price: car.extra,
        discount_amount: discount, discount_note: note, total_price: Math.max(0, base - discount),
      });
      delete b.coupon;
      db.bookings.push(b);
      if (b.appointment && b.status !== 'cancelled') { const s = slotOf(db, b.appointment); if (s) s.booked_count += 1; }
      return b;
    };
    const registered = db.customers.filter((c) => c.source === 'web');
    // التاريخ من أول الشهر اللي فات (عشان تقارير الشهر والأرباح تطلع كاملة)
    const firstBack = Math.round((Date.parse(T + 'T00:00:00Z') - Date.parse(addDays(T.slice(0, 7) + '-01', -1).slice(0, 7) + '-01T00:00:00Z')) / DAY);
    for (let back = firstBack; back >= -6; back -= 1) {
      const d = addDays(T, -back);
      const k = (x) => d + ':' + x;
      if (back > 0) {
        const count = 9 + (hash(k('n')) % 7); // 9 – 15 عربية في اليوم
        for (let i = 0; i < count; i += 1) {
          const key = k(i);
          const pos = hash(key + 'src') % 10 < 6;
          const cust = !pos || hash(key + 'cl') % 4 === 0 ? registered[hash(key + 'who') % registered.length] : null;
          const time = pad(10 + (hash(key + 'h') % 10)) + ':' + pick(['00', '15', '30', '45'], key + 'm');
          const cancelled = hash(key + 'x') % 100 < 10;
          const pm = pos ? pick(['كاش', 'كاش', 'كاش', 'Instapay'], key + 'pm') : pick(['كاش', 'Instapay'], key + 'pm');
          booking({
            name: cust ? cust.name : walkNames[hash(key + 'wn') % walkNames.length], phone: cust ? cust.phone : '011' + String(40000000 + hash(key + 'ph') * 9973).slice(0, 8),
            email: cust ? cust.email : null, package_code: pick(weighted, key + 'p'), car_type_code: pick(cars, key + 'c'),
            plate_number: cust ? cust.car_plate : pick(plates, key + 'pl'), payment_method: pm, status: cancelled ? 'cancelled' : 'completed',
            payment_status: cancelled ? 'pending' : 'paid', customer_id: cust ? cust.id : null, source: pos ? 'pos' : 'web',
            appointment: pos ? null : d + 'T' + pick(TIMES, key + 't'), created_at: cairoInstant(pos ? d : addDays(d, -(hash(key + 'ad') % 3)), time),
            pos_staff_id: pos ? activeStaff[hash(key + 'st') % activeStaff.length].id : null,
            claim_token: pos && !cust ? hex(32) : null, coupon: hash(key + 'cp') % 9 === 0 ? 'WELCOME10' : hash(key + 'cp') % 13 === 0 && pos ? null : null,
          });
        }
      } else if (back === 0) {
        // النهارده: اتسلّم، بيتغسل، مؤكد، وجديد مستني تأكيد
        const nowT = cairoParts().time;
        const minus = (t, m) => { const x = Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) - m; return x < 0 ? '00:00' : pad(Math.floor(x / 60)) + ':' + pad(x % 60); };
        const done = ['09:10', '09:40', '10:15', '10:50', '11:30', '12:05', '12:45', '13:20', '14:00', '14:40', '15:20', '16:00', '16:45', '17:30', '18:15', '19:00', '19:45', '20:30']
          .filter((t) => t < minus(nowT, 45)).map((t) => ['completed', t, 'pos']);
        const plan = done.concat([['in_service', nowT > '09:30' ? minus(nowT, 25) : '09:05', 'pos'], ['confirmed', '17:00', 'web'], ['confirmed', '18:00', 'web'], ['new', '19:00', 'web']]);
        plan.forEach((p, i) => {
          const key = k('t' + i);
          const cust = p[2] === 'web' ? registered[(i + 3) % registered.length] : null;
          const createdTime = p[2] === 'pos' ? p[1] : '08:1' + (i % 10);
          booking({
            name: cust ? cust.name : walkNames[i % walkNames.length], phone: cust ? cust.phone : '011' + String(52000000 + i * 4111).slice(0, 8), email: cust ? cust.email : null,
            package_code: pick(weighted, key + 'p'), car_type_code: pick(cars, key + 'c'), plate_number: cust ? cust.car_plate : plates[(i + 5) % plates.length],
            payment_method: p[0] === 'new' ? 'Instapay' : 'كاش', status: p[0], payment_status: p[0] === 'completed' ? 'paid' : 'pending',
            customer_id: cust ? cust.id : null, source: p[2], appointment: p[2] === 'web' ? d + 'T' + p[1] : null,
            created_at: cairoInstant(p[2] === 'web' ? addDays(d, -1) : d, createdTime),
            pos_staff_id: p[2] === 'pos' ? activeStaff[i % activeStaff.length].id : null, claim_token: p[2] === 'pos' ? hex(32) : null,
            payment_screenshot: p[0] === 'new' ? RECEIPT_IMG : null, notes: i === plan.length - 2 ? 'لو ينفع تلميع للفوانيس كمان' : null,
          });
        });
      } else {
        const count = 1 + (hash(k('f')) % 3);
        for (let i = 0; i < count; i += 1) {
          const key = k('f' + i);
          const cust = registered[hash(key + 'who') % registered.length];
          booking({
            name: cust.name, phone: cust.phone, email: cust.email, package_code: pick(weighted, key + 'p'), car_type_code: pick(cars, key + 'c'),
            plate_number: cust.car_plate, payment_method: 'كاش', status: hash(key + 's') % 2 ? 'confirmed' : 'new', customer_id: cust.id, source: 'web',
            appointment: d + 'T' + TIMES[(hash(key + 't') + i * 3) % TIMES.length], created_at: cairoInstant(addDays(T, -(hash(key + 'ad') % 3)), '1' + (i % 10) + ':2' + i),
          });
        }
      }
    }
    // تاريخ كريم: حجوزات مكتملة وملغي وواحد جاي، وحجز من الكاشير لسه ما اتربطش بحسابه
    [[-38, 'deep', 'completed'], [-24, 'inside-out', 'completed'], [-17, 'rims', 'cancelled'], [-10, 'inside-out', 'completed'], [-4, 'engine', 'completed']].forEach((x, i) => {
      booking({ name: karim.name, phone: karim.phone, email: karim.email, package_code: x[1], car_type_code: 'suv', plate_number: karim.car_plate, payment_method: i % 2 ? 'Instapay' : 'كاش', status: x[2], payment_status: x[2] === 'completed' ? 'paid' : 'pending', customer_id: karim.id, source: 'web', appointment: addDays(T, x[0]) + 'T12:00', created_at: cairoInstant(addDays(T, x[0] - 1), '20:30'), coupon: i === 3 ? 'WELCOME10' : null });
    });
    booking({ name: karim.name, phone: karim.phone, email: karim.email, package_code: 'inside-out', car_type_code: 'suv', plate_number: karim.car_plate, payment_method: 'كاش', status: 'confirmed', customer_id: karim.id, source: 'web', appointment: addDays(T, 2) + 'T16:00', created_at: cairoInstant(addDays(T, -1), '22:05'), notes: 'الكرسي الخلفي محتاج اهتمام' });
    db.claimToken = hex(32);
    booking({ name: karim.name, phone: karim.phone, package_code: 'outside', car_type_code: 'suv', plate_number: karim.car_plate, payment_method: 'كاش', status: 'completed', payment_status: 'paid', source: 'pos', created_at: cairoInstant(addDays(T, -2), '13:20'), pos_staff_id: activeStaff[4].id, claim_token: db.claimToken });
    // عمر (اللي كريم دعاه) خلّص أول حجز ← مكافأة الإحالة
    const omarFirst = booking({ name: omar.name, phone: omar.phone, email: omar.email, package_code: 'inside-out', car_type_code: 'sedan', plate_number: omar.car_plate, payment_method: 'كاش', status: 'in_service', customer_id: omar.id, source: 'web', appointment: addDays(T, -6) + 'T11:00', created_at: cairoInstant(addDays(T, -7), '19:00') });

    db.bookings.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    db.bookings.forEach((b, i) => { b.id = i + 1; });
    db.seq.booking = db.bookings.length;

    // نقاط الولاء للحجوزات المكتملة + الإحالة
    db.bookings.filter((b) => b.status === 'completed' && b.customer_id).forEach((b) => applySideEffects(db, b, 'in_service', 'completed', addDays(localDateOf(b.created_at), 0) + 'T18:00:00.000Z'));
    setStatus(db, omarFirst, 'completed');
    omarFirst.payment_status = 'paid';
    coupon({ code: 'REWARD-K4R1M025', discount_type: 'percent', discount_value: 5, max_uses: 1, used_count: 0, expires_at: addDays(T, 24) + ' 23:59:59', created_at: cairoInstant(addDays(T, -6), '21:00') });
    db.loyalty.push({ id: seq(db, 'loyalty'), customer_id: karim.id, points: -25, source: 'redemption', booking_id: null, note: 'استرداد: خصم 5%', created_at: cairoInstant(addDays(T, -6), '21:00') });

    /* التقييمات */
    const comments = [
      [5, 'شغل ممتاز والعربية رجعت كأنها جديدة. تسلم إيديكم'], [5, 'أحسن مغسلة في قليوب بصراحة، والمواعيد مظبوطة'], [4, 'الغسيل كويس جدًا بس الانتظار طوّل شوية'],
      [5, 'التنظيف الداخلي فرق جامد، والريحة حلوة'], [5, 'تعامل محترم وسعر معقول'], [4, 'كويس، بس ياريت تزودوا مواعيد بالليل'],
      [5, 'الجنوط بقت بتلمع، شكرًا يا رجالة'], [3, 'الخدمة كويسة بس فيه مية فضلت على الزجاج'], [5, 'الحجز من الموبايل سهل جدًا ووصلتني رسالة التأكيد'],
      [5, 'غسيل الموتور اتعمل باحترافية'], [4, 'حلو، هرجع تاني أكيد'], [5, 'أسرع غسيل عملته، ربع ساعة وخلصت'],
      [5, 'ناس محترمة ومواعيدهم مظبوطة'], [4, 'السعر كويس مقارنة باللي حواليه'], [5, 'الغسيل المتخصص يستاهل كل جنيه'],
    ];
    const replies = ['منوّرنا دايمًا', 'شكرًا على ملاحظتك، هنزوّد مواعيد بالليل من الشهر الجاي', 'آسفين على التأخير، بنزوّد عمالة في أوقات الزحمة', 'شكرًا لكلامك الحلو'];
    const completed = db.bookings.filter((b) => b.status === 'completed' && b.customer_id && localDateOf(b.created_at) < T);
    comments.forEach((c, i) => {
      const b = completed[(i * 7) % completed.length];
      if (db.reviews.some((r) => r.booking_id === b.id)) return;
      const at = cairoInstant(addDays(localDateOf(b.created_at), 1), '21:' + pad(i * 3));
      const reply = i % 4 === 2 || i === 7 ? replies[i % replies.length] : null;
      db.reviews.push({ id: seq(db, 'review'), booking_id: b.id, customer_id: b.customer_id, rating: c[0], comment: c[1], created_at: at, admin_reply: reply, admin_replied_at: reply ? at : null });
    });

    /* المصروفات + المرتبات */
    const month = T.slice(0, 7);
    const prevMonth = addDays(month + '-01', -1).slice(0, 7);
    const expense = (category, amount, date, note, staffId) => db.expenses.push({ id: seq(db, 'expense'), category, amount, expense_date: date, note: note || null, staff_id: staffId || null, created_by: 1, created_at: cairoInstant(date <= T ? date : T, '15:00') });
    [prevMonth, month].forEach((m, mi) => {
      const day = (n) => m + '-' + pad(n);
      if (mi === 0 || Number(T.slice(8, 10)) >= 1) expense('rent', 9000, day(1), 'إيجار المكان');
      if (mi === 0 || Number(T.slice(8, 10)) >= 5) expense('other', 3200 + mi * 450, day(5), 'شامبو وواكس ومواد تنظيف');
      if (mi === 0 || Number(T.slice(8, 10)) >= 9) expense('electricity', 2350 + mi * 180, day(9), 'فاتورة الكهرباء');
      if (mi === 0 || Number(T.slice(8, 10)) >= 14) expense('maintenance', mi ? 650 : 1800, day(14), mi ? 'تغيير خراطيم' : 'صيانة مضخة الضغط');
      if (mi === 0 || Number(T.slice(8, 10)) >= 20) expense('maids', 1200, day(20), 'تنظيف الاستراحة والحمامات');
      if (mi === 0) activeStaff.forEach((s) => expense('salaries', s.salary, day(28), 'مرتب ' + s.name, s.id));
    });
    // بونص وخصومات
    db.payroll.push({ id: seq(db, 'payroll'), staff_id: activeStaff[0].id, type: 'bonus', amount: 500, note: 'شغل زيادة يوم الجمعة', created_at: cairoInstant(addDays(T, -9), '20:00') });
    db.payroll.push({ id: seq(db, 'payroll'), staff_id: activeStaff[1].id, type: 'deduction', amount: 150, note: 'تأخير يومين', created_at: cairoInstant(addDays(T, -5), '20:00') });
    db.payroll.push({ id: seq(db, 'payroll'), staff_id: activeStaff[3].id, type: 'bonus', amount: 300, note: 'تقييمات العملاء على التلميع', created_at: cairoInstant(addDays(T, -2), '20:00') });
  }

  /* ---------- المسارات ---------- */

  function handle(req, db, h) {
    H = h;
    const file = req.path.replace(/^\/+/, '');
    const q = req.query || {};
    const b = req.body || {};
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    const s = db.session || (db.session = { customerId: null, adminId: null });
    const customer = s.customerId ? db.customers.find((c) => c.id === s.customerId && c.is_active) : null;
    const admin = s.adminId ? findById(db.admins, s.adminId) : null;
    const needAdmin = () => (admin ? null : fail(401, 'Unauthorized'));
    const needCustomer = () => (customer ? null : fail(401, 'جلسة منتهية، سجل دخولك مرة أخرى'));
    const T = today();
    let g;

    switch (file) {
      case 'health.php':
        return ok({ uptime: Date.now() / 1000 });
      case 'csrf.php':
        return ok({ token: 'demo-csrf-token' });

      /* --- الباقات والأسعار --- */
      case 'packages.php': {
        if (method === 'GET' && q.admin === '1') {
          if ((g = needAdmin())) return g;
          return ok({ packages: db.packages.slice().sort((x, y) => x.sort_order - y.sort_order || x.id - y.id) });
        }
        if (method === 'GET') {
          return ok({
            packages: db.packages.filter((p) => p.is_active).sort((x, y) => x.sort_order - y.sort_order || x.id - y.id).map((p) => ({ code: p.code, name: p.name, price: p.price })),
            carTypes: CONFIG.carTypes, branches: CONFIG.branches, paymentMethods: CONFIG.paymentMethods, instapayNumber: CONFIG.instapayNumber,
          });
        }
        if ((g = needAdmin())) return g;
        const validate = (requireCode) => {
          const name = str(b.name);
          const price = num(b.price);
          if (!name || name.length > 100) return fail(400, 'اسم الباقة غير صالح');
          if (price < 0) return fail(400, 'السعر غير صالح');
          if (requireCode && !/^[a-z0-9_-]{2,30}$/.test(str(b.code).toLowerCase())) return fail(400, 'كود الباقة يجب أن يكون حروف إنجليزية صغيرة/أرقام (2-30 حرف)');
          return null;
        };
        if (method === 'POST') {
          if ((g = validate(true))) return g;
          const code = str(b.code).toLowerCase();
          if (db.packages.some((p) => p.code === code)) return fail(409, 'كود الباقة موجود مسبقاً');
          const p = { id: seq(db, 'package'), code, name: str(b.name), price: num(b.price), is_active: 1, sort_order: Math.max(-1, ...db.packages.map((x) => x.sort_order)) + 1, created_at: nowIso() };
          db.packages.push(p);
          logAudit(db, 'admin', admin.id, 'package.created', 'package', p.id, { code, price: p.price });
          return ok({ id: p.id }, 201);
        }
        const p = findById(db.packages, b.id);
        if (!b.id) return fail(400, 'ID مطلوب');
        if (method === 'PATCH') {
          let touched = false;
          if ('name' in b || 'price' in b) { if ((g = validate(false))) return g; if (p) { p.name = str(b.name); p.price = num(b.price); } touched = true; }
          if ('is_active' in b) { if (p) p.is_active = b.is_active ? 1 : 0; touched = true; }
          if ('sort_order' in b) { if (p) p.sort_order = parseInt(b.sort_order, 10) || 0; touched = true; }
          if (!touched) return fail(400, 'لا يوجد تعديل محدد');
          return ok({});
        }
        if (method === 'DELETE') {
          if (p) p.is_active = 0;
          return ok({});
        }
        return fail(405, 'Method not allowed');
      }
      case 'pricing.php': {
        const pkg = str(q.package || b.package);
        const carType = str(q.car_type || b.car_type);
        if (!pkg || !carType) return fail(400, 'package و car_type مطلوبان');
        const p = activePackage(db, pkg);
        const car = carOf(carType);
        if (!p || !car) return fail(400, 'باقة أو نوع عربية غير صحيح');
        const price = p.price + car.extra;
        return ok({ price, label: price === 0 ? 'حسب التعاقد' : price.toLocaleString('en-US') + ' جنيه', source: 'php', package: pkg, carType });
      }

      /* --- المواعيد --- */
      case 'slots.php': {
        if (method === 'GET') {
          if (q.admin !== undefined && admin) {
            return { status: 200, body: { all_slots: db.slots.slice().sort((x, y) => (x.slot_date + x.slot_time < y.slot_date + y.slot_time ? -1 : 1)).map((x) => ({ id: x.id, slot_date: x.slot_date, slot_time: x.slot_time, max_bookings: x.max_bookings, booked_count: x.booked_count, is_active: x.is_active })) } };
          }
          const grouped = {};
          db.slots.filter((x) => x.is_active && x.slot_date >= T).sort((x, y) => (x.slot_date + x.slot_time < y.slot_date + y.slot_time ? -1 : 1)).forEach((x) => {
            (grouped[x.slot_date] = grouped[x.slot_date] || []).push({ id: x.id, time: x.slot_time, available: Math.max(0, x.max_bookings - x.booked_count) });
          });
          return { status: 200, body: { slots: grouped } };
        }
        if ((g = needAdmin())) return g;
        if (method === 'POST') {
          const date = str(b.date);
          const times = Array.isArray(b.times) ? b.times : [];
          const max = Math.max(1, parseInt(b.max_bookings, 10) || 1);
          if (!date || !times.length) return fail(400, 'date and times required');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, 'invalid date');
          let added = 0;
          times.forEach((t) => {
            t = str(t);
            if (!/^\d{2}:\d{2}$/.test(t)) return;
            const existing = db.slots.find((x) => x.slot_date === date && x.slot_time === t);
            if (existing) { existing.max_bookings = max; existing.is_active = 1; } else db.slots.push({ id: seq(db, 'slot'), slot_date: date, slot_time: t, max_bookings: max, booked_count: 0, is_active: 1, created_at: nowIso() });
            added += 1;
          });
          return ok({ added });
        }
        if (method === 'DELETE') {
          if (q.all !== undefined) {
            const count = db.slots.length;
            db.slots = [];
            logAudit(db, 'admin', admin.id, 'slots.deleted_all', 'appointment_slots', null, { count });
            return ok({ deleted: count });
          }
          if (!parseInt(q.id, 10)) return fail(400, 'id required');
          db.slots = db.slots.filter((x) => x.id !== Number(q.id));
          return ok({});
        }
        return fail(405, 'method not allowed');
      }

      /* --- الحجوزات --- */
      case 'bookings.php': {
        if (method === 'GET') {
          if ((g = needAdmin())) return g;
          return ok({ bookings: db.bookings.slice().sort((x, y) => y.id - x.id) });
        }
        if (method === 'POST') {
          if ((g = needCustomer())) return g;
          const name = str(b.name);
          const email = str(b.email);
          const phone = str(b.phone);
          const code = b.servicePackage || b.packageCode || '';
          const branch = b.branch || '';
          const appointment = b.appointment || null;
          const notes = b.notes || null;
          const plate = b.plateNumber || null;
          const pm = b.paymentMethod || null;
          const couponCode = str(b.couponCode).toUpperCase();
          if (!name || !NAME_RE.test(name)) return fail(400, 'الاسم غير صالح');
          if (!email || !EMAIL_RE.test(email)) return fail(400, 'البريد الإلكتروني غير صالح');
          if (!PHONE_RE.test(phone)) return fail(400, 'رقم الموبايل غير صحيح');
          if (CONFIG.branches.indexOf(branch) < 0) return fail(400, 'الفرع غير صالح');
          if (CONFIG.paymentMethods.indexOf(pm) < 0) return fail(400, 'طريقة الدفع غير صالحة');
          let slot = null;
          if (appointment) {
            if (!APPT_RE.test(appointment)) return fail(400, 'صيغة الموعد غير صحيحة');
            if (db.slots.some((x) => x.is_active)) {
              slot = slotOf(db, appointment);
              if (!slot || !slot.is_active) return fail(400, 'الموعد المختار غير متاح');
              if (slot.booked_count >= slot.max_bookings) return fail(409, 'هذا الموعد اكتمل، اختار موعداً آخر');
            }
          }
          if (notes && String(notes).length > 300) return fail(400, 'الملاحظات طويلة جداً');
          if (plate && !PLATE_RE.test(plate)) return fail(400, 'رقم اللوحة غير صالح');
          const pkg = activePackage(db, code);
          const car = carOf(b.carType || '');
          if (!pkg || !car) return fail(400, 'بيانات الباقة أو نوع العربية غير صحيحة');
          let total = pkg.price + car.extra;
          let discount = 0;
          let discountNote = null;
          let screenshot = null;
          if (pm === 'Instapay') {
            const raw = str(b.paymentScreenshot);
            if (!raw) return fail(400, 'رجاء ارفع إيصال الدفع (Instapay)');
            if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(raw) || raw.length > 3 * 1024 * 1024) return fail(400, 'صورة الإيصال غير صالحة أو حجمها كبير');
            // الصور الكبيرة مش بتتخزن في المتصفح (مساحة localStorage صغيرة) — بنحط إيصال تجريبي مكانها
            screenshot = raw.length < 300000 ? raw : RECEIPT_IMG;
          }
          let applied = null;
          if (couponCode) {
            const c = db.coupons.find((x) => x.code === couponCode && x.is_active);
            if (couponUsable(c, nowIso().replace('T', ' ')) && total >= c.min_order) {
              discount = couponDiscount(c, total);
              total = Math.max(0, total - discount);
              discountNote = 'كوبون: ' + couponCode;
              applied = c;
            }
          }
          const bk = {
            id: seq(db, 'booking'), name, email, phone, package_code: pkg.code, package_name: pkg.name, car_type_code: car.code, car_type_name: car.name,
            branch, appointment, notes, plate_number: plate, payment_method: pm, total_price: total, created_at: nowIso(), status: 'new',
            customer_id: customer.id, source: 'web', payment_status: 'pending', pkg_price: pkg.price, car_extra_price: car.extra,
            discount_amount: discount, discount_note: discountNote, claim_token: null, payment_screenshot: screenshot, admin_notes: null, pos_staff_id: null,
          };
          db.bookings.push(bk);
          if (slot) slot.booked_count += 1;
          if (applied) applied.used_count += 1;
          return ok({ booking: { id: bk.id, total, totalLabel: total === 0 ? 'حسب الشغل' : total.toLocaleString('en-US') + ' جنيه' } }, 201);
        }
        if (method === 'PATCH') {
          if ((g = needAdmin())) return g;
          const bk = findById(db.bookings, b.id);
          if (!b.id) return fail(400, 'ID مطلوب');
          if (!bk) return fail(404, 'الحجز غير موجود');
          const keys = ['status', 'payment_status', 'admin_notes', 'appointment'].filter((k) => k in b);
          if (!keys.length) return fail(400, 'لا يوجد تعديل محدد');
          if ('status' in b) {
            if (STATES.indexOf(b.status) < 0) return fail(400, 'حالة غير صالحة');
            if (!canTransition(bk.status, b.status, 'admin')) return fail(409, 'لا يمكن تغيير حالة الحجز من "' + bk.status + '" إلى "' + b.status + '"');
          }
          if ('payment_status' in b && ['pending', 'paid', 'waived'].indexOf(b.payment_status) < 0) return fail(400, 'حالة دفع غير صالحة');
          if ('admin_notes' in b && b.admin_notes !== null && String(b.admin_notes).length > 1000) return fail(400, 'الملاحظة أطول من 1000 حرف');
          if ('appointment' in b && b.appointment && !APPT_RE.test(b.appointment)) return fail(400, 'صيغة الموعد غير صالحة');
          if ('payment_status' in b) bk.payment_status = b.payment_status;
          if ('admin_notes' in b) bk.admin_notes = b.admin_notes === '' || b.admin_notes === null ? null : String(b.admin_notes);
          if ('appointment' in b) bk.appointment = b.appointment || null;
          if ('status' in b) setStatus(db, bk, b.status);
          logAudit(db, 'admin', admin.id, 'booking.updated', 'booking', bk.id, b);
          return ok({ message: 'تم التحديث' });
        }
        return fail(405, 'Method Not Allowed');
      }

      /* --- حساب العميل --- */
      case 'customer-login.php': {
        const action = b.action || q.action || '';
        if (method === 'GET' && action === 'check') {
          if (!customer) return ok({ authenticated: false });
          return ok({ authenticated: true, name: customer.name, email: customer.email, phone: customer.phone, email_verified: Boolean(customer.email_verified) });
        }
        if (action === 'logout') {
          s.customerId = null;
          return ok({});
        }
        if (method !== 'POST') return fail(405, 'Method Not Allowed');
        if (action === 'register') {
          const name = str(b.name);
          const email = str(b.email);
          const phone = str(b.phone);
          const password = str(b.password);
          if (!name || !NAME_RE.test(name)) return fail(400, 'الاسم غير صالح');
          if (!email || !EMAIL_RE.test(email)) return fail(400, 'البريد الإلكتروني غير صالح');
          if (!PHONE_RE.test(phone)) return fail(400, 'رقم الموبايل غير صحيح');
          if (password.length < 6) return fail(400, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
          if (db.customers.some((c) => c.email.toLowerCase() === email.toLowerCase())) return fail(409, 'البريد الإلكتروني مسجل بالفعل');
          const refCode = str(b.referral_code).toUpperCase();
          const referrer = refCode ? db.customers.find((c) => c.referral_code === refCode && c.is_active) : null;
          const c = {
            id: seq(db, 'customer'), email, phone, name, password, created_at: nowIso(), last_login: null, is_active: 1,
            // في النسخة التجريبية مفيش بريد بيتبعت، فالحساب بيتفعّل على طول
            email_verified: 1, referral_code: referralCode(db), referred_by_id: referrer ? referrer.id : null,
            notes: null, car_type: null, car_color: null, car_plate: null, source: 'web',
          };
          db.customers.push(c);
          s.customerId = c.id;
          if (referrer) db.referrals.push({ id: seq(db, 'referral'), referrer_id: referrer.id, referred_id: c.id, rewarded: 0, created_at: nowIso() });
          return ok({ message: 'تم إنشاء الحساب بنجاح!' });
        }
        if (action === 'login') {
          const email = str(b.email);
          const password = str(b.password);
          if (!email || !password) return fail(400, 'البريد الإلكتروني وكلمة المرور مطلوبة');
          const c = db.customers.find((x) => x.email.toLowerCase() === email.toLowerCase());
          if (!c || !c.is_active || c.password !== password) return fail(401, 'بيانات تسجيل دخول غير صحيحة');
          s.customerId = c.id;
          c.last_login = nowIso();
          return ok({ message: 'تم تسجيل الدخول بنجاح' });
        }
        if (action === 'verify_email') {
          return str(b.token).length !== 64 ? fail(400, 'رابط غير صالح.') : fail(400, 'الرابط منتهي الصلاحية أو البريد مفعّل بالفعل.');
        }
        if (action === 'resend_verification') {
          if (!customer) return fail(401, 'سجّل دخولك أولاً.');
          return ok({ message: 'البريد مفعّل بالفعل.' });
        }
        return fail(405, 'Method Not Allowed');
      }
      case 'customer-bookings.php': {
        if (method === 'GET') {
          if (q.track_id && q.track_phone) {
            const bk = db.bookings.find((x) => x.id === Number(q.track_id) && x.phone === str(q.track_phone));
            if (!bk) return fail(404, 'الحجز غير موجود أو رقم الموبايل غير مطابق');
            return ok({ bookings: [{ id: bk.id, status: bk.status, payment_status: bk.payment_status, package_name: bk.package_name, car_type_name: bk.car_type_name, branch: bk.branch, appointment: bk.appointment, created_at: bk.created_at, total_price: bk.total_price, source: bk.source }] });
          }
          if ((g = needCustomer())) return g;
          return ok({
            bookings: db.bookings.filter((x) => x.customer_id === customer.id).sort((x, y) => y.id - x.id).map((x) => {
              const r = db.reviews.find((v) => v.booking_id === x.id);
              return Object.assign({}, x, { review_rating: r ? r.rating : null, review_comment: r ? r.comment : null });
            }),
          });
        }
        if (method === 'PATCH') {
          if ((g = needCustomer())) return g;
          if (!parseInt(b.id, 10)) return fail(400, 'رقم الحجز مطلوب');
          const bk = findById(db.bookings, b.id);
          if (!bk) return fail(404, 'الحجز غير موجود');
          if (bk.customer_id !== customer.id && bk.email !== customer.email) return fail(403, 'غير مصرح');
          const cancellable = canTransition(bk.status, 'cancelled', 'customer');
          if (b.action === 'cancel') {
            if (!cancellable) return fail(422, 'لا يمكن إلغاء هذا الحجز في حالته الحالية');
            setStatus(db, bk, 'cancelled');
            logAudit(db, 'customer', customer.id, 'booking.cancelled', 'booking', bk.id, {});
            return ok({ message: 'تم إلغاء الحجز بنجاح' });
          }
          if (b.action === 'reschedule') {
            if (!cancellable) return fail(422, 'لا يمكن تعديل هذا الحجز في حالته الحالية');
            const m = APPT_RE.exec(b.appointment || '');
            if (!m || Date.parse(cairoInstant(m[1], m[2])) < Date.now() + 15 * 60000) return fail(400, 'الميعاد الجديد يجب أن يكون بعد 15 دقيقة من الآن');
            bk.appointment = m[1] + ' ' + m[2] + ':00';
            logAudit(db, 'customer', customer.id, 'booking.rescheduled', 'booking', bk.id, {});
            return ok({ message: 'تم تعديل الموعد بنجاح' });
          }
          return fail(400, 'action غير صالح');
        }
        return fail(405, 'Method Not Allowed');
      }
      case 'customer-profile.php': {
        if ((g = needCustomer())) return g;
        if (method === 'GET') {
          return ok({ customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, created_at: customer.created_at, last_login: customer.last_login, is_active: customer.is_active, email_verified: customer.email_verified, booking_count: db.bookings.filter((x) => x.customer_id === customer.id || x.email === customer.email).length } });
        }
        if (method === 'PATCH') {
          if ('name' in b && 'phone' in b) {
            const name = str(b.name);
            const phone = str(b.phone);
            if (!name || !NAME_RE.test(name)) return fail(400, 'الاسم غير صالح');
            if (!PHONE_RE.test(phone)) return fail(400, 'رقم الموبايل غير صحيح');
            customer.name = name;
            customer.phone = phone;
            return ok({ message: 'تم تحديث البيانات الشخصية' });
          }
          if ('current_password' in b && 'new_password' in b) {
            if (String(b.new_password).length < 6) return fail(400, 'كلمة المرور الجديدة قصيرة جداً');
            if (b.current_password !== customer.password) return fail(401, 'كلمة المرور الحالية غير صحيحة');
            customer.password = String(b.new_password);
            return ok({ message: 'تم تحديث كلمة المرور' });
          }
          return fail(400, 'لا توجد بيانات للتحديث');
        }
        return fail(405, 'Method Not Allowed');
      }
      case 'password-reset.php': {
        if (method !== 'POST') return fail(405, 'Method Not Allowed');
        if (b.action === 'request') return ok({ message: 'إذا كان البريد مسجلاً، ستصل رسالة إعادة التعيين خلال دقائق.' });
        if (b.action === 'verify' || b.action === 'reset') {
          if (str(b.token).length !== 64) return fail(400, 'رابط غير صالح.');
          if (b.action === 'reset' && String(b.password || '').length < 6) return fail(400, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
          return fail(400, 'الرابط منتهي الصلاحية أو استُخدم من قبل.');
        }
        return fail(400, 'إجراء غير معروف.');
      }
      case 'loyalty.php': {
        if ((g = needCustomer())) return g;
        const balance = balanceOf(db, customer.id);
        if (method === 'GET') {
          const history = db.loyalty.filter((l) => l.customer_id === customer.id).sort((x, y) => y.id - x.id).slice(0, 20).map((l) => {
            const bk = l.booking_id ? findById(db.bookings, l.booking_id) : null;
            return { points: l.points, source: l.source, note: l.note, created_at: l.created_at, package_name: bk ? bk.package_name : null };
          });
          return ok({ balance, next: REWARDS.find((r) => balance < r.points) || null, rewards: REWARDS.map((r) => Object.assign({}, r, { available: balance >= r.points })), history });
        }
        if (method === 'POST') {
          const reward = REWARDS.find((r) => r.id === b.reward_id);
          if (!reward) return fail(400, 'مكافأة غير موجودة');
          if (balance < reward.points) return fail(422, 'نقاطك غير كافية. رصيدك ' + balance + ' نقطة، والمطلوب ' + reward.points + '.');
          const code = 'REWARD-' + hex(8).toUpperCase();
          const expires = new Date(Date.now() + 30 * DAY).toISOString().slice(0, 19).replace('T', ' ');
          db.coupons.push({ id: seq(db, 'coupon'), code, discount_type: reward.type, discount_value: reward.value, min_order: 0, max_uses: 1, used_count: 0, expires_at: expires, is_active: 1, created_at: nowIso() });
          db.loyalty.push({ id: seq(db, 'loyalty'), customer_id: customer.id, points: -reward.points, source: 'redemption', booking_id: null, note: 'استرداد: ' + reward.label, created_at: nowIso() });
          return ok({ message: 'تم إنشاء كوبون الخصم بنجاح!', coupon_code: code, reward, new_balance: balanceOf(db, customer.id), expires_at: expires });
        }
        return fail(405, 'Method Not Allowed');
      }
      case 'referral.php': {
        if ((g = needCustomer())) return g;
        if (method !== 'GET') return fail(405, 'Method Not Allowed');
        if (!customer.referral_code) customer.referral_code = referralCode(db);
        return ok({
          referral_code: customer.referral_code,
          referred_count: db.referrals.filter((r) => r.referrer_id === customer.id).length,
          points_earned: sum(db.loyalty.filter((l) => l.customer_id === customer.id && l.source === 'referral').map((l) => l.points)),
        });
      }
      case 'claim-booking.php': {
        const token = str(method === 'GET' ? q.token : b.token);
        if (token.length !== 32) return fail(400, 'رمز غير صالح');
        const bk = db.bookings.find((x) => x.claim_token === token);
        if (method === 'GET') {
          if (!bk) return fail(404, 'الرمز غير صالح أو منتهي الصلاحية');
          const phone = bk.phone || '';
          return ok({
            booking: { id: bk.id, package_name: bk.package_name, car_type_name: bk.car_type_name, branch: bk.branch, status: bk.status, created_at: bk.created_at, masked_phone: phone.length > 5 ? phone.slice(0, 3) + '*'.repeat(phone.length - 5) + phone.slice(-2) : '***' },
            already_claimed: Boolean(bk.customer_id), claimed_by_me: Boolean(bk.customer_id && customer && bk.customer_id === customer.id), logged_in: Boolean(customer),
          });
        }
        if (method === 'POST') {
          if ((g = needCustomer())) return g;
          if (!bk) return fail(404, 'الرمز غير صالح');
          if (bk.customer_id === customer.id) return ok({ message: 'الحجز مربوط بحسابك بالفعل' });
          if (bk.customer_id) return fail(403, 'هذا الحجز مربوط بحساب آخر');
          if (customer.phone !== bk.phone) return fail(403, 'رقم موبايل حسابك لا يتطابق مع رقم هذا الحجز. تأكد أنك مسجّل بنفس الرقم المستخدم عند الحجز.');
          bk.customer_id = customer.id;
          return ok({ message: 'تم ربط الحجز بحسابك بنجاح! ✓' });
        }
        return fail(405, 'Method Not Allowed');
      }

      /* --- التقييمات والكوبونات --- */
      case 'reviews.php': {
        if (method === 'GET') {
          if (q.booking_id) {
            const r = db.reviews.find((x) => x.booking_id === Number(q.booking_id));
            return ok({ review: r || null });
          }
          const joined = db.reviews.map((r) => ({ r, bk: findById(db.bookings, r.booking_id) })).filter((x) => x.bk).sort((x, y) => (x.r.created_at < y.r.created_at ? 1 : -1));
          if (q.admin !== undefined) {
            if ((g = needAdmin())) return g;
            return ok({ reviews: joined.map(({ r, bk }) => ({ id: r.id, booking_id: r.booking_id, rating: r.rating, comment: r.comment, created_at: r.created_at, admin_reply: r.admin_reply, admin_replied_at: r.admin_replied_at, customer_name: bk.name, package_name: bk.package_name, car_type_name: bk.car_type_name, branch: bk.branch })) });
          }
          return ok({ reviews: joined.slice(0, 20).map(({ r, bk }) => ({ rating: r.rating, comment: r.comment, admin_reply: r.admin_reply, created_at: r.created_at, package_name: bk.package_name, car_type_name: bk.car_type_name })) });
        }
        if (method === 'PATCH') {
          if ((g = needAdmin())) return g;
          const reply = str(b.reply);
          if (!parseInt(b.id, 10)) return fail(400, 'معرّف التقييم مطلوب');
          if (reply.length > 500) return fail(400, 'الرد طويل جداً (500 حرف كحد أقصى)');
          const r = findById(db.reviews, b.id);
          if (r) { r.admin_reply = reply || null; r.admin_replied_at = reply ? nowIso() : null; }
          return ok({ message: reply ? 'تم حفظ الرد' : 'تم حذف الرد' });
        }
        if (method === 'POST') {
          if ((g = needCustomer())) return g;
          const bookingId = parseInt(b.booking_id, 10) || 0;
          const rating = parseInt(b.rating, 10) || 0;
          const comment = str(b.comment);
          if (!bookingId) return fail(400, 'رقم الحجز مطلوب');
          if (rating < 1 || rating > 5) return fail(400, 'التقييم يجب أن يكون بين 1 و 5');
          if (comment.length > 500) return fail(400, 'التعليق طويل جداً (500 حرف كحد أقصى)');
          const bk = db.bookings.find((x) => x.id === bookingId && x.customer_id === customer.id);
          if (!bk) return fail(404, 'الحجز غير موجود أو لا ينتمي لحسابك');
          if (bk.status !== 'completed') return fail(400, 'يمكن التقييم فقط بعد اكتمال الخدمة');
          if (db.reviews.some((r) => r.booking_id === bookingId)) return fail(409, 'تم تقييم هذا الحجز مسبقاً');
          db.reviews.push({ id: seq(db, 'review'), booking_id: bookingId, customer_id: customer.id, rating, comment: comment || null, created_at: nowIso(), admin_reply: null, admin_replied_at: null });
          return ok({ message: 'شكراً على تقييمك! ⭐' });
        }
        return fail(405, 'Method not allowed');
      }
      case 'coupons.php': {
        const action = str(b.action || q.action);
        if (method === 'POST' && action === 'validate') {
          const code = str(b.code).toUpperCase();
          const subtotal = num(b.subtotal);
          if (!code) return fail(400, 'أدخل كود الخصم');
          const c = db.coupons.find((x) => x.code === code);
          if (!c || !c.is_active) return fail(404, 'كود الخصم غير صالح أو منتهي');
          if (c.expires_at && c.expires_at < nowIso().replace('T', ' ')) return fail(400, 'انتهت صلاحية هذا الكود');
          if (c.max_uses !== null && c.used_count >= c.max_uses) return fail(400, 'تم استنفاد الحد الأقصى لاستخدام هذا الكود');
          if (subtotal < c.min_order) return fail(400, 'الحد الأدنى للطلب هو ' + c.min_order + ' جنيه');
          const discount = couponDiscount(c, subtotal);
          return ok({ code: c.code, discount_type: c.discount_type, discount_value: c.discount_value, discount, new_total: Math.max(0, subtotal - discount) });
        }
        if ((g = needAdmin())) return g;
        if (method === 'GET') return ok({ coupons: db.coupons.slice().sort((x, y) => (x.created_at < y.created_at ? 1 : -1)) });
        if (method === 'POST' && action === 'create') {
          const code = str(b.code).toUpperCase();
          const type = b.discount_type || 'percent';
          const value = num(b.discount_value);
          if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return fail(400, 'الكود يجب أن يكون حروف إنجليزية وأرقام (3-20 حرف)');
          if (['percent', 'fixed'].indexOf(type) < 0) return fail(400, 'نوع الخصم غير صالح');
          if (value <= 0 || (type === 'percent' && value > 100)) return fail(400, 'قيمة الخصم غير صالحة');
          if (db.coupons.some((x) => x.code === code)) return fail(409, 'الكود موجود مسبقاً');
          const c = { id: seq(db, 'coupon'), code, discount_type: type, discount_value: value, min_order: num(b.min_order), max_uses: b.max_uses !== undefined && b.max_uses !== null && b.max_uses !== '' ? parseInt(b.max_uses, 10) : null, used_count: 0, expires_at: str(b.expires_at) || null, is_active: 1, created_at: nowIso() };
          db.coupons.push(c);
          return ok({ message: 'تم إنشاء الكوبون بنجاح', id: c.id });
        }
        if (method === 'PATCH') {
          if (!parseInt(b.id, 10)) return fail(400, 'ID مطلوب');
          if (!('is_active' in b)) return fail(400, 'لا يوجد تعديل محدد');
          const c = findById(db.coupons, b.id);
          if (c) c.is_active = b.is_active ? 1 : 0;
          return ok({});
        }
        if (method === 'DELETE') {
          if (!parseInt(b.id, 10)) return fail(400, 'ID مطلوب');
          db.coupons = db.coupons.filter((x) => x.id !== Number(b.id));
          return ok({});
        }
        return fail(405, 'Method not allowed');
      }

      /* --- الإدارة --- */
      case 'admin-login.php': {
        const action = b.action || q.action || '';
        if (method === 'GET' && action === 'check') return admin ? ok({ authenticated: true, username: admin.username }) : ok({ authenticated: false });
        if (action === 'logout') {
          s.adminId = null;
          return ok({});
        }
        if (method === 'POST') {
          const username = str(b.username);
          const password = str(b.password);
          if (!username || !password) return fail(400, 'اسم المستخدم وكلمة المرور مطلوبة');
          const a = db.admins.find((x) => x.username === username);
          if (!a || !a.is_active || a.password !== password) return fail(401, 'بيانات تسجيل دخول غير صحيحة');
          s.adminId = a.id;
          a.last_login = nowIso();
          return ok({ message: 'تم تسجيل الدخول بنجاح' });
        }
        return fail(405, 'Method Not Allowed');
      }
      case 'customers.php': {
        if ((g = needAdmin())) return g;
        if (method === 'GET') {
          return ok({
            customers: db.customers.map((c) => {
              const mine = db.bookings.filter((x) => x.customer_id === c.id || x.email === c.email);
              return {
                id: c.id, name: c.name, email: c.email, phone: c.phone, notes: c.notes, car_type: c.car_type, car_color: c.car_color, car_plate: c.car_plate,
                source: c.source, created_at: c.created_at, booking_count: mine.length,
                total_spent: sum(mine.filter((x) => x.status !== 'cancelled').map((x) => x.total_price)),
                last_booking_at: mine.length ? mine.map((x) => x.created_at).sort().pop() : null,
              };
            }).sort((x, y) => y.booking_count - x.booking_count || (x.created_at < y.created_at ? 1 : -1)),
          });
        }
        if (method === 'POST') {
          const name = str(b.name);
          const phone = str(b.phone);
          const email = str(b.email);
          const notes = str(b.notes);
          if (!name || !NAME_RE.test(name)) return fail(400, 'اسم غير صالح');
          if (!phone || !PHONE_RE.test(phone)) return fail(400, 'رقم موبايل غير صالح');
          if (email && !EMAIL_RE.test(email)) return fail(400, 'بريد إلكتروني غير صالح');
          if (notes.length > 300) return fail(400, 'الملاحظات طويلة جداً');
          if (str(b.car_type).length > 60 || str(b.car_color).length > 30 || str(b.car_plate).length > 20) return fail(400, 'بيانات السيارة طويلة جداً');
          const dupe = db.customers.find((c) => c.phone === phone);
          if (dupe) return fail(409, 'يوجد عميل بنفس رقم الموبايل: ' + dupe.name);
          if (email && db.customers.some((c) => c.email === email)) return fail(409, 'البريد الإلكتروني مستخدم مسبقاً');
          const c = { id: seq(db, 'customer'), email: email || 'walkin_' + Date.now() + '_' + hex(16) + '@drcare.local', phone, name, password: hex(32), created_at: nowIso(), last_login: null, is_active: 1, email_verified: 0, referral_code: null, referred_by_id: null, notes: notes || null, car_type: str(b.car_type) || null, car_color: str(b.car_color) || null, car_plate: str(b.car_plate) || null, source: 'admin' };
          db.customers.push(c);
          logAudit(db, 'admin', admin.id, 'customer.created', 'customer', c.id, { name, phone });
          return ok({ id: c.id }, 201);
        }
        return fail(405, 'Method Not Allowed');
      }
      case 'expenses.php': {
        if ((g = needAdmin())) return g;
        const validate = () => {
          if (CONFIG.expenseCategories.indexOf(str(b.category)) < 0) return fail(400, 'فئة المصروف غير صالحة');
          if (num(b.amount) <= 0) return fail(400, 'المبلغ غير صالح');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(str(b.expense_date))) return fail(400, 'صيغة التاريخ غير صحيحة');
          if (str(b.note).length > 300) return fail(400, 'الملاحظة طويلة جداً');
          if (b.staff_id && !findById(db.staff, b.staff_id)) return fail(400, 'الموظف غير موجود');
          return null;
        };
        const fields = () => ({ category: str(b.category), amount: num(b.amount), expense_date: str(b.expense_date), note: str(b.note) || null, staff_id: b.staff_id !== undefined && b.staff_id !== '' && b.staff_id !== null ? Number(b.staff_id) : null });
        if (method === 'GET') {
          let month = str(q.month);
          let list;
          if (month === 'all') list = db.expenses.slice();
          else {
            if (!/^\d{4}-\d{2}$/.test(month)) month = T.slice(0, 7);
            list = db.expenses.filter((e) => e.expense_date.indexOf(month) === 0);
          }
          return ok({ expenses: list.sort((x, y) => (x.expense_date < y.expense_date ? 1 : x.expense_date > y.expense_date ? -1 : y.id - x.id)), month });
        }
        if (method === 'POST') {
          if ((g = validate())) return g;
          const e = Object.assign({ id: seq(db, 'expense') }, fields(), { created_by: admin.id, created_at: nowIso() });
          db.expenses.push(e);
          logAudit(db, 'admin', admin.id, 'expense.created', 'expense', e.id, {});
          return ok({ id: e.id }, 201);
        }
        if (!parseInt(b.id, 10)) return fail(400, 'ID مطلوب');
        if (method === 'PATCH') {
          if ((g = validate())) return g;
          const e = findById(db.expenses, b.id);
          if (e) Object.assign(e, fields());
          return ok({});
        }
        if (method === 'DELETE') {
          db.expenses = db.expenses.filter((e) => e.id !== Number(b.id));
          return ok({});
        }
        return fail(405, 'Method not allowed');
      }
      case 'staff.php': {
        if ((g = needAdmin())) return g;
        if (method === 'GET') {
          return ok({
            staff: db.staff.map((x) => {
              const ex = db.expenses.filter((e) => e.staff_id === x.id);
              return { id: x.id, name: x.name, phone: x.phone, role: x.role, is_active: x.is_active, created_at: x.created_at, total_expenses: sum(ex.map((e) => e.amount)), expense_count: ex.length };
            }).sort((x, y) => y.is_active - x.is_active || (x.created_at < y.created_at ? 1 : -1)),
          });
        }
        const checkName = (v) => (!str(v) || !NAME_RE.test(str(v)) ? fail(400, 'اسم غير صالح') : null);
        const checkPhone = (v) => (str(v) && !PHONE_RE.test(str(v)) ? fail(400, 'رقم موبايل غير صالح') : null);
        if (method === 'POST') {
          if ((g = checkName(b.name) || checkPhone(b.phone))) return g;
          if (str(b.role).length > 60) return fail(400, 'اسم الوظيفة طويل جداً');
          const x = { id: seq(db, 'staff'), name: str(b.name), phone: str(b.phone) || null, role: str(b.role) || null, salary: 0, is_active: 1, created_at: nowIso() };
          db.staff.push(x);
          return ok({ id: x.id }, 201);
        }
        if (!parseInt(b.id, 10)) return fail(400, 'ID مطلوب');
        const x = findById(db.staff, b.id);
        if (method === 'PATCH') {
          let touched = false;
          if ('name' in b) { if ((g = checkName(b.name))) return g; if (x) x.name = str(b.name); touched = true; }
          if ('phone' in b) { if ((g = checkPhone(b.phone))) return g; if (x) x.phone = str(b.phone) || null; touched = true; }
          if ('role' in b) { if (str(b.role).length > 60) return fail(400, 'اسم الوظيفة طويل جداً'); if (x) x.role = str(b.role) || null; touched = true; }
          if ('is_active' in b) { if (x) x.is_active = b.is_active ? 1 : 0; touched = true; }
          if (!touched) return fail(400, 'لا يوجد تعديل محدد');
          return ok({});
        }
        if (method === 'DELETE') {
          if (x) x.is_active = 0;
          return ok({});
        }
        return fail(405, 'Method not allowed');
      }
      case 'staff-payroll.php': {
        if ((g = needAdmin())) return g;
        if (method === 'GET') {
          if (!parseInt(q.staff_id, 10)) return fail(400, 'staff_id مطلوب');
          const x = findById(db.staff, q.staff_id);
          if (!x) return fail(404, 'الموظف غير موجود');
          const entries = db.payroll.filter((p) => p.staff_id === x.id).sort((p1, p2) => p2.id - p1.id).map((p) => ({ id: p.id, type: p.type, amount: p.amount, note: p.note, created_at: p.created_at }));
          const bonus = sum(entries.filter((e) => e.type === 'bonus').map((e) => e.amount));
          const deduction = sum(entries.filter((e) => e.type !== 'bonus').map((e) => e.amount));
          return ok({ staff: { id: x.id, name: x.name, phone: x.phone, role: x.role, salary: x.salary, is_active: x.is_active, created_at: x.created_at }, entries, totals: { salary: x.salary, bonus, deduction, net: x.salary + bonus - deduction } });
        }
        if (method === 'POST') {
          const type = str(b.type);
          const amount = num(b.amount);
          if (!parseInt(b.staff_id, 10)) return fail(400, 'staff_id مطلوب');
          if (['bonus', 'deduction'].indexOf(type) < 0) return fail(400, 'النوع يجب أن يكون بونص أو خصم');
          if (amount <= 0 || amount > 1000000) return fail(400, 'المبلغ غير صالح');
          if (str(b.note).length > 200) return fail(400, 'الملاحظة طويلة جداً (200 حرف كحد أقصى)');
          if (!findById(db.staff, b.staff_id)) return fail(404, 'الموظف غير موجود');
          db.payroll.push({ id: seq(db, 'payroll'), staff_id: Number(b.staff_id), type, amount, note: str(b.note) || null, created_at: nowIso() });
          return ok({ message: type === 'bonus' ? 'تم إضافة البونص' : 'تم تسجيل الخصم' }, 201);
        }
        if (method === 'PATCH') {
          if (!parseInt(b.staff_id, 10)) return fail(400, 'staff_id مطلوب');
          if (!('salary' in b)) return fail(400, 'المرتب مطلوب');
          const salary = num(b.salary);
          if (salary < 0 || salary > 1000000) return fail(400, 'قيمة المرتب غير صالحة');
          const x = findById(db.staff, b.staff_id);
          if (!x) return fail(404, 'الموظف غير موجود');
          x.salary = salary;
          return ok({ message: 'تم حفظ المرتب' });
        }
        if (method === 'DELETE') {
          if (!parseInt(b.id, 10)) return fail(400, 'ID مطلوب');
          if (!findById(db.payroll, b.id)) return fail(404, 'السجل غير موجود');
          db.payroll = db.payroll.filter((p) => p.id !== Number(b.id));
          return ok({ message: 'تم حذف السجل' });
        }
        return fail(405, 'Method not allowed');
      }

      /* --- نقطة البيع --- */
      case 'pos.php': {
        const token = str(req.header('X-POS-Token')) || str(b.token);
        const badToken = () => fail(401, 'رمز الموظف غير صحيح');
        const row = (x, extra) => {
          const out = { id: x.id, name: x.name, phone: x.phone, plate_number: x.plate_number, package_name: x.package_name, car_type_name: x.car_type_name, branch: x.branch, payment_method: x.payment_method, total_price: x.total_price, discount_amount: x.discount_amount, discount_note: x.discount_note, status: x.status, created_at: x.created_at };
          (extra || []).forEach((k) => { out[k] = x[k]; });
          return out;
        };
        if (method === 'GET') {
          const action = str(q.action);
          if (!action) return ok({ message: 'DR.Care POS متصل ✓', time: cairoParts().time });
          if (token !== POS_TOKEN) return badToken();
          if (action === 'today') {
            const list = db.bookings.filter((x) => x.source === 'pos' && localDateOf(x.created_at) === T).sort((x, y) => y.id - x.id).map((x) => row(x));
            return ok({ bookings: list, revenue: sum(list.filter((x) => x.status !== 'cancelled').map((x) => x.total_price)) });
          }
          if (action === 'staff') return ok({ staff: db.staff.filter((x) => x.is_active).map((x) => ({ id: x.id, name: x.name })).sort((x, y) => x.name.localeCompare(y.name, 'ar')) });
          if (action === 'history') {
            const limit = Math.max(1, Math.min(200, parseInt(q.limit, 10) || 50));
            const offset = Math.max(0, parseInt(q.offset, 10) || 0);
            const all = db.bookings.filter((x) => x.source === 'pos').sort((x, y) => y.id - x.id);
            return ok({ bookings: all.slice(offset, offset + limit).map((x) => row(x, ['payment_status'])), total: all.length });
          }
          if (action === 'search') {
            const term = str(q.q).toLowerCase();
            if (!term) return fail(400, 'أدخل كلمة البحث');
            return ok({ bookings: db.bookings.filter((x) => [x.name, x.phone, x.plate_number].some((v) => String(v || '').toLowerCase().indexOf(term) >= 0)).sort((x, y) => y.id - x.id).slice(0, 20).map((x) => row(x)) });
          }
          if (action === 'detail') {
            if (!parseInt(q.id, 10)) return fail(400, 'ID مطلوب');
            const x = findById(db.bookings, q.id);
            if (!x) return fail(404, 'الحجز غير موجود');
            return ok({ booking: row(x, ['email', 'pkg_price', 'car_extra_price', 'notes']) });
          }
          if (action === 'coupon') {
            const code = str(q.code).toUpperCase();
            const total = num(q.total);
            if (!code) return fail(400, 'أدخل الكود');
            const c = db.coupons.find((x) => x.code === code);
            if (!couponUsable(c, nowIso().replace('T', ' '))) return fail(404, 'الكود غير صالح أو منتهي الصلاحية');
            if (total > 0 && c.min_order > total) return fail(400, 'الحد الأدنى للطلب ' + c.min_order + ' جنيه');
            return ok({ coupon: c, discount: couponDiscount(c, total) });
          }
          if (action === 'stats') {
            const date = str(q.date) || T;
            const list = db.bookings.filter((x) => x.source === 'pos' && localDateOf(x.created_at) === date && x.status !== 'cancelled');
            const group = (key) => {
              const map = new Map();
              list.forEach((x) => { const g2 = map.get(x[key]) || { label: x[key], cnt: 0, rev: 0 }; g2.cnt += 1; g2.rev += x.total_price; map.set(x[key], g2); });
              return Array.from(map.values()).sort((x, y) => y.rev - x.rev);
            };
            return ok({ by_package: group('package_name'), by_car: group('car_type_name'), by_payment: group('payment_method') });
          }
          return fail(400, 'action غير معروف');
        }
        if (token !== POS_TOKEN) return badToken();
        if (method === 'PATCH') {
          if (!parseInt(b.id, 10)) return fail(400, 'رقم الحجز مطلوب');
          const x = findById(db.bookings, b.id);
          if (!x) return fail(404, 'الحجز غير موجود');
          if (!('status' in b) && !('payment_status' in b)) return fail(400, 'لا يوجد تعديل');
          if ('status' in b) {
            const st = str(b.status);
            if (STATES.indexOf(st) < 0) return fail(400, 'حالة غير صالحة');
            if (!canTransition(x.status, st, 'pos')) return fail(409, 'لا يمكن تغيير حالة الحجز من "' + x.status + '" إلى "' + st + '"');
          }
          if ('payment_status' in b && ['pending', 'paid', 'waived'].indexOf(str(b.payment_status)) < 0) return fail(400, 'حالة دفع غير صالحة');
          if ('payment_status' in b) x.payment_status = str(b.payment_status);
          if ('status' in b) setStatus(db, x, str(b.status));
          logAudit(db, 'pos', null, 'booking.updated', 'booking', x.id, b);
          return ok({ message: 'تم التحديث' });
        }
        if (method === 'POST') {
          const name = str(b.name);
          const phone = str(b.phone);
          const email = str(b.email) || null;
          if (!name || !NAME_RE.test(name)) return fail(400, 'اسم العميل غير صالح');
          if (!PHONE_RE.test(phone)) return fail(400, 'رقم الهاتف غير صحيح');
          if (email && !EMAIL_RE.test(email)) return fail(400, 'البريد الإلكتروني غير صالح');
          const pkg = activePackage(db, str(b.packageCode));
          const car = carOf(str(b.carType));
          if (!pkg) return fail(400, 'اختار الباقة');
          if (!car) return fail(400, 'اختار نوع السيارة');
          if (CONFIG.branches.indexOf(str(b.branch)) < 0) return fail(400, 'الفرع غير صالح');
          const base = pkg.price + car.extra;
          let discount = 0;
          let note = null;
          const couponCode = str(b.coupon_code).toUpperCase();
          let applied = null;
          if (couponCode) {
            const c = db.coupons.find((x) => x.code === couponCode);
            if (couponUsable(c, nowIso().replace('T', ' '))) { discount += couponDiscount(c, base); note = 'كوبون: ' + couponCode; applied = c; }
          }
          const manual = Math.max(0, num(b.manual_discount));
          const manualType = str(b.manual_discount_type) || 'fixed';
          if (manual > 0) {
            discount += manualType === 'percent' ? round2(base * Math.min(manual, 100) / 100) : Math.min(manual, base);
            note = (note ? note + '، ' : '') + (manualType === 'percent' ? 'خصم يدوي ' + manual + '%' : 'خصم يدوي ' + manual + ' جنيه');
          }
          discount = Math.min(discount, base);
          const x = {
            id: seq(db, 'booking'), name, email, phone, package_code: pkg.code, package_name: pkg.name, car_type_code: car.code, car_type_name: car.name,
            branch: str(b.branch), payment_method: str(b.paymentMethod), plate_number: str(b.plateNumber) || null, notes: str(b.notes) || null,
            total_price: base - discount, pkg_price: pkg.price, car_extra_price: car.extra, discount_amount: discount, discount_note: note,
            claim_token: hex(32), created_at: nowIso(), pos_staff_id: parseInt(b.staffId, 10) || null, status: 'new', source: 'pos',
            appointment: null, customer_id: null, payment_status: 'pending', payment_screenshot: null, admin_notes: null,
          };
          db.bookings.push(x);
          if (applied) applied.used_count += 1;
          return ok({ booking: { id: x.id, name, phone, email, package_name: x.package_name, car_type_name: x.car_type_name, branch: x.branch, payment_method: x.payment_method, plate_number: x.plate_number, notes: x.notes, total_price: x.total_price, pkg_price: x.pkg_price, car_extra: x.car_extra_price, discount_amount: x.discount_amount, discount_note: x.discount_note, claim_token: x.claim_token, created_at: x.created_at, status: 'new' } });
        }
        return fail(405, 'Method not allowed');
      }

      /* --- حاجات بتتبعت لبرّه: في التجربة بتنجح من غير ما تتبعت فعلًا --- */
      case 'push-subscribe.php':
        return ok({ message: 'تم تفعيل الإشعارات (تجريبي)' });
      case 'push-send.php':
        if ((g = needAdmin())) return g;
        return ok({ sent: 0, message: 'في النسخة التجريبية مفيش إشعارات بتتبعت فعلًا' });
      case 'whatsapp-broadcast.php': {
        if ((g = needAdmin())) return g;
        if (!str(b.message)) return fail(400, 'الرسالة مطلوبة');
        const phones = (Array.isArray(b.phones) ? b.phones : []).filter((p) => PHONE_RE.test(str(p)));
        if (!phones.length) return fail(400, 'لا توجد أرقام مصرية صالحة');
        return ok({ sent: phones.length, failed: 0, message: 'في النسخة التجريبية مفيش رسائل واتساب بتتبعت فعلًا' });
      }
      case 'anniversary-notify.php':
        if ((g = needAdmin())) return g;
        return ok({ sent: 0, message: 'لا توجد ذكريات اليوم.' });
      case 'backup.php':
        if ((g = needAdmin())) return g;
        return ok({ message: 'في النسخة التجريبية البيانات متخزنة في متصفحك بس، مفيش نسخة احتياطية على السيرفر', file: 'demo' });
      case 'test-email.php':
        if ((g = needAdmin())) return g;
        return ok({ message: 'في النسخة التجريبية مفيش بريد بيتبعت' });
      default:
        return null;
    }
  }

  const go = (a, path) => a.go(path);

  const demo = createDemo({
    key: 'drcare_demo_db',
    version: 1,
    prefix: '/api',
    seed,
    handle,
    notFound: () => ({ ok: false, message: 'Not Found' }),
    serverError: () => ({ ok: false, message: 'حصل خطأ في النسخة التجريبية' }),
    home: '/',
    bar: {
      label: 'نسخة تجريبية',
      openFirst: true,
      intro: 'ده عرض لـ DR.Care ببيانات مغسلة وهمية متخزنة على جهازك بس. جرّب من أي ناحية:',
      actions: [
        { label: 'ادخل كعميل (كريم) وشوف حجوزاته', primary: true, run: (a) => { a.db().session.customerId = 1; go(a, window.location.pathname.indexOf('/app') === 0 ? '/app/bookings' : '/customer-bookings.html'); } },
        { label: 'افتح لوحة الإدارة', run: (a) => { a.db().session.adminId = 1; go(a, '/admin.html'); } },
        { label: 'افتح نقطة البيع (الكاشير)', run: (a) => go(a, '/CarWash-POS/') },
        { label: 'افتح تطبيق الموبايل', run: (a) => go(a, '/app/') },
      ],
      note: 'حساب العميل karim@drcare.demo، والأدمن admin، وكلمة المرور ' + DEMO_PASSWORD + '. رمز الكاشير ' + POS_TOKEN + '. الواتساب والإيميل والإشعارات مش بتتبعت فعلًا.',
      mountOnRoot: true,
      css: "#demo-bar{font-family:'IBM Plex Sans Arabic',system-ui,sans-serif}" +
        '@media (max-width:760px){#demo-bar{bottom:calc(84px + env(safe-area-inset-bottom))}}',
    },
  });

  // الصفحة الرئيسية بتحوّل الزائر لصفحة الدخول أول ما تفتح (مرة في الجلسة، قبل تسجيل الـ
  // service worker). في العرض ده بيخلّي الزائر ما يشوفش الموقع، فبنعلّم إن التنبيه اتعرض —
  // ولسه لو ضغط «احجز» من غير حساب هيتحوّل للدخول زي الموقع الحقيقي.
  try {
    if (!sessionStorage.getItem('bookingPromptShown')) sessionStorage.setItem('bookingPromptShown', '1');
  } catch (e) {
    /* التخزين مقفول */
  }

  // نقطة البيع: نكتب رمز الكاشير التجريبي لوحده (الواجهة بتحمّل الحجوزات أول ما الرمز يتكتب)
  function fillPosToken() {
    const input = document.getElementById('posToken');
    if (!input || input.value) return;
    input.value = POS_TOKEN;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (window.location.pathname.indexOf('/CarWash-POS') === 0) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillPosToken);
    else fillPosToken();
  }
  return demo;
})();
