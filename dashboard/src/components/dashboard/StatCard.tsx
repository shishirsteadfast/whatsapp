import type { LucideIcon } from 'lucide-react';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent: string;
  bg: string;
  hint?: string;
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({ label, value, icon: Icon, accent, bg, hint, onClick, active }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`card group relative overflow-hidden p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${
        onClick ? 'cursor-pointer' : ''
      } ${active ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-muted)]' : ''}`}
    >
      <div
        className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110"
        style={{ background: bg }}
      />
      <div className="relative">
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-[0.75rem] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">{label}</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ background: bg }}>
            <Icon size={16} style={{ color: accent }} />
          </div>
        </div>
        <div className="text-[2rem] font-bold leading-none tracking-tight text-[var(--color-ink)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {hint && (
          <div className="mt-2 flex items-center gap-1 text-[0.75rem] font-medium" style={{ color: accent }}>
            <TrendingUp size={12} />
            <span>{hint}</span>
          </div>
        )}
      </div>
    </Tag>
  );
}
