import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { messageApi } from '../services/api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import { useSessionsQuery, useSessionGroupsQuery } from '../hooks/queries';
import { PageHeader } from '../components/PageHeader';

interface ApiResponse {
  success: boolean;
  messageId?: string;
  timestamp: string;
  error?: string;
}

const messageTypes = ['text', 'image', 'video', 'audio', 'document'] as const;

export function MessageTester() {
  const { t } = useTranslation();
  useDocumentTitle(t('messageTester.title'));
  const { canWrite } = useRole();
  const { data: allSessions = [], isLoading: loadingSessions } = useSessionsQuery();
  const sessions = allSessions.filter(s => s.status === 'ready');
  const [session, setSession] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientType, setRecipientType] = useState<'personal' | 'group'>('personal');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [messageType, setMessageType] = useState<typeof messageTypes[number]>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const { data: groups = [], isLoading: loadingGroups } = useSessionGroupsQuery(
    session,
    recipientType === 'group',
  );

  useEffect(() => {
    if (sessions.length > 0 && !session) {
      setSession(sessions[0].id);
    }
  }, [sessions, session]);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id);
    }
    if (recipientType !== 'group') {
      setSelectedGroup('');
    }
  }, [groups, selectedGroup, recipientType]);

  const handleSend = async () => {
    const targetId = recipientType === 'group' ? selectedGroup : recipient;
    if (!session || !targetId) return;
    setIsLoading(true);
    setResponse(null);

    const chatId = recipientType === 'group' ? targetId : targetId.replace(/[^0-9]/g, '') + '@c.us';

    try {
      let result;
      if (messageType === 'text') {
        result = await messageApi.sendText(session, chatId, content);
      } else if (messageType === 'image') {
        result = await messageApi.sendImage(session, chatId, mediaUrl, content);
      } else if (messageType === 'video') {
        result = await messageApi.sendVideo(session, chatId, mediaUrl, content);
      } else if (messageType === 'audio') {
        result = await messageApi.sendAudio(session, chatId, mediaUrl);
      } else {
        result = await messageApi.sendDocument(session, chatId, mediaUrl, content);
      }

      setResponse({
        success: !!result.messageId,
        messageId: result.messageId,
        timestamp: result.timestamp ? new Date(result.timestamp * 1000).toISOString() : new Date().toISOString(),
      });
    } catch (err) {
      setResponse({
        success: false,
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : t('messageTester.sendFailed'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingSessions) {
    return (
      <div className="flex min-h-[400px] w-full items-center justify-center p-8">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full p-8">
      <PageHeader title={t('messageTester.title')} subtitle={t('messageTester.subtitle')} />

      <div className="grid grid-cols-2 gap-6 max-[1000px]:grid-cols-1">
        {/* Compose Panel */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <h2 className="mb-6 text-lg font-bold text-ink">{t('messageTester.compose')}</h2>

          <div className="mb-5">
            <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">{t('messageTester.session')}</label>
            <select
              className="w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
              value={session}
              onChange={e => setSession(e.target.value)}
            >
              {sessions.length === 0 && <option value="">{t('messageTester.noReadySessions')}</option>}
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone || t('messageTester.sessionOptionPhoneNone')})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">{t('messageTester.recipientType')}</label>
            <div className="flex overflow-hidden rounded-(--radius) border border-border">
              <button
                className={`flex-1 cursor-pointer border-r border-border px-4 py-[0.625rem] text-sm font-medium transition-all ${
                  recipientType === 'personal' ? 'bg-primary text-white' : 'bg-surface text-ink-secondary'
                }`}
                onClick={() => setRecipientType('personal')}
              >
                {t('messageTester.personal')}
              </button>
              <button
                className={`flex-1 cursor-pointer px-4 py-[0.625rem] text-sm font-medium transition-all ${
                  recipientType === 'group' ? 'bg-primary text-white' : 'bg-surface text-ink-secondary'
                }`}
                onClick={() => setRecipientType('group')}
              >
                {t('messageTester.group')}
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">
              {recipientType === 'group' ? t('messageTester.selectGroup') : t('messageTester.recipientPhone')}
            </label>
            {recipientType === 'group' ? (
              <>
                <select
                  className="w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                  disabled={loadingGroups || groups.length === 0}
                >
                  {loadingGroups && <option value="">{t('messageTester.loadingGroups')}</option>}
                  {!loadingGroups && groups.length === 0 && <option value="">{t('messageTester.noGroupsFound')}</option>}
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-ink-muted">{t('messageTester.selectGroupHint')}</span>
              </>
            ) : (
              <>
                <input
                  type="text"
                  className="w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder="+62812345678"
                />
                <span className="mt-1 block text-xs text-ink-muted">{t('messageTester.phoneHint')}</span>
              </>
            )}
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">{t('messageTester.messageType')}</label>
            <div className="flex overflow-hidden rounded-(--radius) border border-border">
              {messageTypes.map((type, i) => (
                <button
                  key={type}
                  className={`flex-1 cursor-pointer px-4 py-[0.625rem] text-sm font-medium transition-all ${
                    i < messageTypes.length - 1 ? 'border-r border-border' : ''
                  } ${
                    messageType === type ? 'bg-primary text-white' : 'bg-surface text-ink-secondary'
                  }`}
                  onClick={() => setMessageType(type)}
                >
                  {t(`messageTester.types.${type}`)}
                </button>
              ))}
            </div>
          </div>

          {messageType === 'text' ? (
            <div className="mb-5">
              <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">{t('messageTester.messageContent')}</label>
              <textarea
                className="min-h-[100px] w-full resize-y rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={t('messageTester.messagePlaceholder')}
                rows={5}
              />
            </div>
          ) : (
            <>
              <div className="mb-5">
                <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">{t('messageTester.mediaUrl')}</label>
                <input
                  type="text"
                  className="w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/file.jpg"
                />
              </div>
              {messageType !== 'audio' && (
                <div className="mb-5">
                  <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-secondary">
                    {messageType === 'document' ? t('messageTester.filename') : t('messageTester.caption')} ({t('common.optional')})
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-(--radius) border border-border bg-surface px-4 py-3 text-[0.9375rem] text-ink transition-all focus:border-primary focus:outline-none"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder={messageType === 'document' ? t('messageTester.filenamePlaceholder') : t('messageTester.captionPlaceholder')}
                  />
                </div>
              )}
            </>
          )}

          <button
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-(--radius) bg-primary px-6 py-[0.875rem] text-base font-semibold text-white transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleSend}
            disabled={!canWrite || isLoading || !session || (recipientType === 'group' ? !selectedGroup : !recipient)}
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {isLoading ? t('messageTester.sending') : canWrite ? t('messageTester.send') : t('messageTester.viewOnly')}
          </button>
        </div>

        {/* Response Panel */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <h2 className="mb-6 text-lg font-bold text-ink">{t('messageTester.responseTitle')}</h2>

          {response ? (
            <>
              <div className={`mb-4 flex items-center gap-2 rounded-(--radius) px-4 py-3 text-[0.9375rem] font-semibold ${
                response.success ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-600'
              }`}>
                {response.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                <span>{response.success ? t('messageTester.successLabel') : t('messageTester.failedLabel')}</span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between border-b border-border py-[0.625rem]">
                  <span className="text-sm text-ink-secondary">{t('messageTester.response.timestamp')}</span>
                  <span className="text-sm font-medium text-ink">{response.timestamp}</span>
                </div>
                {response.messageId && (
                  <div className="flex justify-between border-b border-border py-[0.625rem]">
                    <span className="text-sm text-ink-secondary">{t('messageTester.response.messageId')}</span>
                    <span className="font-mono text-sm font-medium text-ink">{response.messageId}</span>
                  </div>
                )}
                {response.error && (
                  <div className="flex justify-between border-b border-border py-[0.625rem]">
                    <span className="text-sm text-ink-secondary">{t('messageTester.response.error')}</span>
                    <span className="text-sm font-medium text-red-600">{response.error}</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-(--radius) bg-slate-800 p-4">
                <pre className="m-0 font-['JetBrains_Mono',monospace] text-xs text-slate-200 whitespace-pre-wrap">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-(--radius) bg-muted">
              <p className="m-0 text-ink-muted">{t('messageTester.responseEmpty')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
