import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Webhook, Users, Megaphone, Activity, Loader2 } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useWebSocket } from '../hooks/useWebSocket';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';
import { MessageVolumeChart } from '../components/dashboard/MessageVolumeChart';
import { MessageStatusChart } from '../components/dashboard/MessageStatusChart';
import { CampaignPerformanceChart } from '../components/dashboard/CampaignPerformanceChart';
import { ActiveDevices } from '../components/dashboard/ActiveDevices';
import { RecentMessages } from '../components/dashboard/RecentMessages';
import {
  useSessionsQuery, useSessionStatsQuery, useWebhooksQuery, useMessagesQuery,
  useContactsQuery, useCampaignsQuery, useCampaignStatsQuery, useApiKeyStatsQuery,
  queryKeys,
} from '../hooks/queries';
import { bucketMessagesByDay, countMessagesByStatus, countMessagesToday } from '../utils/dashboardMetrics';

const MESSAGE_SAMPLE_SIZE = 500;

export function Dashboard() {
  const { t } = useTranslation();
  useDocumentTitle(t('dashboard.title'));
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: loadingSessions, error: sessionsError } = useSessionsQuery();
  const { data: stats } = useSessionStatsQuery();
  const { data: webhooks = [] } = useWebhooksQuery();
  const { data: messages = [], isLoading: loadingMessages } = useMessagesQuery({ limit: MESSAGE_SAMPLE_SIZE });
  const { data: contacts = [] } = useContactsQuery();
  const { data: campaignsPage } = useCampaignsQuery({ limit: 5 });
  const { data: campaignStats } = useCampaignStatsQuery();
  const { data: apiKeyStats } = useApiKeyStatsQuery();

  // Live updates: a new message or session status change invalidates the
  // relevant queries so every widget refreshes without manual polling.
  useWebSocket({
    onMessage: useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
    }, [queryClient]),
    onSessionStatus: useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessionStats });
    }, [queryClient]),
  });

  const loading = loadingSessions || loadingMessages;
  const error = sessionsError instanceof Error ? sessionsError.message : sessionsError ? t('dashboard.loadError') : null;

  const dailyVolume = useMemo(() => bucketMessagesByDay(messages, 14), [messages]);
  const statusBreakdown = useMemo(() => countMessagesByStatus(messages), [messages]);
  const messagesToday = useMemo(() => countMessagesToday(messages), [messages]);

  const campaignBars = useMemo(
    () => (campaignsPage?.campaigns ?? []).map(c => ({ name: c.name, sent: c.sentCount, failed: c.failedCount })),
    [campaignsPage],
  );

  const activeCampaigns = (campaignStats?.sending ?? 0) + (campaignStats?.scheduled ?? 0);

  const statsCards = [
    {
      label: t('dashboard.stats.activeSessions'),
      value: stats?.ready ?? 0,
      icon: MessageSquare,
      accent: 'var(--color-primary)',
      bg: 'var(--color-primary-dim)',
      hint: stats ? t('dashboard.statsHints.ofTotal', { total: stats.total }) : undefined,
    },
    {
      label: t('dashboard.stats.messagesToday'),
      value: messagesToday,
      icon: Send,
      accent: '#6366f1',
      bg: 'rgba(99,102,241,0.1)',
    },
    {
      label: t('dashboard.stats.contacts'),
      value: contacts.length,
      icon: Users,
      accent: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      label: t('dashboard.stats.activeCampaigns'),
      value: activeCampaigns,
      icon: Megaphone,
      accent: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
    },
    {
      label: t('dashboard.stats.webhooksConfigured'),
      value: webhooks.length,
      icon: Webhook,
      accent: '#ec4899',
      bg: 'rgba(236,72,153,0.1)',
    },
    {
      label: t('dashboard.stats.apiCalls'),
      value: apiKeyStats?.callsToday ?? 0,
      icon: Activity,
      accent: '#14b8a6',
      bg: 'rgba(20,184,166,0.1)',
    },
  ];

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
      <div className="mb-5 grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {statsCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Charts: main column (volume + campaigns) + right rail (status + devices) */}
      <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-1">
        <div className="col-span-2 flex flex-col gap-5 max-lg:col-span-1">
          <MessageVolumeChart data={dailyVolume} />
          <CampaignPerformanceChart data={campaignBars} />
        </div>
        <div className="col-span-1 flex flex-col gap-5">
          <MessageStatusChart data={statusBreakdown} sampleSize={messages.length} />
          <ActiveDevices sessions={sessions} />
        </div>
      </div>

      <div className="mt-5">
        <RecentMessages messages={messages} />
      </div>
    </div>
  );
}
