import { useState, useEffect, useCallback, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Plus, QrCode, RefreshCw, Trash2, Eye, Loader2, Play, Square, X, Search, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { sessionApi, type Session } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/Toast';
import { useWebSocket } from '../hooks/useWebSocket';
import { useRole } from '../hooks/useRole';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/dashboard/StatCard';

export function Sessions() {
  const { t } = useTranslation();
  useDocumentTitle(t('sessions.title'));
  const toast = useToast();
  const { canWrite } = useRole();
  const [sessions, setSessions]             = useState<Session[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName]   = useState('');
  const [creating, setCreating]               = useState(false);
  const [qrData, setQrData]                   = useState<{ sessionId: string; sessionName: string; qrCode: string } | null>(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [statusFilter, setStatusFilter]       = useState('all');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useWebSocket({
    onSessionStatus: useCallback((event: { sessionId: string; status: string }) => {
      setSessions(prev => prev.map(s => s.id === event.sessionId ? { ...s, status: event.status as Session['status'] } : s));
      if (event.status === 'ready')        toast.success(t('sessions.toasts.readyTitle'), t('sessions.toasts.readyDesc'));
      else if (event.status === 'disconnected') toast.warning(t('sessions.toasts.disconnectedTitle'), t('sessions.toasts.disconnectedDesc'));
    }, [toast, t]),
  });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setSessions(await sessionApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.create.errorDefault'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const qrRefreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentSessionName = useRef('');

  const fetchQR = useCallback(async (sessionId: string) => {
    try {
      const qr = await sessionApi.getQR(sessionId);
      setQrData({ sessionId, sessionName: currentSessionName.current, qrCode: qr.qrCode });
      if (qr.status === 'ready') { setQrData(null); currentSessionName.current = ''; fetchSessions(); }
    } catch { setQrData(null); currentSessionName.current = ''; fetchSessions(); }
  }, []);

  useEffect(() => {
    if (qrData) {
      currentSessionName.current = qrData.sessionName;
      qrRefreshInterval.current = setInterval(() => fetchQR(qrData.sessionId), 5000);
    }
    return () => { if (qrRefreshInterval.current) clearInterval(qrRefreshInterval.current); };
  }, [qrData, fetchQR]);

  const handleCreate = async () => {
    if (!newSessionName.trim()) return;
    try {
      setCreating(true);
      const s = await sessionApi.create(newSessionName);
      setSessions(prev => [...prev, s]);
      setNewSessionName('');
      setShowCreateModal(false);
      toast.success(t('sessions.create.successTitle'), t('sessions.create.successDesc', { name: s.name }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('sessions.create.errorDefault');
      toast.error(t('sessions.create.errorTitle'), msg);
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    const session = sessions.find(s => s.id === id);
    try {
      await sessionApi.delete(id);
      setSessions(sessions.filter(s => s.id !== id));
      toast.success(t('sessions.delete.successTitle'), session ? t('sessions.delete.successDescNamed', { name: session.name }) : t('sessions.delete.successDescGeneric'));
    } catch (err) {
      toast.error(t('sessions.delete.errorTitle'), err instanceof Error ? err.message : t('sessions.delete.errorDefault'));
    } finally { setDeleteConfirmId(null); }
  };

  const handleStart = async (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session && ['initializing','connecting','qr_ready'].includes(session.status)) { handleShowQR(id); return; }
    try {
      await sessionApi.start(id);
      setSessions(sessions.map(s => s.id === id ? { ...s, status: 'connecting' } : s));
      await fetchSessions();
      handleShowQR(id);
    } catch (err) {
      await fetchSessions();
      if (err instanceof Error && err.message.includes('already started')) handleShowQR(id);
    }
  };

  const handleShowQR = async (id: string) => {
    const session = sessions.find(s => s.id === id);
    try {
      const qr = await sessionApi.getQR(id);
      setQrData({ sessionId: id, sessionName: session?.name || '', qrCode: qr.qrCode });
    } catch { setError(t('sessions.qr.unavailable')); }
  };

  const handleStop = async (id: string) => {
    try {
      await sessionApi.stop(id);
      setSessions(sessions.map(s => s.id === id ? { ...s, status: 'disconnected' } : s));
      if (qrData?.sessionId === id) setQrData(null);
    } catch { fetchSessions(); }
  };

  const formatLastActive = (date?: string) => {
    if (!date) return t('common.never');
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000)   return t('common.justNow');
    if (diff < 3600000) return t('common.minAgo', { count: Math.floor(diff / 60000) });
    return new Date(date).toLocaleDateString();
  };

  const isActiveStatus     = (s: Session) => s.status === 'ready';
  const isInactiveStatus   = (s: Session) => ['created', 'idle', 'disconnected'].includes(s.status);
  const isConnectingStatus = (s: Session) => ['initializing', 'connecting', 'qr_ready'].includes(s.status);

  const filteredSessions = sessions.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch  = s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    const matchesStatus  =
      statusFilter === 'all' ||
      (statusFilter === 'active'     && isActiveStatus(s)) ||
      (statusFilter === 'inactive'   && isInactiveStatus(s)) ||
      (statusFilter === 'connecting' && isConnectingStatus(s));
    return matchesSearch && matchesStatus;
  });

  const statCards = [
    { key: 'all',        label: t('sessions.stats.total'),      value: sessions.length,                        icon: Smartphone, accent: 'var(--color-ink)',      bg: 'var(--color-muted)' },
    { key: 'active',     label: t('common.active'),              value: sessions.filter(isActiveStatus).length, icon: Wifi,       accent: 'var(--color-primary)', bg: 'var(--color-primary-dim)' },
    { key: 'connecting', label: t('sessions.stats.connecting'), value: sessions.filter(isConnectingStatus).length, icon: RefreshCw, accent: '#f59e0b',           bg: 'rgba(245,158,11,0.1)' },
    { key: 'inactive',   label: t('common.inactive'),            value: sessions.filter(isInactiveStatus).length, icon: WifiOff,   accent: '#ef4444',            bg: 'rgba(239,68,68,0.1)' },
  ] as const;

  const statusFilters = [
    { value: 'all',        label: t('sessions.filter.all') },
    { value: 'active',     label: t('sessions.filter.active') },
    { value: 'inactive',   label: t('sessions.filter.inactive') },
    { value: 'connecting', label: t('sessions.filter.connecting') },
  ];

  const pillColor = (status: string) => {
    if (status === 'ready')                                      return 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]';
    if (['connecting','initializing'].includes(status))          return 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400';
    if (status === 'qr_ready')                                   return 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400';
    if (status === 'disconnected')                               return 'bg-red-100 text-red-500 dark:bg-red-500/15 dark:text-red-400';
    return 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]';
  };

  const statusDot = (status: string) => {
    if (status === 'ready')       return 'bg-[var(--color-primary)]';
    if (['connecting','initializing','qr_ready'].includes(status)) return 'bg-amber-500';
    if (status === 'disconnected')return 'bg-red-500';
    return 'bg-[var(--color-ink-muted)]';
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title={t('sessions.title')}
        subtitle={t('sessions.subtitle')}
        actions={canWrite && (
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />{t('sessions.newSession')}
          </button>
        )}
      />

      {/* Stat cards — click one to jump straight to that filter */}
      <div className="mb-6 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {statCards.map(card => (
          <StatCard
            key={card.key}
            label={card.label}
            value={card.value}
            icon={card.icon}
            accent={card.accent}
            bg={card.bg}
            active={statusFilter === card.key}
            onClick={() => setStatusFilter(card.key)}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="search-bar max-w-[340px] flex-1 max-sm:max-w-none">
          <Search size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            placeholder={t('sessions.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="inline-flex flex-wrap items-center gap-1 rounded-[var(--radius)] border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`cursor-pointer whitespace-nowrap rounded-[6px] border-none px-3 py-1.5 text-[0.8125rem] font-medium transition-all ${
                statusFilter === f.value
                  ? 'bg-[var(--color-primary)] text-white shadow-[0_1px_4px_rgba(37,211,102,0.3)]'
                  : 'bg-transparent text-[var(--color-ink-secondary)] hover:bg-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-[var(--radius)] border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-600 dark:border-red-800/40 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('sessions.create.title')}</h2>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label className="mb-1.5 block text-[0.8125rem] font-semibold text-[var(--color-ink-secondary)]">{t('sessions.create.label')}</label>
              <input
                type="text"
                placeholder={t('sessions.create.placeholder')}
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="input-base"
                autoFocus
              />
              <p className="mt-2 text-[0.75rem] text-[var(--color-ink-muted)]"><Trans i18nKey="sessions.create.hint" components={{ code: <code /> }} /></p>
              {newSessionName && !/^[a-z0-9-]+$/.test(newSessionName) && <p className="mt-1.5 text-[0.75rem] font-medium text-red-500">{t('sessions.create.invalidChars')}</p>}
              {newSessionName && newSessionName.length > 50 && <p className="mt-1.5 text-[0.75rem] font-medium text-red-500">{t('sessions.create.tooLong', { length: newSessionName.length })}</p>}
              {newSessionName && /^[a-z0-9-]+$/.test(newSessionName) && newSessionName.length <= 50 && sessions.some(s => s.name === newSessionName) && <p className="mt-1.5 text-[0.75rem] font-medium text-red-500">{t('sessions.create.duplicate')}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>{t('common.cancel')}</button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={creating || !newSessionName.trim() || !/^[a-z0-9-]+$/.test(newSessionName) || newSessionName.length > 50 || sessions.some(s => s.name === newSessionName)}
              >
                {creating ? <Loader2 className="animate-spin" size={15} /> : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Modal ── */}
      {qrData && (
        <div className="modal-overlay" onClick={() => setQrData(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('sessions.qr.title')}</h2>
                <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">{qrData.sessionName}</span>
              </div>
              <button className="icon-btn" onClick={() => setQrData(null)} aria-label={t('common.close')}><X size={18} /></button>
            </div>
            <div className="modal-body text-center">
              {qrData.qrCode ? (
                <>
                  <div className="mx-auto mb-5 w-fit rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-sm)]">
                    <img src={qrData.qrCode} alt="QR" className="block h-[240px] w-[240px] rounded-[var(--radius)]" />
                  </div>
                  <div className="rounded-[var(--radius)] bg-[var(--color-muted)] px-4 py-3.5 text-left space-y-2">
                    {['step1','step2','step3'].map(step => (
                      <p key={step} className="m-0 text-[0.8125rem] text-[var(--color-ink-secondary)]">
                        <Trans i18nKey={`sessions.qr.${step}`} components={{ strong: <strong className="text-[var(--color-ink)]" /> }} />
                      </p>
                    ))}
                  </div>
                  <p className="mt-3.5 flex items-center justify-center gap-2 text-[0.75rem] text-[var(--color-ink-muted)]">
                    <RefreshCw size={12} className="animate-spin" /> {t('sessions.qr.autoRefresh')}
                  </p>
                </>
              ) : (
                <div className="py-10">
                  <Loader2 className="mx-auto mb-3 animate-spin text-[var(--color-primary)]" size={40} />
                  <p className="text-[var(--color-ink-secondary)]">{t('sessions.qr.generating')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('sessions.details.title')}</h2>
              <button className="icon-btn" onClick={() => setSelectedSession(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="space-y-3.5">
                {[
                  { label: t('sessions.details.name'),      value: selectedSession.name },
                  { label: t('sessions.details.sessionId'), value: selectedSession.id, mono: true },
                  { label: t('sessions.details.phone'),     value: selectedSession.phone || t('sessions.details.phoneNone') },
                  { label: t('sessions.details.created'),   value: new Date(selectedSession.createdAt).toLocaleString() },
                  { label: t('sessions.details.lastActive'),value: selectedSession.lastActive ? new Date(selectedSession.lastActive).toLocaleString() : t('common.never') },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{label}</span>
                    <span className={`text-[0.875rem] text-[var(--color-ink)] break-all ${mono ? 'font-mono rounded-[var(--radius)] bg-[var(--color-muted)] px-2.5 py-1.5 text-[0.8125rem]' : ''}`}>{value}</span>
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">{t('sessions.details.status')}</span>
                  <span className={`pill w-fit ${pillColor(selectedSession.status)}`}>
                    {t(`sessionStatus.${selectedSession.status}`, { defaultValue: selectedSession.status })}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedSession(null)}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-box max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="m-0 text-[1.0625rem] font-bold text-[var(--color-ink)]">{t('sessions.delete.title')}</h2>
              <button className="icon-btn" onClick={() => setDeleteConfirmId(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="m-0 text-[0.9rem] text-[var(--color-ink-secondary)]">
                <Trans i18nKey="sessions.delete.message" values={{ name: sessions.find(s => s.id === deleteConfirmId)?.name }} components={{ strong: <strong className="text-[var(--color-ink)]" /> }} />
              </p>
              <p className="mt-2 text-[0.8125rem] text-[var(--color-ink-muted)]">{t('sessions.delete.warning')}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)}>{t('common.cancel')}</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirmId)}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Session Grid ── */}
      <div className="grid grid-cols-3 gap-5 max-xl:grid-cols-2 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {filteredSessions.length === 0 ? (
          <div className="col-span-full empty-state">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-muted)]">
              <Smartphone size={28} strokeWidth={1.2} className="text-[var(--color-ink-muted)]" />
            </div>
            <h3>{t('sessions.empty.title')}</h3>
            <p>{t('sessions.empty.description')}</p>
            {canWrite && (
              <button className="btn-primary mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus size={15} /> {t('sessions.newSession')}
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map(session => (
            <div key={session.id} className="card flex flex-col p-5 transition-all duration-200 hover:shadow-[var(--shadow-md)]">
              {/* Card header */}
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[var(--color-muted)]`}>
                    <Smartphone size={17} className="text-[var(--color-ink-secondary)]" />
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)] ${statusDot(session.status)}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="m-0 truncate text-[0.9375rem] font-semibold text-[var(--color-ink)]" title={session.name}>{session.name}</h3>
                    <span className="font-mono text-[0.7rem] text-[var(--color-ink-muted)]">{session.id.substring(0, 10)}…</span>
                  </div>
                </div>
                <span className={`pill shrink-0 ${pillColor(session.status)}`}>
                  {t(`sessionStatus.${session.status}`, { defaultValue: session.status })}
                </span>
              </div>

              {/* QR / details */}
              {['initializing','connecting','qr_ready'].includes(session.status) ? (
                <div className="mb-4 flex flex-col items-center rounded-[var(--radius)] bg-[var(--color-muted)] p-6">
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface)]">
                    <QrCode size={28} className="text-[var(--color-ink-muted)]" />
                  </div>
                  <p className="m-0 mb-2.5 text-center text-[0.8125rem] text-[var(--color-ink-secondary)]">
                    {session.status === 'qr_ready' ? t('sessions.qr.scanToConnect') : t('sessions.qr.preparing')}
                  </p>
                  <button
                    className="btn-primary py-1.5 px-3.5 text-[0.8125rem]"
                    onClick={() => handleShowQR(session.id)}
                    disabled={session.status !== 'qr_ready'}
                  >
                    <QrCode size={14} />
                    {session.status === 'qr_ready' ? t('sessions.qr.showQr') : t('sessions.qr.loading')}
                  </button>
                </div>
              ) : (
                <div className="mb-4 flex-1">
                  {[
                    [t('sessions.card.phone'), session.phone || '—', false],
                    [t('sessions.card.sessionId'), session.id.substring(0, 14), true],
                    [t('sessions.card.lastActive'), formatLastActive(session.lastActive), false],
                  ].map(([label, value, mono]) => (
                    <div key={String(label)} className="flex items-center justify-between border-b border-[var(--color-border)] py-2.5 last:border-none">
                      <span className="text-[0.7375rem] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">{label}</span>
                      <span className={`text-[0.8125rem] font-medium text-[var(--color-ink)] ${mono ? 'font-mono' : ''}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button className="btn-secondary flex-1 justify-center py-2 text-[0.8125rem]" onClick={() => setSelectedSession(session)}>
                  <Eye size={14} />{t('sessions.actions.view')}
                </button>
                {canWrite && (session.status === 'created' || session.status === 'idle' || session.status === 'disconnected') ? (
                  <button className="btn-secondary flex-1 justify-center py-2 text-[0.8125rem]" onClick={() => handleStart(session.id)}>
                    <Play size={14} />{t('sessions.actions.start')}
                  </button>
                ) : canWrite && ['ready','initializing','connecting','qr_ready'].includes(session.status) ? (
                  <button className="btn-secondary flex-1 justify-center py-2 text-[0.8125rem]" onClick={() => handleStop(session.id)}>
                    <Square size={14} />{t('sessions.actions.stop')}
                  </button>
                ) : canWrite ? (
                  <button className="btn-secondary flex-1 justify-center py-2 text-[0.8125rem]" onClick={() => handleStart(session.id)}>
                    <RefreshCw size={14} />{t('sessions.actions.reconnect')}
                  </button>
                ) : null}
                {canWrite && (
                  <button
                    className="icon-btn border-none text-[var(--color-ink-muted)] hover:bg-red-50 hover:border-red-200 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    onClick={() => setDeleteConfirmId(session.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
