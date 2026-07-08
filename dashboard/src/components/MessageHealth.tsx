import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Loader2, RefreshCw, Send } from 'lucide-react';
import type { SessionHealth, SessionConnectivity } from '../services/api';

function ConnectivityBadge({ connectivity }: { connectivity: SessionConnectivity }) {
  const { t } = useTranslation();

  const config: Record<SessionConnectivity, { icon: React.ReactNode; className: string }> = {
    connected: {
      icon: <CheckCircle2 size={13} />,
      className: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
    },
    degraded: {
      icon: <AlertTriangle size={13} />,
      className: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    },
    unreachable: {
      icon: <XCircle size={13} />,
      className: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    },
    not_connected: {
      icon: <MinusCircle size={13} />,
      className: 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]',
    },
  };

  const { icon, className } = config[connectivity];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${className}`}>
      {icon}
      {t(`messageHealth.connectivity.${connectivity}`)}
    </span>
  );
}

export function MessageHealthPanel({
  sessions,
  isLoading,
  isFetching,
  onRefresh,
  onTestSend,
  testSendingId,
}: {
  sessions: SessionHealth[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onTestSend: (sessionId: string) => void;
  testSendingId: string | null;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="m-0 text-[0.875rem] font-semibold text-[var(--color-ink)]">
            {t('messageHealth.title')}
          </h3>
          <p className="m-0 mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">
            {t('messageHealth.subtitle')}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary !py-1.5 !px-2.5 !text-[0.75rem] shrink-0"
          onClick={onRefresh}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {t('messageHealth.refresh')}
        </button>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="m-0 text-[0.8125rem] text-[var(--color-ink-muted)]">{t('messageHealth.noSessions')}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[0.8125rem] font-semibold text-[var(--color-ink)]">
                    {session.name}
                  </p>
                  <p className="m-0 mt-0.5 flex flex-wrap items-center gap-2 text-[0.75rem] text-[var(--color-ink-muted)]">
                    <span>
                      {session.phone
                        ? `+${session.phone}`
                        : t('messageHealth.noPhone')}
                    </span>
                    <span>·</span>
                    <span>{t(`sessionStatus.${session.status}`, { defaultValue: session.status })}</span>
                  </p>
                </div>

                <ConnectivityBadge connectivity={session.connectivity} />

                <button
                  type="button"
                  className="btn-secondary !py-1.5 !px-2.5 !text-[0.75rem] shrink-0"
                  onClick={() => onTestSend(session.id)}
                  disabled={session.connectivity !== 'connected' || testSendingId !== null}
                  title={session.connectivity !== 'connected' ? t('messageHealth.testSendDisabledHint') : undefined}
                >
                  {testSendingId === session.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  {t('messageHealth.testSend')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
