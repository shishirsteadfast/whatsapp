import { useState, useRef, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, Edit, Upload, Search,
  X, ChevronLeft, ChevronRight, Check, AlertTriangle, Loader2,
  Users, CheckSquare, Square, FileText, Download, Filter,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { useRole } from '../hooks/useRole';
import {
  queryKeys,
  useContactGroupsQuery,
  useContactGroupQuery,
  useCreateContactGroupMutation,
  useUpdateContactGroupMutation,
  useDeleteContactGroupMutation,
  useAddGroupMembersMutation,
  useRemoveGroupMembersMutation,
  useFilterContactsQuery,
  useBulkCreateWithGroupMutation,
  useContactsQuery,
} from '../hooks/queries';
import { groupApi, type Contact, type ContactGroup, type ContactPayload } from '../services/api';
import { CountryCodePicker } from '../components/CountryCodePicker';
import { StateSelect } from '../components/StateSelect';
import { CitySelect } from '../components/CitySelect';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_DIAL = '+60';

function formatPhone(countryCode: string, phone: string): string {
  return `${countryCode}${phone}`;
}

const KNOWN_DIAL_CODES = [
  '+1268','+1242','+1246','+1809','+1876','+1869','+1758','+1784','+1868','+1649',
  '+977','+971','+973','+974','+968','+966','+965','+962','+961','+960',
  '+964','+963','+959','+955','+950','+947','+942','+937','+934','+931',
  '+925','+922','+921','+920','+919','+918','+917','+916','+915','+914',
  '+913','+912','+911','+910','+909','+908','+907','+906','+905','+904',
  '+903','+902','+901','+900','+886','+880','+856','+855','+853','+852',
  '+851','+850','+84','+83','+82','+81','+80','+79','+78','+77',
  '+76','+75','+74','+73','+72','+71','+70','+69','+68','+67',
  '+66','+65','+64','+63','+62','+61','+60','+59','+58','+57',
  '+56','+55','+54','+53','+52','+51','+50','+49','+48','+47',
  '+46','+45','+44','+43','+42','+41','+40','+39','+38','+37',
  '+36','+35','+34','+33','+32','+31','+30','+29','+28','+27',
  '+26','+25','+24','+23','+22','+21','+20','+18','+17','+16',
  '+15','+14','+13','+12','+11','+10','+9','+8','+7','+6',
  '+5','+4','+3','+2','+1',
];

function parseImportPhone(raw: string): { countryCode: string; phone: string } | null {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (!cleaned.startsWith('+')) return null;
  for (const code of KNOWN_DIAL_CODES) {
    if (cleaned.startsWith(code)) {
      const local = cleaned.slice(code.length);
      if (local && /^\d+$/.test(local)) {
        return { countryCode: code, phone: local };
      }
    }
  }
  return null;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

// ─── Form Primitives ─────────────────────────────────────────────────────────

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.7875rem] font-semibold text-[var(--color-ink-secondary)]">{label}</span>
      {children}
      {error && <p className="m-0 text-[0.75rem] font-medium text-[var(--color-error)]">{error}</p>}
    </div>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input-base ${props.className ?? ''}`} />;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImportRow {
  row: number;
  fullName: string;
  rawPhone: string;
  country: string;
  state: string;
  city: string;
  address: string;
  note: string;
  countryCode?: string;
  phone?: string;
  valid: boolean;
  errors: string[];
}

interface WizardState {
  step: 1 | 2 | 3;
  name: string;
  description: string;
  method: 'csv' | 'filter' | null;
  csvRows: ImportRow[];
  selectedContactIds: Set<string>;
}

const EMPTY_WIZARD: WizardState = {
  step: 1,
  name: '',
  description: '',
  method: null,
  csvRows: [],
  selectedContactIds: new Set(),
};

// ─── Create Group Wizard ─────────────────────────────────────────────────────

function CreateGroupWizard({
  existingNames,
  existingPhones,
  onClose,
  onCreated,
}: {
  existingNames: string[];
  existingPhones: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateContactGroupMutation();
  const bulkCreateWithGroup = useBulkCreateWithGroupMutation();
  const addMembers = useAddGroupMembersMutation();

  const [wizard, setWizard] = useState<WizardState>(EMPTY_WIZARD);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ groupId: string; created: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importValidOnly, setImportValidOnly] = useState(true);

  // Filter state
  const [filterCountryId, setFilterCountryId] = useState<number | null>(null);
  const [filterStateId, setFilterStateId] = useState<number | null>(null);
  const [filterCityId, setFilterCityId] = useState<number | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');

  const { data: filteredContacts = [] } = useFilterContactsQuery(
    {
      countryId: filterCountryId ?? undefined,
      stateId: filterStateId ?? undefined,
      cityId: filterCityId ?? undefined,
      name: filterName || undefined,
      phonePrefix: filterPhone || undefined,
    },
    wizard.method === 'filter' && wizard.step === 2,
  );

  const set = <K extends keyof WizardState>(key: K, val: WizardState[K]) => {
    setWizard(prev => ({ ...prev, [key]: val }));
  };

  const validateStep1 = (): boolean => {
    const errs: { name?: string } = {};
    if (!wizard.name.trim()) {
      errs.name = t('groups.form.nameRequired');
    } else if (existingNames.includes(wizard.name.trim())) {
      errs.name = t('groups.form.nameRequired');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (wizard.step === 1 && !validateStep1()) return;
    setWizard(prev => ({ ...prev, step: (prev.step + 1) as 2 | 3 }));
  };

  const goBack = () => {
    setWizard(prev => ({ ...prev, step: (prev.step - 1) as 1 | 2 }));
  };

  // CSV handling
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const validated = parsed.map((r, idx) => {
        const rawPhone = (r['phone'] || r['whatsapp'] || r['whatsapp phone'] || '').trim();
        const fullName = (r['fullname'] || r['full name'] || r['name'] || '').trim();
        const country = (r['country'] || '').trim();
        const state = (r['state'] || '').trim();
        const city = (r['city'] || '').trim();
        const address = (r['address'] || '').trim();
        const note = (r['note'] || r['notes'] || '').trim();
        const errs: string[] = [];
        if (!rawPhone) {
          errs.push(t('groups.create.csv.errorPhone'));
          return { row: idx + 2, fullName, rawPhone, country, state, city, address, note, valid: false, errors: errs };
        }
        const parsed = parseImportPhone(rawPhone);
        if (!parsed) {
          errs.push(t('groups.create.csv.errorNoCountryCode'));
          return { row: idx + 2, fullName, rawPhone, country, state, city, address, note, valid: false, errors: errs };
        }
        const fullNum = `${parsed.countryCode}${parsed.phone}`;
        if (existingPhones.includes(fullNum)) {
          errs.push(t('groups.create.csv.errorPhone'));
        }
        return {
          row: idx + 2, fullName, rawPhone, country, state, city, address, note,
          countryCode: parsed.countryCode,
          phone: parsed.phone,
          valid: errs.length === 0,
          errors: errs,
        };
      });
      setWizard(prev => ({ ...prev, csvRows: validated, step: 2 as const }));
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  };

  const toggleContactSelection = (id: string) => {
    setWizard(prev => {
      const next = new Set(prev.selectedContactIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, selectedContactIds: next };
    });
  };

  const toggleAllContacts = () => {
    setWizard(prev => {
      const allIds = filteredContacts.map(c => c.id);
      const allSelected = allIds.every(id => prev.selectedContactIds.has(id));
      if (allSelected) {
        return { ...prev, selectedContactIds: new Set() };
      }
      return { ...prev, selectedContactIds: new Set(allIds) };
    });
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      if (wizard.method === 'csv') {
        const rowsToImport = importValidOnly
          ? wizard.csvRows.filter(r => r.valid)
          : wizard.csvRows;
        const payloads: ContactPayload[] = rowsToImport.map(r => ({
          fullName: r.fullName || undefined,
          countryCode: r.countryCode!,
          phone: r.phone!,
          address: r.address || undefined,
          note: r.note || undefined,
        }));
        const res = await bulkCreateWithGroup.mutateAsync({
          name: wizard.name.trim(),
          description: wizard.description.trim() || undefined,
          contacts: payloads,
        });
        setResult({ groupId: res.group.id, created: res.created, skipped: res.skipped });
      } else {
        const group = await createMutation.mutateAsync({
          name: wizard.name.trim(),
          description: wizard.description.trim() || undefined,
        });
        if (wizard.selectedContactIds.size > 0) {
          await addMembers.mutateAsync({
            id: group.id,
            contactIds: [...wizard.selectedContactIds],
          });
        }
        setResult({ groupId: group.id, created: wizard.selectedContactIds.size, skipped: 0 });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactGroups });
      onCreated();
    } catch (err) {
      toast.error(t('groups.toasts.createError'), err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  };

  const validCsvCount = wizard.csvRows.filter(r => r.valid).length;
  const invalidCsvCount = wizard.csvRows.filter(r => !r.valid).length;
  const rowsToImport = importValidOnly ? wizard.csvRows.filter(r => r.valid) : wizard.csvRows;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box max-w-[720px]"
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header shrink-0">
          <div>
            <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('groups.form.createTitle')}</h2>
            <div className="mt-2 flex items-center gap-2">
              {([1, 2, 3] as const).map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold ${wizard.step >= s ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]'}`}>{s}</span>
                  {i < 2 && <span className={`h-px w-6 ${wizard.step > s ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />}
                </span>
              ))}
              <span className="ml-1 text-[0.75rem] text-[var(--color-ink-muted)]">
                {wizard.step === 1 ? t('groups.create.step1Title') : wizard.step === 2 ? t('groups.create.step2Title') : t('groups.create.step3Title')}
              </span>
            </div>
          </div>
          <button className="icon-btn border-none" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1 — Group Details */}
          {wizard.step === 1 && (
            <div className="space-y-4">
              <Field label={`${t('groups.form.name')} *`} error={errors.name}>
                <FormInput
                  value={wizard.name}
                  onChange={e => { set('name', e.target.value); setErrors({}); }}
                  placeholder={t('groups.form.namePlaceholder')}
                />
              </Field>
              <Field label={t('groups.form.description')}>
                <textarea
                  value={wizard.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder={t('groups.form.descriptionPlaceholder')}
                  rows={3}
                  className="input-base resize-none"
                />
              </Field>
            </div>
          )}

          {/* Step 2 — Choose Method & Add Members */}
          {wizard.step === 2 && !wizard.method && (
            <div className="space-y-4">
              <p className="m-0 text-[0.875rem] text-[var(--color-ink-secondary)]">{t('groups.create.method')}</p>
              <button
                onClick={() => set('method', 'csv')}
                className="flex w-full items-center gap-4 rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] p-5 text-left transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] cursor-pointer bg-transparent"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]">
                  <Upload size={22} className="text-[var(--color-ink-muted)]" />
                </div>
                <div>
                  <p className="m-0 text-[0.9375rem] font-bold text-[var(--color-ink)]">{t('groups.create.csvImport')}</p>
                  <p className="m-0 mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">{t('groups.create.csvImportDesc')}</p>
                </div>
              </button>
              <button
                onClick={() => set('method', 'filter')}
                className="flex w-full items-center gap-4 rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] p-5 text-left transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] cursor-pointer bg-transparent"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)]">
                  <Filter size={22} className="text-[var(--color-ink-muted)]" />
                </div>
                <div>
                  <p className="m-0 text-[0.9375rem] font-bold text-[var(--color-ink)]">{t('groups.create.filterSelect')}</p>
                  <p className="m-0 mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">{t('groups.create.filterSelectDesc')}</p>
                </div>
              </button>
            </div>
          )}

          {/* Step 2 — CSV Upload */}
          {wizard.step === 2 && wizard.method === 'csv' && (
            <div className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed p-10 text-center transition-colors ${dragOver ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-muted)]'}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)]">
                  <Upload size={22} className="text-[var(--color-ink-muted)]" />
                </div>
                <div>
                  <p className="m-0 text-[0.9rem] font-semibold text-[var(--color-ink)]">{t('groups.create.csv.dropzone')}</p>
                  <p className="m-0 mt-0.5 text-[0.8rem] text-[var(--color-ink-muted)]">{t('groups.create.csv.dropzoneHint')}</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </div>
          )}

          {/* Step 2 — CSV Preview */}
          {wizard.step === 2 && wizard.method === 'csv' && wizard.csvRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary-dim)] px-3 py-1 text-[0.75rem] font-semibold text-[var(--color-primary)]">
                  <Check size={12} /> {t('groups.create.csv.validRows', { count: validCsvCount })}
                </span>
                {invalidCsvCount > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[0.75rem] font-semibold text-red-500 dark:bg-red-500/15 dark:text-red-400">
                    <AlertTriangle size={12} /> {t('groups.create.csv.invalidRows', { count: invalidCsvCount })}
                  </span>
                )}
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-[0.8125rem] font-medium text-[var(--color-ink-secondary)]">
                  <span className="relative inline-flex h-[18px] w-[32px] items-center">
                    <input type="checkbox" checked={importValidOnly} onChange={e => setImportValidOnly(e.target.checked)} className="peer sr-only" />
                    <span className="absolute inset-0 rounded-full bg-[var(--color-border-strong)] transition-all peer-checked:bg-[var(--color-primary)]" />
                    <span className="absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[14px]" />
                  </span>
                  {t('groups.create.csv.importValid')}
                </label>
              </div>
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <table className="w-full min-w-[600px] text-[0.8125rem]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                      {['row', 'status', 'name', 'phone', 'country', 'city', 'error'].map(col => (
                        <th key={col} className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                          {t(`groups.create.csv.previewColumns.${col}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wizard.csvRows.map(row => (
                      <tr key={row.row} className={`border-b border-[var(--color-border)] last:border-none ${!row.valid ? 'bg-red-50/50 dark:bg-red-500/5' : ''}`}>
                        <td className="px-3 py-2 font-mono text-[var(--color-ink-muted)]">{row.row}</td>
                        <td className="px-3 py-2">
                          {row.valid
                            ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-dim)] text-[var(--color-primary)]"><Check size={11} /></span>
                            : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/15"><X size={11} /></span>
                          }
                        </td>
                        <td className="px-3 py-2 text-[var(--color-ink)]">{row.fullName || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[var(--color-ink)]">
                          {row.countryCode ? `${row.countryCode}${row.phone}` : row.rawPhone}
                        </td>
                        <td className="px-3 py-2 text-[var(--color-ink-secondary)]">{row.country || '—'}</td>
                        <td className="px-3 py-2 text-[var(--color-ink-secondary)]">{row.city || '—'}</td>
                        <td className="px-3 py-2">
                          {row.errors.length > 0 && (
                            <div className="flex flex-col gap-1">
                              {row.errors.map((err, i) => (
                                <span key={i} className="inline-flex items-start gap-1 text-[0.7375rem] font-medium text-red-500">
                                  <AlertTriangle size={11} className="mt-px shrink-0" />
                                  <span>{err}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 2 — Filter & Select */}
          {wizard.step === 2 && wizard.method === 'filter' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <Field label={t('groups.create.filter.country')}>
                  <CountryCodePicker
                    value={filterCountryId}
                    onChange={(id) => { setFilterCountryId(id); setFilterStateId(null); setFilterCityId(null); }}
                  />
                </Field>
                <Field label={t('groups.create.filter.state')}>
                  <StateSelect
                    countryId={filterCountryId}
                    value={filterStateId}
                    onChange={(id) => { setFilterStateId(id); setFilterCityId(null); }}
                    disabled={!filterCountryId}
                  />
                </Field>
                <Field label={t('groups.create.filter.city')}>
                  <CitySelect
                    stateId={filterStateId}
                    value={filterCityId}
                    onChange={(id) => setFilterCityId(id)}
                    disabled={!filterStateId}
                  />
                </Field>
                <Field label={t('common.name')}>
                  <FormInput
                    value={filterName}
                    onChange={e => setFilterName(e.target.value)}
                    placeholder={t('groups.create.filter.namePlaceholder')}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[0.8125rem] font-semibold text-[var(--color-ink-secondary)]">
                  {t('groups.create.filter.selected', { count: wizard.selectedContactIds.size })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFilterCountryId(null); setFilterStateId(null); setFilterCityId(null); setFilterName(''); setFilterPhone(''); }}
                    className="text-[0.8125rem] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer border-none bg-transparent p-0"
                  >
                    {t('groups.create.filter.clearFilters')}
                  </button>
                  <button
                    onClick={toggleAllContacts}
                    className="text-[0.8125rem] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer border-none bg-transparent p-0"
                  >
                    {filteredContacts.every(c => wizard.selectedContactIds.has(c.id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]" style={{ maxHeight: 360 }}>
                <table className="w-full min-w-[500px] text-[0.8125rem]">
                  <thead className="sticky top-0 bg-[var(--color-surface)] z-[1]">
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="w-10 px-3 py-2.5">
                        <button onClick={toggleAllContacts} className="cursor-pointer border-none bg-transparent p-0 text-[var(--color-ink-muted)]">
                          {filteredContacts.length > 0 && filteredContacts.every(c => wizard.selectedContactIds.has(c.id))
                            ? <CheckSquare size={16} className="text-[var(--color-primary)]" />
                            : <Square size={16} />
                          }
                        </button>
                      </th>
                      <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('groups.columns.name')}</th>
                      <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('contacts.columns.phone')}</th>
                      <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('contacts.columns.country')}</th>
                      <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('contacts.columns.city')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-[0.875rem] text-[var(--color-ink-muted)]">
                          {t('groups.create.filter.noResults')}
                        </td>
                      </tr>
                    ) : (
                      filteredContacts.map(contact => {
                        const isChecked = wizard.selectedContactIds.has(contact.id);
                        return (
                          <tr
                            key={contact.id}
                            className={`border-b border-[var(--color-border)] last:border-none cursor-pointer transition-colors hover:bg-[var(--color-muted)] ${isChecked ? 'bg-[var(--color-primary-dim)]' : ''}`}
                            onClick={() => toggleContactSelection(contact.id)}
                          >
                            <td className="px-3 py-2">
                              <button className="cursor-pointer border-none bg-transparent p-0 text-[var(--color-ink-muted)]">
                                {isChecked
                                  ? <CheckSquare size={16} className="text-[var(--color-primary)]" />
                                  : <Square size={16} />
                                }
                              </button>
                            </td>
                            <td className="px-3 py-2 text-[var(--color-ink)]">{contact.fullName || '—'}</td>
                            <td className="px-3 py-2 font-mono text-[var(--color-ink)]">{contact.countryCode}{contact.phone}</td>
                            <td className="px-3 py-2 text-[var(--color-ink-secondary)]">{contact.country?.name || '—'}</td>
                            <td className="px-3 py-2 text-[var(--color-ink-secondary)]">{contact.city?.name || '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {wizard.step === 3 && (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
                <h3 className="m-0 mb-3 text-[0.9375rem] font-bold text-[var(--color-ink)]">{t('groups.create.review.title')}</h3>
                <dl className="m-0 grid grid-cols-[120px_1fr] gap-y-2 text-[0.875rem]">
                  <dt className="font-semibold text-[var(--color-ink-secondary)]">{t('groups.create.review.nameLabel')}</dt>
                  <dd className="m-0 text-[var(--color-ink)]">{wizard.name}</dd>
                  <dt className="font-semibold text-[var(--color-ink-secondary)]">{t('groups.create.review.descriptionLabel')}</dt>
                  <dd className="m-0 text-[var(--color-ink)]">{wizard.description || '—'}</dd>
                  <dt className="font-semibold text-[var(--color-ink-secondary)]">{t('groups.create.review.membersLabel')}</dt>
                  <dd className="m-0 text-[var(--color-ink)]">
                    {wizard.method === 'csv'
                      ? `${rowsToImport.length} contacts from CSV`
                      : `${wizard.selectedContactIds.size} contacts selected`
                    }
                  </dd>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer shrink-0 border-t border-[var(--color-border)] pt-4">
          {wizard.step === 1 && (
            <>
              <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={goNext}>{t('common.next')}</button>
            </>
          )}
          {wizard.step === 2 && !wizard.method && (
            <button className="btn-secondary" onClick={goBack}>{t('common.back')}</button>
          )}
          {wizard.step === 2 && wizard.method === 'csv' && wizard.csvRows.length === 0 && (
            <>
              <button className="btn-secondary" onClick={() => set('method', null)}>{t('common.back')}</button>
            </>
          )}
          {wizard.step === 2 && wizard.method === 'csv' && wizard.csvRows.length > 0 && (
            <>
              <button className="btn-secondary" onClick={() => { set('csvRows', []); set('method', null); }}>{t('common.back')}</button>
              <button className="btn-primary" onClick={() => setWizard(prev => ({ ...prev, step: 3 }))}>
                {t('common.next')}
              </button>
            </>
          )}
          {wizard.step === 2 && wizard.method === 'filter' && (
            <>
              <button className="btn-secondary" onClick={() => set('method', null)}>{t('common.back')}</button>
              <button
                className="btn-primary"
                onClick={() => setWizard(prev => ({ ...prev, step: 3 }))}
                disabled={wizard.selectedContactIds.size === 0}
              >
                {t('common.next')} ({wizard.selectedContactIds.size})
              </button>
            </>
          )}
          {wizard.step === 3 && (
            <>
              <button className="btn-secondary" onClick={goBack}>{t('common.back')}</button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? <><Loader2 size={15} className="animate-spin" />{t('common.creating')}</> : t('common.create')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Group Detail Modal ──────────────────────────────────────────────────────

function GroupDetailModal({
  groupId,
  onClose,
  onRefresh,
}: {
  groupId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: group, isLoading } = useContactGroupQuery(groupId);
  const removeMembers = useRemoveGroupMembersMutation();
  const addMembers = useAddGroupMembersMutation();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Add members filter state
  const [filterCountryId, setFilterCountryId] = useState<number | null>(null);
  const [filterStateId, setFilterStateId] = useState<number | null>(null);
  const [filterCityId, setFilterCityId] = useState<number | null>(null);
  const [filterName, setFilterName] = useState('');
  const [addSelected, setAddSelected] = useState<Set<string>>(new Set());

  const { data: filteredContacts = [] } = useFilterContactsQuery(
    {
      countryId: filterCountryId ?? undefined,
      stateId: filterStateId ?? undefined,
      cityId: filterCityId ?? undefined,
      name: filterName || undefined,
    },
    showAddMembers,
  );

  const memberIds = useMemo(
    () => new Set(group?.members?.map(m => m.contactId) ?? []),
    [group],
  );

  const filteredMembers = useMemo(() => {
    if (!group?.members) return [];
    const q = search.toLowerCase();
    return group.members.filter(m =>
      (m.contact.fullName ?? '').toLowerCase().includes(q) ||
      `${m.contact.countryCode}${m.contact.phone}`.includes(q)
    );
  }, [group, search]);

  const handleRemoveMembers = async () => {
    try {
      const res = await removeMembers.mutateAsync({ id: groupId, contactIds: [...selected] });
      toast.success(t('groups.toasts.removeMembersSuccess', { count: res.removed }));
      setSelected(new Set());
      setShowRemoveConfirm(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactGroup(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactGroups });
      onRefresh();
    } catch (err) {
      toast.error(t('groups.toasts.removeMembersError'));
    }
  };

  const handleAddMembers = async () => {
    if (addSelected.size === 0) return;
    try {
      const res = await addMembers.mutateAsync({ id: groupId, contactIds: [...addSelected] });
      toast.success(t('groups.toasts.addMembersSuccess', { count: res.added }));
      setAddSelected(new Set());
      setShowAddMembers(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactGroup(groupId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactGroups });
      onRefresh();
    } catch (err) {
      toast.error(t('groups.toasts.addMembersError'));
    }
  };

  const toggleAddSelection = (id: string) => {
    setAddSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const availableContacts = useMemo(
    () => filteredContacts.filter(c => !memberIds.has(c.id)),
    [filteredContacts, memberIds],
  );

  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box max-w-[600px] flex items-center justify-center p-10" onClick={e => e.stopPropagation()}>
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box max-w-[700px]"
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header shrink-0">
          <div>
            <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{group?.name}</h2>
            {group?.description && (
              <p className="m-0 mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">{group.description}</p>
            )}
          </div>
          <button className="icon-btn border-none" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="search-bar max-w-[280px] flex-1">
              <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
              <input
                type="text"
                placeholder={t('groups.detail.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button
                  className="flex items-center gap-1.5 rounded-[var(--radius)] border border-red-200 bg-red-50 px-3 py-1.5 text-[0.8125rem] font-semibold text-red-600 transition-all hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400 cursor-pointer"
                  onClick={() => setShowRemoveConfirm(true)}
                >
                  <Trash2 size={14} />{t('groups.detail.removeSelected')} ({selected.size})
                </button>
              )}
              <button className="btn-primary" onClick={() => setShowAddMembers(true)}>
                <Plus size={15} />{t('groups.detail.addMembers')}
              </button>
            </div>
          </div>

          {/* Members List */}
          {filteredMembers.length === 0 ? (
            <div className="empty-state">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-muted)]">
                <Users size={26} strokeWidth={1.2} className="text-[var(--color-ink-muted)]" />
              </div>
              <h3>{t('groups.detail.empty.title')}</h3>
              <p>{t('groups.detail.empty.description')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
              <table className="w-full text-[0.8125rem]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                    <th className="w-10 px-3 py-2.5">
                      <button
                        onClick={() => {
                          if (filteredMembers.every(m => selected.has(m.contactId))) {
                            setSelected(new Set());
                          } else {
                            setSelected(new Set(filteredMembers.map(m => m.contactId)));
                          }
                        }}
                        className="cursor-pointer border-none bg-transparent p-0 text-[var(--color-ink-muted)]"
                      >
                        {filteredMembers.length > 0 && filteredMembers.every(m => selected.has(m.contactId))
                          ? <CheckSquare size={16} className="text-[var(--color-primary)]" />
                          : <Square size={16} />
                        }
                      </button>
                    </th>
                    <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('groups.columns.name')}</th>
                    <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('contacts.columns.phone')}</th>
                    <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('contacts.columns.country')}</th>
                    <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('contacts.columns.city')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map(member => {
                    const isChecked = selected.has(member.contactId);
                    return (
                      <tr
                        key={member.contactId}
                        className={`border-b border-[var(--color-border)] last:border-none ${isChecked ? 'bg-[var(--color-primary-dim)]' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <button
                            onClick={() => {
                              setSelected(prev => {
                                const next = new Set(prev);
                                next.has(member.contactId) ? next.delete(member.contactId) : next.add(member.contactId);
                                return next;
                              });
                            }}
                            className="cursor-pointer border-none bg-transparent p-0 text-[var(--color-ink-muted)]"
                          >
                            {isChecked
                              ? <CheckSquare size={16} className="text-[var(--color-primary)]" />
                              : <Square size={16} />
                            }
                          </button>
                        </td>
                        <td className="px-3 py-2 text-[var(--color-ink)]">{member.contact.fullName || '—'}</td>
                        <td className="px-3 py-2 font-mono text-[var(--color-ink)]">{member.contact.countryCode}{member.contact.phone}</td>
                        <td className="px-3 py-2 text-[var(--color-ink-secondary)]">{member.contact.country?.name || '—'}</td>
                        <td className="px-3 py-2 text-[var(--color-ink-secondary)]">{member.contact.city?.name || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer shrink-0 border-t border-[var(--color-border)] pt-4">
          <button className="btn-secondary" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>

      {/* Add Members Sub-Modal */}
      {showAddMembers && (
        <div className="modal-overlay z-[10]" onClick={() => setShowAddMembers(false)}>
          <div
            className="modal-box max-w-[600px]"
            style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header shrink-0">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('groups.detail.addMembers')}</h2>
              <button className="icon-btn border-none" onClick={() => setShowAddMembers(false)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <Field label={t('groups.create.filter.country')}>
                  <CountryCodePicker
                    value={filterCountryId}
                    onChange={(id) => { setFilterCountryId(id); setFilterStateId(null); setFilterCityId(null); }}
                  />
                </Field>
                <Field label={t('groups.create.filter.state')}>
                  <StateSelect
                    countryId={filterCountryId}
                    value={filterStateId}
                    onChange={(id) => { setFilterStateId(id); setFilterCityId(null); }}
                    disabled={!filterCountryId}
                  />
                </Field>
                <Field label={t('groups.create.filter.city')}>
                  <CitySelect
                    stateId={filterStateId}
                    value={filterCityId}
                    onChange={(id) => setFilterCityId(id)}
                    disabled={!filterStateId}
                  />
                </Field>
                <Field label={t('common.name')}>
                  <FormInput
                    value={filterName}
                    onChange={e => setFilterName(e.target.value)}
                    placeholder={t('groups.create.filter.namePlaceholder')}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[0.8125rem] font-semibold text-[var(--color-ink-secondary)]">
                  {addSelected.size} selected
                </span>
                <button
                  onClick={() => {
                    const allIds = availableContacts.map(c => c.id);
                    if (allIds.every(id => addSelected.has(id))) {
                      setAddSelected(new Set());
                    } else {
                      setAddSelected(new Set(allIds));
                    }
                  }}
                  className="text-[0.8125rem] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer border-none bg-transparent p-0"
                >
                  {availableContacts.every(c => addSelected.has(c.id)) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]" style={{ maxHeight: 300 }}>
                <table className="w-full min-w-[450px] text-[0.8125rem]">
                  <thead className="sticky top-0 bg-[var(--color-surface)] z-[1]">
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="w-10 px-3 py-2.5" />
                      <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('groups.columns.name')}</th>
                      <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('contacts.columns.phone')}</th>
                      <th className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('contacts.columns.country')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableContacts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-[0.875rem] text-[var(--color-ink-muted)]">
                          {t('groups.create.filter.noResults')}
                        </td>
                      </tr>
                    ) : (
                      availableContacts.map(contact => {
                        const isChecked = addSelected.has(contact.id);
                        return (
                          <tr
                            key={contact.id}
                            className={`border-b border-[var(--color-border)] last:border-none cursor-pointer transition-colors hover:bg-[var(--color-muted)] ${isChecked ? 'bg-[var(--color-primary-dim)]' : ''}`}
                            onClick={() => toggleAddSelection(contact.id)}
                          >
                            <td className="px-3 py-2">
                              {isChecked
                                ? <CheckSquare size={16} className="text-[var(--color-primary)]" />
                                : <Square size={16} />
                              }
                            </td>
                            <td className="px-3 py-2 text-[var(--color-ink)]">{contact.fullName || '—'}</td>
                            <td className="px-3 py-2 font-mono text-[var(--color-ink)]">{contact.countryCode}{contact.phone}</td>
                            <td className="px-3 py-2 text-[var(--color-ink-secondary)]">{contact.country?.name || '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer shrink-0 border-t border-[var(--color-border)] pt-4">
              <button className="btn-secondary" onClick={() => setShowAddMembers(false)}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleAddMembers} disabled={addSelected.size === 0}>
                {t('groups.detail.addMembers')} ({addSelected.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirm */}
      {showRemoveConfirm && (
        <div className="modal-overlay z-[10]" onClick={() => setShowRemoveConfirm(false)}>
          <div className="modal-box max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('groups.detail.removeSelected')}</h2>
              <button className="icon-btn border-none" onClick={() => setShowRemoveConfirm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/15">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
              </div>
              <p className="m-0 text-center text-[0.9rem] text-[var(--color-ink-secondary)]">
                {t('groups.detail.removeConfirm', { count: selected.size })}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRemoveConfirm(false)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={handleRemoveMembers}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function Groups() {
  const { t } = useTranslation();
  useDocumentTitle(t('groups.title'));
  const toast = useToast();
  const { canWrite } = useRole();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useContactGroupsQuery();
  const { data: contacts = [] } = useContactsQuery();
  const deleteMutation = useDeleteContactGroupMutation();
  const updateMutation = useUpdateContactGroupMutation();

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailTarget, setDetailTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactGroup | null>(null);
  const [editTarget, setEditTarget] = useState<ContactGroup | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const existingNames = useMemo(
    () => groups.map(g => g.name),
    [groups],
  );

  const existingPhones = useMemo(
    () => contacts.map(c => formatPhone(c.countryCode, c.phone)),
    [contacts],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return groups.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.description ?? '').toLowerCase().includes(q)
    );
  }, [groups, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactGroups });
      toast.success(t('groups.toasts.deleteSuccess'));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(t('groups.toasts.deleteError'));
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !editName.trim()) return;
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        data: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        },
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactGroups });
      toast.success(t('groups.toasts.updateSuccess'));
      setEditTarget(null);
    } catch (err) {
      toast.error(t('groups.toasts.updateError'), err instanceof Error ? err.message : '');
    }
  };

  const openEdit = (group: ContactGroup) => {
    setEditTarget(group);
    setEditName(group.name);
    setEditDescription(group.description ?? '');
  };

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
        title={t('groups.title')}
        subtitle={t('groups.subtitle')}
        actions={
          canWrite && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={15} />{t('groups.newGroup')}
            </button>
          )
        }
      />

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="search-bar max-w-[340px] flex-1 max-sm:max-w-none">
          <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            placeholder={t('groups.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-muted)]">
              <Users size={26} strokeWidth={1.2} className="text-[var(--color-ink-muted)]" />
            </div>
            <h3>{groups.length === 0 ? t('groups.empty.title') : t('logs.empty.title')}</h3>
            <p>{groups.length === 0 ? t('groups.empty.description') : ''}</p>
            {groups.length === 0 && canWrite && (
              <div className="mt-4">
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={14} />{t('groups.newGroup')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 640 }}>
              {/* Header */}
              <div className="table-header grid-cols-[1fr_1fr_100px_140px_120px]">
                <span>{t('groups.columns.name')}</span>
                <span>{t('groups.columns.description')}</span>
                <span>{t('groups.columns.members')}</span>
                <span>{t('groups.columns.created')}</span>
                <span className="text-right">{t('groups.columns.actions')}</span>
              </div>

              {/* Rows */}
              {filtered.map(group => (
                <div
                  key={group.id}
                  className="table-row-base grid-cols-[1fr_1fr_100px_140px_120px] cursor-pointer"
                  onClick={() => setDetailTarget(group.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-dim)] text-[0.75rem] font-bold text-[var(--color-primary)]">
                      <Users size={14} />
                    </div>
                    <span className="truncate text-[0.875rem] font-medium text-[var(--color-ink)]">{group.name}</span>
                  </div>
                  <span className="truncate text-[0.875rem] text-[var(--color-ink-secondary)]">{group.description || '—'}</span>
                  <span className="text-[0.875rem] font-medium text-[var(--color-ink)]">{group.memberCount ?? 0}</span>
                  <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">
                    {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                    {canWrite && (
                      <>
                        <button
                          className="icon-btn"
                          title={t('common.edit')}
                          onClick={() => openEdit(group)}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="icon-btn hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title={t('common.delete')}
                          onClick={() => setDeleteTarget(group)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Wizard */}
      {showCreate && (
        <CreateGroupWizard
          existingNames={existingNames}
          existingPhones={existingPhones}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}

      {/* Detail Modal */}
      {detailTarget && (
        <GroupDetailModal
          groupId={detailTarget}
          onClose={() => setDetailTarget(null)}
          onRefresh={() => {}}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('groups.delete.title')}</h2>
              <button className="icon-btn border-none" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/15">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
              </div>
              <p className="m-0 text-center text-[0.9rem] text-[var(--color-ink-secondary)]"
                dangerouslySetInnerHTML={{ __html: t('groups.delete.message', { name: deleteTarget.name }) }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={handleDelete}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-box max-w-[480px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('groups.form.editTitle')}</h2>
              <button className="icon-btn border-none" onClick={() => setEditTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <Field label={`${t('groups.form.name')} *`}>
                  <FormInput
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder={t('groups.form.namePlaceholder')}
                  />
                </Field>
                <Field label={t('groups.form.description')}>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder={t('groups.form.descriptionPlaceholder')}
                    rows={3}
                    className="input-base resize-none"
                  />
                </Field>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditTarget(null)}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={handleEdit} disabled={!editName.trim()}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
