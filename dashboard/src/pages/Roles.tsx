import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Pencil, Trash2, Loader2, Shield, ShieldCheck, ShieldPlus, X,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useRole } from '../hooks/useRole';
import { useRolesQuery, useDeleteRoleMutation } from '../hooks/queries';
import { StatCard } from '../components/dashboard/StatCard';

// ─── Main Roles Page ────────────────────────────────────────────────────────

export function RolesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useRole();
  useDocumentTitle(t('roles.title'));

  const { data: roles, isLoading } = useRolesQuery();
  const deleteMutation = useDeleteRoleMutation();

  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!roles) return [];
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(r => r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q));
  }, [roles, search]);

  const roleStats = useMemo(() => {
    const total = roles?.length ?? 0;
    const system = roles?.filter(r => r.isSystem).length ?? 0;
    return { total, system, custom: total - system };
  }, [roles]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t('roles.toasts.deleteSuccess'));
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(t('roles.toasts.deleteError'), err instanceof Error ? err.message : '');
    }
  };

  if (!isAdmin) {
    return (
      <div className="w-full p-7 max-sm:p-4">
        <p className="text-[var(--color-ink-muted)]">{t('common.accessDenied')}</p>
      </div>
    );
  }

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title={t('roles.title')}
        subtitle={t('roles.subtitle')}
        actions={
          <button className="btn-primary" onClick={() => navigate('/roles/new')}>
            <Plus size={16} />
            {t('roles.createRole')}
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-3 gap-4 max-sm:grid-cols-1">
        <StatCard
          label={t('roles.stats.total')}
          value={roleStats.total}
          icon={Shield}
          accent="var(--color-ink)"
          bg="var(--color-muted)"
        />
        <StatCard
          label={t('roles.stats.system')}
          value={roleStats.system}
          icon={ShieldCheck}
          accent="var(--color-primary)"
          bg="var(--color-primary-dim)"
        />
        <StatCard
          label={t('roles.stats.custom')}
          value={roleStats.custom}
          icon={ShieldPlus}
          accent="#6366f1"
          bg="rgba(99,102,241,0.1)"
        />
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="search-bar max-w-md">
          <Search size={16} className="text-[var(--color-ink-muted)] shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('roles.searchPlaceholder')}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state py-16">
            <Shield size={36} strokeWidth={1.2} className="opacity-30 mb-3" />
            <h3>{t('roles.emptyTitle')}</h3>
            <p>{t('roles.emptyDescription')}</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="table-header" style={{ gridTemplateColumns: '1fr 1.5fr 100px 1fr 80px' }}>
              <span>{t('roles.name')}</span>
              <span>{t('roles.description')}</span>
              <span>{t('roles.type')}</span>
              <span>{t('roles.permissions')}</span>
              <span className="text-right">{t('common.actions')}</span>
            </div>

            {/* Rows */}
            {filtered.map(role => (
              <div
                key={role.id}
                className="table-row-base"
                style={{ gridTemplateColumns: '1fr 1.5fr 100px 1fr 80px' }}
              >
                <span className="text-[0.8875rem] font-medium text-[var(--color-ink)] flex items-center gap-2">
                  <Shield size={14} className={role.isSystem ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-muted)]'} />
                  {role.name}
                </span>
                <span className="text-[0.7875rem] text-[var(--color-ink-secondary)] truncate">
                  {role.description ?? '—'}
                </span>
                <div>
                  <span className={`pill text-[0.6875rem] ${role.isSystem ? 'text-[var(--color-primary)] bg-[var(--color-primary-dim)]' : 'text-[var(--color-ink-muted)] bg-[var(--color-muted)]'}`}>
                    {role.isSystem ? t('roles.system') : t('roles.custom')}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {role.permissions.length === 0 ? (
                    <span className="text-[0.75rem] italic text-[var(--color-ink-muted)]">{t('roles.noPermissions')}</span>
                  ) : (
                    <>
                      <span
                        className="pill w-fit text-[0.6875rem]"
                        style={{ background: 'var(--color-muted)', color: 'var(--color-ink-secondary)' }}
                      >
                        {t('roles.permissionCount', { count: role.permissions.length })}
                      </span>
                      <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                        {t('roles.acrossGroups', { count: new Set(role.permissions.map(p => p.group)).size })}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    className="icon-btn"
                    title={t('common.edit')}
                    onClick={() => navigate(`/roles/${role.id}/edit`)}
                  >
                    <Pencil size={14} />
                  </button>
                  {!role.isSystem && (
                    <button
                      className="icon-btn !text-red-400 hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-500/10"
                      title={t('common.delete')}
                      onClick={() => setDeleteConfirm(role.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-box !max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.125rem] font-bold text-[var(--color-ink)]">{t('roles.deleteConfirm')}</h2>
              <button onClick={() => setDeleteConfirm(null)} className="icon-btn !border-none !bg-transparent">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="m-0 text-[0.8875rem] text-[var(--color-ink-secondary)]">{t('roles.deleteWarning')}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
