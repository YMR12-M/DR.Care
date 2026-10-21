import { ArrowLeft } from 'lucide-react';
import NeonEmblem from './NeonEmblem';
import Button from '../ui/Button';

/* Empty / signed-out states: the neon sign, switched half-off, with one clear next step. */
export default function EmptyState({ title, text, action, onAction, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 text-center ${className}`}>
      <NeonEmblem size={120} className="mb-5" style={{ opacity: 0.55 }} />
      <h2 className="font-display text-[1.7rem] leading-none mb-2">{title}</h2>
      <p className="text-sm mb-6 max-w-[17rem] leading-relaxed" style={{ color: 'var(--muted)' }}>{text}</p>
      {action && <Button size="lg" onClick={onAction} style={{ minWidth: 220 }}>{action} <ArrowLeft size={20} strokeWidth={3} /></Button>}
    </div>
  );
}
