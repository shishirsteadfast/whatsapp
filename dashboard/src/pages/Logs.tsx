import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Search, Filter, Loader2, FileText, AlertTriangle, Info, XCircle } from 'lucide-react';
import type { AuditLog } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLogsQuery } from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';

const severityConfig: Record<string, { label: string; pillClass: string; Icon: typeof Info }> = {
  info:  { label: 'Info',    pillClass: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',    Icon: Info },
  warn:  { label: 'Warning', pillClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400', Icon: AlertTriangle },
  error: { label: 'Error',   pillClass: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400',        Icon: XCircle },
};

export function Logs() {
  const { t } = useTranslation();
  useDocumentTitle(t('logs.title'));

  const [searchQuery,    setSearchQuery]    = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page,           setPage]           = useState(1);
  const limit = 20;

  const severityParam = severityFilter !== 'all' ? severityFilter : undefined;
  const { data, isLoading } = useLogsQuery({ severity: severityParam, page, limit });
  const logs: AuditLog[] = data?.data ?? [];
  const total: number    = data?.total ?? 0;

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.errorMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(total / limit);
  const formatDate = (date: string) => new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title={t('logs.title')}
        subtitle={t('logs.subtitle')}
        actions={
          <button className="btn-secondary">
            <Download size={15} />
            {t('logs.exportCsv')}
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex gap-3 max-sm:flex-col">
        <div className="search-bar max-w-[360px] flex-1 max-sm:max-w-none">
          <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            placeholder={t('logs.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 rounded-[var(--radius)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-0.5">
          <Filter size={13} className="shrink-0 text-[var(--color-ink-muted)]" />
          <select
            value={severityFilter}
            onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
            className="cursor-pointer border-none bg-transparent py-2 text-[0.875rem] text-[var(--color-ink)] outline-none w-auto"
          >
            <option value="all">{t('logs.severity.all')}</option>
            <option value="info">{t('logs.severity.info')}</option>
            <option value="warn">{t('logs.severity.warn')}</option>
            <option value="error">{t('logs.severity.error')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filteredLogs.length === 0 ? (
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
              {/* Header */}
              <div className="table-header grid-cols-[170px_200px_130px_120px_1fr_100px]">
                <span>{t('logs.columns.timestamp')}</span>
                <span>{t('logs.columns.action')}</span>
                <span>{t('logs.columns.session')}</span>
                <span>{t('logs.columns.ip')}</span>
                <span>{t('logs.columns.user')}</span>
                <span>{t('logs.columns.severity')}</span>
              </div>

              {filteredLogs.map(log => {
                const sev = severityConfig[log.severity] || { label: log.severity, pillClass: 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]', Icon: Info };
                const SevIcon = sev.Icon;
                return (
                  <div
                    key={log.id}
                    className="table-row-base grid-cols-[170px_200px_130px_120px_1fr_100px] max-sm:flex max-sm:flex-col max-sm:gap-1.5 max-sm:px-4 max-sm:py-3"
                  >
                    {/* Timestamp */}
                    <span className="font-mono text-[0.75rem] text-[var(--color-ink-muted)]">{formatDate(log.createdAt)}</span>

                    {/* Action */}
                    <span className="text-[0.875rem] font-semibold text-[var(--color-ink)]">{log.action}</span>

                    {/* Session */}
                    <span className="text-[0.8125rem] text-[var(--color-ink-secondary)]">{log.sessionName || log.sessionId || '—'}</span>

                    {/* IP */}
                    <span className="font-mono text-[0.8125rem] text-[var(--color-ink-secondary)]">{log.ipAddress || '—'}</span>

                    {/* User */}
                    <span className="text-[0.8125rem] text-[var(--color-ink-secondary)]">{log.userName || '—'}</span>

                    {/* Severity */}
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
