import { useState, useEffect, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type VisibilityState,
} from '@tanstack/react-table';
import { Plus, Copy, RefreshCw, Trash2, Eye, EyeOff, Loader2, X, Check, KeyRound, AlertTriangle } from 'lucide-react';
import type { ApiKey } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useApiKeysQuery, useCreateApiKeyMutation, useDeleteApiKeyMutation, useRevokeApiKeyMutation } from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';

const roleNames = ['admin', 'operator', 'viewer'] as const;

function useWindowSize() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

const columnHelper = createColumnHelper<ApiKey>();

export function ApiKeys() {
  const { t } = useTranslation();
  useDocumentTitle(t('apiKeys.title'));
  const { data: apiKeys = [], isLoading: loading } = useApiKeysQuery();
  const createMutation = useCreateApiKeyMutation();
  const deleteMutation = useDeleteApiKeyMutation();
  const revokeMutation = useRevokeApiKeyMutation();
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState({ name: '', role: 'operator' });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'revoke'; id: string; name: string } | null>(
    null,
  );

  const windowWidth = useWindowSize();
  const isMobile = windowWidth < 768;
  const isSmall = windowWidth < 640;
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    setColumnVisibility({ key: !isSmall, lastUsed: !isMobile });
  }, [isMobile, isSmall]);

  const handleCreate = async () => {
    if (!newKey.name) return;
    try {
      const created = await createMutation.mutateAsync({ name: newKey.name, role: newKey.role });
      setCreatedKey(created.apiKey || null);
      setNewKey({ name: '', role: 'operator' });
    } catch (err) {
      console.error('Failed to create:', err);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to revoke:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const confirmAndExecute = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete') handleDelete(confirmAction.id);
    else handleRevoke(confirmAction.id);
    setConfirmAction(null);
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: () => t('apiKeys.columns.name'),
        cell: info => <span className="font-medium text-ink">{info.getValue()}</span>,
      }),
      columnHelper.accessor('keyPrefix', {
        id: 'key',
        header: () => t('apiKeys.columns.key'),
        cell: info => {
          const apiKey = info.row.original;
          return (
            <span className="flex items-center gap-2">
              <code className="whitespace-nowrap rounded-md bg-muted px-[0.625rem] py-[0.375rem] font-mono text-xs text-ink-secondary">
                {visibleKeys.has(apiKey.id) ? apiKey.keyPrefix + '...' : apiKey.keyPrefix + '****'}
              </code>
              <button className="flex shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-1 text-ink-muted transition-colors hover:text-ink" onClick={() => toggleKeyVisibility(apiKey.id)}>
                {visibleKeys.has(apiKey.id) ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </span>
          );
        },
      }),
      columnHelper.accessor('role', {
        header: () => t('apiKeys.columns.role'),
        cell: info => (
          <span className="whitespace-nowrap rounded-md bg-sky-100 px-2 py-1 text-[0.6875rem] font-medium text-sky-700">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('isActive', {
        header: () => t('apiKeys.columns.status'),
        cell: info => (
          <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
            info.getValue() ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-600'
          }`}>
            {info.getValue() ? t('apiKeys.statuses.active') : t('apiKeys.statuses.revoked')}
          </span>
        ),
      }),
      columnHelper.accessor('lastUsedAt', {
        id: 'lastUsed',
        header: () => t('apiKeys.columns.lastUsed'),
        cell: info => (
          <span className="text-sm text-ink-secondary">
            {info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : t('common.never')}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => t('apiKeys.columns.actions'),
        cell: info => {
          const apiKey = info.row.original;
          return (
            <span className="flex justify-end gap-1">
              <button
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-2 text-ink-secondary transition-all hover:bg-muted hover:text-ink"
                onClick={() => copyToClipboard(apiKey.keyPrefix, apiKey.id)}
                title={t('apiKeys.actions.copy')}
              >
                {copied === apiKey.id ? <Check size={16} /> : <Copy size={16} />}
              </button>
              {apiKey.isActive && (
                <button
                  className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-2 text-ink-secondary transition-all hover:bg-muted hover:text-ink"
                  onClick={() => setConfirmAction({ type: 'revoke', id: apiKey.id, name: apiKey.name })}
                  title={t('apiKeys.actions.revoke')}
                >
                  <RefreshCw size={16} />
                </button>
              )}
              <button
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent p-2 text-ink-secondary transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={() => setConfirmAction({ type: 'delete', id: apiKey.id, name: apiKey.name })}
                title={t('apiKeys.actions.delete')}
              >
                <Trash2 size={16} />
              </button>
            </span>
          );
        },
      }),
    ],
    [visibleKeys, copied, t],
  );

  const table = useReactTable({
    data: apiKeys,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full p-8">
      <PageHeader
        title={t('apiKeys.title')}
        subtitle={t('apiKeys.subtitle')}
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            {t('apiKeys.createBtn')}
          </button>
        }
      />

      {/* Create/Reveal Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]"
          onClick={() => {
            setShowModal(false);
            setCreatedKey(null);
          }}
        >
          <div className="w-[90%] max-w-[480px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">
                {createdKey ? t('apiKeys.createdTitle') : t('apiKeys.modalTitle')}
              </h2>
              <button
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-all hover:bg-muted hover:text-ink"
                onClick={() => {
                  setShowModal(false);
                  setCreatedKey(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6">
              {createdKey ? (
                <div>
                  <p className="mb-4 text-sm text-ink-muted">{t('apiKeys.createdHint')}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded-md bg-muted px-3 py-3 text-sm">{createdKey}</code>
                    <button className="btn-primary" onClick={() => copyToClipboard(createdKey, 'modal')}>
                      {copied === 'modal' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-secondary">{t('common.name')}</label>
                  <input
                    type="text"
                    placeholder={t('apiKeys.namePlaceholder')}
                    className="mb-5 w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                    value={newKey.name}
                    onChange={e => setNewKey({ ...newKey, name: e.target.value })}
                  />
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-ink-secondary">{t('common.role')}</label>
                  <select
                    className="w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                    value={newKey.role}
                    onChange={e => setNewKey({ ...newKey, role: e.target.value })}
                  >
                    {roleNames.map(r => (
                      <option key={r} value={r}>{t(`apiKeys.roles.${r}`)}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
            {!createdKey && (
              <div className="flex justify-end gap-3 px-6 pb-6">
                <button className="btn-secondary" onClick={() => { setShowModal(false); setCreatedKey(null); }}>{t('common.cancel')}</button>
                <button className="btn-primary" onClick={handleCreate}>{t('common.create')}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-6">
        <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center text-ink-muted">
              <KeyRound size={48} strokeWidth={1} className="mb-4 text-ink-muted opacity-40" />
              <h3 className="m-0 mb-2 text-lg font-semibold text-ink-secondary">{t('apiKeys.empty.title')}</h3>
              <p className="m-0 max-w-[300px] text-sm">{t('apiKeys.empty.description')}</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-border bg-muted">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-6 py-[1.125rem] text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border last:border-b-0 ${
                      idx % 2 === 1 ? 'bg-black/[0.02]' : ''
                    } hover:bg-primary/5`}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-[1.125rem] align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <h3 className="mb-4 text-lg font-semibold text-ink">{t('apiKeys.rolesTitle')}</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {roleNames.map(r => (
              <div key={r} className="flex flex-col gap-1 rounded-(--radius) bg-muted p-3">
                <code className="w-fit rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">{r}</code>
                <span className="text-xs text-ink-secondary">{t(`apiKeys.roleDescriptions.${r}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setConfirmAction(null)}>
          <div className="w-[90%] max-w-[400px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">
                {confirmAction.type === 'delete' ? t('apiKeys.confirm.deleteTitle') : t('apiKeys.confirm.revokeTitle')}
              </h2>
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-all hover:bg-muted hover:text-ink" onClick={() => setConfirmAction(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="mb-4 flex justify-center">
                <AlertTriangle size={48} className="text-amber-500" />
              </div>
              <p className="m-0 text-center text-[0.9375rem] leading-relaxed text-ink-secondary">
                <Trans
                  i18nKey={confirmAction.type === 'delete' ? 'apiKeys.confirm.deleteMessage' : 'apiKeys.confirm.revokeMessage'}
                  values={{ name: confirmAction.name }}
                  components={{ strong: <strong className="text-ink" /> }}
                />
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button className="btn-secondary" onClick={() => setConfirmAction(null)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={confirmAndExecute}>
                {confirmAction.type === 'delete' ? t('apiKeys.confirm.delete') : t('apiKeys.confirm.revoke')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
