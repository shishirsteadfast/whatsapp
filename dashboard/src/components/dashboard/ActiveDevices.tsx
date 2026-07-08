import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ArrowRight } from 'lucide-react';
import type { Session } from '../../services/api';
import { formatRelativeTime } from '../../utils/time';

function statusPillClass(status: string): string {
  if (status === 'ready') return 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]';
  if (['connecting', 'initializing', 'qr_ready'].includes(status)) return 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400';
  return 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]';
}

export function ActiveDevices({ sessions }: { sessions: Session[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sorted = [...sessions]
    .sort((a, b) => {
      if (a.status === 'ready' && b.status !== 'ready') return -1;
      if (b.status === 'ready' && a.status !== 'ready') return 1;
      return new Date(b.lastActive ?? b.updatedAt).getTime() - new Date(a.lastActive ?? a.updatedAt).getTime();
    })
    .slice(0, 5);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
        <div>
          <h2 className="m-0 text-[0.9375rem] font-semibold text-[var(--color-ink)]">{t('dashboard.activeDevices.title')}</h2>
          <p className="m-0 mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">{t('dashboard.activeDevices.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/sessions')}
          className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[0.8125rem] font-semibold text-[var(--color-primary)] transition-all hover:gap-2"
        >
          {t('common.viewAll')} <ArrowRight size={14} />
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state py-10">
          <Smartphone size={30} strokeWidth={1.2} className="mb-2 opacity-25" />
          <p>{t('dashboard.activeDevices.empty')}</p>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {sorted.map(session => (
            <li
              key={session.id}
              className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5 last:border-none"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-surface)]">
                <Smartphone size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[0.875rem] font-medium text-[var(--color-ink)]">{session.name}</p>
                <p className="m-0 truncate text-[0.75rem] text-[var(--color-ink-muted)]">{session.phone || '—'}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`pill ${statusPillClass(session.status)}`}>
                  {t(`sessionStatus.${session.status}`, { defaultValue: session.status })}
                </span>
                <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">{formatRelativeTime(session.lastActive, t)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
