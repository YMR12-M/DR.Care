/* DR.Care — brand behaviours (vanilla, no dependencies)
   1. Neon "open" sign that is honest about opening hours (12:00–22:00, Cairo time)
   2. The car on the services wash-line follows the scroll through the section
   3. Menu-board prices + car-type extras follow the live package config
      (script.js hands the config over via window.__drcareConfig / drcareSyncMenu) */
(function () {
  'use strict';

  var OPEN_HOUR = 12, CLOSE_HOUR = 22;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. open / closed sign ───────────────────────────── */
  function cairoHour() {
    try {
      return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
    } catch (e) { return new Date().getHours(); }
  }
  function paintOpenSigns() {
    var h = cairoHour();
    var open = h >= OPEN_HOUR && h < CLOSE_HOUR;
    document.querySelectorAll('[data-open-sign]').forEach(function (el) {
      el.classList.toggle('is-open', open);
      var word = el.querySelector('[data-open-word]'), sub = el.querySelector('[data-open-sub]');
      if (word) word.textContent = open ? 'مفتوح' : 'مقفول';
      if (sub) sub.textContent = open ? 'لحد 10 بالليل' : 'بنفتح 12 الضهر';
    });
  }
  paintOpenSigns();
  setInterval(paintOpenSigns, 30000);

  /* ── 2. the car follows the scroll along the wash line ── */
  var line = document.querySelector('[data-line]');
  var car = line && line.querySelector('[data-line-car], .line__car');
  if (line && car) {
    var ticking = false;
    var place = function () {
      ticking = false;
      var r = line.getBoundingClientRect(), vh = window.innerHeight || 800;
      var raw = (vh * 0.8 - r.top) / (r.height + vh * 0.35);       // 0 when the line enters, 1 when it has passed
      var p = Math.max(0, Math.min(1, (raw - 0.12) / 0.7));
      line.style.setProperty('--car-p', p.toFixed(4));
    };
    if (reduceMotion) {
      line.style.setProperty('--car-p', '0');
    } else {
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(place); } }, { passive: true });
      window.addEventListener('resize', place);
      place();
    }
  }

  /* ── 3. live prices on the menu board ───────────────── */
  function syncMenu(cfg) {
    if (!cfg || !cfg.packages) return;
    document.querySelectorAll('[data-package-card]').forEach(function (row) {
      var code = row.getAttribute('data-package-card');
      if (code === 'carpet') return;                       // priced per metre in the markup
      var pkg = cfg.packages.filter(function (p) { return p.code === code; })[0];
      var priceEl = row.querySelector('.menu-item__price strong:not(.menu-item__ask)');
      if (pkg && priceEl && Number(pkg.price) > 0) priceEl.textContent = String(Number(pkg.price));
    });
    var note = document.getElementById('carExtrasNote');
    if (note && cfg.carTypes) {
      var parts = cfg.carTypes.filter(function (c) { return Number(c.extra) > 0; })
        .map(function (c) { return c.name + ' +' + Number(c.extra); });
      if (parts.length) note.textContent = parts.join(' · ');
    }
  }
  window.drcareSyncMenu = syncMenu;
  if (window.__drcareConfig) syncMenu(window.__drcareConfig);
})();
