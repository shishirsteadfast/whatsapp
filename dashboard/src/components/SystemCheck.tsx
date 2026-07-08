import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, X, AlertTriangle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import type { SystemCheckItem } from '../services/api';

/* ─── Shared row ───────────────────────────────────────────────────────────── */

function CheckRow({ item }: { item: SystemCheckItem }) {
  const { t } = useTranslation();
  const isOk = item.status === 'ok';

  return (
    <div
      className={`rounded-[var(--radius)] border p-3 ${
        isOk
          ? 'border-[var(--color-border)] bg-[var(--color-surface-raised)]'
          : 'border-red-300/50 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {isOk ? (
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
        ) : (
          <XCircle size={17} className="mt-0.5 shrink-0 text-red-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[0.8125rem] font-semibold text-[var(--color-ink)]">
            {t(`systemCheck.items.${item.key}.label`)}
          </p>
          {!isOk && (
            <div className="mt-1.5 space-y-1">
              <p className="m-0 text-[0.75rem] leading-relaxed text-[var(--color-ink-secondary)]">
                <span className="font-semibold">{t('systemCheck.panel.howToFix')}: </span>
                {t(`systemCheck.items.${item.key}.fix`)}
              </p>
              {item.detail && (
                <p className="m-0 rounded-md bg-[var(--color-muted)] px-2 py-1 font-mono text-[0.6875rem] text-[var(--color-ink-muted)] break-all">
                  {item.detail}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Full checklist panel (Settings → System tab) ────────────────────────── */

export function SystemCheckPanel({
  checks,
  isLoading,
  isFetching,
  onRefresh,
}: {
  checks: SystemCheckItem[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const failCount = checks.filter(c => c.status === 'fail').length;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="m-0 text-[0.875rem] font-semibold text-[var(--color-ink)]">
            {t('systemCheck.panel.title')}
          </h3>
          <p className="m-0 mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">
            {t('systemCheck.panel.subtitle')}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary !py-1.5 !px-2.5 !text-[0.75rem] shrink-0"
          onClick={onRefresh}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {t('systemCheck.panel.refresh')}
        </button>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : (
          <>
            <p
              className={`m-0 mb-3 text-[0.75rem] font-medium ${
                failCount > 0 ? 'text-red-500' : 'text-[var(--color-success)]'
              }`}
            >
              {failCount > 0
                ? t('systemCheck.panel.issuesFound', { count: failCount })
                : t('systemCheck.panel.allPassed')}
            </p>
            <div className="space-y-2">
              {checks.map(item => <CheckRow key={item.key} item={item} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Auto-popup modal (app-wide, admin only) ──────────────────────────────── */

export function SystemCheckModal({
  checks,
  onClose,
  onViewDetails,
}: {
  checks: SystemCheckItem[];
  onClose: () => void;
  onViewDetails: () => void;
}) {
  const { t } = useTranslation();
  const failing = checks.filter(c => c.status === 'fail');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-[560px]" onClick={e => e.stopPropagation()}>
        <div className="modal-header flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/15">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="m-0 text-[1rem] font-bold text-[var(--color-ink)]">
                {t('systemCheck.modal.title')}
              </h2>
              <p className="m-0 mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
                {t('systemCheck.modal.subtitle', { count: failing.length })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto p-5">
          {failing.map(item => <CheckRow key={item.key} item={item} />)}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3.5">
          <button className="btn-secondary" onClick={onClose}>
            {t('systemCheck.modal.dismiss')}
          </button>
          <button className="btn-primary" onClick={onViewDetails}>
            {t('systemCheck.modal.viewDetails')}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
