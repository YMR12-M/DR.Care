import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const SERVICES = [
  { id: 'basic', name: 'غسيل عادي', icon: '🚗', desc: 'خارجي + تنظيف داخلي', price: 'من 60 جنيه' },
  { id: 'full', name: 'غسيل شامل', icon: '✨', desc: 'خارجي + داخلي + بولش', price: 'من 100 جنيه' },
  { id: 'detailing', name: 'ديتيلينج', icon: '💎', desc: 'تلميع احترافي كامل', price: 'من 250 جنيه' },
  { id: 'engine', name: 'غسيل موتور', icon: '⚙️', desc: 'تنظيف حجرة المحرك', price: 'من 80 جنيه' },
];

function StarIcon({ filled }) {
  return (
    <svg className={`w-4 h-4 ${filled ? 'text-amber-400' : 'text-slate-200'}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch('../api/reviews.php', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => setReviews((d.reviews || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <div className="h-full overflow-y-auto scroll-hide main-content bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">DR</div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">DR.Care</p>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">مغسلة عربيات مصرية</p>
          </div>
        </div>
        {user ? (
          <button onClick={() => navigate('/profile')} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
              {user.name?.[0] || 'أ'}
            </div>
          </button>
        ) : (
          <button onClick={() => navigate('/login')} className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
            تسجيل دخول
          </button>
        )}
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white px-5 pt-8 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 text-8xl">🚗</div>
          <div className="absolute bottom-4 left-4 text-6xl">💧</div>
        </div>
        <div className="relative">
          <p className="text-blue-200 text-sm font-medium mb-1">أهلاً بك في</p>
          <h1 className="text-3xl font-black mb-2 leading-tight">DR.Care<br/>مغسلة عربيات مصرية</h1>
          <p className="text-blue-100 text-sm mb-6 leading-relaxed">احجز غسلة عربيتك أونلاين — أسعار واضحة ومتابعة لحظية</p>
          <button
            onClick={() => navigate('/book')}
            className="bg-white text-blue-700 font-bold px-6 py-3 rounded-2xl text-sm shadow-lg active:scale-95 transition-transform"
          >
            احجز دلوقتي ←
          </button>
        </div>
      </div>

      {/* Services */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h2 className="text-sm font-bold text-slate-800 mb-3">خدماتنا</h2>
          <div className="grid grid-cols-2 gap-2">
            {SERVICES.map(s => (
              <button
                key={s.id}
                onClick={() => navigate('/book', { state: { service: s.id } })}
                className="flex flex-col items-start p-3 rounded-xl border border-slate-100 bg-slate-50 active:bg-blue-50 active:border-blue-200 transition-colors text-right"
              >
                <span className="text-2xl mb-1">{s.icon}</span>
                <p className="text-sm font-bold text-slate-800 leading-none">{s.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                <p className="text-xs font-bold text-blue-600 mt-1.5">{s.price}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Book CTA */}
      <div className="px-4 mt-4">
        <button
          onClick={() => navigate('/book')}
          className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
        >
          <span>📅</span>
          احجز موعد الآن
        </button>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="px-4 mt-6 pb-4">
          <h2 className="text-sm font-bold text-slate-800 mb-3">آراء العملاء</h2>
          <div className="flex gap-3 overflow-x-auto scroll-hide pb-2">
            {reviews.map((r, i) => (
              <div key={i} className="min-w-[220px] bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="flex mb-2">
                  {[1,2,3,4,5].map(n => <StarIcon key={n} filled={n <= (r.rating || 5)} />)}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{r.comment || r.review}</p>
                <p className="text-[11px] font-medium text-slate-400 mt-2">{r.customer_name || 'عميل'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
