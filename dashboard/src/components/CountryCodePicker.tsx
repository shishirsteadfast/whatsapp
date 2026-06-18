import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { useCountriesQuery } from '../hooks/queries';
import type { CountryLocation } from '../services/api';

interface CountryCodePickerProps {
  value: number | null;
  onChange: (countryId: number, dialCode: string) => void;
}

export function CountryCodePicker({ value, onChange }: CountryCodePickerProps) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const searchRef           = useRef<HTMLInputElement>(null);
  const { data: countries = [] } = useCountriesQuery();

  const selected = useMemo(() => countries.find(c => c.id === value), [countries, value]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [search, countries]);

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

  const handleSelect = useCallback((country: CountryLocation) => {
    onChange(country.id, `+${country.dialCode}`);
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
        title={selected ? `${selected.name} (+${selected.dialCode})` : 'Select country code'}
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
                  const isActive = value === c.id;
                  return (
                    <li key={c.code}>
                      <button
                        type="button"
                        onClick={() => handleSelect(c)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-[0.875rem] transition-colors ${
                          isActive
                            ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                            : 'text-[var(--color-ink)] hover:bg-[var(--color-muted)]'
                        }`}
                      >
                        <span className="w-7 text-center text-[1.25rem] leading-none">{c.flag}</span>
                        <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                        <span className={`shrink-0 font-mono text-[0.8125rem] ${isActive ? 'font-bold text-[var(--color-primary)]' : 'text-[var(--color-ink-muted)]'}`}>
                          +{c.dialCode}
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
              {filtered.length === countries.length
                ? `${countries.length} countries`
                : `${filtered.length} of ${countries.length} countries`}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
