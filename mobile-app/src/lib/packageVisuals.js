import { Droplets, Sparkles, Zap, Car, Settings, Shield, FlaskConical, LayoutGrid, Layers } from 'lucide-react';

/* Single source of truth for per-package visual identity (icon/color/description) —
   shared between HomeScreen and BookingScreen so both stay in sync automatically. */
export const PACKAGE_VISUALS = {
  'inside-out': { icon: Sparkles,      color: 'var(--yellow)',     desc: 'تنظيف كامل داخلي وخارجي',      popular: true },
  outside:      { icon: Droplets,      color: 'var(--cat-blue)',   desc: 'تنظيف خارجي شامل للسيارة' },
  deep:         { icon: Zap,           color: 'var(--cat-purple)', desc: 'غسيل متخصص عميق للغاية' },
  rims:         { icon: Car,           color: 'var(--cat-green)',  desc: 'تلميع وتنظيف الجنوط بالكامل' },
  engine:       { icon: Settings,      color: 'var(--cat-orange)', desc: 'تنظيف حجرة المحرك بدقة' },
  blanket:      { icon: Shield,        color: 'var(--cat-pink)',   desc: 'غسيل بطاطين وتفصيل' },
  cover:        { icon: Layers,        color: 'var(--cat-teal)',   desc: 'تغيير وتنظيف غطاء السيارة' },
  chemical:     { icon: FlaskConical,  color: 'var(--cat-indigo)', desc: 'غسيل كيماوي احترافي' },
  carpet:       { icon: LayoutGrid,    color: 'var(--cat-amber)',  desc: 'غسيل سجاد حسب المساحة' },
};

export function getPackageVisual(code) {
  return PACKAGE_VISUALS[code] || { icon: Sparkles, color: 'var(--yellow)', desc: '' };
}
