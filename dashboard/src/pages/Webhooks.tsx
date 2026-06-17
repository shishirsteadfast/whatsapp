import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  ExternalLink,
  Loader2,
  X,
  Webhook as WebhookIcon,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { webhookApi, type Webhook } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import {
  useWebhooksQuery,
  useSessionsQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
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
  const { data: webhooks = [], isLoading: loadingWebhooks } = useWebhooksQuery();
  const { data: sessions = [] } = useSessionsQuery();
  const loading = loadingWebhooks;
  const createMutation = useCreateWebhookMutation();
  const updateMutation = useUpdateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ sessionId: string; id: string; url: string } | null>(null);
  const [editWebhook, setEditWebhook] = useState<Webhook | null>(null);
  const [newWebhook, setNewWebhook] = useState({ url: '', events: ['message.received'], sessionId: '' });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const eventDescription = (name: string) => {
    if (name === '*') return t('webhooks.eventDescriptions.all');
    return t(`webhooks.eventDescriptions.${name}`, { defaultValue: name });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleCreate = async () => {
    if (!newWebhook.url || !newWebhook.sessionId) return;
    try {
      await createMutation.mutateAsync({
        sessionId: newWebhook.sessionId,
        url: newWebhook.url,
        events: newWebhook.events,
      });
      setShowCreateModal(false);
      setNewWebhook({ url: '', events: ['message.received'], sessionId: '' });
      setToast({ type: 'success', message: t('webhooks.toasts.created') });
    } catch (err) {
      setToast({
        type: 'error',
        message: t('webhooks.toasts.createFailed', {
          message: err instanceof Error ? err.message : t('common.unknownError'),
        }),
      });
    }
  };

  const confirmDelete = (sessionId: string, id: string, url: string) => {
    setDeleteTarget({ sessionId, id, url });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ sessionId: deleteTarget.sessionId, id: deleteTarget.id });
      setShowDeleteModal(false);
      setDeleteTarget(null);
      setToast({ type: 'success', message: t('webhooks.toasts.deleted') });
    } catch (err) {
      setToast({
        type: 'error',
        message: t('webhooks.toasts.deleteFailed', {
          message: err instanceof Error ? err.message : t('common.unknownError'),
        }),
      });
    }
  };

  const handleTest = async (sessionId: string, id: string) => {
    setTestingId(id);
    try {
      const result = await webhookApi.test(sessionId, id);
      if (result.success) {
        setToast({ type: 'success', message: t('webhooks.toasts.testOk', { status: result.statusCode }) });
      } else {
        setToast({
          type: 'error',
          message: t('webhooks.toasts.testFailed', { message: result.error || `Status ${result.statusCode}` }),
        });
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: t('webhooks.toasts.testError', {
          message: err instanceof Error ? err.message : t('common.unknownError'),
        }),
      });
    } finally {
      setTestingId(null);
    }
  };

  const openEdit = (webhook: Webhook) => {
    setEditWebhook({ ...webhook });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editWebhook) return;
    try {
      await updateMutation.mutateAsync({
        sessionId: editWebhook.sessionId,
        id: editWebhook.id,
        data: { url: editWebhook.url, events: editWebhook.events, active: editWebhook.active },
      });
      setShowEditModal(false);
      setEditWebhook(null);
      setToast({ type: 'success', message: t('webhooks.toasts.updated') });
    } catch (err) {
      setToast({
        type: 'error',
        message: t('webhooks.toasts.updateFailed', {
          message: err instanceof Error ? err.message : t('common.unknownError'),
        }),
      });
    }
  };

  const toggleEditEvent = (event: string) => {
    if (!editWebhook) return;
    setEditWebhook({
      ...editWebhook,
      events: editWebhook.events.includes(event)
        ? editWebhook.events.filter(e => e !== event)
        : [...editWebhook.events, event],
    });
  };

  const toggleNewEvent = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter(e => e !== event) : [...prev.events, event],
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full p-8">
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex animate-[slideIn_0.3s_ease] items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-red-200 bg-red-50 text-red-600'
        }`}>
          {toast.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
          <button className="cursor-pointer bg-transparent p-1 text-inherit opacity-60 hover:opacity-100" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <PageHeader
        title={t('webhooks.title')}
        subtitle={t('webhooks.subtitle')}
        actions={
          canWrite && (
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} />
              {t('webhooks.addWebhook')}
            </button>
          )
        }
      />

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowCreateModal(false)}>
          <div className="w-[90%] max-w-[480px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">{t('webhooks.createTitle')}</h2>
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-all hover:bg-muted hover:text-ink" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-secondary">{t('webhooks.session')}</label>
              <select
                className="mb-5 w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                value={newWebhook.sessionId}
                onChange={e => setNewWebhook({ ...newWebhook, sessionId: e.target.value })}
              >
                <option value="">{t('webhooks.selectSession')}</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-secondary">{t('common.url')}</label>
              <input
                type="url"
                placeholder="https://..."
                className="mb-5 w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                value={newWebhook.url}
                onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
              />
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-secondary">{t('webhooks.events')}</label>
              <div className="flex flex-wrap gap-2">
                {availableEventNames.map(name => (
                  <button
                    key={name}
                    type="button"
                    className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-all ${
                      newWebhook.events.includes(name)
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-muted text-ink-secondary hover:border-primary hover:text-primary'
                    }`}
                    onClick={() => toggleNewEvent(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleCreate}>{t('common.create')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowEditModal(false)}>
          <div className="w-[90%] max-w-[480px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">{t('webhooks.editTitle')}</h2>
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-all hover:bg-muted hover:text-ink" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-secondary">{t('common.url')}</label>
              <input
                type="url"
                className="mb-5 w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                value={editWebhook.url}
                onChange={e => setEditWebhook({ ...editWebhook, url: e.target.value })}
              />
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-secondary">{t('webhooks.events')}</label>
              <div className="mb-5 flex flex-wrap gap-2">
                {availableEventNames.map(name => (
                  <button
                    key={name}
                    type="button"
                    className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-all ${
                      editWebhook.events.includes(name)
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-muted text-ink-secondary hover:border-primary hover:text-primary'
                    }`}
                    onClick={() => toggleEditEvent(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-(--radius) bg-muted px-5 py-4 mx-6 mb-4">
              <span className="text-sm font-medium text-ink">{t('common.status')}</span>
              <label className="relative inline-block h-[26px] w-[48px] cursor-pointer">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={editWebhook.active}
                  onChange={e => setEditWebhook({ ...editWebhook, active: e.target.checked })}
                />
                <span className="absolute inset-0 rounded-[26px] bg-ink-muted transition-all peer-checked:bg-primary" />
                <span className="absolute bottom-[3px] left-[3px] h-5 w-5 rounded-full bg-white shadow-md transition-all peer-checked:translate-x-[22px]" />
              </label>
              <span className={`text-sm font-medium ${editWebhook.active ? 'text-primary' : 'text-ink-muted'}`}>
                {editWebhook.active ? t('common.active') : t('common.inactive')}
              </span>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button className="btn-secondary" onClick={() => setShowEditModal(false)}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleEdit}>{t('webhooks.saveChanges')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowDeleteModal(false)}>
          <div className="w-[90%] max-w-[400px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">{t('webhooks.deleteTitle')}</h2>
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-all hover:bg-muted hover:text-ink" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6">
              <p className="m-0 text-sm text-ink-secondary">{t('webhooks.deleteConfirm')}</p>
              <code className="mt-2 block break-all rounded-md bg-muted px-3 py-2 text-sm">
                {deleteTarget.url}
              </code>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={handleDelete}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_280px] gap-6 max-lg:grid-cols-1">
        <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
          <div className="flex min-w-[650px] flex-col text-sm">
            <div className="grid grid-cols-[1fr_150px_140px_80px_100px] gap-3 border-b border-border bg-muted px-5 py-[0.875rem] text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">
              <span>{t('webhooks.columns.url')}</span>
              <span>{t('webhooks.columns.events')}</span>
              <span>{t('webhooks.columns.session')}</span>
              <span>{t('webhooks.columns.status')}</span>
              <span>{t('webhooks.columns.actions')}</span>
            </div>
            {webhooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-8 py-16 text-center text-ink-muted">
                <WebhookIcon size={48} strokeWidth={1} className="mb-4 text-ink-muted opacity-40" />
                <h3 className="m-0 mb-2 text-lg font-semibold text-ink-secondary">{t('webhooks.empty.title')}</h3>
                <p className="m-0 max-w-[300px] text-sm">{t('webhooks.empty.description')}</p>
              </div>
            ) : (
              webhooks.map((webhook, idx) => (
                <div
                  key={webhook.id}
                  className={`grid grid-cols-[1fr_150px_140px_80px_100px] gap-3 border-b border-border px-5 py-[0.875rem] items-center ${
                    idx % 2 === 1 ? 'bg-black/[0.02]' : ''
                  } hover:bg-primary/5`}
                >
                  <span className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-muted px-2 py-1 text-xs text-ink-secondary">{webhook.url}</code>
                    <ExternalLink size={14} className="shrink-0 text-ink-muted" />
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {webhook.events.map((event: string) => (
                      <span key={event} className="whitespace-nowrap rounded-md bg-primary/10 px-2 py-1 text-[0.6875rem] font-medium text-primary">
                        {event}
                      </span>
                    ))}
                  </span>
                  <span className="text-sm text-ink-secondary">
                    {sessions.find(s => s.id === webhook.sessionId)?.name || webhook.sessionId.substring(0, 8)}
                  </span>
                  <span>
                    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                      webhook.active ? 'bg-primary/10 text-primary' : 'bg-muted text-ink-muted'
                    }`}>
                      {webhook.active ? t('common.active') : t('common.inactive')}
                    </span>
                  </span>
                  <span className="flex justify-end gap-1">
                    <button
                      className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-2 text-ink-secondary transition-all hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                      title={t('webhooks.actions.test')}
                      onClick={() => handleTest(webhook.sessionId, webhook.id)}
                      disabled={testingId === webhook.id}
                    >
                      {testingId === webhook.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                    </button>
                    {canWrite && (
                      <>
                        <button className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-2 text-ink-secondary transition-all hover:bg-muted hover:text-ink" title={t('webhooks.actions.edit')} onClick={() => openEdit(webhook)}>
                          <Edit size={16} />
                        </button>
                        <button
                          className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-2 text-ink-secondary transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          title={t('webhooks.actions.delete')}
                          onClick={() => confirmDelete(webhook.sessionId, webhook.id, webhook.url)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="h-fit rounded-xl border border-border bg-surface p-6 shadow-xs max-lg:hidden">
          <h3 className="mb-4 text-lg font-semibold text-ink">{t('webhooks.available')}</h3>
          <div className="flex flex-col gap-3">
            {availableEventNames.map(name => (
              <div key={name} className="flex flex-col gap-1">
                <code className="w-fit rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{name}</code>
                <span className="text-xs text-ink-secondary">{eventDescription(name)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
