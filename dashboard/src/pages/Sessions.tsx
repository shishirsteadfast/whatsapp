import { useState, useEffect, useCallback, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Plus, QrCode, RefreshCw, Trash2, Eye, Loader2, Play, Square, X, Search, Filter } from 'lucide-react';
import { sessionApi, type Session } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/Toast';
import { useWebSocket } from '../hooks/useWebSocket';
import { useRole } from '../hooks/useRole';
import { PageHeader } from '../components/PageHeader';

export function Sessions() {
  const { t } = useTranslation();
  useDocumentTitle(t('sessions.title'));
  const toast = useToast();
  const { canWrite } = useRole();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [qrData, setQrData] = useState<{ sessionId: string; sessionName: string; qrCode: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useWebSocket({
    onSessionStatus: useCallback(
      (event: { sessionId: string; status: string }) => {
        setSessions(prev =>
          prev.map(s => (s.id === event.sessionId ? { ...s, status: event.status as Session['status'] } : s)),
        );
        if (event.status === 'ready') {
          toast.success(t('sessions.toasts.readyTitle'), t('sessions.toasts.readyDesc'));
        } else if (event.status === 'disconnected') {
          toast.warning(t('sessions.toasts.disconnectedTitle'), t('sessions.toasts.disconnectedDesc'));
        }
      },
      [toast, t],
    ),
  });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionApi.list();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.create.errorDefault'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  const qrRefreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentSessionName = useRef<string>('');

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
      const newSession = await sessionApi.create(newSessionName);
      setSessions([...sessions, newSession]);
      setNewSessionName('');
      setShowCreateModal(false);
      toast.success(t('sessions.create.successTitle'), t('sessions.create.successDesc', { name: newSession.name }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('sessions.create.errorDefault');
      setError(msg);
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
    if (session && ['initializing', 'connecting', 'qr_ready'].includes(session.status)) { handleShowQR(id); return; }
    try {
      await sessionApi.start(id);
      setSessions(sessions.map(s => (s.id === id ? { ...s, status: 'connecting' } : s)));
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
      setSessions(sessions.map(s => (s.id === id ? { ...s, status: 'disconnected' } : s)));
      if (qrData?.sessionId === id) setQrData(null);
    } catch { fetchSessions(); }
  };

  const formatLastActive = (date?: string) => {
    if (!date) return t('common.never');
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return t('common.justNow');
    if (diff < 3600000) return t('common.minAgo', { count: Math.floor(diff / 60000) });
    return new Date(date).toLocaleDateString();
  };

  const formatStatus = (status: string) => t(`sessionStatus.${status}`, { defaultValue: status });

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && s.status === 'ready') || (statusFilter === 'inactive' && ['created', 'idle', 'disconnected'].includes(s.status)) || (statusFilter === 'connecting' && ['initializing', 'connecting', 'qr_ready'].includes(s.status));
    return matchesSearch && matchesStatus;
  });

  const pillColor = (status: string) => {
    if (status === 'ready') return 'bg-green-100 text-green-700';
    if (status === 'connecting' || status === 'initializing') return 'bg-amber-100 text-amber-600';
    if (status === 'qr_ready') return 'bg-blue-100 text-blue-600';
    if (status === 'disconnected') return 'bg-red-100 text-red-600';
    return 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (<div className="flex min-h-[400px] w-full items-center justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>);
  }

  return (
    <div className="w-full p-8 box-border max-sm:p-4">
      <PageHeader
        title={t('sessions.title')}
        subtitle={t('sessions.subtitle')}
        actions={canWrite && (
          <button className="btn-primary inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border-none bg-primary px-5 py-3 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-primary-hover" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />{t('sessions.newSession')}
          </button>
        )}
      />

      <div className="mb-6 flex gap-4 max-sm:flex-col max-sm:gap-3">
        <div className="flex max-w-[400px] flex-1 items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-4 py-3">
          <Search size={18} className="shrink-0 text-ink-muted" />
          <input type="text" placeholder={t('sessions.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 border-none bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-muted" />
        </div>
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-surface px-4">
          <Filter size={16} className="text-ink-muted" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="cursor-pointer border-none bg-transparent px-0 py-3 text-[0.9375rem] text-ink outline-none">
            <option value="all">{t('sessions.filter.all')}</option>
            <option value="active">{t('sessions.filter.active')}</option>
            <option value="inactive">{t('sessions.filter.inactive')}</option>
            <option value="connecting">{t('sessions.filter.connecting')}</option>
          </select>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-600">{error}</div>}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[1000] flex animate-[fadeIn_0.2s_ease] items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="w-[90%] max-w-[480px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">{t('sessions.create.title')}</h2>
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-ink-muted transition-colors hover:bg-muted hover:text-ink" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <div className="px-6 py-6">
              <label className="mb-2 block text-sm font-semibold text-ink-secondary">{t('sessions.create.label')}</label>
              <input type="text" placeholder={t('sessions.create.placeholder')} value={newSessionName}
                onChange={e => setNewSessionName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full rounded-[var(--radius)] border border-border bg-muted px-4 py-3.5 text-[0.9375rem] text-ink transition-all placeholder:text-ink-muted focus:border-primary focus:bg-surface focus:shadow-[0_0_0_3px_rgba(37,211,102,0.1)] focus:outline-none box-border"
              />
              <p className="mt-2 text-xs text-ink-muted"><Trans i18nKey="sessions.create.hint" components={{ code: <code /> }} /></p>
              {newSessionName && !/^[a-z0-9-]+$/.test(newSessionName) && <p className="mt-2 text-xs font-medium text-red-600">{t('sessions.create.invalidChars')}</p>}
              {newSessionName && newSessionName.length > 50 && <p className="mt-2 text-xs font-medium text-red-600">{t('sessions.create.tooLong', { length: newSessionName.length })}</p>}
              {newSessionName && /^[a-z0-9-]+$/.test(newSessionName) && newSessionName.length <= 50 && sessions.some(s => s.name === newSessionName) && <p className="mt-2 text-xs font-medium text-red-600">{t('sessions.create.duplicate')}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-4">
              <button className="cursor-pointer rounded-[var(--radius)] border border-border bg-muted px-5 py-3 text-[0.9375rem] font-semibold text-ink-secondary transition-colors hover:border-ink-muted hover:bg-surface hover:text-ink" onClick={() => setShowCreateModal(false)}>{t('common.cancel')}</button>
              <button className="btn-primary inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border-none bg-primary px-5 py-3 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60" onClick={handleCreate} disabled={creating || !newSessionName.trim() || !/^[a-z0-9-]+$/.test(newSessionName) || newSessionName.length > 50 || sessions.some(s => s.name === newSessionName)}>
                {creating ? <Loader2 className="animate-spin" size={16} /> : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrData && (
        <div className="fixed inset-0 z-[1000] flex animate-[fadeIn_0.2s_ease] items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setQrData(null)}>
          <div className="w-[90%] max-w-[480px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-xl font-bold text-ink">{t('sessions.qr.title')}</h2>
                <span className="text-sm font-medium text-ink-muted">{qrData.sessionName}</span>
              </div>
              <button className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-muted text-ink-secondary transition-colors hover:border-red-200 hover:bg-red-100 hover:text-red-600" onClick={() => setQrData(null)} aria-label={t('common.close')}>
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6 text-center">
              {qrData.qrCode ? (
                <>
                  <img src={qrData.qrCode} alt="QR" className="mx-auto max-w-[280px] rounded-xl" />
                  <div className="mt-6 rounded-xl bg-muted px-5 py-4 text-left">
                    <p className="m-0 border-b border-border py-2 text-sm text-ink-secondary last:border-b-0"><Trans i18nKey="sessions.qr.step1" components={{ strong: <strong className="text-ink" /> }} /></p>
                    <p className="m-0 border-b border-border py-2 text-sm text-ink-secondary last:border-b-0"><Trans i18nKey="sessions.qr.step2" components={{ strong: <strong className="text-ink" /> }} /></p>
                    <p className="m-0 py-2 text-sm text-ink-secondary"><Trans i18nKey="sessions.qr.step3" components={{ strong: <strong className="text-ink" /> }} /></p>
                  </div>
                  <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-muted">
                    <RefreshCw size={14} className="animate-[spin_2s_linear_infinite]" /> {t('sessions.qr.autoRefresh')}
                  </p>
                </>
              ) : (
                <div className="p-8">
                  <Loader2 className="animate-spin" size={48} className="mx-auto" />
                  <p className="mt-4 text-ink-secondary">{t('sessions.qr.generating')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-[1000] flex animate-[fadeIn_0.2s_ease] items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedSession(null)}>
          <div className="w-[90%] max-w-[480px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">{t('sessions.details.title')}</h2>
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-ink-muted transition-colors hover:bg-muted hover:text-ink" onClick={() => setSelectedSession(null)}><X size={20} /></button>
            </div>
            <div className="px-6 py-6">
              <div className="grid gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('sessions.details.name')}</span>
                  <span className="text-[0.9375rem] text-ink break-all">{selectedSession.name}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('sessions.details.status')}</span>
                  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${pillColor(selectedSession.status)} before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current`}>{formatStatus(selectedSession.status)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('sessions.details.sessionId')}</span>
                  <span className="rounded-md bg-muted px-2 py-2 text-xs text-ink break-all font-mono">{selectedSession.id}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('sessions.details.phone')}</span>
                  <span className="text-[0.9375rem] text-ink break-all">{selectedSession.phone || t('sessions.details.phoneNone')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('sessions.details.created')}</span>
                  <span className="text-[0.9375rem] text-ink">{new Date(selectedSession.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('sessions.details.lastActive')}</span>
                  <span className="text-[0.9375rem] text-ink">{selectedSession.lastActive ? new Date(selectedSession.lastActive).toLocaleString() : t('common.never')}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-4">
              <button className="cursor-pointer rounded-[var(--radius)] border border-border bg-muted px-5 py-3 text-[0.9375rem] font-semibold text-ink-secondary transition-colors hover:border-ink-muted hover:bg-surface hover:text-ink" onClick={() => setSelectedSession(null)}>{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[1000] flex animate-[fadeIn_0.2s_ease] items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-[90%] max-w-[400px] animate-[slideUp_0.3s_ease] overflow-hidden rounded-2xl bg-surface shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
              <h2 className="m-0 text-xl font-bold text-ink">{t('sessions.delete.title')}</h2>
              <button className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-ink-muted transition-colors hover:bg-muted hover:text-ink" onClick={() => setDeleteConfirmId(null)}><X size={20} /></button>
            </div>
            <div className="px-6 py-6">
              <p className="m-0 mb-2"><Trans i18nKey="sessions.delete.message" values={{ name: sessions.find(s => s.id === deleteConfirmId)?.name }} components={{ strong: <strong /> }} /></p>
              <p className="text-sm text-ink-muted">{t('sessions.delete.warning')}</p>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-4">
              <button className="cursor-pointer rounded-[var(--radius)] border border-border bg-muted px-5 py-3 text-[0.9375rem] font-semibold text-ink-secondary transition-colors hover:border-ink-muted hover:bg-surface hover:text-ink" onClick={() => setDeleteConfirmId(null)}>{t('common.cancel')}</button>
              <button className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border-none bg-red-600 px-5 py-3 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-red-700" onClick={() => handleDelete(deleteConfirmId)}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Session Grid */}
      <div className="grid w-full grid-cols-4 gap-6 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {filteredSessions.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-16 text-center text-ink-muted">
            <QrCode size={48} className="mb-4 opacity-50" />
            <h3 className="m-0 mb-2 text-lg font-semibold text-ink-secondary">{t('sessions.empty.title')}</h3>
            <p className="m-0 text-sm">{t('sessions.empty.description')}</p>
          </div>
        ) : (
          filteredSessions.map(session => (
            <div key={session.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="m-0 max-w-[180px] truncate text-base font-semibold text-ink" title={session.name}>{session.name}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pillColor(session.status)}`}>{formatStatus(session.status)}</span>
              </div>

              {session.status === 'initializing' || session.status === 'connecting' || session.status === 'qr_ready' ? (
                <div className="mb-4 flex flex-col items-center justify-center rounded-[var(--radius)] bg-muted p-8">
                  <QrCode size={80} className="mb-3 text-ink-muted" />
                  <p className="m-0 text-sm text-ink-secondary">{session.status === 'qr_ready' ? t('sessions.qr.scanToConnect') : t('sessions.qr.preparing')}</p>
                  <button className="mt-3 cursor-pointer rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50" onClick={() => handleShowQR(session.id)} disabled={session.status !== 'qr_ready'}>
                    {session.status === 'qr_ready' ? t('sessions.qr.showQr') : t('sessions.qr.loading')}
                  </button>
                </div>
              ) : (
                <div className="mb-4">
                  {[['phone', t('sessions.card.phone'), session.phone || '—'], ['sessionId', t('sessions.card.sessionId'), session.id.substring(0, 12)], ['lastActive', t('sessions.card.lastActive'), formatLastActive(session.lastActive)]].map(([key, label, value]) => (
                    <div key={key} className="flex items-center justify-between border-b border-border px-0 py-2 last:border-b-0">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink-secondary">{label}</span>
                      <span className={`text-xs font-medium text-ink ${key === 'sessionId' ? 'font-mono' : ''}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface hover:text-ink" onClick={() => setSelectedSession(session)}>
                  <Eye size={16} />{t('sessions.actions.view')}</button>
                {canWrite && (session.status === 'created' || session.status === 'idle' || session.status === 'disconnected') ? (
                  <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface hover:text-ink" onClick={() => handleStart(session.id)}>
                    <Play size={16} />{t('sessions.actions.start')}</button>
                ) : canWrite && ['ready', 'initializing', 'connecting', 'qr_ready'].includes(session.status) ? (
                  <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface hover:text-ink" onClick={() => handleStop(session.id)}>
                    <Square size={16} />{t('sessions.actions.stop')}</button>
                ) : canWrite ? (
                  <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface hover:text-ink" onClick={() => handleStart(session.id)}>
                    <RefreshCw size={16} />{t('sessions.actions.reconnect')}</button>
                ) : null}
                {canWrite && (
                  <button className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-100" onClick={() => setDeleteConfirmId(session.id)}>
                    <Trash2 size={16} />{t('sessions.actions.delete')}</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
