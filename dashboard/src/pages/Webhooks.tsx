import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Edit, Trash2, Play, ExternalLink, Loader2, X,
  Webhook as WebhookIcon, Check, AlertTriangle, Info,
} from 'lucide-react';
import { webhookApi, type Webhook } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import {
  useWebhooksQuery, useSessionsQuery,
  useCreateWebhookMutation, useUpdateWebhookMutation, useDeleteWebhookMutation,
} from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';

const availableEventNames = [
  'message.received',
  'message.sent',
  'session.connected',
  'session.disconnected',
  'session.qr',
  '*',
] as const;

export function Webhooks() {
  const { t } = useTranslation();
  useDocumentTitle(t('webhooks.title'));
  const { canWrite } = useRole();
  const { data: webhooks = [], isLoading } = useWebhooksQuery();
  const { data: sessions = [] } = useSessionsQuery();
  const createMutation = useCreateWebhookMutation();
  const updateMutation = useUpdateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget]       = useState<{ sessionId: string; id: string; url: string } | null>(null);
  const [editWebhook,  setEditWebhook]        = useState<Webhook | null>(null);
  const [newWebhook,   setNewWebhook]         = useState({ url: '', events: ['message.received'], sessionId: '' });
  const [testingId,    setTestingId]          = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleCreate = async () => {
    if (!newWebhook.url || !newWebhook.sessionId) return;
    try {
      await createMutation.mutateAsync({ sessionId: newWebhook.sessionId, url: newWebhook.url, events: newWebhook.events });
      setShowCreateModal(false);
      setNewWebhook({ url: '', events: ['message.received'], sessionId: '' });
      setToast({ type: 'success', message: t('webhooks.toasts.created') });
    } catch (err) {
      setToast({ type: 'error', message: t('webhooks.toasts.createFailed', { message: err instanceof Error ? err.message : t('common.unknownError') }) });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ sessionId: deleteTarget.sessionId, id: deleteTarget.id });
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setToast({ type: 'success', message: t('webhooks.toasts.deleted') });
    } catch (err) {
      setToast({ type: 'error', message: t('webhooks.toasts.deleteFailed', { message: err instanceof Error ? err.message : t('common.unknownError') }) });
    }
  };

  const handleTest = async (sessionId: string, id: string) => {
    setTestingId(id);
    try {
      const result = await webhookApi.test(sessionId, id);
      setToast(result.success
        ? { type: 'success', message: t('webhooks.toasts.testOk', { status: result.statusCode }) }
        : { type: 'error',   message: t('webhooks.toasts.testFailed', { message: result.error || `Status ${result.statusCode}` }) });
    } catch (err) {
      setToast({ type: 'error', message: t('webhooks.toasts.testError', { message: err instanceof Error ? err.message : t('common.unknownError') }) });
    } finally { setTestingId(null); }
  };

  const handleEdit = async () => {
    if (!editWebhook) return;
    try {
      await updateMutation.mutateAsync({ sessionId: editWebhook.sessionId, id: editWebhook.id, data: { url: editWebhook.url, events: editWebhook.events, active: editWebhook.active } });
      setShowEditModal(false);
      setEditWebhook(null);
      setToast({ type: 'success', message: t('webhooks.toasts.updated') });
    } catch (err) {
      setToast({ type: 'error', message: t('webhooks.toasts.updateFailed', { message: err instanceof Error ? err.message : t('common.unknownError') }) });
    }
  };

  const toggleEvent = (list: string[], name: string) =>
    list.includes(name) ? list.filter(e => e !== name) : [...list, name];

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  const EventChips = ({ selected, toggle }: { selected: string[]; toggle: (n: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {availableEventNames.map(name => (
        <button
          key={name}
          type="button"
          onClick={() => toggle(name)}
          className={`cursor-pointer rounded-[6px] border px-3 py-1.5 text-[0.75rem] font-semibold transition-all ${
            selected.includes(name)
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-ink-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="mb-1.5 block text-[0.7875rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{children}</label>
  );

  return (
    <div className="w-full p-7 max-sm:p-4">

      {/* Toast */}
      {toast && (
        <div className={`fixed right-5 top-5 z-[200] flex animate-[slideIn_0.25s_ease] items-center gap-3 rounded-[var(--radius)] border px-4 py-3 text-[0.875rem] font-medium shadow-[var(--shadow-lg)] ${
          toast.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'border-red-200 bg-red-50 text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
          <button className="cursor-pointer border-none bg-transparent p-0.5 text-inherit opacity-50 hover:opacity-100" onClick={() => setToast(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      <PageHeader
        title={t('webhooks.title')}
        subtitle={t('webhooks.subtitle')}
        actions={canWrite && (
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />{t('webhooks.addWebhook')}
          </button>
        )}
      />

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('webhooks.createTitle')}</h2>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <FieldLabel>{t('webhooks.session')}</FieldLabel>
                <select
                  value={newWebhook.sessionId}
                  onChange={e => setNewWebhook({ ...newWebhook, sessionId: e.target.value })}
                >
                  <option value="">{t('webhooks.selectSession')}</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>{t('common.url')}</FieldLabel>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newWebhook.url}
                  onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  className="input-base"
                />
              </div>
              <div>
                <FieldLabel>{t('webhooks.events')}</FieldLabel>
                <EventChips selected={newWebhook.events} toggle={n => setNewWebhook(p => ({ ...p, events: toggleEvent(p.events, n) }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleCreate} disabled={!newWebhook.url || !newWebhook.sessionId}>{t('common.create')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && editWebhook && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('webhooks.editTitle')}</h2>
              <button className="icon-btn" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <FieldLabel>{t('common.url')}</FieldLabel>
                <input
                  type="url"
                  value={editWebhook.url}
                  onChange={e => setEditWebhook({ ...editWebhook, url: e.target.value })}
                  className="input-base"
                />
              </div>
              <div>
                <FieldLabel>{t('webhooks.events')}</FieldLabel>
                <EventChips selected={editWebhook.events} toggle={n => setEditWebhook(p => p ? { ...p, events: toggleEvent(p.events, n) } : p)} />
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius)] bg-[var(--color-muted)] px-4 py-3">
                <span className="text-[0.875rem] font-medium text-[var(--color-ink-secondary)]">{t('common.status')}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-[0.8125rem] font-semibold ${editWebhook.active ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-muted)]'}`}>
                    {editWebhook.active ? t('common.active') : t('common.inactive')}
                  </span>
                  <label className="relative inline-block h-[22px] w-[40px] cursor-pointer">
                    <input type="checkbox" className="peer sr-only" checked={editWebhook.active} onChange={e => setEditWebhook({ ...editWebhook, active: e.target.checked })} />
                    <span className="absolute inset-0 rounded-[22px] bg-[var(--color-border-strong)] transition-all peer-checked:bg-[var(--color-primary)]" />
                    <span className="absolute bottom-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[18px]" />
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleEdit}>{t('webhooks.saveChanges')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && deleteTarget && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-box max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('webhooks.deleteTitle')}</h2>
              <button className="icon-btn" onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="m-0 mb-2 text-[0.9rem] text-[var(--color-ink-secondary)]">{t('webhooks.deleteConfirm')}</p>
              <code className="block break-all rounded-[var(--radius)] bg-[var(--color-muted)] px-3 py-2 text-[0.8125rem]">{deleteTarget.url}</code>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={handleDelete}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="grid grid-cols-[1fr_260px] gap-5 max-lg:grid-cols-1">

        {/* Webhooks table */}
        <div className="card overflow-hidden">
          {webhooks.length === 0 ? (
            <div className="empty-state">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-muted)]">
                <WebhookIcon size={26} strokeWidth={1.2} className="text-[var(--color-ink-muted)]" />
              </div>
              <h3>{t('webhooks.empty.title')}</h3>
              <p>{t('webhooks.empty.description')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: 620 }}>
                {/* Header */}
                <div className="table-header grid-cols-[1fr_160px_130px_80px_110px]">
                  <span>{t('webhooks.columns.url')}</span>
                  <span>{t('webhooks.columns.events')}</span>
                  <span>{t('webhooks.columns.session')}</span>
                  <span>{t('webhooks.columns.status')}</span>
                  <span className="text-right">{t('webhooks.columns.actions')}</span>
                </div>

                {webhooks.map(webhook => (
                  <div key={webhook.id} className="table-row-base grid-cols-[1fr_160px_130px_80px_110px]">
                    {/* URL */}
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[6px] border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1 font-mono text-[0.75rem] text-[var(--color-ink-secondary)]">
                        {webhook.url}
                      </span>
                      <a href={webhook.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]">
                        <ExternalLink size={13} />
                      </a>
                    </span>

                    {/* Events */}
                    <span className="flex flex-wrap gap-1">
                      {webhook.events.map((ev: string) => (
                        <span key={ev} className="rounded-[5px] bg-[var(--color-primary-dim)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--color-primary)]">{ev}</span>
                      ))}
                    </span>

                    {/* Session */}
                    <span className="text-[0.8125rem] text-[var(--color-ink-secondary)]">
                      {sessions.find(s => s.id === webhook.sessionId)?.name || webhook.sessionId.substring(0, 8)}
                    </span>

                    {/* Status */}
                    <span>
                      <span className={`pill ${webhook.active ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]' : 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]'}`}>
                        {webhook.active ? t('common.active') : t('common.inactive')}
                      </span>
                    </span>

                    {/* Actions */}
                    <span className="flex justify-end gap-1.5">
                      <button
                        title={t('webhooks.actions.test')}
                        onClick={() => handleTest(webhook.sessionId, webhook.id)}
                        disabled={testingId === webhook.id}
                        className="icon-btn"
                      >
                        {testingId === webhook.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                      </button>
                      {canWrite && (
                        <>
                          <button title={t('webhooks.actions.edit')} className="icon-btn" onClick={() => { setEditWebhook({ ...webhook }); setShowEditModal(true); }}>
                            <Edit size={14} />
                          </button>
                          <button
                            title={t('webhooks.actions.delete')}
                            className="icon-btn hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            onClick={() => { setDeleteTarget({ sessionId: webhook.sessionId, id: webhook.id, url: webhook.url }); setShowDeleteModal(true); }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Events reference panel */}
        <div className="card h-fit p-5 max-lg:hidden">
          <div className="mb-4 flex items-center gap-2">
            <Info size={15} className="text-[var(--color-ink-muted)]" />
            <h3 className="m-0 text-[0.9rem] font-semibold text-[var(--color-ink)]">{t('webhooks.available')}</h3>
          </div>
          <div className="space-y-3">
            {availableEventNames.map(name => (
              <div key={name} className="flex flex-col gap-1">
                <code className="w-fit rounded-[5px] bg-[var(--color-primary-dim)] px-2 py-0.5 text-[0.7125rem] font-semibold text-[var(--color-primary)]">{name}</code>
                <span className="text-[0.7875rem] text-[var(--color-ink-muted)]">
                  {name === '*' ? t('webhooks.eventDescriptions.all') : t(`webhooks.eventDescriptions.${name}`, { defaultValue: name })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
