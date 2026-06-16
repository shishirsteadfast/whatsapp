import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Smartphone,
  Webhook,
  FileText,
  LogOut,
  Send,
  Server,
  Puzzle,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Languages,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { type UserRole } from '../hooks/useRole';
import { supportedLanguages, type SupportedLanguage } from '../i18n';
import { AuthHeader } from './AuthHeader';

interface LayoutProps {
  onLogout: () => void;
  userRole: UserRole | null;
}

const allNavItems = [
  { to: '/', icon: LayoutDashboard, key: 'dashboard' as const, adminOnly: false },
  { to: '/sessions', icon: Smartphone, key: 'sessions' as const, adminOnly: false },
  { to: '/webhooks', icon: Webhook, key: 'webhooks' as const, adminOnly: false },
  { to: '/message-tester', icon: Send, key: 'messageTester' as const, adminOnly: false },
  { to: '/infrastructure', icon: Server, key: 'infrastructure' as const, adminOnly: false },
  { to: '/plugins', icon: Puzzle, key: 'plugins' as const, adminOnly: true },
  { to: '/logs', icon: FileText, key: 'logs' as const, adminOnly: false },
];

const themeIcons = { light: Sun, dark: Moon, system: Monitor };

export function Layout({ onLogout, userRole }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = themeIcons[theme];
  const themeLabel = t(`theme.${theme}`);

  const navItems = allNavItems.filter(item => !item.adminOnly || userRole === 'admin');

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = () => {
    if (isMobile) setIsMobileOpen(false);
  };

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] as SupportedLanguage;
  const cycleLanguage = () => {
    const idx = supportedLanguages.indexOf(currentLang);
    const next = supportedLanguages[(idx + 1) % supportedLanguages.length];
    void i18n.changeLanguage(next);
  };
  const languageLabel = currentLang === 'he' ? 'עברית' : 'EN';
  const isRtl = currentLang === 'he';

  return (
    <div className="flex min-h-screen">
      {/* Mobile header */}
      {isMobile && (
        <header className="fixed left-0 right-0 top-0 z-90 flex h-14 items-center justify-between border-b border-border bg-surface px-4">
          <button
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[var(--radius)] border-none bg-transparent p-0 text-ink transition-colors duration-200 hover:bg-muted"
            onClick={toggleMobile}
            aria-label={t('common.expand')}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <img src="/openwa_logo.webp" alt="OpenWA" className="h-6 w-6 shrink-0 object-contain" />
            <span className="text-base font-extrabold tracking-tight text-ink">{t('common.appName')}</span>
          </div>
          <div style={{ width: 40 }} />
        </header>
      )}

      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-95 animate-[fadeIn_0.2s_ease] bg-black/50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed flex h-screen flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out z-100
          ${isMobile
            ? `w-[280px] translate-x-[-100%] shadow-[2px_0_20px_rgba(0,0,0,0.1)] ${isMobileOpen ? 'translate-x-0' : ''}`
            : `${isCollapsed ? 'w-[72px]' : 'w-[260px]'}`
          }
          rtl:border-l rtl:border-r-0`}
      >
        {/* Sidebar header */}
        <div className={`flex min-h-[72px] items-center gap-3 border-b border-border px-6 ${isCollapsed ? 'justify-center px-4' : ''}`}>
          <img src="/openwa_logo.webp" alt="OpenWA" className="h-7 w-7 shrink-0 object-contain" />
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden whitespace-nowrap">
              <span className="text-lg font-extrabold tracking-tight text-ink">{t('common.appName')}</span>
              <span className="text-[0.7rem] font-medium uppercase tracking-wider text-ink-muted">{t('common.appSubtitle')}</span>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        {!isMobile && (
          <button
            className={`absolute top-9 z-101 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border bg-surface p-0 text-ink-secondary shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white hover:shadow-[0_4px_12px_rgba(37,211,102,0.3)]
              ${isCollapsed ? 'right-[-14px]' : 'right-[-14px]'}
              rtl:left-[-14px] rtl:right-auto`}
            onClick={toggleCollapse}
            title={isCollapsed ? t('common.expand') : t('common.collapse')}
            aria-label={isCollapsed ? t('common.expand') : t('common.collapse')}
          >
            {isCollapsed
              ? (isRtl ? <ChevronLeft size={16} className="rtl:scale-x-[-1]" /> : <ChevronRight size={16} className="rtl:scale-x-[-1]" />)
              : (isRtl ? <ChevronRight size={16} className="rtl:scale-x-[-1]" /> : <ChevronLeft size={16} className="rtl:scale-x-[-1]" />)}
          </button>
        )}

        {/* Navigation */}
        <nav className={`flex flex-1 flex-col gap-1 overflow-y-auto ${isCollapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
          {navItems.map(({ to, icon: Icon, key }) => {
            const label = t(`nav.${key}`);
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-[var(--radius)] text-sm font-medium whitespace-nowrap overflow-hidden no-underline transition-all duration-200
                  ${isCollapsed ? 'justify-center p-[0.7rem]' : 'px-4 py-[0.7rem]'}
                  ${isActive
                    ? 'bg-primary/10 text-primary [&>svg]:text-primary'
                    : 'text-ink-secondary hover:bg-muted hover:text-ink hover:no-underline'
                  }`
                }
                end={to === '/'}
                onClick={handleNavClick}
                title={isCollapsed ? label : undefined}
              >
                <Icon size={20} />
                {!isCollapsed && <span>{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className={`flex flex-col gap-2 border-t border-border ${isCollapsed ? 'px-2 py-3' : 'p-3'}`}>
          <button
            className={`flex items-center gap-3 cursor-pointer rounded-[var(--radius)] border border-border bg-transparent text-sm font-medium text-ink-secondary whitespace-nowrap overflow-hidden transition-all duration-200 hover:bg-muted hover:text-ink ${isCollapsed ? 'justify-center p-[0.6rem]' : 'px-[0.9rem] py-[0.6rem]'}`}
            onClick={cycleLanguage}
            title={t('common.language')}
            aria-label={t('common.language')}
          >
            <Languages size={18} />
            {!isCollapsed && <span>{languageLabel}</span>}
          </button>
          <button
            className={`flex items-center gap-3 cursor-pointer rounded-[var(--radius)] border border-border bg-transparent text-sm font-medium text-ink-secondary whitespace-nowrap overflow-hidden transition-all duration-200 hover:bg-muted hover:text-ink ${isCollapsed ? 'justify-center p-[0.6rem]' : 'px-[0.9rem] py-[0.6rem]'}`}
            onClick={toggleTheme}
            title={t('theme.label', { value: themeLabel })}
          >
            <ThemeIcon size={18} />
            {!isCollapsed && <span>{themeLabel}</span>}
          </button>
          <button
            className={`flex items-center gap-3 cursor-pointer rounded-[var(--radius)] border border-border bg-transparent text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 ${isCollapsed ? 'justify-center p-[0.6rem] text-ink-secondary' : 'px-[0.9rem] py-[0.6rem] text-ink-secondary'}`}
            onClick={onLogout}
            title={isCollapsed ? t('common.logout') : undefined}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>{t('common.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex min-h-screen flex-1 flex-col overflow-x-hidden bg-muted transition-all duration-300 ease-in-out
          ${isMobile
            ? 'ml-0 w-full pt-14'
            : `${isCollapsed ? 'ml-[72px] w-[calc(100%-72px)]' : 'ml-[260px] w-[calc(100%-260px)]'}`
          }
          rtl:ml-0 rtl:mr-[260px] rtl:transition-[margin-right,width] rtl:duration-300 rtl:ease-in-out
          rtl:[&.expanded]:mr-[72px]`}
      >
        <AuthHeader onLogout={onLogout} />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
