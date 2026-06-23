import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function BookingSuccessScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const booking = state?.booking;

  useEffect(() => {
    if (!booking) navigate('/');
  }, [booking, navigate]);

  if (!booking) return null;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl mb-5 animate-bounce">
        ✅
      </div>
      <h1 className="text-2xl font-black text-slate-800 mb-2">تم الحجز بنجاح!</h1>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        شكراً ليك! هنتواصل معاك قريباً لتأكيد الموعد
      </p>

      {booking.booking_id && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 w-full mb-6 text-right">
          <p className="text-xs text-slate-500 mb-1">رقم الحجز</p>
          <p className="text-xl font-black text-blue-700">#{booking.booking_id}</p>
        </div>
      )}

      <button
        onClick={() => navigate('/bookings')}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base mb-3 active:scale-95 transition-transform"
      >
        تابع حجوزاتي
      </button>
      <button
        onClick={() => navigate('/')}
        className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold text-base active:scale-95 transition-transform"
      >
        الرئيسية
      </button>
    </div>
  );
}
