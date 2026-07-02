import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Pencil, Trash2, Loader2, Shield, X, Save, Check,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useRole } from '../hooks/useRole';
import { useRolesQuery, useCreateRoleMutation, useUpdateRoleMutation, useDeleteRoleMutation, usePermissionsQuery } from '../hooks/queries';
import type { PermissionItem } from '../services/api';

// ─── Role Form Modal ────────────────────────────────────────────────────────

function RoleModal({
  edit,
  onClose,
  onSave,
}: {
  edit?: { id: string; name: string; description: string | null; permissionIds: string[] };
  onClose: () => void;
  onSave: (data: { name: string; description?: string; permissionIds: string[] }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { data: permissions, isLoading: permLoading } = usePermissionsQuery();
  const [name, setName] = useState(edit?.name ?? '');
  const [description, setDescription] = useState(edit?.description ?? '');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(edit?.permissionIds ?? []);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    if (!permissions) return {};
    const map: Record<string, PermissionItem[]> = {};
    for (const p of permissions) {
      if (!map[p.group]) map[p.group] = [];
      map[p.group].push(p);
    }
    return map;
  }, [permissions]);

  const togglePerm = (permId: string) => {
    setSelectedPerms(prev =>
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId],
    );
  };

  const selectGroup = (groupPerms: PermissionItem[], select: boolean) => {
    const ids = groupPerms.map(p => p.id);
    setSelectedPerms(prev => {
      const without = prev.filter(id => !ids.includes(id));
      return select ? [...without, ...ids] : without;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() || undefined, permissionIds: selectedPerms });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box !max-w-[640px]" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="m-0 text-[1.125rem] font-bold text-[var(--color-ink)]">
            {edit ? t('roles.editTitle') : t('roles.createTitle')}
          </h2>
          <button onClick={onClose} className="icon-btn !border-none !bg-transparent !text-[var(--color-ink-muted)] hover:!text-[var(--color-ink)]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{t('roles.name')}</span>
              <input
                className="input-base"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('roles.namePlaceholder')}
                required
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{t('roles.description')}</span>
              <input
                className="input-base"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('roles.descriptionPlaceholder')}
              />
            </div>

            {/* Permissions */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{t('roles.permissions')}</span>

              {permLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="animate-spin text-[var(--color-primary)]" size={20} />
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto space-y-2 rounded-[var(--radius)] border border-[var(--color-border)] p-3">
                  {Object.entries(grouped).map(([group, perms]) => (
                    <div key={group}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{group}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="text-[0.65rem] text-[var(--color-ink-muted)] hover:text-[var(--color-primary)] cursor-pointer bg-transparent border-none"
                            onClick={() => selectGroup(perms, true)}
                          >
                            {t('common.selectAll')}
                          </button>
                          <span className="text-[0.65rem] text-[var(--color-ink-muted)]">|</span>
                          <button
                            type="button"
                            className="text-[0.65rem] text-[var(--color-ink-muted)] hover:text-[var(--color-error)] cursor-pointer bg-transparent border-none"
                            onClick={() => selectGroup(perms, false)}
                          >
                            {t('common.deselectAll')}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {perms.map(perm => {
                          const isSelected = selectedPerms.includes(perm.id);
                          return (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() => togglePerm(perm.id)}
                              className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium border transition-all ${
                                isSelected
                                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                                  : 'border-[var(--color-border)] bg-transparent text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink-secondary)]'
                              }`}
                              title={perm.description ?? perm.name}
                            >
                              {isSelected && <Check size={10} />}
                              {perm.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <span className="text-[0.6875rem] text-[var(--color-ink-muted)]">
                {selectedPerms.length} {t('roles.permissionsSelected')}
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving || !name.trim()}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {edit ? t('common.save') : t('roles.createRole')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Roles Page ────────────────────────────────────────────────────────

export function RolesPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { isAdmin } = useRole();
  useDocumentTitle(t('roles.title'));

  const { data: roles, isLoading, refetch } = useRolesQuery();
  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();

  const [search, setSearch] = useState('');
  const [modalEdit, setModalEdit] = useState<{ id: string; name: string; description: string | null; permissionIds: string[] } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!roles) return [];
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(r => r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q));
  }, [roles, search]);

  const handleCreate = async (data: { name: string; description?: string; permissionIds: string[] }) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success(t('roles.toasts.createSuccess'));
      setShowCreate(false);
      void refetch();
    } catch (err) {
      toast.error(t('roles.toasts.createError'), err instanceof Error ? err.message : '');
    }
  };

  const handleUpdate = async (data: { name: string; description?: string; permissionIds: string[] }) => {
    if (!modalEdit) return;
    try {
      await updateMutation.mutateAsync({ id: modalEdit.id, data });
      toast.success(t('roles.toasts.updateSuccess'));
      setModalEdit(null);
      void refetch();
    } catch (err) {
      toast.error(t('roles.toasts.updateError'), err instanceof Error ? err.message : '');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t('roles.toasts.deleteSuccess'));
      setDeleteConfirm(null);
      void refetch();
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
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t('roles.createRole')}
          </button>
        }
      />

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
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 5).map(p => (
                    <span
                      key={p.id}
                      className="pill text-[0.625rem]"
                      style={{ background: 'var(--color-muted)', color: 'var(--color-ink-secondary)' }}
                    >
                      {p.name}
                    </span>
                  ))}
                  {role.permissions.length > 5 && (
                    <span className="pill text-[0.625rem] text-[var(--color-ink-muted)]">
                      +{role.permissions.length - 5}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    className="icon-btn"
                    title={t('common.edit')}
                    onClick={() =>
                      setModalEdit({
                        id: role.id,
                        name: role.name,
                        description: role.description,
                        permissionIds: role.permissions.map(p => p.id),
                      })
                    }
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

      {/* Create Modal */}
      {showCreate && (
        <RoleModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {modalEdit && (
        <RoleModal
          edit={modalEdit}
          onClose={() => setModalEdit(null)}
          onSave={handleUpdate}
        />
      )}

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
