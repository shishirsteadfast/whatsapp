import { useState, useRef, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
import {
  Plus, Trash2, Edit, Upload, Download, Search,
  X, ChevronLeft, ChevronRight, Check, AlertTriangle, Loader2,
  Users, CheckSquare, Square, FileText, MessageSquare, FileDown,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { useRole } from '../hooks/useRole';
import {
  queryKeys,
  useContactsQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useBulkDeleteContactsMutation,
  useBulkCreateContactsMutation,
} from '../hooks/queries';
import { contactApi } from '../services/api';
import type { Contact, ContactPayload } from '../services/api';
import { ContactDetailModal } from '../components/ContactDetailModal';
import { CountryCodePicker } from '../components/CountryCodePicker';
import { StateSelect } from '../components/StateSelect';
import { CitySelect } from '../components/CitySelect';

// ─── helpers ────────────────────────────────────────────────────────────────

const DEFAULT_DIAL = '+60';

function formatPhone(countryCode: string, phone: string): string {
  return `${countryCode}${phone}`;
}

// Known dial codes sorted longest-first to avoid partial matches (e.g. +1 vs +1268)
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
  // Try longest dial codes first to avoid partial matches
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

// ─── Shared form primitives (MUST live outside ContactFormModal so React sees
//     stable component references across re-renders and never remounts inputs) ──

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

// ─── Contact Form ─────────────────────────────────────────────────────────────

interface FormState {
  fullName: string;
  countryCode: string;
  phone: string;
  countryId: number | null;
  stateId: number | null;
  cityId: number | null;
  address: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  fullName: '', countryCode: DEFAULT_DIAL, phone: '',
  countryId: null, stateId: null, cityId: null,
  address: '', note: '',
};

function contactToForm(c: Contact): FormState {
  return {
    fullName:    c.fullName    ?? '',
    countryCode: c.countryCode ?? DEFAULT_DIAL,
    phone:       c.phone       ?? '',
    countryId:   c.countryId   ?? null,
    stateId:     c.stateId     ?? null,
    cityId:      c.cityId      ?? null,
    address:     c.address     ?? '',
    note:        c.note        ?? '',
  };
}

interface ContactFormModalProps {
  mode: 'create' | 'edit';
  initial: FormState;
  existingPhones: string[];
  editId?: string;
  onClose: () => void;
  onSubmit: (payload: ContactPayload) => Promise<void>;
}

function ContactFormModal({ mode, initial, existingPhones, editId, onClose, onSubmit }: ContactFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.phone.trim()) {
      errs.phone = t('contacts.form.phoneRequired');
    } else if (!/^\d+$/.test(form.phone.replace(/\s/g, ''))) {
      errs.phone = t('contacts.form.phoneInvalid');
    } else {
      const full = formatPhone(form.countryCode, form.phone.replace(/\s/g, ''));
      const dupe = existingPhones.find(p => p === full && p !== (editId ? formatPhone(initial.countryCode, initial.phone) : ''));
      if (dupe) errs.phone = t('contacts.form.phoneDuplicate');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        fullName:    form.fullName    || undefined,
        countryCode: form.countryCode,
        phone:       form.phone.replace(/\s/g, ''),
        countryId:   form.countryId   ?? undefined,
        stateId:     form.stateId     ?? undefined,
        cityId:      form.cityId      ?? undefined,
        address:     form.address     || undefined,
        note:        form.note        || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-[520px]" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">
            {mode === 'create' ? t('contacts.form.createTitle') : t('contacts.form.editTitle')}
          </h2>
          <button className="icon-btn border-none" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {/* Full Name */}
            <Field label={t('contacts.form.fullName')}>
              <FormInput
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                placeholder={t('contacts.form.fullNamePlaceholder')}
              />
            </Field>

            {/* Phone */}
            <Field label={`${t('contacts.form.phone')} *`} error={errors.phone}>
              <div className="flex items-stretch">
                <CountryCodePicker
                  value={form.countryId}
                  onChange={(countryId, dial) => {
                    set('countryId', countryId);
                    set('countryCode', dial);
                    set('stateId', null);
                    set('cityId', null);
                  }}
                />
                <FormInput
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value.replace(/[^\d\s]/g, ''))}
                  placeholder={t('contacts.form.phonePlaceholder')}
                  className={`flex-1 rounded-l-none border-l-0 ${errors.phone ? 'border-[var(--color-error)]' : ''}`}
                />
              </div>
              <p className="m-0 text-[0.7375rem] text-[var(--color-ink-muted)]">{t('contacts.form.phoneHint')}</p>
            </Field>

            {/* State */}
            <Field label={t('contacts.form.state')}>
              <StateSelect
                countryId={form.countryId}
                value={form.stateId}
                onChange={(stateId) => {
                  set('stateId', stateId);
                  set('cityId', null);
                }}
                disabled={!form.countryId}
              />
            </Field>

            {/* City */}
            <Field label={t('contacts.form.city')}>
              <CitySelect
                stateId={form.stateId}
                value={form.cityId}
                onChange={(cityId) => set('cityId', cityId)}
                disabled={!form.stateId}
              />
            </Field>

            {/* Address */}
            <Field label={t('contacts.form.address')}>
              <FormInput value={form.address} onChange={e => set('address', e.target.value)} placeholder={t('contacts.form.addressPlaceholder')} />
            </Field>

            {/* Note */}
            <Field label={t('contacts.form.note')}>
              <textarea
                value={form.note}
                onChange={e => set('note', e.target.value)}
                placeholder={t('contacts.form.notePlaceholder')}
                rows={3}
                className="input-base resize-none"
              />
            </Field>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : mode === 'create' ? t('common.create') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Flow ──────────────────────────────────────────────────────────────

interface ImportRow {
  row: number;
  fullName: string;
  rawPhone: string;
  country: string;
  state: string;
  city: string;
  address: string;
  note: string;
  // resolved
  countryCode?: string;
  phone?: string;
  valid: boolean;
  errors: string[];
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

function validateImportRows(rows: Record<string, string>[], existingPhones: string[], t: (k: string) => string): ImportRow[] {
  const seenInFile = new Set<string>();
  return rows.map((r, idx) => {
    const rawPhone = (r['phone'] || r['whatsapp'] || r['whatsapp phone'] || '').trim();
    const fullName = (r['fullname'] || r['full name'] || r['name'] || '').trim();
    const country  = (r['country']  || '').trim();
    const state    = (r['state']    || '').trim();
    const city     = (r['city']     || '').trim();
    const address  = (r['address']  || '').trim();
    const note     = (r['note']     || r['notes'] || '').trim();

    const errs: string[] = [];

    if (!rawPhone) {
      errs.push(t('contacts.import.errorPhone'));
      return { row: idx + 2, fullName, rawPhone, country, state, city, address, note, valid: false, errors: errs };
    }

    const parsed = parseImportPhone(rawPhone);
    if (!parsed) {
      errs.push(t('contacts.import.errorNoCountryCode'));
      return { row: idx + 2, fullName, rawPhone, country, state, city, address, note, valid: false, errors: errs };
    }

    const fullNum = `${parsed.countryCode}${parsed.phone}`;

    if (seenInFile.has(fullNum)) {
      errs.push(t('contacts.import.errorDuplicate'));
    } else {
      seenInFile.add(fullNum);
    }

    if (existingPhones.includes(fullNum)) {
      errs.push(t('contacts.form.phoneDuplicate'));
    }

    return {
      row: idx + 2, fullName, rawPhone, country, state, city, address, note,
      countryCode: parsed.countryCode,
      phone: parsed.phone,
      valid: errs.length === 0,
      errors: errs,
    };
  });
}

const SAMPLE_CSV = `fullName,phone,country,state,city,address,note
John Doe,+601234567890,Malaysia,Selangor,Kuala Lumpur,123 Jalan Ampang,VIP customer
Jane Smith,+14155552671,United States,California,San Francisco,,
Ahmad Bin Ali,+60198765432,Malaysia,,Penang,,
`;

function ImportModal({
  existingPhones,
  onClose,
  onImport,
}: {
  existingPhones: string[];
  onClose: () => void;
  onImport: (rows: ImportRow[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importValidOnly, setImportValidOnly] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const validated = validateImportRows(parsed, existingPhones, t);
      setRows(validated);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  };

  const rowsToImport = importValidOnly ? rows.filter(r => r.valid) : rows;

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(rowsToImport);
      setResult({ created: rowsToImport.length, skipped: rows.length - rowsToImport.length });
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'contacts_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const validCount   = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box max-w-[680px]"
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header shrink-0">
          <div>
            <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('contacts.import.title')}</h2>
            {/* Step indicator */}
            <div className="mt-2 flex items-center gap-2">
              {([1,2,3] as const).map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold ${step >= s ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]'}`}>{s}</span>
                  {i < 2 && <span className={`h-px w-6 ${step > s ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />}
                </span>
              ))}
              <span className="ml-1 text-[0.75rem] text-[var(--color-ink-muted)]">
                {step === 1 ? t('contacts.import.step1Title') : step === 2 ? t('contacts.import.step2Title') : t('contacts.import.step3Title')}
              </span>
            </div>
          </div>
          <button className="icon-btn border-none" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1 — Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="m-0 text-[0.875rem] text-[var(--color-ink-secondary)]">{t('contacts.import.step1Desc')}</p>

              {/* Dropzone */}
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
                  <p className="m-0 text-[0.9rem] font-semibold text-[var(--color-ink)]">{t('contacts.import.dropzone')}</p>
                  <p className="m-0 mt-0.5 text-[0.8rem] text-[var(--color-ink-muted)]">{t('contacts.import.dropzoneHint')}</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              {/* Sample download */}
              <div className="flex items-center justify-between rounded-[var(--radius)] bg-[var(--color-muted)] px-4 py-3">
                <div className="flex items-center gap-2.5 text-[0.8125rem] text-[var(--color-ink-secondary)]">
                  <FileText size={16} />
                  <span>contacts_template.csv</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); downloadSample(); }}
                  className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer border-none bg-transparent p-0"
                >
                  <Download size={14} />
                  {t('contacts.downloadTemplate')}
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Preview */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="m-0 text-[0.875rem] text-[var(--color-ink-secondary)]">{t('contacts.import.step2Desc')}</p>

              {/* Summary bar */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary-dim)] px-3 py-1 text-[0.75rem] font-semibold text-[var(--color-primary)]">
                  <Check size={12} /> {t('contacts.import.validRows', { count: validCount })}
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[0.75rem] font-semibold text-red-500 dark:bg-red-500/15 dark:text-red-400">
                    <AlertTriangle size={12} /> {t('contacts.import.invalidRows', { count: invalidCount })}
                  </span>
                )}
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-[0.8125rem] font-medium text-[var(--color-ink-secondary)]">
                  <span className="relative inline-flex h-[18px] w-[32px] items-center">
                    <input
                      type="checkbox"
                      checked={importValidOnly}
                      onChange={e => setImportValidOnly(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 rounded-full bg-[var(--color-border-strong)] transition-all peer-checked:bg-[var(--color-primary)]" />
                    <span className="absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[14px]" />
                  </span>
                  {t('contacts.import.importValid')}
                </label>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <table className="w-full min-w-[680px] text-[0.8125rem]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                      {['row','status','name','phone','country','city','note','error'].map(col => (
                        <th key={col} className="px-3 py-2.5 text-left text-[0.675rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                          {t(`contacts.import.previewColumns.${col}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr
                        key={row.row}
                        className={`border-b border-[var(--color-border)] last:border-none ${!row.valid ? 'bg-red-50/50 dark:bg-red-500/5' : ''}`}
                      >
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
                        <td className="px-3 py-2 max-w-[160px]">
                          <span className="block truncate text-[0.8125rem] text-[var(--color-ink-muted)]" title={row.note}>
                            {row.note || '—'}
                          </span>
                        </td>
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

          {/* Step 3 — Done */}
          {step === 3 && result && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-dim)]">
                <Check size={32} className="text-[var(--color-primary)]" />
              </div>
              <h3 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('contacts.import.step3Title')}</h3>
              <p className="m-0 text-[0.9rem] text-[var(--color-ink-secondary)]">
                {t('contacts.import.successDesc', { created: result.created, skipped: result.skipped })}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer shrink-0 border-t border-[var(--color-border)] pt-4">
          {step === 1 && (
            <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          )}
          {step === 2 && (
            <>
              <button className="btn-secondary" onClick={() => setStep(1)}>{t('common.back')}</button>
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={importing || rowsToImport.length === 0}
              >
                {importing
                  ? <><Loader2 size={15} className="animate-spin" />{t('contacts.import.importing')}</>
                  : t('contacts.import.importBtn', { count: rowsToImport.length })
                }
              </button>
            </>
          )}
          {step === 3 && (
            <button className="btn-primary" onClick={onClose}>{t('common.close')}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Contacts() {
  const { t } = useTranslation();
  useDocumentTitle(t('contacts.title'));
  const toast = useToast();
  const { canWrite } = useRole();

  const queryClient = useQueryClient();
  const { data: contacts = [], isLoading } = useContactsQuery();
  const createMutation      = useCreateContactMutation();
  const updateMutation      = useUpdateContactMutation();
  const deleteMutation      = useDeleteContactMutation();
  const bulkDeleteMutation  = useBulkDeleteContactsMutation();
  const bulkCreateMutation  = useBulkCreateContactsMutation();

  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [formMode,   setFormMode]   = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [detailTarget, setDetailTarget] = useState<Contact | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Reset selection and page when contacts reload
  useEffect(() => { setSelected(new Set()); setCurrentPage(1); }, [contacts]);
  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [search]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(c =>
      (c.fullName ?? '').toLowerCase().includes(q) ||
      `${c.countryCode}${c.phone}`.includes(q)
    );
  }, [contacts, search]);

  const existingPhones = useMemo(
    () => contacts.map(c => formatPhone(c.countryCode, c.phone)),
    [contacts],
  );

  // ── Pagination ──
  const totalPages  = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage    = Math.min(currentPage, totalPages);
  const startIdx    = (safePage - 1) * perPage;
  const paginated   = filtered.slice(startIdx, startIdx + perPage);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo   = Math.min(startIdx + perPage, filtered.length);

  // ── Selection helpers ──
  const allSelected = paginated.length > 0 && paginated.every(c => selected.has(c.id));
  const toggleAll   = () => {
    if (allSelected) setSelected(prev => {
      const next = new Set(prev);
      paginated.forEach(c => next.delete(c.id));
      return next;
    });
    else setSelected(prev => {
      const next = new Set(prev);
      paginated.forEach(c => next.add(c.id));
      return next;
    });
  };
  const toggleOne = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── CRUD ──
  const handleCreate = async (payload: ContactPayload) => {
    try {
      await createMutation.mutateAsync(payload);
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      toast.success(t('contacts.toasts.createSuccess'));
    } catch (err) {
      toast.error(t('contacts.toasts.createError'), err instanceof Error ? err.message : '');
      throw err;
    }
  };

  const handleUpdate = async (payload: ContactPayload) => {
    if (!editTarget) return;
    try {
      await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      toast.success(t('contacts.toasts.updateSuccess'));
    } catch (err) {
      toast.error(t('contacts.toasts.updateError'), err instanceof Error ? err.message : '');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      toast.success(t('contacts.toasts.deleteSuccess'));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(t('contacts.toasts.deleteError'), err instanceof Error ? err.message : '');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = [...selected];
      await bulkDeleteMutation.mutateAsync(ids);
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      toast.success(t('contacts.toasts.bulkDeleteSuccess', { count: ids.length }));
      setSelected(new Set());
      setShowBulkDeleteModal(false);
    } catch (err) {
      toast.error(t('contacts.toasts.bulkDeleteError'), err instanceof Error ? err.message : '');
    }
  };

  const handleImport = async (rows: ImportRow[]) => {
    // CSV import still uses text-based country/state/city since we can't easily match FKs
    const payloads: ContactPayload[] = rows.map(r => ({
      fullName:    r.fullName    || undefined,
      countryCode: r.countryCode!,
      phone:       r.phone!,
      address:     r.address    || undefined,
      note:        r.note       || undefined,
    }));
    try {
      await bulkCreateMutation.mutateAsync(payloads);
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      toast.success(t('contacts.toasts.importSuccess', { created: payloads.length }));
    } catch (err) {
      toast.error(t('contacts.toasts.importError'), err instanceof Error ? err.message : '');
      throw err;
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await contactApi.exportAll();
      const headers = ['Full Name', 'Phone', 'Country', 'State', 'City', 'Address', 'Note', 'Total Sent Messages'];
      const rows = data.map(c => [
        c.fullName ?? '',
        `${c.countryCode}${c.phone}`,
        c.country?.name ?? '',
        c.state?.name ?? '',
        c.city?.name ?? '',
        c.address ?? '',
        c.note ?? '',
        String(c.totalSentMessages),
      ]);
      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('contacts.toasts.exportSuccess', { count: data.length }));
    } catch (err) {
      toast.error(t('contacts.toasts.exportError'), err instanceof Error ? err.message : '');
    } finally {
      setExporting(false);
    }
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
        title={t('contacts.title')}
        subtitle={t('contacts.subtitle')}
        actions={
          canWrite && (
            <div className="flex items-center gap-2">
              <button className="btn-secondary" onClick={handleExport} disabled={exporting}>
                {exporting
                  ? <Loader2 size={15} className="animate-spin" />
                  : <FileDown size={15} />
                }{t('contacts.exportBtn')}
              </button>
              <button className="btn-secondary" onClick={() => setShowImport(true)}>
                <Upload size={15} />{t('contacts.importBtn')}
              </button>
              <button className="btn-primary" onClick={() => { setEditTarget(null); setFormMode('create'); }}>
                <Plus size={15} />{t('contacts.newContact')}
              </button>
            </div>
          )
        }
      />

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="search-bar max-w-[340px] flex-1 max-sm:max-w-none">
          <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            placeholder={t('contacts.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {selected.size > 0 && canWrite && (
          <div className="flex items-center gap-2">
            <span className="text-[0.8125rem] font-medium text-[var(--color-ink-secondary)]">
              {t('contacts.selected', { count: selected.size })}
            </span>
            <button
              className="flex items-center gap-1.5 rounded-[var(--radius)] border border-red-200 bg-red-50 px-3 py-1.5 text-[0.8125rem] font-semibold text-red-600 transition-all hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400 cursor-pointer"
              onClick={() => setShowBulkDeleteModal(true)}
            >
              <Trash2 size={14} />{t('contacts.bulkDelete')}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-muted)]">
              <Users size={26} strokeWidth={1.2} className="text-[var(--color-ink-muted)]" />
            </div>
            <h3>{contacts.length === 0 ? t('contacts.empty.title') : t('logs.empty.title')}</h3>
            <p>{contacts.length === 0 ? t('contacts.empty.description') : ''}</p>
            {contacts.length === 0 && (
              <div className="mt-4 flex gap-2">
                {canWrite && (
                  <>
                    <button className="btn-secondary" onClick={() => setShowImport(true)}>
                      <Upload size={14} />{t('contacts.importBtn')}
                    </button>
                    <button className="btn-primary" onClick={() => { setEditTarget(null); setFormMode('create'); }}>
                      <Plus size={14} />{t('contacts.newContact')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 640 }}>
              {/* Table header */}
              <div className="table-header grid-cols-[40px_1fr_160px_130px_120px_1fr_90px]">
                <div className="flex items-center">
                  <button
                    onClick={toggleAll}
                    className="cursor-pointer border-none bg-transparent p-0 text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
                  >
                    {allSelected ? <CheckSquare size={16} className="text-[var(--color-primary)]" /> : <Square size={16} />}
                  </button>
                </div>
                <span>{t('contacts.columns.name')}</span>
                <span>{t('contacts.columns.phone')}</span>
                <span>{t('contacts.columns.country')}</span>
                <span>{t('contacts.columns.city')}</span>
                <span>{t('contacts.columns.note')}</span>
                <span className="text-right">{t('contacts.columns.actions')}</span>
              </div>

              {/* Rows */}
              {paginated.map(contact => {
                const isChecked = selected.has(contact.id);
                return (
                  <div
                    key={contact.id}
                    className={`table-row-base grid-cols-[40px_1fr_160px_130px_120px_1fr_90px] ${isChecked ? 'bg-[var(--color-primary-dim)]' : ''}`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleOne(contact.id)}
                        className="cursor-pointer border-none bg-transparent p-0 text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
                      >
                        {isChecked
                          ? <CheckSquare size={16} className="text-[var(--color-primary)]" />
                          : <Square size={16} />
                        }
                      </button>
                    </div>

                    {/* Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-muted)] text-[0.75rem] font-bold text-[var(--color-ink-secondary)]">
                        {(contact.fullName?.[0] ?? contact.phone[0] ?? '?').toUpperCase()}
                      </div>
                      <span className="truncate text-[0.875rem] font-medium text-[var(--color-ink)]">
                        {contact.fullName || <span className="text-[var(--color-ink-muted)]">—</span>}
                      </span>
                    </div>

                    {/* Phone */}
                    <span className="font-mono text-[0.8125rem] text-[var(--color-ink)]">
                      {contact.country?.flag} {contact.countryCode}{contact.phone}
                    </span>

                    {/* Country */}
                    <span className="text-[0.875rem] text-[var(--color-ink-secondary)]">{contact.country?.name || '—'}</span>

                    {/* City */}
                    <span className="text-[0.875rem] text-[var(--color-ink-secondary)]">{contact.city?.name || '—'}</span>

                    {/* Note */}
                    <span className="truncate text-[0.8125rem] text-[var(--color-ink-muted)]" title={contact.note}>
                      {contact.note || '—'}
                    </span>

                    {/* Actions */}
                    <div className="flex justify-end gap-1.5">
                      <button
                        className="icon-btn"
                        title={t('common.view', 'View')}
                        onClick={() => setDetailTarget(contact)}
                      >
                        <MessageSquare size={14} />
                      </button>
                      {canWrite && (
                        <>
                          <button
                            className="icon-btn"
                            title={t('common.edit')}
                            onClick={() => { setEditTarget(contact); setFormMode('edit'); }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="icon-btn hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            title={t('common.delete')}
                            onClick={() => setDeleteTarget(contact)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {filtered.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {/* Left: info + per-page */}
          <div className="flex flex-wrap items-center gap-3 text-[0.8125rem] text-[var(--color-ink-muted)]">
            <span>
              {t('contacts.pagination.showing', { from: showingFrom, to: showingTo, total: filtered.length })}
            </span>
            <div className="flex items-center gap-1.5">
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="cursor-pointer rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
              >
                {[10, 25, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="whitespace-nowrap text-[0.8125rem] text-[var(--color-ink-muted)]">{t('contacts.pagination.perPage')}</span>
            </div>
          </div>

          {/* Right: page buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={15} />
              </button>

              {/* Page number buttons with ellipsis */}
              {(() => {
                const pages: (number | '...')[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (safePage > 3) pages.push('...');
                  const rangeStart = Math.max(2, safePage - 1);
                  const rangeEnd   = Math.min(totalPages - 1, safePage + 1);
                  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
                  if (safePage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, idx) =>
                  p === '...' ? (
                    <span key={`e${idx}`} className="flex h-8 w-8 items-center justify-center text-[0.8125rem] text-[var(--color-ink-muted)]">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border text-[0.8125rem] font-medium transition-all ${
                        p === safePage
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_2px_8px_rgba(37,211,102,0.3)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-muted)]'
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              <button
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {formMode && (
        <ContactFormModal
          mode={formMode}
          initial={formMode === 'edit' && editTarget ? contactToForm(editTarget) : EMPTY_FORM}
          existingPhones={existingPhones}
          editId={editTarget?.id}
          onClose={() => { setFormMode(null); setEditTarget(null); }}
          onSubmit={formMode === 'create' ? handleCreate : handleUpdate}
        />
      )}

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('contacts.delete.title')}</h2>
              <button className="icon-btn border-none" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/15">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
              </div>
              <p className="m-0 text-center text-[0.9rem] text-[var(--color-ink-secondary)]">
                {deleteTarget.fullName
                  ? <Trans i18nKey="contacts.delete.message" values={{ name: deleteTarget.fullName }} components={{ strong: <strong className="text-[var(--color-ink)]" /> }} />
                  : <Trans i18nKey="contacts.delete.messagePhone" values={{ phone: `${deleteTarget.countryCode}${deleteTarget.phone}` }} components={{ strong: <strong className="text-[var(--color-ink)]" /> }} />
                }
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={handleDelete}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Modal ── */}
      {showBulkDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowBulkDeleteModal(false)}>
          <div className="modal-box max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">
                {t('contacts.bulkDeleteModal.title', { count: selected.size })}
              </h2>
              <button className="icon-btn border-none" onClick={() => setShowBulkDeleteModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/15">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
              </div>
              <p className="m-0 text-center text-[0.9rem] text-[var(--color-ink-secondary)]">
                {t('contacts.bulkDeleteModal.message', { count: selected.size })}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBulkDeleteModal(false)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={handleBulkDelete}>{t('contacts.bulkDelete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {showImport && (
        <ImportModal
          existingPhones={existingPhones}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}

      {/* ── Contact Detail Modal ── */}
      {detailTarget && (
        <ContactDetailModal
          contact={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}
