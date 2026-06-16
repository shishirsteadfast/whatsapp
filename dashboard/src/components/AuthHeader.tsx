import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  User,
  Key,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { useTheme } from '../hooks/useTheme';

interface AuthHeaderProps {
  onLogout: () => void;
}

export function AuthHeader({ onLogout }: AuthHeaderProps) {
  const { t } = useTranslation();
  const { role } = useRole();
  const { resolvedTheme, setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleLabel = role ? t(`apiKeys.roles.${role}`, { defaultValue: role }) : '';

  const profileItems = [
    { icon: User, label: t('common.profile') },
    { icon: Key, label: t('common.changePassword') },
    { icon: Settings, label: t('common.settings') },
  ];

  const handleProfileClick = (label: string) => {
    setProfileOpen(false);
    // Route navigation can be added here when those pages exist
    console.log(`Navigate to: ${label}`);
  };

  const handleThemeToggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-end gap-3 border-b border-border bg-surface px-6 rtl:justify-start">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {/* ---------- Theme Toggle ---------- */}
        <div className="relative">
          <button
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-surface p-0 text-ink-secondary transition-all duration-200 hover:border-primary hover:bg-muted hover:text-ink active:scale-[0.93] active:border-primary active:bg-muted active:text-primary focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(37,211,102,0.3)] focus-visible:outline-none"
            onClick={handleThemeToggle}
            aria-label={resolvedTheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            title={resolvedTheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          >
            {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* ---------- Notification Bell ---------- */}
        <div className="relative" ref={notifRef}>
          <button
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border p-0 transition-all duration-200 hover:border-primary hover:bg-muted hover:text-ink active:scale-[0.93] active:border-primary active:bg-muted active:text-primary focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(37,211,102,0.3)] focus-visible:outline-none ${
              notifOpen              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-surface text-ink-secondary'
          }`}
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            aria-label={t('common.notifications')}
            title={t('common.notifications')}
          >
            <Bell size={20} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-[blink-dot_1.4s_ease-in-out_infinite] rounded-full border-2 border-surface bg-red-500 dark:border-surface" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[300px] animate-[dropdown-appear_0.15s_ease] overflow-hidden rounded-xl border border-border bg-surface shadow-lg rtl:left-0 rtl:right-auto">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="text-[0.9375rem] font-bold text-ink">{t('common.notifications')}</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                <div className="flex flex-col items-center gap-2 px-5 py-8 text-sm text-ink-muted">
                  <Bell size={32} className="stroke-ink-muted opacity-50" />
                  <span>{t('common.noNotifications')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------- Profile Dropdown ---------- */}
        <div className="relative" ref={profileRef}>
          <button
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 p-0 transition-all duration-200 active:scale-[0.93] focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(37,211,102,0.3)] focus-visible:outline-none ${
              profileOpen
                ? 'border-primary shadow-[0_0_0_3px_rgba(37,211,102,0.15)]'
                : 'border-border bg-muted hover:border-primary hover:shadow-[0_0_0_3px_rgba(37,211,102,0.15)]'
            }`}
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            aria-label={t('common.profile')}
            title={t('common.profile')}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-white">
              <User size={18} className="stroke-white" />
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[240px] animate-[dropdown-appear_0.15s_ease] overflow-hidden rounded-xl border border-border bg-surface shadow-lg rtl:left-0 rtl:right-auto">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-white">
                  <User size={22} className="stroke-white" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[0.9375rem] font-bold text-ink">{role ? role.charAt(0).toUpperCase() + role.slice(1) : '—'}</span>
                  <span className="text-[0.8125rem] font-medium text-ink-muted">{roleLabel}</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 p-2">
                {profileItems.map(({ icon: Icon, label }) => (
                  <button key={label} className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-sm font-medium text-ink-secondary transition-all duration-150 hover:bg-muted hover:text-ink rtl:text-right" onClick={() => handleProfileClick(label)}>
                    <Icon size={18} className="shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
                <div className="my-1 h-px bg-border" />
                <button className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-sm font-medium text-error transition-all duration-150 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/12 dark:hover:text-red-400 rtl:text-right" onClick={onLogout}>
                  <LogOut size={18} className="shrink-0" />
                  <span>{t('common.logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
