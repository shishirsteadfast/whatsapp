import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Smartphone,
  Webhook,
  FileText,
  Send,
  Server,
  Puzzle,
  Users,
  UserPlus,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { type UserRole } from '../hooks/useRole';
import { type SupportedLanguage } from '../i18n';
import { AuthHeader } from './AuthHeader';

interface LayoutProps {
  onLogout: () => void;
  userRole: UserRole | null;
}

const allNavItems = [
  { to: '/',               icon: LayoutDashboard, key: 'dashboard'      as const, adminOnly: false },
  { to: '/sessions',       icon: Smartphone,      key: 'sessions'       as const, adminOnly: false },
  { to: '/contacts',       icon: Users,           key: 'contacts'       as const, adminOnly: false },
  { to: '/groups',         icon: UserPlus,        key: 'groups'         as const, adminOnly: false },
  { to: '/messages',       icon: Send,            key: 'messages'       as const, adminOnly: false },
  { to: '/webhooks',       icon: Webhook,         key: 'webhooks'       as const, adminOnly: false },
  { to: '/message-tester', icon: Send,            key: 'messageTester'  as const, adminOnly: false },
  { to: '/infrastructure', icon: Server,          key: 'infrastructure' as const, adminOnly: false },
  { to: '/plugins',        icon: Puzzle,          key: 'plugins'        as const, adminOnly: true  },
  { to: '/logs',           icon: FileText,        key: 'logs'           as const, adminOnly: false },
  { to: '/settings',       icon: Settings,        key: 'settings'       as const, adminOnly: false },
];

export function Layout({ onLogout, userRole }: LayoutProps) {
  const { t, i18n } = useTranslation();

  const navItems = allNavItems.filter(item => !item.adminOnly || userRole === 'admin');

  const [isCollapsed,   setIsCollapsed]   = useState(false);
  const [isMobileOpen,  setIsMobileOpen]  = useState(false);
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const handleNavClick = () => { if (isMobile) setIsMobileOpen(false); };

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] as SupportedLanguage;
  const isRtl = currentLang === 'he';

  const sidebarW = isCollapsed ? 64 : 236;

  return (
    <div className="flex min-h-screen">

      {/* ── Mobile top bar ── */}
      {isMobile && (
        <header className="fixed left-0 right-0 top-0 z-[90] flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
          <button
            onClick={() => setIsMobileOpen(v => !v)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border-none bg-transparent text-[var(--color-ink-secondary)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)]"
            aria-label={t('common.expand')}
          >
            {isMobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--color-primary)]">
              <img src="/openwa_logo.webp" alt="OpenWA" className="h-4 w-4 object-contain brightness-0 invert" />
            </div>
            <span className="text-[0.9rem] font-bold tracking-tight text-[var(--color-ink)]">{t('common.appName')}</span>
          </div>

          <div className="w-8" />
        </header>
      )}

      {/* ── Mobile overlay ── */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-[95] bg-black/40 backdrop-blur-sm animate-[fadeIn_0.18s_ease]"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{ width: isMobile ? 236 : sidebarW }}
        className={[
          'fixed flex h-screen flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] z-[100]',
          'transition-[width] duration-200 ease-in-out',
          isMobile
            ? `-translate-x-full shadow-[var(--shadow-lg)] ${isMobileOpen ? '!translate-x-0' : ''}`
            : '',
          isRtl ? 'right-0 border-l border-r-0' : 'left-0',
        ].join(' ')}
      >
        {/* Brand */}
        <div className={`flex h-14 shrink-0 items-center border-b border-[var(--color-border)] ${isCollapsed && !isMobile ? 'justify-center px-3' : 'gap-2.5 px-4'}`}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[var(--color-primary)]">
            <img src="/openwa_logo.webp" alt="OpenWA" className="h-4 w-4 object-contain brightness-0 invert" />
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-[0.9rem] font-bold tracking-tight text-[var(--color-ink)]">{t('common.appName')}</span>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">{t('common.appSubtitle')}</span>
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(v => !v)}
            title={isCollapsed ? t('common.expand') : t('common.collapse')}
            className={`absolute top-[1.3125rem] z-[101] flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-ink-muted)] shadow-[var(--shadow-sm)] transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white ${isRtl ? 'left-[-10px]' : 'right-[-10px]'}`}
          >
            {isCollapsed
              ? (isRtl ? <ChevronLeft size={11} /> : <ChevronRight size={11} />)
              : (isRtl ? <ChevronRight size={11} /> : <ChevronLeft size={11} />)}
          </button>
        )}

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-px overflow-y-auto px-2 py-3">
          {navItems.map(({ to, icon: Icon, key }) => {
            const label = t(`nav.${key}`);
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={handleNavClick}
                title={isCollapsed && !isMobile ? label : undefined}
                className={({ isActive }) =>
                  [
                    'relative flex items-center rounded-[8px] text-[0.8375rem] font-medium no-underline whitespace-nowrap overflow-hidden transition-all duration-150',
                    isCollapsed && !isMobile ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)] font-semibold'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)]',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active left-bar indicator */}
                    {isActive && (
                      <span
                        className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 h-[60%] w-[3px] rounded-r-full bg-[var(--color-primary)]`}
                        style={isRtl ? { borderRadius: '4px 0 0 4px' } : undefined}
                      />
                    )}
                    <Icon
                      size={17}
                      className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]'}
                    />
                    {(!isCollapsed || isMobile) && <span>{label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* No footer — language is in header, theme & logout are in the header profile menu */}
      </aside>

      {/* ── Main content ── */}
      <main
        style={{
          marginLeft:  isMobile ? 0 : (isRtl ? 0        : sidebarW),
          marginRight: isMobile ? 0 : (isRtl ? sidebarW : 0),
          width:       isMobile ? '100%' : `calc(100% - ${sidebarW}px)`,
          paddingTop:  isMobile ? 56 : 0,
        }}
        className="flex min-h-screen flex-1 flex-col bg-[var(--color-muted)] transition-[margin,width] duration-200 ease-in-out overflow-x-hidden"
      >
        <AuthHeader onLogout={onLogout} />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
