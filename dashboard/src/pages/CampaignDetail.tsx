import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Trash2,
  Edit3,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle as XIcon,
  Clock,
  AlertTriangle,
  Send,
  BarChart3,
  Users,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import {
  useCampaignQuery,
  useCampaignRecipientsQuery,
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

const recipientStatusConfig: Record<string, { color: string; bg: string; icon: typeof Clock }> = {
  pending:   { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Clock },
  sent:      { color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-100 dark:bg-green-900/30',   icon: CheckCircle },
  failed:    { color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-100 dark:bg-red-900/30',       icon: XIcon },
  cancelled: { color: 'text-gray-500 dark:text-gray-500',     bg: 'bg-gray-100 dark:bg-gray-800',         icon: AlertTriangle },
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Main Page ─────────────────────────────────────────────────────

export function CampaignDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  useDocumentTitle('Campaign Details');

  const { data: campaign, isLoading: loadingCampaign } = useCampaignQuery(id || '');

  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientStatusFilter, setRecipientStatusFilter] = useState('');
  const [recipientPage, setRecipientPage] = useState(1);
  const recipientPerPage = 20;

  const { data: recipientsData, isLoading: loadingRecipients } = useCampaignRecipientsQuery(
    id || '',
    {
      status: recipientStatusFilter || undefined,
      search: recipientSearch || undefined,
      page: recipientPage,
      limit: recipientPerPage,
    },
    !!id,
  );

  const startMutation = useStartCampaignMutation();
  const pauseMutation = usePauseCampaignMutation();
  const cancelMutation = useCancelCampaignMutation();
  const deleteMutation = useDeleteCampaignMutation();
  const resendMutation = useResendFailedCampaignMutation();

  const totalPages = recipientsData ? Math.max(1, Math.ceil(recipientsData.total / recipientPerPage)) : 1;
  const safePage = Math.min(recipientPage, totalPages);

  const progressPercent = campaign
    ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100)
    : 0;

  const handleAction = async (action: string) => {
    if (!id) return;
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
          if (!confirm(t('campaigns.detail.confirmDelete'))) return;
          await cancelMutation.mutateAsync(id);
          toast.success(t('campaigns.toasts.cancelSuccess'));
          break;
        case 'delete':
          if (!confirm(t('campaigns.detail.confirmDelete'))) return;
          await deleteMutation.mutateAsync(id);
          toast.success(t('campaigns.toasts.deleteSuccess'));
          navigate('/campaigns');
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

  if (loadingCampaign) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="w-full p-7">
        <p className="text-center text-[var(--color-ink-muted)]">Campaign not found</p>
      </div>
    );
  }

  const cfg = statusConfig[campaign.status] || statusConfig.draft;

  // ── Action buttons based on status ──
  const actions: Array<{ label: string; icon: typeof Play; action: string; variant: 'primary' | 'secondary' | 'danger' }> = [];
  if (campaign.status === 'draft' || campaign.status === 'paused' || campaign.status === 'scheduled') {
    actions.push({ label: t('campaigns.detail.actions.start'), icon: Play, action: 'start', variant: 'primary' });
  }
  if (campaign.status === 'sending') {
    actions.push({ label: t('campaigns.detail.actions.pause'), icon: Pause, action: 'pause', variant: 'secondary' });
  }
  if (campaign.status === 'sending' || campaign.status === 'paused' || campaign.status === 'scheduled') {
    actions.push({ label: t('campaigns.detail.actions.cancel'), icon: XCircle, action: 'cancel', variant: 'danger' });
  }
  if (campaign.status === 'completed' && campaign.failedCount > 0) {
    actions.push({ label: t('campaigns.detail.actions.resendFailed'), icon: RefreshCw, action: 'resend', variant: 'primary' });
  }
  if (campaign.status === 'draft') {
    actions.push({ label: t('campaigns.detail.actions.edit'), icon: Edit3, action: 'edit', variant: 'secondary' });
  }
  if (campaign.status !== 'sending') {
    actions.push({ label: t('campaigns.detail.actions.delete'), icon: Trash2, action: 'delete', variant: 'danger' });
  }

  return (
    <div className="w-full p-7 max-sm:p-4">
      {/* Back button */}
      <Link
        to="/campaigns"
        className="mb-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--color-ink-muted)] no-underline transition-colors hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={15} />
        {t('campaigns.detail.actions.back')}
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="m-0 text-[1.5rem] font-bold tracking-tight text-[var(--color-ink)]">
                {campaign.name}
              </h1>
              <span className={`pill ${cfg.bg} ${cfg.color}`}>
                {t(cfg.label)}
              </span>
            </div>
            {campaign.description && (
              <p className="mt-1 m-0 text-[0.8125rem] text-[var(--color-ink-muted)]">{campaign.description}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {actions.map(({ label, icon: Icon, action, variant }) => (
            <button
              key={action}
              onClick={() => action === 'edit' ? navigate(`/campaigns/${campaign.id}/edit`) : handleAction(action)}
              className={variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-secondary'}
              disabled={
                (action === 'start' && startMutation.isPending) ||
                (action === 'pause' && pauseMutation.isPending) ||
                (action === 'cancel' && cancelMutation.isPending) ||
                (action === 'delete' && deleteMutation.isPending) ||
                (action === 'resend' && resendMutation.isPending)
              }
            >
              {((action === 'start' && startMutation.isPending) ||
                (action === 'pause' && pauseMutation.isPending) ||
                (action === 'cancel' && cancelMutation.isPending) ||
                (action === 'delete' && deleteMutation.isPending) ||
                (action === 'resend' && resendMutation.isPending)) ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Icon size={14} />
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4 max-sm:grid-cols-2">
        <div className="card flex flex-col items-center gap-1 px-4 py-4 text-center">
          <Users size={18} className="text-[var(--color-ink-muted)]" />
          <span className="text-[1.25rem] font-bold text-[var(--color-ink)]">{campaign.totalRecipients}</span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.04em] text-[var(--color-ink-muted)]">
            {t('campaigns.detail.stats.total')}
          </span>
        </div>
        <div className="card flex flex-col items-center gap-1 px-4 py-4 text-center">
          <CheckCircle size={18} className="text-green-500" />
          <span className="text-[1.25rem] font-bold text-green-600 dark:text-green-400">{campaign.sentCount}</span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.04em] text-[var(--color-ink-muted)]">
            {t('campaigns.detail.stats.sent')}
          </span>
        </div>
        <div className="card flex flex-col items-center gap-1 px-4 py-4 text-center">
          <XIcon size={18} className="text-red-500" />
          <span className="text-[1.25rem] font-bold text-red-600 dark:text-red-400">{campaign.failedCount}</span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.04em] text-[var(--color-ink-muted)]">
            {t('campaigns.detail.stats.failed')}
          </span>
        </div>
        <div className="card flex flex-col items-center gap-1 px-4 py-4 text-center">
          <Clock size={18} className="text-yellow-500" />
          <span className="text-[1.25rem] font-bold text-yellow-600 dark:text-yellow-400">
            {campaign.totalRecipients - campaign.sentCount - campaign.failedCount}
          </span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.04em] text-[var(--color-ink-muted)]">
            {t('campaigns.detail.stats.pending')}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {(campaign.status === 'sending' || campaign.status === 'completed' || campaign.status === 'paused') && (
        <div className="card mb-6 px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.75rem] font-semibold uppercase tracking-[0.04em] text-[var(--color-ink-muted)]">
              {t('campaigns.detail.stats.progress')}
            </span>
            <span className="text-[0.8125rem] font-medium text-[var(--color-ink)]">{progressPercent}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[0.65rem] text-[var(--color-ink-muted)]">
            <span>{t('campaigns.detail.stats.sent')}: {campaign.sentCount}</span>
            <span>{t('campaigns.detail.stats.failed')}: {campaign.failedCount}</span>
            <span>{t('campaigns.detail.stats.pending')}: {campaign.totalRecipients - campaign.sentCount - campaign.failedCount}</span>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <div className="card px-5 py-4">
          <h3 className="m-0 mb-3 text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
            {t('campaigns.detail.overview')}
          </h3>
          <div className="space-y-2 text-[0.8125rem]">
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">{t('campaigns.wizard.session')}</span>
              <span className="font-medium text-[var(--color-ink)]">{campaign.sessionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">{t('campaigns.wizard.recipientType')}</span>
              <span className="font-medium capitalize text-[var(--color-ink)]">{t(`campaigns.recipientType.${campaign.recipientType}`)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">{t('campaigns.wizard.messageType')}</span>
              <span className="font-medium capitalize text-[var(--color-ink)]">{campaign.messageContent.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-ink-muted)]">{t('common.created')}</span>
              <span className="font-medium text-[var(--color-ink)]">{formatDateTime(campaign.createdAt)}</span>
            </div>
            {campaign.startedAt && (
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">Started</span>
                <span className="font-medium text-[var(--color-ink)]">{formatDateTime(campaign.startedAt)}</span>
              </div>
            )}
            {campaign.completedAt && (
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-muted)]">Completed</span>
                <span className="font-medium text-[var(--color-ink)]">{formatDateTime(campaign.completedAt)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="card px-5 py-4">
          <h3 className="m-0 mb-3 text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
            {t('campaigns.wizard.reviewMessagePreview')}
          </h3>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] p-4">
            <p className="m-0 whitespace-pre-wrap text-[0.8125rem] text-[var(--color-ink)]">
              {campaign.messageContent.type === 'text'
                ? campaign.messageContent.text
                : campaign.messageContent.type === 'location'
                ? `📍 ${campaign.messageContent.caption || 'Location'}`
                : campaign.messageContent.type === 'contact'
                ? `📇 ${campaign.messageContent.contactName} · ${campaign.messageContent.contactPhone}`
                : `[${campaign.messageContent.type.toUpperCase()}] ${campaign.messageContent.url || ''}${campaign.messageContent.caption ? `\n${campaign.messageContent.caption}` : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Recipients Section */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
          <h3 className="m-0 text-[0.85rem] font-bold text-[var(--color-ink)]">
            {t('campaigns.detail.recipients')}
            <span className="ml-1.5 text-[0.7rem] font-normal text-[var(--color-ink-muted)]">
              ({recipientsData?.total ?? 0})
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <div className="search-bar max-w-[200px]">
              <Search size={13} className="text-[var(--color-ink-muted)]" />
              <input
                type="text"
                value={recipientSearch}
                onChange={e => { setRecipientSearch(e.target.value); setRecipientPage(1); }}
                placeholder={t('campaigns.detail.searchRecipients')}
                className="text-[0.75rem]"
              />
            </div>
            <select
              value={recipientStatusFilter}
              onChange={e => { setRecipientStatusFilter(e.target.value); setRecipientPage(1); }}
              className="w-auto cursor-pointer rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[0.75rem] text-[var(--color-ink-secondary)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)]"
            >
              <option value="">{t('campaigns.detail.filterStatus')}</option>
              {Object.entries(recipientStatusConfig).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingRecipients ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : !recipientsData || recipientsData.recipients.length === 0 ? (
          <div className="empty-state">
            <Users size={24} className="text-[var(--color-ink-muted)]" />
            <h3>{t('campaigns.detail.noRecipients')}</h3>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 600 }}>
                <div className="table-header grid-cols-[1fr_120px_100px_150px_120px]">
                  <span>{t('campaigns.columns.name')}</span>
                  <span>{t('campaigns.columns.status')}</span>
                  <span>Chat ID</span>
                  <span>Sent At</span>
                  <span>Error</span>
                </div>
                {recipientsData.recipients.map(recipient => {
                  const rCfg = recipientStatusConfig[recipient.status] || recipientStatusConfig.pending;
                  const RIcon = rCfg.icon;
                  return (
                    <div
                      key={recipient.id}
                      className="table-row-base grid-cols-[1fr_120px_100px_150px_120px]"
                    >
                      <span className="truncate text-[0.8125rem] font-medium text-[var(--color-ink)]">
                        {recipient.recipientName || recipient.chatId.replace('@c.us', '').replace('@g.us', '')}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 pill ${rCfg.bg} ${rCfg.color}`}>
                        <RIcon size={11} />
                        {recipient.status}
                      </span>
                      <span className="font-mono text-[0.7rem] text-[var(--color-ink-secondary)]">
                        {recipient.chatId.replace('@c.us', '').replace('@g.us', '')}
                      </span>
                      <span className="text-[0.75rem] text-[var(--color-ink-muted)]">
                        {formatDateTime(recipient.sentAt || null)}
                      </span>
                      <span className="max-w-[120px] truncate text-[0.7rem] text-red-500" title={recipient.errorMessage}>
                        {recipient.errorMessage || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3">
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">
                  {recipientsData.total} total
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] transition-all hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={safePage <= 1}
                    onClick={() => setRecipientPage(p => p - 1)}
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="px-2 text-[0.75rem] text-[var(--color-ink-secondary)]">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] transition-all hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={safePage >= totalPages}
                    onClick={() => setRecipientPage(p => p + 1)}
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
