import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  Plus, Trash2, Edit, Upload, Download, Search,
  X, ChevronDown, Check, AlertTriangle, Loader2,
  Users, CheckSquare, Square, FileText,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { useRole } from '../hooks/useRole';
import {
  useContactsQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useBulkDeleteContactsMutation,
  useBulkCreateContactsMutation,
} from '../hooks/queries';
import type { Contact, ContactPayload } from '../services/api';
import { COUNTRY_CODES, type CountryCode } from '../data/countryCodes';

// ─── helpers ────────────────────────────────────────────────────────────────

const DEFAULT_DIAL = '+60';

function dialToCountry(dial: string): CountryCode | undefined {
  return COUNTRY_CODES.find(c => c.dial === dial);
}

function formatPhone(countryCode: string, phone: string): string {
  return `${countryCode}${phone}`;
}

function parseImportPhone(raw: string): { countryCode: string; phone: string } | null {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  const match = COUNTRY_CODES
    .slice()
    .sort((a, b) => b.dial.length - a.dial.length)
    .find(c => cleaned.startsWith(c.dial));
  if (!match) return null;
  const local = cleaned.slice(match.dial.length);
  if (!local || !/^\d+$/.test(local)) return null;
  return { countryCode: match.dial, phone: local };
}

// ─── Country Code Picker ─────────────────────────────────────────────────────
// Opens a full overlay modal via portal — no position math, no overflow/z-index
// issues, works at every screen size and in any stacking context.

function CountryCodePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (dial: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const searchRef           = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => COUNTRY_CODES.find(c => c.dial === value), [value]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [search]);

  // Focus search input when panel opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = useCallback((dial: string) => {
    onChange(dial);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  return (
    <>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => { setSearch(''); setOpen(true); }}
        className="flex cursor-pointer items-center gap-1.5 self-stretch rounded-l-[var(--radius)] border border-r-0 border-[var(--color-border)] bg-[var(--color-muted)] px-3 text-[var(--color-ink)] transition-colors hover:bg-[var(--color-muted-deep)] active:scale-[0.97]"
        title={selected ? `${selected.name} (${value})` : 'Select country code'}
      >
        <span className="text-[1.375rem] leading-none">{selected?.flag ?? '🌐'}</span>
        <ChevronDown size={12} className="shrink-0 text-[var(--color-ink-muted)]" />
      </button>

      {/* ── Picker overlay (portal) ── */}
      {open && createPortal(
        /* Backdrop */
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
          className="flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
          onClick={() => { setOpen(false); setSearch(''); }}
        >
          {/* Panel */}
          <div
            style={{ width: 'min(420px, 92vw)', maxHeight: '85vh' }}
            className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)] animate-[slideUp_0.2s_ease]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3.5">
              <span className="text-[0.9375rem] font-bold text-[var(--color-ink)]">Select Country Code</span>
              <button
                type="button"
                onClick={() => { setOpen(false); setSearch(''); }}
                className="icon-btn border-none"
              >
                <X size={17} />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-[var(--color-border)] p-3">
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-muted)] px-3 transition-colors focus-within:border-[var(--color-primary)] focus-within:bg-[var(--color-surface)]">
                <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search country name or dial code..."
                  className="flex-1 border-none bg-transparent py-2 text-[0.875rem] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Country list */}
            <ul className="flex-1 overflow-y-auto py-1.5">
              {filtered.length === 0 ? (
                <li className="px-4 py-8 text-center text-[0.875rem] text-[var(--color-ink-muted)]">
                  No countries found for &ldquo;{search}&rdquo;
                </li>
              ) : (
                filtered.map(c => {
                  const isActive = value === c.dial;
                  return (
                    <li key={c.code}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c.dial)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-[0.875rem] transition-colors ${
                          isActive
                            ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                            : 'text-[var(--color-ink)] hover:bg-[var(--color-muted)]'
                        }`}
                      >
                        <span className="w-7 text-center text-[1.25rem] leading-none">{c.flag}</span>
                        <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                        <span className={`shrink-0 font-mono text-[0.8125rem] ${isActive ? 'font-bold text-[var(--color-primary)]' : 'text-[var(--color-ink-muted)]'}`}>
                          {c.dial}
                        </span>
                        {isActive && (
                          <Check size={15} className="shrink-0 text-[var(--color-primary)]" />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            {/* Footer count */}
            <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-[0.75rem] text-[var(--color-ink-muted)]">
              {filtered.length === COUNTRY_CODES.length
                ? `${COUNTRY_CODES.length} countries`
                : `${filtered.length} of ${COUNTRY_CODES.length} countries`}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
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
  country: string;
  state: string;
  city: string;
  address: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  fullName: '', countryCode: DEFAULT_DIAL, phone: '',
  country: '', state: '', city: '', address: '', note: '',
};

function contactToForm(c: Contact): FormState {
  return {
    fullName:    c.fullName    ?? '',
    countryCode: c.countryCode ?? DEFAULT_DIAL,
    phone:       c.phone       ?? '',
    country:     c.country     ?? '',
    state:       c.state       ?? '',
    city:        c.city        ?? '',
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

  const set = (key: keyof FormState, val: string) => {
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
        country:     form.country    || undefined,
        state:       form.state      || undefined,
        city:        form.city       || undefined,
        address:     form.address    || undefined,
        note:        form.note       || undefined,
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
                <CountryCodePicker value={form.countryCode} onChange={v => set('countryCode', v)} />
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

            {/* Country + State */}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('contacts.form.country')}>
                <FormInput value={form.country} onChange={e => set('country', e.target.value)} placeholder={t('contacts.form.countryPlaceholder')} />
              </Field>
              <Field label={t('contacts.form.state')}>
                <FormInput value={form.state} onChange={e => set('state', e.target.value)} placeholder={t('contacts.form.statePlaceholder')} />
              </Field>
            </div>

            {/* City */}
            <Field label={t('contacts.form.city')}>
              <FormInput value={form.city} onChange={e => set('city', e.target.value)} placeholder={t('contacts.form.cityPlaceholder')} />
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

  const rowsToImport = importValidOnly ? rows.filter(r => r.valid) : rows.filter(r => r.valid);

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
                  <input
                    type="checkbox"
                    checked={importValidOnly}
                    onChange={e => setImportValidOnly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <span className="relative inline-block h-[18px] w-[32px] rounded-full bg-[var(--color-border-strong)] transition-all peer-checked:bg-[var(--color-primary)]">
                    <span className="absolute bottom-[2px] left-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[14px]" />
                  </span>
                  {t('contacts.import.importValid')}
                </label>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <table className="w-full min-w-[560px] text-[0.8125rem]">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]">
                      {['row','status','name','phone','country','city','error'].map(col => (
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
                        <td className="px-3 py-2">
                          {row.errors.length > 0 && (
                            <span className="text-[0.7375rem] font-medium text-red-500">{row.errors.join(', ')}</span>
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
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Reset selection when contacts reload
  useEffect(() => { setSelected(new Set()); }, [contacts]);

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

  // ── Selection helpers ──
  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));
  const toggleAll   = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
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
      toast.success(t('contacts.toasts.bulkDeleteSuccess', { count: ids.length }));
      setSelected(new Set());
      setShowBulkDeleteModal(false);
    } catch (err) {
      toast.error(t('contacts.toasts.bulkDeleteError'), err instanceof Error ? err.message : '');
    }
  };

  const handleImport = async (rows: ImportRow[]) => {
    const payloads: ContactPayload[] = rows.map(r => ({
      fullName:    r.fullName    || undefined,
      countryCode: r.countryCode!,
      phone:       r.phone!,
      country:     r.country    || undefined,
      state:       r.state      || undefined,
      city:        r.city       || undefined,
      address:     r.address    || undefined,
      note:        r.note       || undefined,
    }));
    try {
      await bulkCreateMutation.mutateAsync(payloads);
      toast.success(t('contacts.toasts.importSuccess', { created: payloads.length }));
    } catch (err) {
      toast.error(t('contacts.toasts.importError'), err instanceof Error ? err.message : '');
      throw err;
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
            {contacts.length === 0 && canWrite && (
              <div className="mt-4 flex gap-2">
                <button className="btn-secondary" onClick={() => setShowImport(true)}>
                  <Upload size={14} />{t('contacts.importBtn')}
                </button>
                <button className="btn-primary" onClick={() => { setEditTarget(null); setFormMode('create'); }}>
                  <Plus size={14} />{t('contacts.newContact')}
                </button>
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
              {filtered.map(contact => {
                const isChecked = selected.has(contact.id);
                const country = dialToCountry(contact.countryCode);
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
                      {country?.flag} {contact.countryCode}{contact.phone}
                    </span>

                    {/* Country */}
                    <span className="text-[0.875rem] text-[var(--color-ink-secondary)]">{contact.country || '—'}</span>

                    {/* City */}
                    <span className="text-[0.875rem] text-[var(--color-ink-secondary)]">{contact.city || '—'}</span>

                    {/* Note */}
                    <span className="truncate text-[0.8125rem] text-[var(--color-ink-muted)]" title={contact.note}>
                      {contact.note || '—'}
                    </span>

                    {/* Actions */}
                    <div className="flex justify-end gap-1.5">
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

      {/* Total count */}
      {filtered.length > 0 && (
        <p className="mt-3 text-[0.8rem] text-[var(--color-ink-muted)]">
          {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
          {search ? ` matching "${search}"` : ''}
        </p>
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
    </div>
  );
}
