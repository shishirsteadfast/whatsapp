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
import './AuthHeader.css';

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
    <header className="auth-header">
      <div className="auth-header__left">
        {/* Reserved for breadcrumb or page context if needed */}
      </div>
      <div className="auth-header__right">
        {/* ---------- Theme Toggle ---------- */}
        <div className="auth-header__icon-wrapper">
          <button
            className="auth-header__icon-btn"
            onClick={handleThemeToggle}
            aria-label={resolvedTheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            title={resolvedTheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          >
            {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* ---------- Notification Bell ---------- */}
        <div className="auth-header__icon-wrapper" ref={notifRef}>
          <button
            className={`auth-header__icon-btn ${notifOpen ? 'active' : ''}`}
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            aria-label={t('common.notifications')}
            title={t('common.notifications')}
          >
            <Bell size={20} />
            <span className="auth-header__dot" />
          </button>

          {notifOpen && (
            <div className="auth-header__dropdown auth-header__dropdown--notif">
              <div className="auth-header__dropdown-header">
                <span className="auth-header__dropdown-title">{t('common.notifications')}</span>
              </div>
              <div className="auth-header__notif-list">
                <div className="auth-header__notif-empty">
                  <Bell size={32} className="auth-header__notif-empty-icon" />
                  <span>{t('common.noNotifications')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------- Profile Dropdown ---------- */}
        <div className="auth-header__icon-wrapper" ref={profileRef}>
          <button
            className={`auth-header__avatar-btn ${profileOpen ? 'active' : ''}`}
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            aria-label={t('common.profile')}
            title={t('common.profile')}
          >
            <div className="auth-header__avatar">
              <User size={18} />
            </div>
          </button>

          {profileOpen && (
            <div className="auth-header__dropdown auth-header__dropdown--profile">
              <div className="auth-header__dropdown-header">
                <div className="auth-header__avatar auth-header__avatar--lg">
                  <User size={22} />
                </div>
                <div className="auth-header__user-info">
                  <span className="auth-header__user-name">{role ? role.charAt(0).toUpperCase() + role.slice(1) : '—'}</span>
                  <span className="auth-header__user-role">{roleLabel}</span>
                </div>
              </div>
              <div className="auth-header__menu">
                {profileItems.map(({ icon: Icon, label }) => (
                  <button key={label} className="auth-header__menu-item" onClick={() => handleProfileClick(label)}>
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
                <div className="auth-header__divider" />
                <button className="auth-header__menu-item auth-header__menu-item--danger" onClick={onLogout}>
                  <LogOut size={18} />
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
