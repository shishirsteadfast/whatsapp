import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Pencil, Trash2, Loader2, User, Shield, X, Save,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { useRole } from '../hooks/useRole';
import { useUsersQuery, useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation, useRolesQuery } from '../hooks/queries';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UserForm {
  name: string;
  phone: string;
  password: string;
  roleIds: string[];
  isActive: boolean;
}



// ─── User Modal ─────────────────────────────────────────────────────────────

function UserModal({
  edit,
  onClose,
  onSave,
}: {
  edit?: { id: string; name: string; phone: string; isActive: boolean; roles?: Array<{ id: string; name: string }> };
  onClose: () => void;
  onSave: (form: UserForm) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { data: roles } = useRolesQuery();
  const [form, setForm] = useState<UserForm>(() => ({
    name: edit?.name ?? '',
    phone: edit?.phone ?? '',
    password: '',
    roleIds: edit?.roles?.map(r => r.id) ?? [],
    isActive: edit?.isActive ?? true,
  }));
  const [saving, setSaving] = useState(false);

  const set = (key: keyof UserForm, val: string | boolean | string[]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const toggleRole = (roleId: string) => {
    setForm(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    if (!edit && !form.password) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box !max-w-[520px]" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="m-0 text-[1.125rem] font-bold text-[var(--color-ink)]">
            {edit ? t('users.editTitle') : t('users.createTitle')}
          </h2>
          <button onClick={onClose} className="icon-btn !border-none !bg-transparent !text-[var(--color-ink-muted)] hover:!text-[var(--color-ink)]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{t('users.name')}</span>
              <input
                className="input-base"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder={t('users.namePlaceholder')}
                required
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{t('users.phone')}</span>
              <input
                className="input-base"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder={t('users.phonePlaceholder')}
                type="tel"
                required
              />
            </div>

            {/* Password (only for create) */}
            {!edit && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{t('users.password')}</span>
                <input
                  className="input-base"
                  type="password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={t('users.passwordPlaceholder')}
                  required
                />
              </div>
            )}

            {/* Roles selection */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{t('users.assignRoles')}</span>
              <div className="flex flex-wrap gap-2">
                {roles?.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.id)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] font-medium border transition-all ${
                      form.roleIds.includes(role.id)
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] bg-transparent text-[var(--color-ink-secondary)] hover:border-[var(--color-border-strong)]'
                    }`}
                  >
                    <Shield size={12} />
                    {role.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Active status (only for edit) */}
            {edit && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={e => set('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="isActive" className="text-[0.8375rem] text-[var(--color-ink-secondary)] cursor-pointer">
                  {t('users.isActive')}
                </label>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {edit ? t('common.save') : t('users.createUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Users Page ────────────────────────────────────────────────────────

export function UsersPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { isAdmin } = useRole();
  useDocumentTitle(t('users.title'));

  const { data: users, isLoading, refetch } = useUsersQuery();
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();

  const [search, setSearch] = useState('');
  const [modalEdit, setModalEdit] = useState<{
    id: string;
    name: string;
    phone: string;
    password: string;
    roleIds: string[];
    isActive: boolean;
  } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!users) return [];
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      u => u.name.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q),
    );
  }, [users, search]);

  const handleCreate = async (form: UserForm) => {
    try {
      await createMutation.mutateAsync({
        name: form.name,
        phone: form.phone,
        password: form.password,
        roleIds: form.roleIds,
        isActive: form.isActive,
      });
      toast.success(t('users.toasts.createSuccess'));
      setShowCreate(false);
      void refetch();
    } catch (err) {
      toast.error(t('users.toasts.createError'), err instanceof Error ? err.message : '');
    }
  };

  const handleUpdate = async (form: UserForm) => {
    if (!modalEdit) return;
    try {
      await updateMutation.mutateAsync({
        id: modalEdit.id,
        data: {
          name: form.name,
          phone: form.phone,
          roleIds: form.roleIds,
          isActive: form.isActive,
        },
      });
      toast.success(t('users.toasts.updateSuccess'));
      setModalEdit(null);
      void refetch();
    } catch (err) {
      toast.error(t('users.toasts.updateError'), err instanceof Error ? err.message : '');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t('users.toasts.deleteSuccess'));
      setDeleteConfirm(null);
      void refetch();
    } catch (err) {
      toast.error(t('users.toasts.deleteError'), err instanceof Error ? err.message : '');
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
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t('users.createUser')}
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
            placeholder={t('users.searchPlaceholder')}
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
            <User size={36} strokeWidth={1.2} className="opacity-30 mb-3" />
            <h3>{t('users.emptyTitle')}</h3>
            <p>{t('users.emptyDescription')}</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="table-header" style={{ gridTemplateColumns: '1fr 1.2fr 0.8fr 1.2fr 80px' }}>
              <span>{t('users.name')}</span>
              <span>{t('users.phone')}</span>
              <span>{t('users.role')}</span>
              <span>{t('users.assignedRoles')}</span>
              <span className="text-right">{t('common.actions')}</span>
            </div>

            {/* Rows */}
            {filtered.map(user => (
              <div
                key={user.id}
                className="table-row-base"
                style={{ gridTemplateColumns: '1fr 1.2fr 0.8fr 1.2fr 80px' }}
              >
                <span className="text-[0.8875rem] font-medium text-[var(--color-ink)] truncate">
                  {user.name}
                </span>
                <span className="text-[0.8375rem] text-[var(--color-ink-secondary)] font-mono">
                  {user.phone}
                </span>
                <div>
                  <span className="pill text-[0.6875rem] capitalize"
                    style={{
                      background: user.role === 'admin' ? 'var(--color-primary-dim)' : 'var(--color-muted)',
                      color: user.role === 'admin' ? 'var(--color-primary)' : 'var(--color-ink-secondary)',
                    }}
                  >
                    {user.role}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map(r => (
                      <span
                        key={r.id}
                        className="pill text-[0.65rem]"
                        style={{
                          background: 'var(--color-primary-dim)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {r.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[0.75rem] text-[var(--color-ink-muted)]">—</span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    className="icon-btn"
                    title={t('common.edit')}
                    onClick={() =>
                      setModalEdit({
                        id: user.id,
                        name: user.name,
                        phone: user.phone,
                        password: '',
                        roleIds: user.roles?.map(r => r.id) ?? [],
                        isActive: user.isActive,
                      })
                    }
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-btn !text-red-400 hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-500/10"
                    title={t('common.delete')}
                    onClick={() => setDeleteConfirm(user.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <UserModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {modalEdit && (
        <UserModal
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
              <h2 className="m-0 text-[1.125rem] font-bold text-[var(--color-ink)]">{t('users.deleteConfirm')}</h2>
              <button onClick={() => setDeleteConfirm(null)} className="icon-btn !border-none !bg-transparent">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="m-0 text-[0.8875rem] text-[var(--color-ink-secondary)]">{t('users.deleteWarning')}</p>
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
