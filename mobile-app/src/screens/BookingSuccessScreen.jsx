import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { CheckCircle2, ClipboardList, Home } from 'lucide-react';
import Button from '../components/ui/Button';

export default function BookingSuccessScreen() {
  const navigate    = useNavigate();
  const { state }   = useLocation();
  const booking     = state?.booking;

  useEffect(() => { if (!booking) navigate('/'); }, [booking, navigate]);
  if (!booking) return null;

  return (
    <div className="relative h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: 'var(--black)' }}>
      {/* glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'var(--yellow)' }}/>

      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 relative fade-in"
        style={{ background: 'var(--yellow-soft)', border: '1px solid var(--yellow-line)', boxShadow: 'var(--shadow-yellow-glow)' }}>
        <CheckCircle2 size={38} style={{ color: 'var(--yellow)' }} strokeWidth={2} />
      </div>
      <h1 className="text-2xl font-black mb-2 relative fade-in fade-in-1" style={{ color: 'var(--white)' }}>تم الحجز بنجاح!</h1>
      <p className="text-sm mb-6 leading-relaxed relative fade-in fade-in-2" style={{ color: 'var(--muted)' }}>
        شكراً ليك! هنتواصل معاك قريباً لتأكيد الموعد
      </p>

      {booking.id && (
        <div className="rounded-2xl p-5 w-full mb-6 text-right relative fade-in fade-in-3"
          style={{ background: 'var(--panel-2)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--line-2)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>رقم الحجز</p>
          <p className="text-xl font-black" style={{ color: 'var(--yellow)' }}>#{booking.id}</p>
        </div>
      )}

      <Button variant="primary" size="lg" onClick={() => navigate('/bookings')} className="w-full mb-3 relative fade-in fade-in-4">
        <span className="inline-flex items-center gap-2"><ClipboardList size={17}/> تابع حجوزاتي</span>
      </Button>
      <Button variant="secondary" size="lg" onClick={() => navigate('/')} className="w-full relative fade-in fade-in-5">
        <span className="inline-flex items-center gap-2"><Home size={17}/> الرئيسية</span>
      </Button>
    </div>
  );
}
