import { useState, useEffect, type ComponentType } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Smartphone,
  Webhook,
  FileText,
  Contact,
  UserPlus,
  Users,
  Settings,
  Megaphone,
  KeyRound,
  Shield,
  UserCog,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SquarePen,
  MessageCircle,
  History,
  ShieldCheck,
  Mail,
  Link,
  Facebook,
  Youtube,
} from 'lucide-react';
import { type UserRole } from '../hooks/useRole';
import { type SupportedLanguage, rtlLanguages } from '../i18n';
import { AuthHeader } from './AuthHeader';
import { SystemCheckModal } from './SystemCheck';
import { useSystemCheckQuery, useSessionStatsQuery } from '../hooks/queries';

interface LayoutProps {
  onLogout: () => void;
  userRole: UserRole | null;
}

interface NavLeaf {
  to: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  key: string;
  adminOnly?: boolean;
}

interface NavGroup {
  key: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  children: NavLeaf[];
}

function isGroup(entry: NavLeaf | NavGroup): entry is NavGroup {
  return 'children' in entry;
}

function isPathActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

// Order mirrors how the product is actually used day to day: connect a
// session, message people, then the supporting tools (API, audit, settings),
// with account/permission management — the most sensitive area — last.
const NAV_STRUCTURE: (NavLeaf | NavGroup)[] = [
  { to: '/',         icon: LayoutDashboard, key: 'dashboard' },
  { to: '/sessions', icon: Smartphone,      key: 'sessions' },
  {
    key: 'groupAudience',
    icon: Users,
    children: [
      { to: '/contacts', icon: Contact,  key: 'contacts' },
      { to: '/groups',   icon: UserPlus, key: 'groups' },
    ],
  },
  {
    key: 'groupMessaging',
    icon: MessageCircle,
    children: [
      { to: '/messages',  icon: History,   key: 'messages' },
      { to: '/campaigns', icon: Megaphone, key: 'campaigns' },
      { to: '/webhooks',  icon: Webhook,   key: 'webhooks' },
    ],
  },
  { to: '/api-keys',     icon: KeyRound, key: 'apiKeys' },
  { to: '/activity-log', icon: FileText, key: 'activityLog' },
  { to: '/settings',     icon: Settings, key: 'settings' },
  {
    key: 'groupAccess',
    icon: ShieldCheck,
    children: [
      { to: '/users', icon: UserCog, key: 'usersNav', adminOnly: true },
      { to: '/roles', icon: Shield,  key: 'rolesNav', adminOnly: true },
    ],
  },
];

// Static so the links live in one place, not scattered through JSX.
const SOCIAL_LINKS = [
  { key: 'email',    icon: Mail,          href: 'mailto:openwa@gmail.com' },
  { key: 'website',  icon: Link,          href: 'https://example.com' },
  { key: 'whatsapp', icon: MessageCircle, href: 'https://wa.me/+88016020804488' },
  { key: 'facebook', icon: Facebook,      href: 'https://facebook.com/openwa' },
  { key: 'youtube',  icon: Youtube,       href: 'https://youtube.com/openwa' },
] as const;

export function Layout({ onLogout, userRole }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = userRole === 'admin';
  const { data: systemCheck } = useSystemCheckQuery(isAdmin);
  const [systemCheckDismissed, setSystemCheckDismissed] = useState(false);
  const showSystemCheckModal = isAdmin && !systemCheckDismissed && !!systemCheck?.hasIssues;
  const { data: sessionStats } = useSessionStatsQuery();

  const [isCollapsed,   setIsCollapsed]   = useState(false);
  const [isMobileOpen,  setIsMobileOpen]  = useState(false);
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);
  const [openGroups,    setOpenGroups]    = useState<Set<string>>(() => new Set());

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

  // Auto-expand whichever group contains the current route.
  useEffect(() => {
    const activeGroup = NAV_STRUCTURE.find(
      entry => isGroup(entry) && entry.children.some(child => isPathActive(location.pathname, child.to)),
    );
    if (activeGroup) setOpenGroups(prev => (prev.has(activeGroup.key) ? prev : new Set(prev).add(activeGroup.key)));
  }, [location.pathname]);

  const handleNavClick = () => { if (isMobile) setIsMobileOpen(false); };

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const canSee = (item: NavLeaf) => !item.adminOnly || isAdmin;

  const currentLang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] as SupportedLanguage;
  const isRtl = rtlLanguages.includes(currentLang);

  const sidebarW = isCollapsed ? 64 : 236;
  const showLabels = !isCollapsed || isMobile;

  const renderLeaf = (item: NavLeaf) => {
    const label = t(`nav.${item.key}`);
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        onClick={handleNavClick}
        title={!showLabels ? label : undefined}
        className={({ isActive }) =>
          [
            'relative flex items-center rounded-[8px] text-[0.8375rem] font-medium no-underline whitespace-nowrap overflow-hidden transition-all duration-150',
            !showLabels ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
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
            <item.icon
              size={17}
              className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]'}
            />
            {showLabels && <span>{label}</span>}
          </>
        )}
      </NavLink>
    );
  };

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
        <div className={`flex h-14 shrink-0 items-center border-b border-[var(--color-border)] ${!showLabels ? 'justify-center px-3' : 'gap-2.5 px-4'}`}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[var(--color-primary)]">
            <img src="/openwa_logo.webp" alt="OpenWA" className="h-4 w-4 object-contain brightness-0 invert" />
          </div>
          {showLabels && (
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

        {/* Compose — the primary action, always first and always emphasized */}
        <div className={showLabels ? 'px-2.5 pt-3' : 'flex justify-center px-2.5 pt-3'}>
          <NavLink
            to="/composer"
            onClick={handleNavClick}
            title={!showLabels ? t('nav.compose') : undefined}
            className={
              showLabels
                ? 'btn-primary w-full justify-center py-2.5 text-[0.875rem] no-underline'
                : 'flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--color-primary)] text-white no-underline shadow-[0_2px_8px_rgba(37,211,102,0.3)] transition-transform hover:scale-105'
            }
          >
            <SquarePen size={16} />
            {showLabels && t('nav.compose')}
          </NavLink>
        </div>

        {/* Nav — grows to fill the space above the footer, scrolls internally if long */}
        <div className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
          <nav className="flex flex-col gap-px">
            {NAV_STRUCTURE.map(entry => {
              if (!isGroup(entry)) {
                if (!canSee(entry)) return null;
                return renderLeaf(entry);
              }

              const children = entry.children.filter(canSee);
              if (children.length === 0) return null;

              // Icon-collapsed rail: flatten groups so every icon stays reachable
              // without needing a hover flyout.
              if (!showLabels) {
                return children.map(child => renderLeaf(child));
              }

              const isOpen = openGroups.has(entry.key);
              const groupLabel = t(`nav.${entry.key}`);
              const hasActiveChild = children.some(child => isPathActive(location.pathname, child.to));

              return (
                <div key={entry.key}>
                  <button
                    onClick={() => toggleGroup(entry.key)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-[8px] border-none bg-transparent px-3 py-2.5 text-[0.8375rem] font-medium transition-all duration-150 ${
                      hasActiveChild && !isOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)] hover:bg-[var(--color-muted)]'
                    }`}
                  >
                    <entry.icon size={17} className={hasActiveChild && !isOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]'} />
                    <span className="flex-1 text-start">{groupLabel}</span>
                    <ChevronDown
                      size={14}
                      className={`text-[var(--color-ink-muted)] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-px flex flex-col gap-px border-[var(--color-border)] ps-2 ms-[1.0625rem] border-s">
                      {children.map(child => renderLeaf(child))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer — live connection status + version on one row, social links on another */}
        <div className="shrink-0 border-t border-[var(--color-border)] p-2.5">
          {showLabels ? (
            <>
              {/* Row 1: connection status ↔ version */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => { navigate('/sessions'); handleNavClick(); }}
                  className="flex min-w-0 cursor-pointer items-center gap-2 rounded-[8px] border-none bg-transparent py-1 ps-1 pe-2 transition-all hover:bg-[var(--color-muted)]"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      sessionStats && sessionStats.ready > 0 ? 'animate-[pulse-ring_1.8s_ease_infinite] bg-[var(--color-primary)]' : 'bg-[var(--color-ink-muted)]'
                    }`}
                  />
                  <span className="truncate text-[0.75rem] text-[var(--color-ink)]">
                    <span className="font-semibold">{sessionStats?.ready ?? 0}/{sessionStats?.total ?? 0}</span>{' '}
                    <span className="text-[var(--color-ink-muted)]">{t('common.sessionsActive')}</span>
                  </span>
                </button>
                <span className="shrink-0 text-[0.6875rem] text-[var(--color-ink-muted)]">v{__APP_VERSION__}</span>
              </div>

              {/* Row 2: social links */}
              <div className="mt-2 flex items-center justify-center gap-0.5 border-t border-[var(--color-border)] pt-2">
                {SOCIAL_LINKS.map(social => (
                  <a
                    key={social.key}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t(`common.social.${social.key}`)}
                    aria-label={t(`common.social.${social.key}`)}
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-primary)]"
                  >
                    <social.icon size={14} />
                  </a>
                ))}
              </div>
            </>
          ) : (
            <button
              onClick={() => { navigate('/sessions'); handleNavClick(); }}
              title={t('nav.sessions')}
              className="flex w-full cursor-pointer items-center justify-center rounded-[8px] border-none bg-transparent py-2 transition-all hover:bg-[var(--color-muted)]"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  sessionStats && sessionStats.ready > 0 ? 'animate-[pulse-ring_1.8s_ease_infinite] bg-[var(--color-primary)]' : 'bg-[var(--color-ink-muted)]'
                }`}
              />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        style={{
          marginLeft:  isMobile ? 0 : (isRtl ? 0        : sidebarW),
          marginRight: isMobile ? 0 : (isRtl ? sidebarW : 0),
          width:       isMobile ? '100%' : `calc(100% - ${sidebarW}px)`,
          paddingTop:  isMobile ? 56 : 0,
        }}
        className="flex min-h-screen flex-1 flex-col bg-[var(--color-muted)] transition-[margin,width] duration-200 ease-in-out"
      >
        <AuthHeader onLogout={onLogout} />
        <div className="flex-1 overflow-x-hidden">
          <Outlet />
        </div>
      </main>

      {showSystemCheckModal && systemCheck && (
        <SystemCheckModal
          checks={systemCheck.checks}
          onClose={() => setSystemCheckDismissed(true)}
          onViewDetails={() => {
            setSystemCheckDismissed(true);
            navigate('/settings?tab=systemRequirements');
          }}
        />
      )}
    </div>
  );
}
