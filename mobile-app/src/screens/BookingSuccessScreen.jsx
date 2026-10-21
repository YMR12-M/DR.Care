import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import NeonEmblem from '../components/brand/NeonEmblem';
import Plate from '../components/brand/Plate';
import Ticket, { TicketField } from '../components/brand/Ticket';
import { Mixed } from '../lib/bidi';

/* The booking comes out of the machine as a paper ticket and gets a rubber stamp. */
export default function BookingSuccessScreen() {
  const navigate    = useNavigate();
  const { state }   = useLocation();
  const booking     = state?.booking;

  useEffect(() => { if (!booking) navigate('/'); }, [booking, navigate]);
  if (!booking) return null;

  const total = booking.total ?? booking.totalLabel;

  return (
    <div className="h-full overflow-y-auto scroll-hide flex flex-col items-center px-5 pt-10 pb-10 text-center" style={{ background: 'var(--black)', paddingTop: 'calc(2.5rem + var(--safe-top))' }}>
      <NeonEmblem size={86} animate />
      <h1 className="font-display text-[2.7rem] leading-none mt-5 fade-in">الحجز اتسجّل</h1>
      <p className="text-sm mt-2.5 mb-7 leading-relaxed fade-in fade-in-1" style={{ color: 'var(--muted)' }}>
        اتفضّل تذكرتك — هنأكد معاك الميعاد قريب
      </p>

      <div className="relative w-full text-right">
        <Ticket
          print seed={booking.id}
          stub={
            <div className="flex items-center justify-between gap-3">
              {booking.plate ? <Plate value={booking.plate} size="sm" /> : <span className="ticket__k">احتفظ بالرقم ده</span>}
              <span className="font-display text-[1.5rem] leading-none" dir="ltr">#{booking.id}</span>
            </div>
          }
        >
          <p className="ticket__k" style={{ letterSpacing: '0.12em' }}>DR.CARE · تذكرة غسيل</p>
          <div className="mt-2 mb-1">
            <div className="ticket__k">رقم الحجز</div>
            <div className="font-display text-[3.4rem] leading-none" dir="ltr" style={{ textAlign: 'right' }}>#{booking.id}</div>
          </div>
          <div className="ticket__rule" />
          <div className="ticket__grid grid grid-cols-2 gap-x-4 gap-y-3">
            {booking.packageName && <TicketField label="الغسلة"><Mixed>{booking.packageName}</Mixed></TicketField>}
            {booking.carName && <TicketField label="العربية">{booking.carName}</TicketField>}
            {booking.when && <TicketField label="الميعاد">{booking.when}</TicketField>}
            {total ? <TicketField label="الإجمالي">{typeof total === 'number' ? `${total} ج` : total}</TicketField> : null}
          </div>
        </Ticket>

        <span
          aria-hidden="true"
          className="absolute font-display pointer-events-none"
          style={{
            top: 16, left: 14, padding: '2px 12px 0', fontSize: '1.7rem', lineHeight: 1.25,
            color: 'var(--plate)', border: '3px solid var(--plate)', borderRadius: 6, opacity: 0.88,
            mixBlendMode: 'multiply', animation: 'stampIn 0.45s 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.2) both', transform: 'rotate(-6deg)',
          }}
        >
          اتحجز
        </span>
      </div>

      <div className="w-full flex flex-col gap-3 mt-8 fade-in fade-in-4">
        <Button size="lg" onClick={() => navigate('/bookings')} className="w-full">تابع حجوزاتي <ArrowLeft size={22} strokeWidth={3} /></Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/')} className="w-full">الرئيسية</Button>
      </div>
    </div>
  );
}
