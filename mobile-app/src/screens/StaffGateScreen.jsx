import { useNavigate } from 'react-router-dom';
import { ReceiptText, LayoutDashboard, ChevronLeft } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import IconBadge from '../components/ui/IconBadge';

function OptionCard({ icon, title, subtitle, onClick }) {
  return (
    <Card as="button" type="button" onClick={onClick} className="w-full p-4 flex items-center gap-3 text-right active:scale-[0.98] transition-transform">
      <IconBadge icon={icon} size="md" tone="yellow" />
      <div className="flex-1">
        <p className="text-sm font-black" style={{ color: 'var(--white)' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{subtitle}</p>
      </div>
      <ChevronLeft size={16} style={{ color: 'var(--muted-2)' }} />
    </Card>
  );
}

export default function StaffGateScreen() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-3" style={{ background: 'var(--black)' }}>
      <p className="text-xs font-black mb-2" style={{ color: 'var(--muted)' }}>دخول الموظفين — اختار النظام</p>
      <OptionCard icon={ReceiptText} title="نظام الفواتير POS" subtitle="فتح فاتورة بكود الموظف" onClick={() => navigate('/pos')} />
      <OptionCard icon={LayoutDashboard} title="لوحة الأدمن" subtitle="حجوزات، أرباح، عربيات مميزة" onClick={() => navigate('/admin')} />
      <Button variant="ghost" size="md" className="mt-2" onClick={() => navigate('/profile')}>رجوع</Button>
    </div>
  );
}
