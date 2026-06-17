import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Webhook, Activity, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
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
  const error = sessionsError instanceof Error
    ? sessionsError.message
    : sessionsError
      ? t('dashboard.loadError')
      : null;
  const webhookCount = webhooks.length;

  const handleDisconnect = async (id: string) => {
    try {
      await stopMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const statsCards = [
    {
      label: t('dashboard.stats.activeSessions'),
      value: stats?.active ?? 0,
      icon: MessageSquare,
      trend: `+${stats?.ready ?? 0}`,
      trendUp: true,
    },
    { label: t('dashboard.stats.messagesToday'), value: '—', icon: Send, trend: '0', trendUp: null },
    { label: t('dashboard.stats.webhooksConfigured'), value: webhookCount, icon: Webhook, trend: '0', trendUp: null },
    { label: t('dashboard.stats.apiCalls'), value: '—', icon: Activity, trend: '0', trendUp: null },
  ];

  const formatLastActive = (date?: string) => {
    if (!date) return t('common.never');
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return t('common.justNow');
    if (diff < 3600000) return t('common.minAgo', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('common.hoursAgo', { count: Math.floor(diff / 3600000) });
    return new Date(date).toLocaleDateString();
  };

  const formatStatus = (status: string) => t(`sessionStatus.${status}`, { defaultValue: status });

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-100 p-4 text-red-600">
          {t('dashboard.errorPrefix', { message: error })}
        </div>
      </div>
    );
  }

  const statusColor = (status: string) => {
    if (status === 'ready') return 'bg-primary/10 text-primary';
    if (status === 'connecting' || status === 'initializing' || status === 'qr_ready') return 'bg-amber-100 text-amber-600';
    return 'bg-muted text-ink-muted';
  };

  return (
    <div className="w-full p-8 box-border max-sm:p-4">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        badge={
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
            stats && stats.ready > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-ink-muted'
          }`}>
            {stats && stats.ready > 0 ? t('common.connected') : t('common.disconnected')}
          </span>
        }
      />

      <div className="mb-8 grid w-full grid-cols-4 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-4">
        {statsCards.map(({ label, value, icon: Icon, trend, trendUp }) => (
          <div key={label} className="relative min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md">
            <Icon className="pointer-events-none absolute -bottom-[15px] -right-[10px] z-1 h-24 w-24 rotate-[-15deg] text-ink opacity-[0.04]" />
            <div className="relative z-2 mb-3 flex items-center justify-between">
              <span className="relative z-2 text-xs font-semibold uppercase tracking-wider text-ink-secondary">{label}</span>
              <Icon size={20} className="relative z-2 text-ink-muted" />
            </div>
            <div className="relative z-2 text-3xl font-bold text-ink">{typeof value === 'number' ? value.toLocaleString() : value}</div>
            {trend !== '0' && (
              <div className={`relative z-2 mt-2 flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-primary' : 'text-error'}`}>
                {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {trend}
              </div>
            )}
          </div>
        ))}
      </div>

      <section className="w-full rounded-xl border border-border bg-surface p-6 shadow-sm box-border">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-wider text-ink-secondary">{t('dashboard.sessionsOverview')}</h2>
          <span className="text-sm text-ink-muted">
            {t('dashboard.showingSessions', { shown: sessions.length, total: stats?.total ?? 0 })}
          </span>
        </div>

        <div className="flex w-full flex-col text-sm">
          <div className="grid grid-cols-[140px_200px_140px_1fr_180px] gap-4 border-b border-border bg-muted px-6 py-4 text-[0.7rem] font-bold uppercase tracking-wider text-ink-secondary rounded-t-[var(--radius)] max-md:hidden">
            <span>{t('dashboard.columns.sessionId')}</span>
            <span>{t('dashboard.columns.phone')}</span>
            <span>{t('dashboard.columns.status')}</span>
            <span>{t('dashboard.columns.lastActive')}</span>
            <span className="text-right">{t('dashboard.columns.actions')}</span>
          </div>
          {sessions.length === 0 ? (
            <div className="flex justify-center border-b border-border px-6 py-4 text-ink-muted">
              {t('dashboard.noSessions')}
            </div>
          ) : (
            sessions.map(session => (
              <div key={session.id} className="grid grid-cols-[140px_200px_140px_1fr_180px] items-center gap-4 border-b border-border px-6 py-4 last:border-b-0 max-md:flex max-md:flex-col max-md:gap-2 max-md:border-b max-md:px-4 max-md:py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="whitespace-nowrap font-mono text-xs text-ink">{session.id.substring(0, 12)}</span>
                  <span className="max-w-[140px] truncate text-xs text-ink-muted" title={session.name}>{session.name}</span>
                </div>
                <span className="whitespace-nowrap text-xs text-ink">{session.phone || '—'}</span>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusColor(session.status)}`}>{formatStatus(session.status)}</span>
                <span className="text-sm text-ink-secondary">{formatLastActive(session.lastActive)}</span>
                <div className="flex justify-end gap-2">
                  <button className="cursor-pointer rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-ink-secondary transition-all duration-200 hover:border-ink-muted hover:bg-surface" onClick={() => navigate('/sessions')}>
                    {t('dashboard.view')}
                  </button>
                  {['ready', 'initializing', 'connecting', 'qr_ready'].includes(session.status) && (
                    <button className="cursor-pointer rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-all duration-200 hover:bg-red-100" onClick={() => handleDisconnect(session.id)}>
                      {t('dashboard.disconnect')}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
