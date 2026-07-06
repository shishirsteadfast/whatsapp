import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Image, Video, FileText, Music, MapPin, UserCircle, UserPlus,
  Contact as ContactIcon, Users, Phone, Search, X, Check, ChevronDown,
  Eye, EyeOff, AlertTriangle, Loader2,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useRole } from '../hooks/useRole';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { PageHeader } from '../components/PageHeader';
import {
  useSessionsQuery,
  useSessionGroupsQuery,
  useContactsQuery,
} from '../hooks/queries';
import { messageApi } from '../services/api';
import { IPhonePreview, type WhatsAppPreviewData, type WhatsAppPreviewMessage } from '../components/iPhonePreview';
import type { Contact } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────

type RecipientTab = 'contacts' | 'groups' | 'manual';
type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';

interface Recipient {
  id: string;
  name: string;
  identifier: string; // phone number or group ID
  type: 'contact' | 'group' | 'manual';
}

interface AttachOption {
  type: MessageType;
  icon: typeof Image;
  focusId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function formatPhoneForChatId(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return `${cleaned}@c.us`;
}

const ATTACH_OPTIONS: AttachOption[] = [
  { type: 'image', icon: Image, focusId: 'composer-media-url' },
  { type: 'video', icon: Video, focusId: 'composer-media-url' },
  { type: 'audio', icon: Music, focusId: 'composer-media-url' },
  { type: 'document', icon: FileText, focusId: 'composer-media-url' },
  { type: 'location', icon: MapPin, focusId: 'composer-latitude' },
  { type: 'contact', icon: UserCircle, focusId: 'composer-contact-name' },
];

const TYPE_ICON: Record<MessageType, typeof Image> = {
  text: Image, image: Image, video: Video, audio: Music, document: FileText, location: MapPin, contact: UserCircle,
};

// ─── Recipient Chip ───────────────────────────────────────────────────

function RecipientChip({ recipient, onRemove }: { recipient: Recipient; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      {recipient.name || recipient.identifier}
      <button
        onClick={onRemove}
        className="flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full border-none bg-primary/20 p-0 text-primary transition-colors hover:bg-primary/30"
      >
        <X size={10} strokeWidth={3} />
      </button>
    </span>
  );
}

// ─── Labeled Input (shared) ─────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  const { t } = useTranslation();
  return (
    <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-ink-muted">
      {children}
      {optional && <span className="ml-1 font-normal lowercase text-ink-muted">({t('common.optional')})</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-ink-muted focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-dim)]';

// ─── Main Composer Page ───────────────────────────────────────────────

export function Composer() {
  const { t } = useTranslation();
  useDocumentTitle(t('composer.title'));
  const toast = useToast();
  const { canWrite } = useRole();
  const { resolvedTheme } = useTheme();

  // ── Session ──
  const { data: allSessions = [], isLoading: loadingSessions } = useSessionsQuery();
  const sessions = useMemo(() => allSessions.filter(s => s.status === 'ready'), [allSessions]);
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    if (sessions.length > 0 && !sessionId) setSessionId(sessions[0].id);
  }, [sessions, sessionId]);

  // ── Preview panel visibility ──
  const [showPreview, setShowPreview] = useState(true);

  // ── Recipients ──
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);
  const [recipientTab, setRecipientTab] = useState<RecipientTab>('contacts');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [manualPhone, setManualPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: savedContacts = [] } = useContactsQuery();
  const { data: waGroups = [], isLoading: loadingGroups } = useSessionGroupsQuery(sessionId, recipientTab === 'groups' && !!sessionId);

  // Pagination for the contacts list
  const [contactsLimit, setContactsLimit] = useState(10);
  useEffect(() => setContactsLimit(10), [recipientTab, searchQuery]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return savedContacts;
    return savedContacts.filter(
      c => (c.fullName ?? '').toLowerCase().includes(q) || `${c.countryCode}${c.phone}`.includes(q),
    );
  }, [savedContacts, searchQuery]);

  const displayedContacts = useMemo(() => filteredContacts.slice(0, contactsLimit), [filteredContacts, contactsLimit]);
  const hasMoreContacts = filteredContacts.length > contactsLimit;

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return waGroups;
    return waGroups.filter(g => g.name.toLowerCase().includes(q));
  }, [waGroups, searchQuery]);

  const isSelected = useCallback((id: string) => selectedRecipients.some(r => r.id === id), [selectedRecipients]);

  const toggleContact = useCallback((contact: Contact) => {
    const id = `contact-${contact.id}`;
    setSelectedRecipients(prev =>
      prev.some(r => r.id === id)
        ? prev.filter(r => r.id !== id)
        : [...prev, { id, name: contact.fullName || `${contact.countryCode}${contact.phone}`, identifier: `${contact.countryCode}${contact.phone}`, type: 'contact' }],
    );
  }, []);

  const toggleGroup = useCallback((group: { id: string; name: string }) => {
    const id = `group-${group.id}`;
    setSelectedRecipients(prev =>
      prev.some(r => r.id === id) ? prev.filter(r => r.id !== id) : [...prev, { id, name: group.name, identifier: group.id, type: 'group' }],
    );
  }, []);

  const addManualRecipient = useCallback(() => {
    const cleaned = manualPhone.replace(/[^0-9+]/g, '');
    if (!cleaned) return;
    const id = `manual-${cleaned}`;
    if (isSelected(id)) return;
    setSelectedRecipients(prev => [...prev, { id, name: cleaned, identifier: formatPhoneForChatId(cleaned), type: 'manual' }]);
    setManualPhone('');
  }, [manualPhone, isSelected]);

  const removeRecipient = useCallback((id: string) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== id));
  }, []);

  // ── Message Composition ──
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [textContent, setTextContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [fileName, setFileName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const resetTypeFields = () => {
    setMediaUrl(''); setCaption(''); setFileName('');
    setLatitude(''); setLongitude('');
    setContactName(''); setContactPhone('');
  };

  const selectMessageType = (option: AttachOption) => {
    if (option.type !== messageType) resetTypeFields();
    setMessageType(option.type);
    setShowAttachMenu(false);
    setTimeout(() => document.getElementById(option.focusId)?.focus(), 100);
  };

  const clearAttachment = () => {
    resetTypeFields();
    setMessageType('text');
  };

  // ── Sending state ──
  const [isSending, setIsSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ total: number; sent: number; failed: number } | null>(null);

  // ── Live Preview State ──
  const [previewData, setPreviewData] = useState<WhatsAppPreviewData>({ contactName: 'Contact', isOnline: false, messages: [] });

  useEffect(() => {
    const firstRecipient = selectedRecipients[0];
    const name = firstRecipient?.name || 'Contact';
    let previewMessages: WhatsAppPreviewMessage[] = [];

    if (textContent || mediaUrl || contactName || (latitude && longitude)) {
      previewMessages = [{
        id: 'preview',
        type: messageType,
        content: messageType === 'text' ? textContent : messageType === 'location' ? (caption || '📍 Location') : caption || '',
        caption: messageType === 'image' || messageType === 'video' ? caption : undefined,
        mediaUrl: (messageType === 'image' || messageType === 'video' || messageType === 'audio') ? mediaUrl : undefined,
        fileName: messageType === 'document' ? fileName : messageType === 'audio' ? fileName : undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        contactName: messageType === 'contact' ? contactName : undefined,
        contactNumber: messageType === 'contact' ? contactPhone : undefined,
        timestamp: new Date(),
        status: 'sent',
        isOutgoing: true,
      }];
    }

    setPreviewData({ contactName: name, isOnline: selectedRecipients.length > 0, messages: previewMessages });
  }, [textContent, mediaUrl, caption, fileName, latitude, longitude, contactName, contactPhone, messageType, selectedRecipients]);

  // ── Send Logic ──
  const handleSend = async () => {
    if (!sessionId || selectedRecipients.length === 0 || isSending) return;
    if (messageType === 'text' && !textContent.trim()) return;
    if ((messageType === 'image' || messageType === 'video' || messageType === 'audio' || messageType === 'document') && !mediaUrl.trim()) return;
    if (messageType === 'location' && (!latitude || !longitude)) return;
    if (messageType === 'contact' && (!contactName || !contactPhone)) return;

    setIsSending(true);
    setBatchProgress({ total: selectedRecipients.length, sent: 0, failed: 0 });

    const allMessages: WhatsAppPreviewMessage[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of selectedRecipients) {
      const chatId = recipient.type === 'group' ? recipient.identifier : formatPhoneForChatId(recipient.identifier);

      try {
        let result: { messageId: string; timestamp: number };

        switch (messageType) {
          case 'text':
            result = await messageApi.sendText(sessionId, chatId, textContent);
            break;
          case 'image':
            result = await messageApi.sendImage(sessionId, chatId, mediaUrl, caption || undefined);
            break;
          case 'video':
            result = await messageApi.sendVideo(sessionId, chatId, mediaUrl, caption || undefined);
            break;
          case 'audio':
            result = await messageApi.sendAudio(sessionId, chatId, mediaUrl);
            break;
          case 'document':
            result = await messageApi.sendDocument(sessionId, chatId, mediaUrl, fileName || undefined);
            break;
          case 'location':
            result = await messageApi.sendLocation(sessionId, chatId, parseFloat(latitude), parseFloat(longitude), caption || undefined);
            break;
          case 'contact':
            result = await messageApi.sendContact(sessionId, chatId, contactName, contactPhone);
            break;
          default:
            throw new Error(`Unknown message type: ${messageType}`);
        }

        allMessages.push({
          id: result.messageId || generateId(),
          type: messageType,
          content: messageType === 'text' ? textContent : messageType === 'location' ? (caption || '📍 Location') : caption || '',
          caption: (messageType === 'image' || messageType === 'video') ? caption : undefined,
          mediaUrl: (messageType === 'image' || messageType === 'video' || messageType === 'audio') ? mediaUrl : undefined,
          fileName: messageType === 'document' ? fileName : undefined,
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
          contactName: messageType === 'contact' ? contactName : undefined,
          contactNumber: messageType === 'contact' ? contactPhone : undefined,
          timestamp: result.timestamp ? new Date(result.timestamp * 1000) : new Date(),
          status: 'sent',
          isOutgoing: true,
        });
        sentCount++;
      } catch {
        failedCount++;
        allMessages.push({
          id: `failed-${generateId()}`,
          type: messageType,
          content: messageType === 'text' ? textContent : caption || 'Message failed to send',
          caption: (messageType === 'image' || messageType === 'video') ? caption : undefined,
          mediaUrl: (messageType === 'image' || messageType === 'video' || messageType === 'audio') ? mediaUrl : undefined,
          fileName: messageType === 'document' ? fileName : undefined,
          timestamp: new Date(),
          status: 'sent',
          isOutgoing: true,
        });
      }

      setBatchProgress({ total: selectedRecipients.length, sent: sentCount, failed: failedCount });
    }

    setPreviewData(prev => ({ ...prev, messages: allMessages.length > 0 ? allMessages : prev.messages }));

    if (failedCount === 0) {
      toast.success(t('composer.sentSuccess', { count: sentCount }));
      resetTypeFields();
      setTextContent('');
      setMessageType('text');
    } else {
      toast.error(t('composer.sentPartial', { sent: sentCount, failed: failedCount }));
    }

    setIsSending(false);
    setBatchProgress(null);
  };

  const canSend = useMemo(() => {
    if (!canWrite || isSending || !sessionId || selectedRecipients.length === 0) return false;
    switch (messageType) {
      case 'text': return textContent.trim().length > 0;
      case 'image': case 'video': case 'audio': case 'document': return mediaUrl.trim().length > 0;
      case 'location': return latitude !== '' && longitude !== '';
      case 'contact': return contactName.trim().length > 0 && contactPhone.trim().length > 0;
      default: return false;
    }
  }, [canWrite, isSending, sessionId, selectedRecipients, messageType, textContent, mediaUrl, latitude, longitude, contactName, contactPhone]);

  const RECIPIENT_TABS: { key: RecipientTab; labelKey: string; icon: typeof Users }[] = [
    { key: 'contacts', labelKey: 'composer.savedContacts', icon: ContactIcon },
    { key: 'groups', labelKey: 'composer.groups', icon: Users },
    { key: 'manual', labelKey: 'composer.newNumber', icon: Phone },
  ];

  const TypeIcon = TYPE_ICON[messageType];

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title={t('composer.title')}
        subtitle={t('composer.subtitle')}
        actions={
          <button className="btn-secondary" onClick={() => setShowPreview(v => !v)}>
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            <span className="max-sm:hidden">{showPreview ? t('composer.hidePreview') : t('composer.showPreview')}</span>
          </button>
        }
      />

      {!loadingSessions && sessions.length === 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertTriangle size={15} className="shrink-0" />
          <span className="flex-1">{t('composer.noReadySessions')}</span>
          <Link to="/sessions" className="font-semibold underline">{t('nav.sessions')}</Link>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex h-[calc(100vh-12rem)] max-sm:h-auto max-sm:min-h-screen overflow-hidden rounded-xl border border-border bg-surface shadow-xs max-sm:flex-col">
        {/* ── LEFT PANEL: Composer ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Toolbar: session + recipients */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 shrink-0">
            <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${sessionId ? 'bg-primary' : 'bg-ink-muted'}`} />
              {loadingSessions ? (
                <Loader2 size={13} className="animate-spin text-ink-muted" />
              ) : (
                <select
                  className="max-w-[160px] cursor-pointer truncate border-none bg-transparent text-sm font-medium text-ink outline-none"
                  value={sessionId}
                  onChange={e => setSessionId(e.target.value)}
                  disabled={sessions.length === 0}
                >
                  {sessions.length === 0 && <option value="">{t('composer.noReadySessions')}</option>}
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.phone ? ` (${s.phone})` : ''}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="h-5 w-px shrink-0 bg-border" />

            {/* Recipients picker trigger */}
            <div className="relative">
              <button
                onClick={() => setRecipientPickerOpen(v => !v)}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                  recipientPickerOpen || selectedRecipients.length > 0
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-ink-secondary hover:bg-muted'
                }`}
              >
                <Users size={14} />
                {selectedRecipients.length === 0 ? t('composer.addRecipients') : t('composer.selected', { count: selectedRecipients.length })}
                <ChevronDown size={13} className={`transition-transform ${recipientPickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {recipientPickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setRecipientPickerOpen(false)} />
                  <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(360px,90vw)] overflow-hidden rounded-xl border border-border bg-surface shadow-xl animate-[dropdown-appear_0.15s_ease]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                      <span className="text-sm font-semibold text-ink">{t('composer.recipients')}</span>
                      <button className="icon-btn h-7 w-7 border-none" onClick={() => setRecipientPickerOpen(false)}>
                        <X size={14} />
                      </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-border">
                      {RECIPIENT_TABS.map(({ key, labelKey, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => { setRecipientTab(key); setSearchQuery(''); }}
                          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-semibold transition-all ${
                            recipientTab === key ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink-secondary'
                          }`}
                        >
                          <Icon size={13} />
                          {t(labelKey)}
                        </button>
                      ))}
                    </div>

                    {/* Search / manual input */}
                    <div className="px-4 py-2.5">
                      {recipientTab === 'manual' ? (
                        <div className="flex gap-2">
                          <input
                            ref={searchRef}
                            type="tel"
                            value={manualPhone}
                            onChange={e => setManualPhone(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addManualRecipient(); }}
                            placeholder="+62812345678"
                            className={inputClass + ' flex-1 py-2'}
                            autoFocus
                          />
                          <button
                            onClick={addManualRecipient}
                            disabled={!manualPhone.trim()}
                            className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-primary px-3 text-white transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <UserPlus size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="search-bar">
                          <Search size={14} />
                          <input
                            ref={searchRef}
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={recipientTab === 'contacts' ? t('composer.searchContacts') : t('composer.searchGroups')}
                            autoFocus
                          />
                          {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="cursor-pointer border-none bg-transparent p-0 text-ink-muted">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* List */}
                    <div className="max-h-[280px] overflow-y-auto border-t border-border">
                      {recipientTab === 'contacts' && (
                        filteredContacts.length === 0 ? (
                          <p className="px-4 py-6 text-center text-sm text-ink-muted">{searchQuery ? t('composer.noResults') : t('composer.noContacts')}</p>
                        ) : (
                          <>
                            {displayedContacts.map(contact => {
                              const id = `contact-${contact.id}`;
                              const selected = isSelected(id);
                              return (
                                <button
                                  key={contact.id}
                                  onClick={() => toggleContact(contact)}
                                  className={`flex w-full cursor-pointer items-center gap-3 border-none px-4 py-2 text-left text-sm transition-colors ${selected ? 'bg-primary/10' : 'bg-transparent hover:bg-muted'}`}
                                >
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? 'bg-primary text-white' : 'bg-muted text-ink-secondary'}`}>
                                    {(contact.fullName?.[0] || contact.phone[0] || '?').toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="m-0 truncate font-medium text-ink">{contact.fullName || `${contact.countryCode}${contact.phone}`}</p>
                                    <p className="m-0 text-[0.7rem] text-ink-muted">{contact.countryCode}{contact.phone}</p>
                                  </div>
                                  {selected && <Check size={16} className="shrink-0 text-primary" />}
                                </button>
                              );
                            })}
                            {hasMoreContacts && (
                              <button
                                onClick={() => setContactsLimit(prev => prev + 10)}
                                className="flex w-full cursor-pointer items-center justify-center gap-2 border-none border-t border-border bg-transparent px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-muted"
                              >
                                {t('composer.loadMore')} ({filteredContacts.length - contactsLimit})
                              </button>
                            )}
                          </>
                        )
                      )}

                      {recipientTab === 'groups' && (
                        loadingGroups ? (
                          <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
                        ) : filteredGroups.length === 0 ? (
                          <p className="px-4 py-6 text-center text-sm text-ink-muted">{searchQuery ? t('composer.noResults') : t('composer.noGroups')}</p>
                        ) : (
                          filteredGroups.map(group => {
                            const id = `group-${group.id}`;
                            const selected = isSelected(id);
                            return (
                              <button
                                key={group.id}
                                onClick={() => toggleGroup(group)}
                                className={`flex w-full cursor-pointer items-center gap-3 border-none px-4 py-2 text-left text-sm transition-colors ${selected ? 'bg-primary/10' : 'bg-transparent hover:bg-muted'}`}
                              >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? 'bg-primary text-white' : 'bg-muted text-ink-secondary'}`}>
                                  {(group.name?.[0] || 'G').toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="m-0 truncate font-medium text-ink">{group.name}</p>
                                </div>
                                {selected && <Check size={16} className="shrink-0 text-primary" />}
                              </button>
                            );
                          })
                        )
                      )}

                      {recipientTab === 'manual' && selectedRecipients.filter(r => r.type === 'manual').length > 0 && (
                        <div className="flex flex-col gap-1 p-2">
                          {selectedRecipients.filter(r => r.type === 'manual').map(r => (
                            <div key={r.id} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-ink hover:bg-muted">
                              <span>{r.name}</span>
                              <button onClick={() => removeRecipient(r.id)} className="icon-btn h-6 w-6 border-none"><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Selected recipients strip */}
          {selectedRecipients.length > 0 && (
            <div className="flex max-h-16 flex-wrap gap-1.5 overflow-y-auto border-b border-border px-4 py-2 shrink-0">
              {selectedRecipients.map(r => (
                <RecipientChip key={r.id} recipient={r} onRemove={() => removeRecipient(r.id)} />
              ))}
            </div>
          )}

          {/* Attachment mode badge */}
          {messageType !== 'text' && (
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/60 px-4 py-2">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <TypeIcon size={15} className="text-primary" />
                {t(`composer.types.${messageType}`)}
              </span>
              <button onClick={clearAttachment} className="icon-btn h-7 w-7 border-none" title={t('common.cancel')}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── Message Composer ── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Text — calm empty-state hint (live bubble is shown in the phone preview) */}
              {messageType === 'text' && (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-primary"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" /></svg>
                  </div>
                  <p className="m-0 max-w-[280px] text-sm text-ink-muted">{t('composer.messagePlaceholder')}</p>
                </div>
              )}

              {/* Image / Video / Audio / Document */}
              {(messageType === 'image' || messageType === 'video' || messageType === 'audio' || messageType === 'document') && (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>{t('composer.mediaUrl')} *</FieldLabel>
                    <input
                      id="composer-media-url"
                      type="url"
                      value={mediaUrl}
                      onChange={e => setMediaUrl(e.target.value)}
                      placeholder={t('composer.mediaUrlPlaceholder')}
                      className={inputClass}
                    />
                  </div>

                  {messageType === 'image' && mediaUrl && (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <div className="h-40 w-full bg-cover bg-center" style={{ backgroundImage: `url(${mediaUrl})` }} />
                    </div>
                  )}

                  {(messageType === 'image' || messageType === 'video') && (
                    <div>
                      <FieldLabel optional>{t('composer.caption')}</FieldLabel>
                      <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder={t('composer.captionPlaceholder')} className={inputClass} />
                    </div>
                  )}

                  {(messageType === 'document' || messageType === 'audio') && (
                    <div>
                      <FieldLabel optional>{t('composer.fileName')}</FieldLabel>
                      <input type="text" value={fileName} onChange={e => setFileName(e.target.value)} placeholder={t('composer.fileNamePlaceholder')} className={inputClass} />
                    </div>
                  )}
                </div>
              )}

              {/* Location */}
              {messageType === 'location' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>{t('composer.latitude')} *</FieldLabel>
                      <input id="composer-latitude" type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder={t('composer.latitudePlaceholder')} className={inputClass} />
                    </div>
                    <div>
                      <FieldLabel>{t('composer.longitude')} *</FieldLabel>
                      <input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder={t('composer.longitudePlaceholder')} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel optional>{t('composer.locationDescription')}</FieldLabel>
                    <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder={t('composer.locationDescriptionPlaceholder')} className={inputClass} />
                  </div>
                  {latitude && longitude && (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <div className="h-36 w-full bg-cover bg-center" style={{ backgroundImage: `url(https://placehold.co/600x300/e2e8f0/64748b?text=📍+${latitude},${longitude})` }} />
                    </div>
                  )}
                </div>
              )}

              {/* Contact */}
              {messageType === 'contact' && (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>{t('composer.contactName')} *</FieldLabel>
                    <input id="composer-contact-name" type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder={t('composer.contactNamePlaceholder')} className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel>{t('composer.contactPhone')} *</FieldLabel>
                    <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder={t('composer.contactPhonePlaceholder')} className={inputClass} />
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp-style Chat Input Bar */}
            <div className="shrink-0 border-t border-border px-4 py-3">
              <div className="relative flex items-end gap-0.5 rounded-2xl border border-border bg-surface px-2 py-2 transition-colors focus-within:border-border-strong">
                <div className="relative">
                  <button
                    onClick={() => setShowAttachMenu(v => !v)}
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-ink-muted transition-all hover:bg-primary/10 hover:text-primary"
                    title={t('composer.messageType')}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
                  </button>

                  {showAttachMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                      <div className="absolute bottom-full left-0 z-50 mb-2 w-56 origin-bottom-left animate-[fadeIn_0.12s_ease] rounded-xl border border-border bg-surface py-2 shadow-xl">
                        <p className="px-4 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-ink-muted">{t('composer.messageType')}</p>
                        {ATTACH_OPTIONS.map(option => (
                          <button
                            key={option.type}
                            onClick={() => selectMessageType(option)}
                            className={`flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted ${
                              messageType === option.type ? 'text-primary' : 'text-ink'
                            }`}
                          >
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${messageType === option.type ? 'bg-primary/10' : 'bg-muted-deep'} text-ink-secondary`}>
                              <option.icon size={15} className={messageType === option.type ? 'text-primary' : ''} />
                            </div>
                            <span>{t(`composer.types.${option.type}`)}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-ink-muted transition-all hover:bg-muted hover:text-ink-secondary">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026.307.131.572.521.619 2.584.311 5.149.311 7.733 0 .391-.047.548-.312.522-.619-.026-.292-.224-.509-.463-.542-2.243-.308-4.806-.308-7.05 0-.239.033-.437.25-.463.542zm2.649 3.948c.374.39 1.388 1.045 2.902 1.045 1.514 0 2.527-.655 2.902-1.045a.48.48 0 0 0-.007-.735.496.496 0 0 0-.7.03c-.244.253-.988.643-2.195.643s-1.951-.39-2.195-.643a.496.496 0 0 0-.707-.03.48.48 0 0 0 0 .735zm2.902-6.31c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /></svg>
                </button>

                <textarea
                  value={messageType === 'text' ? textContent : caption}
                  onChange={e => (messageType === 'text' ? setTextContent(e.target.value) : setCaption(e.target.value))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend) handleSend();
                    }
                  }}
                  placeholder={messageType === 'text' ? t('composer.messagePlaceholder') : t('composer.captionPlaceholder')}
                  rows={1}
                  className="max-h-[120px] flex-1 resize-none border-none bg-transparent px-1 py-2 text-sm leading-[1.45] text-ink outline-none placeholder:text-ink-muted"
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                  }}
                />

                <div className="relative">
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none transition-all ${
                      canSend ? 'bg-[#00a884] text-white shadow-sm hover:bg-[#009474] active:scale-95' : 'bg-transparent text-ink-muted'
                    }`}
                  >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                    )}
                  </button>
                  {selectedRecipients.length > 0 && (
                    <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#ff3b30] px-1 text-[0.55rem] font-bold leading-none text-white shadow-sm">
                      {selectedRecipients.length > 9 ? '9+' : selectedRecipients.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[0.65rem] text-ink-muted">
                <span>{(messageType === 'text' ? textContent.length : caption.length)} / 4096</span>
                {batchProgress && (
                  <span>{batchProgress.sent + batchProgress.failed} / {batchProgress.total}</span>
                )}
              </div>

              {batchProgress && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${((batchProgress.sent + batchProgress.failed) / batchProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: iPhone Preview ── */}
        {showPreview && (
          <div className="flex shrink-0 items-center justify-center overflow-y-auto border-l border-border bg-muted p-4 max-sm:w-full max-sm:border-l-0 max-sm:border-t max-sm:p-3">
            <div className="animate-[fadeIn_0.3s_ease]">
              <IPhonePreview data={previewData} showEmptyState isDark={resolvedTheme === 'dark'} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
