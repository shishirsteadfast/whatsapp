import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Loader2, FileText, AlertTriangle, Info, XCircle, X, Calendar } from 'lucide-react';
import type { AuditLog } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useActivityLogQuery, useSessionsQuery } from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';

const ACTIONS = [
  'user_login',
  'user_login_failed',
  'session_created',
  'session_started',
  'session_stopped',
  'session_deleted',
  'session_qr_generated',
  'session_connected',
  'session_disconnected',
  'webhook_created',
  'webhook_deleted',
  'webhook_triggered',
  'webhook_failed',
] as const;

const severityConfig: Record<string, { pillClass: string; Icon: typeof Info }> = {
  info:  { pillClass: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',    Icon: Info },
  warn:  { pillClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400', Icon: AlertTriangle },
  error: { pillClass: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400',        Icon: XCircle },
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function ActivityLog() {
  const { t } = useTranslation();
  useDocumentTitle(t('activityLog.title'));

  const [searchInput,    setSearchInput]    = useState('');
  const [actionFilter,   setActionFilter]   = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sessionFilter,  setSessionFilter]  = useState('');
  const [startDate,      setStartDate]      = useState('');
  const [endDate,        setEndDate]        = useState('');
  const [page,           setPage]           = useState(1);
  const limit = 20;

  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const { data: sessions } = useSessionsQuery();

  const filters = useMemo(() => ({
    action: actionFilter || undefined,
    severity: severityFilter || undefined,
    sessionId: sessionFilter || undefined,
    startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
    endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
    search: debouncedSearch || undefined,
  }), [actionFilter, severityFilter, sessionFilter, startDate, endDate, debouncedSearch]);

  const { data, isLoading, isFetching } = useActivityLogQuery(filters, page, limit);
  const logs: AuditLog[] = data?.data ?? [];
  const total: number    = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const hasActiveFilters = !!(actionFilter || severityFilter || sessionFilter || startDate || endDate || searchInput);

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    setSearchInput('');
    setActionFilter('');
    setSeverityFilter('');
    setSessionFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const formatDate = (date: string) => new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title={t('activityLog.title')}
        subtitle={t('activityLog.subtitle')}
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="search-bar max-w-[300px] flex-1 max-sm:max-w-none">
          <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            placeholder={t('activityLog.searchPlaceholder')}
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); resetPage(); }}
          />
        </div>

        <FilterSelect
          icon={<Filter size={13} />}
          value={actionFilter}
          onChange={v => { setActionFilter(v); resetPage(); }}
        >
          <option value="">{t('activityLog.filters.allActions')}</option>
          {ACTIONS.map(action => (
            <option key={action} value={action}>{t(`activityLog.actions.${action}`)}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          icon={<Filter size={13} />}
          value={severityFilter}
          onChange={v => { setSeverityFilter(v); resetPage(); }}
        >
          <option value="">{t('logs.severity.all')}</option>
          <option value="info">{t('logs.severity.info')}</option>
          <option value="warn">{t('logs.severity.warn')}</option>
          <option value="error">{t('logs.severity.error')}</option>
        </FilterSelect>

        <FilterSelect
          icon={<Filter size={13} />}
          value={sessionFilter}
          onChange={v => { setSessionFilter(v); resetPage(); }}
        >
          <option value="">{t('activityLog.filters.allSessions')}</option>
          {(sessions ?? []).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </FilterSelect>

        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); resetPage(); }}
            max={endDate || undefined}
            className="cursor-pointer rounded-[var(--radius)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-[0.8125rem] text-[var(--color-ink)] outline-none"
          />
          <span className="text-[var(--color-ink-muted)]">–</span>
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); resetPage(); }}
            min={startDate || undefined}
            className="cursor-pointer rounded-[var(--radius)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-[0.8125rem] text-[var(--color-ink)] outline-none"
          />
        </div>

        {hasActiveFilters && (
          <button className="btn-secondary !py-1.5 !px-2.5 !text-[0.75rem]" onClick={clearFilters}>
            <X size={13} />
            {t('activityLog.filters.clear')}
          </button>
        )}

        {isFetching && !isLoading && (
          <Loader2 size={15} className="animate-spin text-[var(--color-ink-muted)]" />
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-muted)]">
                <FileText size={26} strokeWidth={1.2} className="text-[var(--color-ink-muted)]" />
              </div>
              <h3>{t('logs.empty.title')}</h3>
              <p>{t('logs.empty.description')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: 700 }}>
                <div className="table-header grid-cols-[170px_200px_130px_120px_1fr_100px]">
                  <span>{t('logs.columns.timestamp')}</span>
                  <span>{t('logs.columns.action')}</span>
                  <span>{t('logs.columns.session')}</span>
                  <span>{t('logs.columns.ip')}</span>
                  <span>{t('logs.columns.user')}</span>
                  <span>{t('logs.columns.severity')}</span>
                </div>

                {logs.map(log => {
                  const sev = severityConfig[log.severity] || { pillClass: 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]', Icon: Info };
                  const SevIcon = sev.Icon;
                  return (
                    <div
                      key={log.id}
                      className="table-row-base grid-cols-[170px_200px_130px_120px_1fr_100px] max-sm:flex max-sm:flex-col max-sm:gap-1.5 max-sm:px-4 max-sm:py-3"
                    >
                      <span className="font-mono text-[0.75rem] text-[var(--color-ink-muted)]">{formatDate(log.createdAt)}</span>
                      <span className="text-[0.875rem] font-semibold text-[var(--color-ink)]">
                        {t(`activityLog.actions.${log.action}`, { defaultValue: log.action })}
                      </span>
                      <span className="text-[0.8125rem] text-[var(--color-ink-secondary)]">{log.sessionName || log.sessionId || '—'}</span>
                      <span className="font-mono text-[0.8125rem] text-[var(--color-ink-secondary)]">{log.ipAddress || '—'}</span>
                      <span className="text-[0.8125rem] text-[var(--color-ink-secondary)]">{log.userName || '—'}</span>
                      <span>
                        <span className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide ${sev.pillClass}`}>
                          <SevIcon size={11} />
                          {log.severity}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between gap-2 max-sm:flex-col">
          <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">
            {t('logs.pagination', { page, total: totalPages, count: total })}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              className="btn-secondary px-3.5 py-2 text-[0.8125rem] disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              {t('common.previous')}
            </button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius)] border text-[0.875rem] font-medium transition-all ${
                    p === page
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_2px_8px_rgba(37,211,102,0.3)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-muted)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              className="btn-secondary px-3.5 py-2 text-[0.8125rem] disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  icon,
  value,
  onChange,
  children,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-0.5">
      <span className="shrink-0 text-[var(--color-ink-muted)]">{icon}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="cursor-pointer border-none bg-transparent py-2 text-[0.875rem] text-[var(--color-ink)] outline-none w-auto max-w-[160px]"
      >
        {children}
      </select>
    </div>
  );
}
