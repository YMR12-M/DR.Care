import { Droplets, Sparkles, Zap, Car, Settings, Shield, FlaskConical, LayoutGrid, Layers } from 'lucide-react';

/* Single source of truth for per-package presentation (blurb / "popular" flag / typical duration).
   Shared by Home, Booking and POS so they stay in sync.
   The rainbow colour-per-service scheme is retired: every service is brand yellow, and the
   menu-board numbering + prices carry the hierarchy instead. `icon` is kept only for the staff
   POS screen's compact tiles. */
export const PACKAGE_VISUALS = {
  'inside-out': { icon: Sparkles,     color: 'var(--yellow)', desc: 'تنظيف كامل داخلي وخارجي',      popular: true, mins: 45 },
  outside:      { icon: Droplets,     color: 'var(--yellow)', desc: 'فوم وشطف وتنشيف للبودي',        popular: true, mins: 20 },
  deep:         { icon: Zap,          color: 'var(--yellow)', desc: 'تنظيف عميق بمعدات متخصصة',      popular: true, mins: 90 },
  rims:         { icon: Car,          color: 'var(--yellow)', desc: 'تنظيف وتلميع الجنوط والكاوتش',  popular: true, mins: 20 },
  engine:       { icon: Settings,     color: 'var(--yellow)', desc: 'تنظيف حجرة الموتور بدقة',        mins: 30 },
  blanket:      { icon: Shield,       color: 'var(--yellow)', desc: 'غسيل وتغليف — للقطعة',            mins: 30 },
  cover:        { icon: Layers,       color: 'var(--yellow)', desc: 'غسيل وتنشيف غطاء العربية',       mins: 15 },
  chemical:     { icon: FlaskConical, color: 'var(--yellow)', desc: 'مواد متخصصة — السعر بعد الفحص' },
  carpet:       { icon: LayoutGrid,   color: 'var(--yellow)', desc: 'غسيل وتغليف — السعر حسب المساحة' },
};

export function getPackageVisual(code) {
  return PACKAGE_VISUALS[code] || { icon: Sparkles, color: 'var(--yellow)', desc: '' };
}

/* Packages in menu-board order: the popular ones first, the rest as the API returns them. */
export function sortForMenu(packages) {
  const pop = [], rest = [];
  packages.forEach(p => (getPackageVisual(p.code).popular ? pop : rest).push(p));
  return [...pop, ...rest];
}
