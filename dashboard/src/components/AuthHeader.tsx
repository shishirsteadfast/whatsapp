import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, User, Key, Settings, LogOut, Sun, Moon, ChevronDown } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useTheme } from '../hooks/useTheme';
import { supportedLanguages, type SupportedLanguage } from '../i18n';

interface AuthHeaderProps {
  onLogout: () => void;
}

export function AuthHeader({ onLogout }: AuthHeaderProps) {
  const { t, i18n } = useTranslation();
  const { role } = useRole();
  const { resolvedTheme, setTheme } = useTheme();
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isDark    = resolvedTheme === 'dark';
  const roleLabel = role ? t(`apiKeys.roles.${role}`, { defaultValue: role }) : '—';
  const roleName  = role ? role.charAt(0).toUpperCase() + role.slice(1) : '—';

  const rawLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] as SupportedLanguage;
  const currentLang = supportedLanguages.includes(rawLang) ? rawLang : 'en';

  const languages = [
    { code: 'en', label: 'EN', native: 'English' },
    { code: 'he', label: 'עב', native: 'עברית' },
    { code: 'zh', label: '中文', native: '中文' },
    { code: 'es', label: 'ES', native: 'Español' },
    { code: 'ar', label: 'العربية', native: 'العربية' },
    { code: 'bn', label: 'বাংলা', native: 'বাংলা' },
    { code: 'pt', label: 'PT', native: 'Português' },
    { code: 'id', label: 'ID', native: 'Bahasa Indonesia' },
    { code: 'ur', label: 'اردو', native: 'اردو' },
    { code: 'ru', label: 'RU', native: 'Русский' },
    { code: 'de', label: 'DE', native: 'Deutsch' },
    { code: 'ja', label: '日本語', native: '日本語' },
    { code: 'it', label: 'IT', native: 'Italiano' },
  ] as const;

  /* Shared icon-button style */
  const iconBtn = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border-none bg-transparent text-[var(--color-ink-muted)] transition-all hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)]';

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 rtl:flex-row-reverse">

      {/* Left spacer */}
      <div className="flex-1" />

      {/* ── Right controls ── */}
      <div className="flex items-center gap-1">

        {/* Language dropdown */}
        <div className="relative">
          <select
            value={currentLang}
            onChange={e => void i18n.changeLanguage(e.target.value)}
            aria-label={t('common.language')}
            className="flex h-8 cursor-pointer appearance-none items-center justify-center rounded-[var(--radius)] border-none bg-transparent px-2.5 pr-6 text-[0.75rem] font-bold tracking-wide text-[var(--color-ink-muted)] transition-all hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.label} — {lang.native}
              </option>
            ))}
          </select>
          <ChevronDown
            size={11}
            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
          />
        </div>

        {/* Theme */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
          className={iconBtn}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
            aria-label={t('common.notifications')}
            className={`${iconBtn} relative ${notifOpen ? 'bg-[var(--color-muted)] text-[var(--color-ink)]' : ''}`}
          >
            <Bell size={16} />
            <span className="absolute right-[7px] top-[7px] h-[6px] w-[6px] rounded-full border-[1.5px] border-[var(--color-surface)] bg-red-500" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 animate-[dropdown-appear_0.15s_ease] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <span className="text-[0.875rem] font-semibold text-[var(--color-ink)]">{t('common.notifications')}</span>
                <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[0.65rem] font-bold text-[var(--color-ink-muted)]">0</span>
              </div>
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[var(--color-ink-muted)]">
                <Bell size={26} strokeWidth={1.2} className="opacity-25" />
                <span className="text-[0.8125rem]">{t('common.noNotifications')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-1.5 h-4 w-px bg-[var(--color-border)]" />

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
            aria-label={t('common.profile')}
            className="flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border-none bg-transparent px-2 py-1.5 transition-all hover:bg-[var(--color-muted)]"
          >
            {/* Avatar */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-surface)]">
              <User size={13} />
            </div>

            {/* Name + role */}
            <div className="flex flex-col items-start leading-none max-sm:hidden">
              <span className="text-[0.8125rem] font-semibold text-[var(--color-ink)]">{roleName}</span>
              <span className="mt-0.5 text-[0.6875rem] text-[var(--color-ink-muted)]">{roleLabel}</span>
            </div>

            <ChevronDown
              size={13}
              className={`text-[var(--color-ink-muted)] transition-transform duration-150 max-sm:hidden ${profileOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 animate-[dropdown-appear_0.15s_ease] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">

              {/* User row */}
              <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-surface)]">
                  <User size={15} />
                </div>
                <div>
                  <p className="m-0 text-[0.875rem] font-semibold text-[var(--color-ink)]">{roleName}</p>
                  <p className="m-0 text-[0.75rem] text-[var(--color-ink-muted)]">{roleLabel}</p>
                </div>
              </div>

              {/* Menu */}
              <div className="flex flex-col p-1.5">
                {[
                  { icon: User,     label: t('common.profile') },
                  { icon: Key,      label: t('common.changePassword') },
                  { icon: Settings, label: t('common.settings') },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border-none bg-transparent px-3 py-2 text-[0.8125rem] font-medium text-[var(--color-ink-secondary)] transition-all hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}

                <div className="my-1.5 h-px bg-[var(--color-border)]" />

                <button
                  onClick={() => { setProfileOpen(false); onLogout(); }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border-none bg-transparent px-3 py-2 text-[0.8125rem] font-medium text-red-500 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <LogOut size={14} />
                  {t('common.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
