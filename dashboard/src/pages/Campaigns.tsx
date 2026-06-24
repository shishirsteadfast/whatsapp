import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Megaphone,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Trash2,
  Eye,
  CalendarClock,
  Clock,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import {
  useCampaignsQuery,
  useCampaignStatsQuery,
  useStartCampaignMutation,
  usePauseCampaignMutation,
  useCancelCampaignMutation,
  useDeleteCampaignMutation,
  useResendFailedCampaignMutation,
} from '../hooks/queries';
import type { Campaign } from '../services/api';

// ── Status Config ─────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'campaigns.statuses.draft',     color: 'text-gray-600 dark:text-gray-400',  bg: 'bg-gray-100 dark:bg-gray-800' },
  scheduled: { label: 'campaigns.statuses.scheduled', color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-100 dark:bg-blue-900/30' },
  sending:   { label: 'campaigns.statuses.sending',   color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  completed: { label: 'campaigns.statuses.completed', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  paused:    { label: 'campaigns.statuses.paused',    color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  cancelled: { label: 'campaigns.statuses.cancelled', color: 'text-gray-500 dark:text-gray-500',  bg: 'bg-gray-100 dark:bg-gray-800' },
  failed:    { label: 'campaigns.statuses.failed',    color: 'text-red-600 dark:text-red-400',   bg: 'bg-red-100 dark:bg-red-900/30' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Main Page ─────────────────────────────────────────────────────

export function Campaigns() {
  const { t } = useTranslation();
  useDocumentTitle('Campaigns');
  const navigate = useNavigate();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  const { data: campaignsData, isLoading } = useCampaignsQuery({
    status: statusFilter || undefined,
    search: search || undefined,
    page: currentPage,
    limit: perPage,
  });
  const { data: stats } = useCampaignStatsQuery();

  const startMutation = useStartCampaignMutation();
  const pauseMutation = usePauseCampaignMutation();
  const cancelMutation = useCancelCampaignMutation();
  const deleteMutation = useDeleteCampaignMutation();
  const resendMutation = useResendFailedCampaignMutation();

  const totalPages = campaignsData ? Math.max(1, Math.ceil(campaignsData.total / perPage)) : 1;
  const safePage = Math.min(currentPage, totalPages);
  const showingFrom = campaignsData?.total ? (safePage - 1) * perPage + 1 : 0;
  const showingTo = Math.min(safePage * perPage, campaignsData?.total || 0);

  const handleAction = async (action: string, id: string) => {
    try {
      switch (action) {
        case 'start':
          await startMutation.mutateAsync(id);
          toast.success(t('campaigns.toasts.startSuccess'));
          break;
        case 'pause':
          await pauseMutation.mutateAsync(id);
          toast.success(t('campaigns.toasts.pauseSuccess'));
          break;
        case 'cancel':
          if (!confirm(t('campaigns.detail.confirmStart'))) return;
          await cancelMutation.mutateAsync(id);
          toast.success(t('campaigns.toasts.cancelSuccess'));
          break;
        case 'delete':
          if (!confirm(t('campaigns.detail.confirmDelete'))) return;
          await deleteMutation.mutateAsync(id);
          toast.success(t('campaigns.toasts.deleteSuccess'));
          break;
        case 'resend':
          await resendMutation.mutateAsync(id);
          toast.success(t('campaigns.toasts.resendSuccess'));
          break;
      }
    } catch {
      toast.error(t('common.errorGeneric'));
    }
  };

  // ── Stats cards ──────────────────────────────────────────────────

  const statsCards = [
    {
      label: t('campaigns.stats.total'),
      value: stats?.total ?? 0,
      color: 'text-[var(--color-ink)]',
      icon: Megaphone,
    },
    {
      label: t('campaigns.stats.active'),
      value: (stats?.sending ?? 0) + (stats?.scheduled ?? 0),
      color: 'text-yellow-500',
      icon: Play,
    },
    {
      label: t('campaigns.stats.completed'),
      value: stats?.completed ?? 0,
      color: 'text-green-500',
      icon: RefreshCw,
    },
    {
      label: t('campaigns.stats.failed'),
      value: stats?.failed ?? 0,
      color: 'text-red-500',
      icon: XCircle,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title={t('campaigns.title')}
        subtitle={t('campaigns.subtitle')}
        actions={
          <Link to="/campaigns/new" className="btn-primary no-underline">
            <Plus size={16} />
            {t('campaigns.newCampaign')}
          </Link>
        }
      />

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statsCards.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-3.5 px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-muted)]">
              <Icon size={18} className={color} />
            </div>
            <div className="min-w-0">
              <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-[var(--color-ink-muted)]">
                {label}
              </p>
              <p className="m-0 text-[1.25rem] font-bold text-[var(--color-ink)]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="search-bar max-w-[320px] flex-1 max-sm:max-w-none">
          <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            placeholder={t('campaigns.searchPlaceholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="w-auto cursor-pointer rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)]"
        >
          <option value="">{t('campaigns.filterStatus')}</option>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <option key={key} value={key}>{t(cfg.label)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {(!campaignsData || campaignsData.campaigns.length === 0) ? (
          <div className="empty-state">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-muted)]">
              <Megaphone size={26} strokeWidth={1.2} className="text-[var(--color-ink-muted)]" />
            </div>
            <h3>{t('campaigns.empty.title')}</h3>
            <p>{t('campaigns.empty.description')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 800 }}>
              {/* Header */}
              <div className="table-header grid-cols-[2fr_120px_100px_100px_160px_150px_120px]">
                <span>{t('campaigns.columns.name')}</span>
                <span>{t('campaigns.columns.status')}</span>
                <span className="text-center">{t('campaigns.columns.recipients')}</span>
                <span className="text-center">{t('campaigns.columns.sent')}</span>
                <span>{t('campaigns.columns.schedule')}</span>
                <span>{t('campaigns.columns.created')}</span>
                <span className="text-center">{t('campaigns.columns.actions')}</span>
              </div>

              {/* Rows */}
              {campaignsData.campaigns.map(campaign => {
                const cfg = statusConfig[campaign.status] || statusConfig.draft;
                return (
                  <div
                    key={campaign.id}
                    className="table-row-base grid-cols-[2fr_120px_100px_100px_160px_150px_120px] cursor-pointer"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    {/* Name */}
                    <div className="min-w-0">
                      <p className="m-0 truncate text-[0.875rem] font-medium text-[var(--color-ink)]">
                        {campaign.name}
                      </p>
                      {campaign.description && (
                        <p className="m-0 truncate text-[0.7rem] text-[var(--color-ink-muted)]">
                          {campaign.description}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`pill ${cfg.bg} ${cfg.color}`}>
                        {t(cfg.label)}
                      </span>
                    </div>

                    {/* Recipients */}
                    <span className="text-center text-[0.8125rem] font-medium text-[var(--color-ink)]">
                      {campaign.totalRecipients}
                    </span>

                    {/* Sent / Failed */}
                    <div className="text-center">
                      <span className="text-[0.8125rem] text-green-600 dark:text-green-400">
                        {campaign.sentCount}
                      </span>
                      {campaign.failedCount > 0 && (
                        <span className="ml-1.5 text-[0.75rem] text-red-500">
                          / {campaign.failedCount}f
                        </span>
                      )}
                    </div>

                    {/* Schedule */}
                    <span className="flex items-center gap-1.5 text-[0.75rem] text-[var(--color-ink-muted)]">
                      {campaign.status === 'scheduled' ? (
                        <><CalendarClock size={13} className="text-blue-500" />{formatDateTime(campaign.scheduleAt)}</>
                      ) : campaign.status === 'sending' ? (
                        <><Clock size={13} className="text-yellow-500" />Sending...</>
                      ) : (
                        '—'
                      )}
                    </span>

                    {/* Created */}
                    <span className="text-[0.75rem] text-[var(--color-ink-muted)]">
                      {formatDateTime(campaign.createdAt)}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => handleAction('start', campaign.id)}
                          className="icon-btn"
                          title="Start"
                        >
                          <Play size={13} className="text-green-500" />
                        </button>
                      )}
                      {campaign.status === 'sending' && (
                        <button
                          onClick={() => handleAction('pause', campaign.id)}
                          className="icon-btn"
                          title="Pause"
                        >
                          <Pause size={13} className="text-orange-500" />
                        </button>
                      )}
                      {(campaign.status === 'paused' || campaign.status === 'scheduled') && (
                        <button
                          onClick={() => handleAction('start', campaign.id)}
                          className="icon-btn"
                          title="Resume"
                        >
                          <Play size={13} className="text-green-500" />
                        </button>
                      )}
                      {(campaign.status === 'sending' || campaign.status === 'paused' || campaign.status === 'scheduled') && (
                        <button
                          onClick={() => handleAction('cancel', campaign.id)}
                          className="icon-btn"
                          title="Cancel"
                        >
                          <XCircle size={13} className="text-red-500" />
                        </button>
                      )}
                      {campaign.status === 'completed' && campaign.failedCount > 0 && (
                        <button
                          onClick={() => handleAction('resend', campaign.id)}
                          className="icon-btn"
                          title="Resend Failed"
                        >
                          <RefreshCw size={13} className="text-blue-500" />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                        className="icon-btn"
                        title="View"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {campaignsData && campaignsData.total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">
            Showing {showingFrom} to {showingTo} of {campaignsData.total} campaigns
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={15} />
              </button>
              <span className="px-3 text-[0.8125rem] text-[var(--color-ink-secondary)]">
                Page {safePage} of {totalPages}
              </span>
              <button
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
