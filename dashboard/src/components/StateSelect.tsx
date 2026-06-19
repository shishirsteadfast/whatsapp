import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useStatesQuery } from '../hooks/queries';
import type { StateLocation } from '../services/api';

interface StateSelectProps {
  countryId: number | null;
  value: number | null;
  onChange: (stateId: number) => void;
  disabled?: boolean;
}

export function StateSelect({ countryId, value, onChange, disabled }: StateSelectProps) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const searchRef           = useRef<HTMLInputElement>(null);
  const { data: states = [], isLoading: loadingStates } = useStatesQuery(countryId, !!countryId);

  const selected = useMemo(() => states.find(s => s.id === value), [states, value]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return states;
    return states.filter(s => s.name.toLowerCase().includes(q));
  }, [search, states]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = useCallback((state: StateLocation) => {
    onChange(state.id);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setSearch(''); setOpen(true); } }}
        className={`flex items-center justify-between gap-1.5 w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[0.875rem] text-left transition-colors ${
          disabled
            ? 'cursor-not-allowed opacity-50 bg-[var(--color-muted)]'
            : 'cursor-pointer hover:border-[var(--color-border-strong)] active:scale-[0.98]'
        }`}
        title={selected ? selected.name : 'Select state'}
        aria-label="Select state"
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? selected.name : <span className="text-[var(--color-ink-muted)]">Select state...</span>}
        </span>
        {loadingStates && !disabled && <Loader2 size={14} className="shrink-0 animate-spin text-[var(--color-ink-muted)]" />}
        <ChevronDown size={14} className="shrink-0 text-[var(--color-ink-muted)]" />
      </button>

      {open && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
          className="flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
          onClick={() => { setOpen(false); setSearch(''); }}
        >
          <div
            style={{ width: 'min(420px, 92vw)', maxHeight: '85vh' }}
            className="flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)] animate-[slideUp_0.2s_ease]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3.5">
              <span className="text-[0.9375rem] font-bold text-[var(--color-ink)]">Select State</span>
              <button type="button" onClick={() => { setOpen(false); setSearch(''); }} className="icon-btn border-none">
                <X size={17} />
              </button>
            </div>

            <div className="border-b border-[var(--color-border)] p-3">
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-muted)] px-3 transition-colors focus-within:border-[var(--color-primary)] focus-within:bg-[var(--color-surface)]">
                <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search state..."
                  className="flex-1 border-none bg-transparent py-2 text-[0.875rem] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)]"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto py-1.5">
              {filtered.length === 0 ? (
                <li className="px-4 py-8 text-center text-[0.875rem] text-[var(--color-ink-muted)]">
                  No states found{search ? ` for "${search}"` : ''}
                </li>
              ) : (
                filtered.map(s => {
                  const isActive = value === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(s)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-[0.875rem] transition-colors ${
                          isActive
                            ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                            : 'text-[var(--color-ink)] hover:bg-[var(--color-muted)]'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                        {isActive && <Check size={15} className="shrink-0 text-[var(--color-primary)]" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="border-t border-[var(--color-border)] px-4 py-2.5 text-[0.75rem] text-[var(--color-ink-muted)]">
              {filtered.length === states.length
                ? `${states.length} states`
                : `${filtered.length} of ${states.length} states`}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
