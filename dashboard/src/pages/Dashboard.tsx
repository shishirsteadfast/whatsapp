import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Webhook, Activity, Loader2, ArrowRight, TrendingUp } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSessionsQuery, useSessionStatsQuery, useWebhooksQuery, useStopSessionMutation } from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';

export function Dashboard() {
  const { t } = useTranslation();
  useDocumentTitle(t('dashboard.title'));
  const navigate = useNavigate();
  const { data: sessions = [], isLoading: loadingSessions, error: sessionsError } = useSessionsQuery();
  const { data: stats } = useSessionStatsQuery();
  const { data: webhooks = [] } = useWebhooksQuery();
  const stopMutation = useStopSessionMutation();

  const loading = loadingSessions;
  const error = sessionsError instanceof Error ? sessionsError.message : sessionsError ? t('dashboard.loadError') : null;

  const handleDisconnect = async (id: string) => {
    try { await stopMutation.mutateAsync(id); } catch { /* handled */ }
  };

  const statsCards = [
    { label: t('dashboard.stats.activeSessions'),   value: stats?.active ?? 0,    icon: MessageSquare, accent: 'var(--color-primary)',  bg: 'var(--color-primary-dim)' },
    { label: t('dashboard.stats.messagesToday'),    value: '—',                   icon: Send,          accent: '#6366f1',              bg: 'rgba(99,102,241,0.1)' },
    { label: t('dashboard.stats.webhooksConfigured'),value: webhooks.length,       icon: Webhook,       accent: '#f59e0b',              bg: 'rgba(245,158,11,0.1)' },
    { label: t('dashboard.stats.apiCalls'),         value: '—',                   icon: Activity,      accent: '#ec4899',              bg: 'rgba(236,72,153,0.1)' },
  ];

  const formatLastActive = (date?: string) => {
    if (!date) return t('common.never');
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000)   return t('common.justNow');
    if (diff < 3600000) return t('common.minAgo',   { count: Math.floor(diff / 60000) });
    if (diff < 86400000)return t('common.hoursAgo', { count: Math.floor(diff / 3600000) });
    return new Date(date).toLocaleDateString();
  };

  const statusColor = (status: string) => {
    if (status === 'ready')       return 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]';
    if (['connecting','initializing','qr_ready'].includes(status)) return 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400';
    return 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]';
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-[var(--radius)] border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
          {t('dashboard.errorPrefix', { message: error })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        badge={
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide ${stats && stats.ready > 0 ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]' : 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${stats && stats.ready > 0 ? 'animate-[pulse-ring_1.8s_ease_infinite] bg-[var(--color-primary)]' : 'bg-[var(--color-ink-muted)]'}`} />
            {stats && stats.ready > 0 ? t('common.connected') : t('common.disconnected')}
          </span>
        }
      />

      {/* Stat cards */}
      <div className="mb-7 grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {statsCards.map(({ label, value, icon: Icon, accent, bg }) => (
          <div
            key={label}
            className="card group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
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
              <div className="mt-2 flex items-center gap-1 text-[0.75rem] font-medium" style={{ color: accent }}>
                <TrendingUp size={12} />
                <span>{typeof value === 'number' && value > 0 ? t('dashboard.statActive', { count: value }) : t('dashboard.statNoData')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sessions table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="m-0 text-[0.9375rem] font-semibold text-[var(--color-ink)]">{t('dashboard.sessionsOverview')}</h2>
            <p className="m-0 mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">
              {t('dashboard.showingSessions', { shown: sessions.length, total: stats?.total ?? 0 })}
            </p>
          </div>
          <button
            onClick={() => navigate('/sessions')}
            className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--color-primary)] transition-all hover:gap-2 cursor-pointer border-none bg-transparent p-0"
          >
            {t('common.viewAll')} <ArrowRight size={14} />
          </button>
        </div>

        {/* Header */}
        <div className="table-header grid-cols-[130px_1fr_120px_1fr_160px] max-md:hidden">
          <span>{t('dashboard.columns.sessionId')}</span>
          <span>{t('dashboard.columns.phone')}</span>
          <span>{t('dashboard.columns.status')}</span>
          <span>{t('dashboard.columns.lastActive')}</span>
          <span className="text-right">{t('dashboard.columns.actions')}</span>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state py-12">
            <MessageSquare size={36} strokeWidth={1.2} className="mb-3 opacity-25" />
            <h3>{t('dashboard.noSessions')}</h3>
            <p>{t('sessions.empty.description')}</p>
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              className="table-row-base grid-cols-[130px_1fr_120px_1fr_160px] max-md:flex max-md:flex-col max-md:gap-1.5 max-md:px-4 max-md:py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[0.75rem] font-medium text-[var(--color-ink)]">{session.id.substring(0, 12)}</span>
                <span className="max-w-[130px] truncate text-[0.75rem] text-[var(--color-ink-muted)]" title={session.name}>{session.name}</span>
              </div>
              <span className="text-[0.875rem] text-[var(--color-ink)]">{session.phone || '—'}</span>
              <span className={`pill w-fit ${statusColor(session.status)}`}>
                {t(`sessionStatus.${session.status}`, { defaultValue: session.status })}
              </span>
              <span className="text-[0.875rem] text-[var(--color-ink-secondary)]">{formatLastActive(session.lastActive)}</span>
              <div className="flex justify-end gap-2">
                <button
                  className="btn-secondary py-1.5 px-3 text-[0.8125rem]"
                  onClick={() => navigate('/sessions')}
                >
                  {t('dashboard.view')}
                </button>
                {['ready','initializing','connecting','qr_ready'].includes(session.status) && (
                  <button
                    className="inline-flex items-center gap-1.5 cursor-pointer rounded-[var(--radius)] border border-red-200 bg-red-50 px-3 py-1.5 text-[0.8125rem] font-medium text-red-600 transition-all hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
                    onClick={() => handleDisconnect(session.id)}
                  >
                    {t('dashboard.disconnect')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
