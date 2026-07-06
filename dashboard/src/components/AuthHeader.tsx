import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, User, Key, Settings, LogOut, Sun, Moon, ChevronDown, Check } from 'lucide-react';
import { US, IL, CN, ES, SA, BD, PT, ID, PK, RU, DE, JP, IT } from 'country-flag-icons/react/3x2';
import { useRole } from '../hooks/useRole';
import { useTheme } from '../hooks/useTheme';
import { supportedLanguages, type SupportedLanguage } from '../i18n';

interface AuthHeaderProps {
  onLogout: () => void;
}

const LANGUAGES = [
  { code: 'en', flag: US, native: 'English' },
  { code: 'he', flag: IL, native: 'עברית' },
  { code: 'zh', flag: CN, native: '中文' },
  { code: 'es', flag: ES, native: 'Español' },
  { code: 'ar', flag: SA, native: 'العربية' },
  { code: 'bn', flag: BD, native: 'বাংলা' },
  { code: 'pt', flag: PT, native: 'Português' },
  { code: 'id', flag: ID, native: 'Bahasa Indonesia' },
  { code: 'ur', flag: PK, native: 'اردو' },
  { code: 'ru', flag: RU, native: 'Русский' },
  { code: 'de', flag: DE, native: 'Deutsch' },
  { code: 'ja', flag: JP, native: '日本語' },
  { code: 'it', flag: IT, native: 'Italiano' },
] as const;

export function AuthHeader({ onLogout }: AuthHeaderProps) {
  const { t, i18n } = useTranslation();
  const { role } = useRole();
  const { resolvedTheme, setTheme } = useTheme();
  const [scrolled,     setScrolled]     = useState(false);
  const [langOpen,     setLangOpen]     = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const langRef    = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current    && !langRef.current.contains(e.target as Node))    setLangOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 4);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isDark    = resolvedTheme === 'dark';
  const roleLabel = role ? t(`apiKeys.roles.${role}`, { defaultValue: role }) : '—';
  const roleName  = role ? role.charAt(0).toUpperCase() + role.slice(1) : '—';

  const rawLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] as SupportedLanguage;
  const currentLang = supportedLanguages.includes(rawLang) ? rawLang : 'en';
  const currentLanguage = LANGUAGES.find(l => l.code === currentLang) ?? LANGUAGES[0];

  const closeAllExcept = (which: 'lang' | 'notif' | 'profile') => {
    if (which !== 'lang')    setLangOpen(false);
    if (which !== 'notif')   setNotifOpen(false);
    if (which !== 'profile') setProfileOpen(false);
  };

  /* Shared icon-button style */
  const iconBtn = 'flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border-none bg-transparent text-[var(--color-ink-muted)] transition-all hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)]';

  return (
    <header
      className={`sticky top-0 max-md:top-14 z-30 flex h-14 shrink-0 items-center border-b bg-[var(--color-surface)] px-5 transition-shadow duration-200 rtl:flex-row-reverse ${
        scrolled
          ? 'border-[var(--color-border)] shadow-[var(--shadow-sm)] backdrop-blur-md bg-[var(--color-surface)]/92'
          : 'border-transparent'
      }`}
    >

      {/* Left spacer */}
      <div className="flex-1" />

      {/* ── Right controls ── */}
      <div className="flex items-center gap-1">

        {/* Language switcher */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => { setLangOpen(v => !v); closeAllExcept('lang'); }}
            aria-label={t('common.language')}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--radius)] border-none bg-transparent px-2 text-[0.8125rem] font-semibold text-[var(--color-ink-secondary)] transition-all hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)] ${langOpen ? 'bg-[var(--color-muted)] text-[var(--color-ink)]' : ''}`}
          >
            <currentLanguage.flag title={currentLanguage.native} className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_var(--color-border)]" />
            <span className="max-sm:hidden">{currentLanguage.code.toUpperCase()}</span>
            <ChevronDown size={12} className={`text-[var(--color-ink-muted)] transition-transform duration-150 ${langOpen ? 'rotate-180' : ''}`} />
          </button>

          {langOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 max-h-[22rem] w-64 overflow-y-auto animate-[dropdown-appear_0.15s_ease] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-lg)]">
              {LANGUAGES.map(lang => {
                const isActive = lang.code === currentLang;
                return (
                  <button
                    key={lang.code}
                    onClick={() => { void i18n.changeLanguage(lang.code); setLangOpen(false); }}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border-none bg-transparent px-3 py-2 text-[0.8125rem] transition-all hover:bg-[var(--color-muted)] ${isActive ? 'font-semibold text-[var(--color-ink)]' : 'font-medium text-[var(--color-ink-secondary)]'}`}
                  >
                    <lang.flag title={lang.native} className="h-4 w-[22px] shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_var(--color-border)]" />
                    <span dir="auto" className="flex-1 truncate">{lang.native}</span>
                    {isActive && <Check size={14} className="shrink-0 text-[var(--color-primary)]" />}
                  </button>
                );
              })}
            </div>
          )}
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
            onClick={() => { setNotifOpen(v => !v); closeAllExcept('notif'); }}
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
            onClick={() => { setProfileOpen(v => !v); closeAllExcept('profile'); }}
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
