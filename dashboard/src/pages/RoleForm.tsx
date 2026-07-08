import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Save, Check, Search, SearchX } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/Toast';
import { useRoleQuery, useCreateRoleMutation, useUpdateRoleMutation, usePermissionsQuery } from '../hooks/queries';
import type { PermissionItem } from '../services/api';

function prettifyGroup(group: string): string {
  return group.replace(/_/g, ' ');
}

export function RoleForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = !!id;
  useDocumentTitle(isEdit ? t('roles.editTitle') : t('roles.createTitle'));

  const { data: existingRole, isLoading: loadingRole } = useRoleQuery(id ?? '', isEdit);
  const { data: permissions, isLoading: permLoading } = usePermissionsQuery();
  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState('');

  useEffect(() => {
    if (existingRole) {
      setName(existingRole.name);
      setDescription(existingRole.description ?? '');
      setSelectedPerms(existingRole.permissions.map(p => p.id));
    }
  }, [existingRole]);

  const grouped = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    const filtered = !permissions ? [] : q
      ? permissions.filter(p => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q))
      : permissions;
    const map: Record<string, PermissionItem[]> = {};
    for (const p of filtered) {
      if (!map[p.group]) map[p.group] = [];
      map[p.group].push(p);
    }
    return map;
  }, [permissions, permSearch]);

  const togglePerm = (permId: string) => {
    setSelectedPerms(prev =>
      prev.includes(permId) ? prev.filter(id2 => id2 !== permId) : [...prev, permId],
    );
  };

  const selectGroup = (groupPerms: PermissionItem[], select: boolean) => {
    const ids = groupPerms.map(p => p.id);
    setSelectedPerms(prev => {
      const without = prev.filter(pid => !ids.includes(pid));
      return select ? [...without, ...ids] : without;
    });
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const data = { name: name.trim(), description: description.trim() || undefined, permissionIds: selectedPerms };
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data });
        toast.success(t('roles.toasts.updateSuccess'));
      } else {
        await createMutation.mutateAsync(data);
        toast.success(t('roles.toasts.createSuccess'));
      }
      navigate('/roles');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      toast.error(isEdit ? t('roles.toasts.updateError') : t('roles.toasts.createError'), message);
    }
  };

  if (isEdit && loadingRole) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full p-7 max-sm:p-4">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate('/roles')} className="icon-btn" aria-label={t('common.back')}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="m-0 text-[1.375rem] font-bold tracking-tight text-[var(--color-ink)]">
            {isEdit ? t('roles.editTitle') : t('roles.createTitle')}
          </h1>
          <p className="m-0 mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">{t('roles.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Name + description */}
        <div className="card mb-5 grid grid-cols-2 gap-4 p-5 max-sm:grid-cols-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{t('roles.name')}</span>
            <input
              className="input-base"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('roles.namePlaceholder')}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{t('roles.description')}</span>
            <input
              className="input-base"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('roles.descriptionPlaceholder')}
            />
          </div>
        </div>

        {/* Permissions */}
        <div className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[0.9375rem] font-semibold text-[var(--color-ink)]">{t('roles.permissions')}</h2>
              <p className="m-0 mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">
                {t('roles.permissionsSummary', { selected: selectedPerms.length, total: permissions?.length ?? 0 })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="search-bar w-64 max-sm:w-full">
                <Search size={14} className="text-[var(--color-ink-muted)] shrink-0" />
                <input
                  value={permSearch}
                  onChange={e => setPermSearch(e.target.value)}
                  placeholder={t('roles.searchPermissionsPlaceholder')}
                />
              </div>
              <button
                type="button"
                className="text-[0.8rem] font-medium text-[var(--color-primary)] hover:underline cursor-pointer bg-transparent border-none whitespace-nowrap"
                onClick={() => setSelectedPerms(permissions?.map(p => p.id) ?? [])}
              >
                {t('roles.selectAllPermissions')}
              </button>
              <span className="text-[0.8rem] text-[var(--color-border-strong)]">|</span>
              <button
                type="button"
                className="text-[0.8rem] font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-error)] cursor-pointer bg-transparent border-none whitespace-nowrap"
                onClick={() => setSelectedPerms([])}
              >
                {t('roles.clearAllPermissions')}
              </button>
            </div>
          </div>

          {permLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-[var(--color-primary)]" size={22} />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--color-ink-muted)]">
              <SearchX size={24} strokeWidth={1.5} className="opacity-50" />
              <span className="text-[0.8125rem]">{t('roles.noPermissionsMatch')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
              {Object.entries(grouped).map(([group, perms]) => (
                <div key={group} className="rounded-[var(--radius)] border border-[var(--color-border)] p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{prettifyGroup(group)}</span>
                    <div className="flex gap-1.5">
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
                  <div className="flex flex-wrap gap-1.5">
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
                          title={perm.name}
                        >
                          {isSelected && <Check size={10} />}
                          {perm.description ?? perm.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate('/roles')}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving || !name.trim()}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isEdit ? t('common.save') : t('roles.createRole')}
          </button>
        </div>
      </form>
    </div>
  );
}
