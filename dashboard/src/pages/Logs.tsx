import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Search, Filter, Loader2, FileText } from 'lucide-react';
import type { AuditLog } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLogsQuery } from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';

export function Logs() {
  const { t } = useTranslation();
  useDocumentTitle(t('logs.title'));
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const severityParam = severityFilter !== 'all' ? severityFilter : undefined;
  const { data, isLoading: loading } = useLogsQuery({ severity: severityParam, page, limit });
  const logs: AuditLog[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.errorMessage || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(total / limit);

  const formatTimestamp = (date: string) => new Date(date).toLocaleString();

  if (loading && logs.length === 0) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const severityStyles: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    warn: 'bg-amber-100 text-amber-600',
    error: 'bg-red-100 text-red-600',
  };

  return (
    <div className="w-full p-8 max-sm:p-3">
      <PageHeader
        title={t('logs.title')}
        subtitle={t('logs.subtitle')}
        actions={
          <button className="btn-secondary">
            <Download size={18} />
            {t('logs.exportCsv')}
          </button>
        }
      />

      <div className="mb-6 flex gap-4 max-sm:flex-col max-sm:gap-3">
        <div className="flex max-w-[400px] flex-1 items-center gap-3 rounded-(--radius) border border-border bg-surface px-4 py-3 max-sm:max-w-none">
          <Search size={18} className="shrink-0 text-ink-muted" />
          <input
            type="text"
            className="flex-1 border-none bg-transparent text-[0.9375rem] text-ink focus:outline-none"
            placeholder={t('logs.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 rounded-(--radius) border border-border bg-surface px-4">
          <Filter size={16} className="shrink-0 text-ink-muted" />
          <select
            className="cursor-pointer border-none bg-transparent py-3 text-[0.9375rem] text-ink focus:outline-none"
            value={severityFilter}
            onChange={e => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t('logs.severity.all')}</option>
            <option value="info">{t('logs.severity.info')}</option>
            <option value="warn">{t('logs.severity.warn')}</option>
            <option value="error">{t('logs.severity.error')}</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-xs max-sm:border-none max-sm:bg-transparent max-sm:shadow-none">
        <div className="flex flex-col text-sm max-sm:block">
          {/* Header row */}
          <div className="grid grid-cols-[180px_200px_150px_150px_150px_1fr_120px] gap-4 border-b border-border bg-muted px-6 py-4 text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary max-sm:hidden">
            <span>{t('logs.columns.timestamp')}</span>
            <span>{t('logs.columns.action')}</span>
            <span>{t('logs.columns.session')}</span>
            <span>{t('logs.columns.apiKey')}</span>
            <span>{t('logs.columns.ip')}</span>
            <span>{t('logs.columns.severity')}</span>
          </div>
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center text-ink-muted">
              <FileText size={48} strokeWidth={1} className="mb-4 text-ink-muted opacity-40" />
              <h3 className="m-0 mb-2 text-lg font-semibold text-ink-secondary">{t('logs.empty.title')}</h3>
              <p className="m-0 max-w-[300px] text-sm">{t('logs.empty.description')}</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="grid grid-cols-[180px_200px_150px_150px_150px_1fr_120px] gap-4 border-b border-border px-6 py-4 items-center hover:bg-primary/5 max-sm:flex max-sm:flex-col max-sm:gap-2 max-sm:rounded-xl max-sm:border max-sm:border-border max-sm:bg-surface max-sm:px-4 max-sm:py-4 max-sm:shadow-xs max-sm:mb-3 max-sm:hover:bg-surface"
              >
                <span className="font-mono text-[0.8125rem] text-ink-muted whitespace-nowrap max-sm:order-2 max-sm:text-xs">{formatTimestamp(log.createdAt)}</span>
                <span className="text-[0.8125rem] font-semibold text-ink whitespace-nowrap max-sm:order-1 max-sm:mb-1 max-sm:text-[0.9375rem]">{log.action}</span>
                <span className="text-sm text-ink-secondary max-sm:hidden">{log.sessionName || log.sessionId || '—'}</span>
                <span className="font-mono text-[0.8125rem] whitespace-nowrap max-sm:hidden">{log.userName || '—'}</span>
                <span className="font-mono text-[0.8125rem] whitespace-nowrap max-sm:hidden">{log.ipAddress || '—'}</span>
                <span className="max-sm:order-3 max-sm:self-start">
                  <span className={`inline-block whitespace-nowrap rounded-md px-[0.625rem] py-1 text-[0.6875rem] font-bold uppercase tracking-[0.025em] ${    severityStyles[log.severity] || 'bg-muted text-ink-muted'}`}>
                    {log.severity}
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2 max-sm:flex-wrap max-sm:gap-2">
          <button
            className="cursor-pointer rounded-md border border-border bg-surface px-4 py-2 text-sm text-ink-secondary transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            {t('common.previous')}
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`min-w-[36px] cursor-pointer rounded-md border px-2 py-2 text-sm transition-all max-sm:min-w-[32px] ${
                  p === page
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-ink-secondary hover:bg-muted'
                }`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            className="cursor-pointer rounded-md border border-border bg-surface px-4 py-2 text-sm text-ink-secondary transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  );
}
