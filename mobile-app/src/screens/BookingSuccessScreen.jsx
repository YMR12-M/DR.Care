import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function BookingSuccessScreen() {
  const navigate    = useNavigate();
  const { state }   = useLocation();
  const booking     = state?.booking;

  useEffect(() => { if (!booking) navigate('/'); }, [booking, navigate]);
  if (!booking) return null;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
      {/* glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'var(--yellow)' }}/>

      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-5 relative"
        style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)' }}>
        ✅
      </div>
      <h1 className="text-2xl font-black mb-2 relative" style={{ color: 'var(--white)' }}>تم الحجز بنجاح!</h1>
      <p className="text-sm mb-6 leading-relaxed relative" style={{ color: 'var(--muted)' }}>
        شكراً ليك! هنتواصل معاك قريباً لتأكيد الموعد
      </p>

      {booking.id && (
        <div className="rounded-2xl p-4 w-full mb-6 text-right relative"
          style={{ background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>رقم الحجز</p>
          <p className="text-xl font-black" style={{ color: 'var(--yellow)' }}>#{booking.id}</p>
        </div>
      )}

      <button onClick={() => navigate('/bookings')} className="w-full btn-yellow py-4 rounded-2xl text-base mb-3 relative">
        تابع حجوزاتي
      </button>
      <button onClick={() => navigate('/')}
        className="w-full py-4 rounded-2xl text-base font-black relative"
        style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--white-2)' }}>
        الرئيسية
      </button>
    </div>
  );
}
