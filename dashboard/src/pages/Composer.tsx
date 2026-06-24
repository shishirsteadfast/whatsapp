import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image, Video, FileText, Music, UserPlus,
  Users, Phone, Search, X, Check, Loader2,
  Globe,
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
import { messageApi, sessionApi, contactApi } from '../services/api';
import { IPhonePreview, type WhatsAppPreviewData, type WhatsAppPreviewMessage } from '../components/iPhonePreview';
import type { Contact } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────

type RecipientTab = 'contacts' | 'whatsapp' | 'groups' | 'manual';
type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';

interface Recipient {
  id: string;
  name: string;
  identifier: string; // phone number or group ID
  type: 'contact' | 'group' | 'manual';
  avatar?: string;
}

interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  pushName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function formatPhoneForChatId(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  return `${cleaned}@c.us`;
}



// ─── Recipient Chip ───────────────────────────────────────────────────

function RecipientChip({ recipient, onRemove }: { recipient: Recipient; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f4f8] px-2.5 py-1 text-[0.75rem] font-medium text-[#1f7a8c] dark:bg-[#1a3a42] dark:text-[#5fc7d8]">
      {recipient.name || recipient.identifier}
      <button
        onClick={onRemove}
        className="ml-0.5 flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full bg-[#1f7a8c]/20 text-[0.5rem] text-[#1f7a8c] transition-colors hover:bg-[#1f7a8c]/30 dark:bg-[#5fc7d8]/20 dark:text-[#5fc7d8] dark:hover:bg-[#5fc7d8]/30"
      >
        <X size={10} strokeWidth={3} />
      </button>
    </span>
  );
}

// ─── Main Composer Page ───────────────────────────────────────────────

export function Composer() {
  const { t } = useTranslation();
  useDocumentTitle('Composer');
  const toast = useToast();
  const { canWrite } = useRole();
  const { resolvedTheme } = useTheme();

  // ── Session ──
  const { data: allSessions = [], isLoading: loadingSessions } = useSessionsQuery();
  const sessions = useMemo(() => allSessions.filter(s => s.status === 'ready'), [allSessions]);
  const [sessionId, setSessionId] = useState('');

  // Auto-select first session
  useEffect(() => {
    if (sessions.length > 0 && !sessionId) {
      setSessionId(sessions[0].id);
    }
  }, [sessions, sessionId]);

  // ── Recipients ──
  const [recipientTab, setRecipientTab] = useState<RecipientTab>('contacts');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [manualPhone, setManualPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Saved contacts
  const { data: savedContacts = [] } = useContactsQuery();

  // WhatsApp live contacts & groups
  const { data: waGroups = [], isLoading: loadingGroups } = useSessionGroupsQuery(sessionId, recipientTab === 'groups' && !!sessionId);
  const [waContacts, setWaContacts] = useState<WhatsAppContact[]>([]);
  const [loadingWaContacts, setLoadingWaContacts] = useState(false);

  // Fetch WhatsApp contacts when tab switches
  useEffect(() => {
    if (recipientTab === 'whatsapp' && sessionId && waContacts.length === 0 && !loadingWaContacts) {
      setLoadingWaContacts(true);
      sessionApi.getGroups(sessionId) // reusing groups endpoint as demo — contacts are fetched differently
        .then(() => {
          // In a real scenario, we'd fetch contacts from the session
          // For now, we'll use saved contacts as "whatsapp contacts"
          setLoadingWaContacts(false);
        })
        .catch(() => setLoadingWaContacts(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientTab, sessionId]);

  // Pagination state for contacts list
  const [contactsLimit, setContactsLimit] = useState(10);

  // Reset limit when tab changes or search changes
  useEffect(() => {
    setContactsLimit(10);
  }, [recipientTab, searchQuery]);

  // Filtered contacts for display
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

  const isSelected = useCallback(
    (id: string) => selectedRecipients.some(r => r.id === id),
    [selectedRecipients],
  );

  const toggleContact = useCallback(
    (contact: Contact) => {
      const id = `contact-${contact.id}`;
      if (isSelected(id)) {
        setSelectedRecipients(prev => prev.filter(r => r.id !== id));
      } else {
        setSelectedRecipients(prev => [
          ...prev,
          {
            id,
            name: contact.fullName || `${contact.countryCode}${contact.phone}`,
            identifier: `${contact.countryCode}${contact.phone}`,
            type: 'contact',
          },
        ]);
      }
    },
    [isSelected],
  );

  const toggleGroup = useCallback(
    (group: { id: string; name: string }) => {
      const id = `group-${group.id}`;
      if (isSelected(id)) {
        setSelectedRecipients(prev => prev.filter(r => r.id !== id));
      } else {
        setSelectedRecipients(prev => [
          ...prev,
          { id, name: group.name, identifier: group.id, type: 'group' },
        ]);
      }
    },
    [isSelected],
  );

  const addManualRecipient = useCallback(() => {
    const cleaned = manualPhone.replace(/[^0-9+]/g, '');
    if (!cleaned) return;
    const id = `manual-${cleaned}`;
    if (isSelected(id)) return;
    setSelectedRecipients(prev => [
      ...prev,
      { id, name: cleaned, identifier: formatPhoneForChatId(cleaned), type: 'manual' },
    ]);
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

  // ── Attachment menu state ──
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // ── Sending state ──
  const [isSending, setIsSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ total: number; sent: number; failed: number } | null>(null);

  // ── Live Preview State ──
  const [previewData, setPreviewData] = useState<WhatsAppPreviewData>({
    contactName: 'Contact',
    isOnline: false,
    messages: [],
  });

  // Update preview in real-time as user types
  useEffect(() => {
    const firstRecipient = selectedRecipients[0];
    const name = firstRecipient?.name || 'Contact';

    let previewMessages: WhatsAppPreviewMessage[] = [];

    // Show a preview message based on what the user is composing
    if (textContent || mediaUrl || contactName || (latitude && longitude)) {
      const msg: WhatsAppPreviewMessage = {
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
      };
      previewMessages = [msg];
    }

    setPreviewData(prev => ({
      contactName: name,
      isOnline: selectedRecipients.length > 0,
      messages: previewMessages,
    }));
  }, [textContent, mediaUrl, caption, fileName, latitude, longitude, contactName, contactPhone, messageType, selectedRecipients]);

  // ── Send Logic ──
  const handleSend = async () => {
    if (!sessionId || selectedRecipients.length === 0 || isSending) return;

    // Validate
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

        // Add to preview messages
        const msg: WhatsAppPreviewMessage = {
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
        };
        allMessages.push(msg);
        sentCount++;
      } catch (err) {
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

    // Update preview with all sent messages
    setPreviewData(prev => ({
      ...prev,
      messages: allMessages.length > 0 ? allMessages : prev.messages,
    }));

    if (failedCount === 0) {
      toast.success(`Message sent to ${sentCount} recipient${sentCount > 1 ? 's' : ''}`);
      // Clear form
      setTextContent('');
      setMediaUrl('');
      setCaption('');
      setFileName('');
      setLatitude('');
      setLongitude('');
      setContactName('');
      setContactPhone('');
    } else {
      toast.error(`Sent to ${sentCount}, failed for ${failedCount} recipient${failedCount > 1 ? 's' : ''}`);
    }

    setIsSending(false);
    setBatchProgress(null);
  };

  // ── Check if send is allowed ──
  const canSend = useMemo(() => {
    if (!canWrite || isSending || !sessionId || selectedRecipients.length === 0) return false;
    switch (messageType) {
      case 'text': return textContent.trim().length > 0;
      case 'image':
      case 'video':
      case 'audio':
      case 'document': return mediaUrl.trim().length > 0;
      case 'location': return latitude !== '' && longitude !== '';
      case 'contact': return contactName.trim().length > 0 && contactPhone.trim().length > 0;
      default: return false;
    }
  }, [canWrite, isSending, sessionId, selectedRecipients, messageType, textContent, mediaUrl, latitude, longitude, contactName, contactPhone]);

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title={t('composer.title')}
        subtitle={t('composer.subtitle')}
      />

      {/* ── Main Content ── */}
      <div className="flex h-[calc(100vh-12rem)] max-sm:h-auto max-sm:min-h-screen rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden max-sm:flex-col">
        {/* ── LEFT PANEL: Composer ── */}
        <div className="flex flex-1 min-w-0 flex-col overflow-y-auto border-r border-[var(--color-border)] max-sm:w-full max-sm:border-r-0 max-sm:border-b max-sm:border-b-[var(--color-border)]">
          {/* Session Selector */}
          <div className="shrink-0 border-b border-[var(--color-border)] px-5 py-3">                <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
              {t('composer.session')}
            </label>
            <select
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[0.875rem] text-[var(--color-ink)] transition-all focus:border-[var(--color-primary)] focus:outline-none"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
            >
              {sessions.length === 0 && <option value="">{t('composer.noReadySessions')}</option>}
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ── Recipient Selector ── */}
          <div className="shrink-0 border-b border-[var(--color-border)]">
            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border)]">                {[
                { key: 'contacts' as RecipientTab, labelKey: 'composer.savedContacts' as const, icon: Users },
                { key: 'whatsapp' as RecipientTab, labelKey: 'composer.waContacts' as const, icon: Globe },
                { key: 'groups' as RecipientTab, labelKey: 'composer.groups' as const, icon: Users },
                { key: 'manual' as RecipientTab, labelKey: 'composer.newNumber' as const, icon: Phone },
              ].map(({ key, labelKey, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setRecipientTab(key); setSearchQuery(''); }}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-[0.7rem] font-semibold transition-all ${
                    recipientTab === key
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink-secondary)]'
                  }`}
                >
                  <Icon size={13} />
                  <span className="max-sm:hidden">{t(labelKey)}</span>
                </button>
              ))}
            </div>

            {/* Search / Input */}
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
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[0.8125rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)]"
                  />
                  <button
                    onClick={addManualRecipient}
                    disabled={!manualPhone.trim()}
                    className="flex cursor-pointer items-center justify-center rounded-lg bg-[var(--color-primary)] px-3 text-white transition-all hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
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
                    placeholder={
                      recipientTab === 'contacts' ? t('composer.searchContacts') :
                      recipientTab === 'groups' ? t('composer.searchGroups') :
                      t('common.search')
                    }
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="cursor-pointer border-none bg-transparent p-0 text-[var(--color-ink-muted)]">
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Selected Recipients */}
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-[var(--color-border)] px-4 py-2">
                {selectedRecipients.map(r => (
                  <RecipientChip key={r.id} recipient={r} onRemove={() => removeRecipient(r.id)} />
                ))}
              </div>
            )}

            {/* Recipient List */}
            <div className="max-h-[160px] overflow-y-auto border-t border-[var(--color-border)]">
              {recipientTab === 'contacts' && (
                <>
                  {filteredContacts.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[0.8rem] text-[var(--color-ink-muted)]">
                      {searchQuery ? t('composer.noResults') : t('composer.noContacts')}
                    </p>
                  ) : (
                    <>
                    {displayedContacts.map(contact => {
                      const id = `contact-${contact.id}`;
                      const selected = isSelected(id);
                      return (
                        <button
                          key={contact.id}
                          onClick={() => toggleContact(contact)}
                          className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-[0.8125rem] transition-colors ${
                            selected ? 'bg-[var(--color-primary-dim)]' : 'hover:bg-[var(--color-muted)]'
                          }`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${
                            selected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)] text-[var(--color-ink-secondary)]'
                          }`}>
                            {(contact.fullName?.[0] || contact.phone[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate font-medium text-[var(--color-ink)]">
                              {contact.fullName || `${contact.countryCode}${contact.phone}`}
                            </p>
                            <p className="m-0 text-[0.65rem] text-[var(--color-ink-muted)]">
                              {contact.countryCode}{contact.phone}
                            </p>
                          </div>
                          {selected && <Check size={16} className="shrink-0 text-[var(--color-primary)]" />}
                        </button>
                      );
                    })}
                    {hasMoreContacts && (
                      <button
                        onClick={() => setContactsLimit(prev => prev + 10)}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 border-t border-[var(--color-border)] px-4 py-2.5 text-[0.75rem] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-muted)]"
                      >
                        Show more… ({(filteredContacts.length - contactsLimit)} remaining)
                      </button>
                    )}
                </>
              )}
              </>
              )}

              {recipientTab === 'whatsapp' && (
                <div className="px-4 py-6 text-center">
                  {loadingWaContacts ? (
                    <Loader2 size={20} className="mx-auto animate-spin text-[var(--color-ink-muted)]" />
                  ) : (
                    <>
                      <p className="text-[0.8rem] text-[var(--color-ink-muted)]">
                        Use the <strong>Saved Contacts</strong> tab or add manually via <strong>New Number</strong>
                      </p>
                      <p className="mt-2 text-[0.7rem] text-[var(--color-ink-muted)]">
                        WhatsApp live contacts will be available when the session is fully synced.
                      </p>
                    </>
                  )}
                </div>
              )}

              {recipientTab === 'groups' && (
                <>
                  {loadingGroups ? (
                    <div className="flex justify-center py-4">
                      <Loader2 size={18} className="animate-spin text-[var(--color-ink-muted)]" />
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[0.8rem] text-[var(--color-ink-muted)]">
                      {searchQuery ? t('composer.noResults') : t('composer.noGroups')}
                    </p>
                  ) : (
                    filteredGroups.map(group => {
                      const id = `group-${group.id}`;
                      const selected = isSelected(id);
                      return (
                        <button
                          key={group.id}
                          onClick={() => toggleGroup(group)}
                          className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-[0.8125rem] transition-colors ${
                            selected ? 'bg-[var(--color-primary-dim)]' : 'hover:bg-[var(--color-muted)]'
                          }`}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${
                            selected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)] text-[var(--color-ink-secondary)]'
                          }`}>
                            {(group.name?.[0] || 'G').toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 truncate font-medium text-[var(--color-ink)]">{group.name}</p>
                            <p className="m-0 text-[0.65rem] text-[var(--color-ink-muted)]">Group</p>
                          </div>
                          {selected && <Check size={16} className="shrink-0 text-[var(--color-primary)]" />}
                        </button>
                      );
                    })
                  )}
                </>
              )}

              {recipientTab === 'manual' && (
                <p className="px-4 py-3 text-[0.75rem] text-[var(--color-ink-muted)]">
                  Enter a phone number above to add as a recipient without saving to contacts.
                </p>
              )}
            </div>
          </div>

          {/* ── Message Composer ── */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Content Inputs */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {/* Text — Message preview */}
              {messageType === 'text' && (
                <div className="mb-3 px-1">
                  {textContent.trim() ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-lg px-3.5 py-2.5 shadow-sm bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-sm">
                        <p className="m-0 text-[0.875rem] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words leading-[1.45]">
                          {textContent}
                        </p>
                        <div className="mt-1 flex justify-end gap-1">
                          <span className="text-[0.625rem] text-[#667781] dark:text-[#8796a0]">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <svg viewBox="0 0 16 11" className="h-[0.625rem] w-[0.875rem] text-[#53bdeb]"><path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.337.14.488.488 0 0 0-.14.336c0 .13.052.254.14.343l2.369 2.468a.473.473 0 0 0 .348.166.493.493 0 0 0 .374-.19l6.56-8.1a.49.49 0 0 0 .102-.413.46.46 0 0 0-.204-.314z" fill="currentColor"/></svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-[0.8rem] text-[var(--color-ink-muted)] text-center max-w-[280px]">
                        Type a message below. Links like https://example.com are automatically detected.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Image / Video / Audio / Document */}
              {(messageType === 'image' || messageType === 'video' || messageType === 'audio' || messageType === 'document') && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                      Media URL *
                    </label>
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={e => setMediaUrl(e.target.value)}
                      placeholder={
                        messageType === 'image' ? 'https://example.com/image.jpg' :
                        messageType === 'video' ? 'https://example.com/video.mp4' :
                        messageType === 'audio' ? 'https://example.com/audio.mp3' :
                        'https://example.com/document.pdf'
                      }
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.875rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
                    />
                  </div>

                  {messageType === 'image' && mediaUrl && (
                    <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                      <div
                        className="h-40 w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${mediaUrl})` }}
                      />
                    </div>
                  )}

                  {(messageType === 'image' || messageType === 'video') && (
                    <div>
                      <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                        Caption <span className="font-normal lowercase text-[var(--color-ink-muted)]">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={caption}
                        onChange={e => setCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.875rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
                      />
                    </div>
                  )}

                  {messageType === 'document' && (
                    <div>
                      <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                        File Name <span className="font-normal lowercase text-[var(--color-ink-muted)]">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={fileName}
                        onChange={e => setFileName(e.target.value)}
                        placeholder="document.pdf"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.875rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
                      />
                    </div>
                  )}

                  {messageType === 'audio' && (
                    <div>
                      <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                        File Name <span className="font-normal lowercase text-[var(--color-ink-muted)]">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={fileName}
                        onChange={e => setFileName(e.target.value)}
                        placeholder="voice-note.ogg"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.875rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Location */}
              {messageType === 'location' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                        Latitude *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={e => setLatitude(e.target.value)}
                        placeholder="-6.2088"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.875rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                        Longitude *
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={e => setLongitude(e.target.value)}
                        placeholder="106.8456"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.875rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                      Description <span className="font-normal lowercase text-[var(--color-ink-muted)]">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={caption}
                      onChange={e => setCaption(e.target.value)}
                      placeholder="e.g. Our meeting point"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.875rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
                    />
                  </div>
                  {latitude && longitude && (
                    <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                      <div
                        className="h-36 w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url(https://placehold.co/600x300/e2e8f0/64748b?text=📍+${latitude},${longitude})`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Contact */}
              {messageType === 'contact' && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.875rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="+62812345678"
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.875rem] text-[var(--color-ink)] outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp-style Chat Input Bar — always visible */}
            <div className="shrink-0 border-t border-[var(--color-border)] px-4 py-3">
              <div className="flex items-end gap-0.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 focus-within:border-[var(--color-border-strong)] transition-colors relative">
                {/* + Attachment button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAttachMenu(v => !v)}
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--color-ink-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] transition-all border-none bg-transparent"
                    title="Attach media"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
                  </button>

                  {/* Attachment Popover Menu */}
                  {showAttachMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                      <div className="absolute bottom-full left-0 mb-2 z-50 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl py-2 animate-[fadeIn_0.12s_ease] origin-bottom-left">
                        <p className="px-4 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--color-ink-muted)]">Attach</p>
                        {[
                          { type: 'image' as MessageType, icon: Image, label: 'Photos & Images' },
                          { type: 'video' as MessageType, icon: Video, label: 'Video' },
                          { type: 'audio' as MessageType, icon: Music, label: 'Audio' },
                          { type: 'document' as MessageType, icon: FileText, label: 'Document' },
                        ].map(({ type, icon: Icon, label }) => (
                          <button
                            key={type}
                            onClick={() => {
                              setMessageType(type);
                              setShowAttachMenu(false);
                              setTimeout(() => {
                                const input = document.getElementById('media-url-input');
                                input?.focus();
                              }, 100);
                            }}
                            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-[0.8125rem] font-medium text-[var(--color-ink)] hover:bg-[var(--color-muted)] transition-colors border-none bg-transparent text-left"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-muted-deep)] text-[var(--color-ink-secondary)]">
                              <Icon size={15} />
                            </div>
                            <div className="flex flex-col">
                              <span>{label}</span>
                              <span className="text-[0.6rem] text-[var(--color-ink-muted)]">
                                {type === 'image' ? 'JPEG, PNG, WebP' :
                                 type === 'video' ? 'MP4, MOV, AVI' :
                                 type === 'audio' ? 'MP3, OGG, WAV' :
                                 'PDF, DOC, TXT'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Emoji button */}
                <button className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--color-ink-muted)] hover:text-[var(--color-ink-secondary)] hover:bg-[var(--color-muted)] transition-all border-none bg-transparent">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm-3.204 1.362c-.026.307.131.572.521.619 2.584.311 5.149.311 7.733 0 .391-.047.548-.312.522-.619-.026-.292-.224-.509-.463-.542-2.243-.308-4.806-.308-7.05 0-.239.033-.437.25-.463.542zm2.649 3.948c.374.39 1.388 1.045 2.902 1.045 1.514 0 2.527-.655 2.902-1.045a.48.48 0 0 0-.007-.735.496.496 0 0 0-.7.03c-.244.253-.988.643-2.195.643s-1.951-.39-2.195-.643a.496.496 0 0 0-.707-.03.48.48 0 0 0 0 .735zm2.902-6.31c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
                </button>

                {/* Text Input — updates textContent for text type, caption for media types */}
                <textarea
                  value={messageType === 'text' ? textContent : caption}
                  onChange={e => {
                    if (messageType === 'text') {
                      setTextContent(e.target.value);
                    } else {
                      setCaption(e.target.value);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend) handleSend();
                    }
                  }}
                  placeholder={messageType === 'text' ? 'Type a message' : 'Add a caption…'}
                  rows={1}
                  className="flex-1 resize-none border-none bg-transparent px-1 py-2 text-[0.875rem] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)] leading-[1.45] max-h-[120px] scrollbar-thin"
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                  }}
                />

                {/* Send button — WhatsApp green when active */}
                <div className="relative">
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none transition-all ${
                      canSend
                        ? 'bg-[#00a884] text-white hover:bg-[#009474] active:scale-95 shadow-sm'
                        : 'bg-transparent text-[var(--color-ink-muted)]'
                    }`}
                  >
                    {isSending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current rotate-0"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    )}
                  </button>
                  {/* Recipient count badge */}
                  {selectedRecipients.length > 0 && (
                    <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#ff3b30] px-1 text-[0.55rem] font-bold leading-none text-white shadow-sm">
                      {selectedRecipients.length > 9 ? '9+' : selectedRecipients.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[0.6rem] text-[var(--color-ink-muted)]">
                  {messageType === 'text' ? textContent.length : caption.length} / 4096
                </span>
                <span className="text-[0.6rem] text-[var(--color-ink-muted)]">{messageType === 'text' ? 'Enter to send · Shift+Enter for new line' : 'Press send to deliver'}</span>
              </div>

              {batchProgress && (
                <div className="mt-3">
                  <div className="flex justify-between text-[0.65rem] text-[var(--color-ink-muted)] mb-1">
                    <span>{t('composer.progress')}</span>
                    <span>{batchProgress.sent + batchProgress.failed} / {batchProgress.total}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                      style={{ width: `${((batchProgress.sent + batchProgress.failed) / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: iPhone Preview ── */}
        <div className="flex shrink-0 items-center justify-center overflow-y-auto bg-[var(--color-muted)] p-4 max-sm:p-3 max-sm:w-full">
          <div className="animate-[fadeIn_0.3s_ease]">
            <IPhonePreview
              data={previewData}
              showEmptyState={true}
              isDark={resolvedTheme === 'dark'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
