import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Users,
  UserPlus,
  Search,
  X,
  Image,
  Video,
  Music,
  FileText,
  MapPin,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../components/Toast';
import {
  useSessionsQuery,
  useContactsQuery,
  useContactGroupsQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useCampaignQuery,
} from '../hooks/queries';
import type { Campaign, CampaignPayload } from '../services/api';

type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';

const STEPS = ['details', 'message', 'recipients', 'schedule', 'review'];
const STEP_LABELS = ['campaigns.wizard.step1', 'campaigns.wizard.step2', 'campaigns.wizard.step3', 'campaigns.wizard.step4', 'campaigns.wizard.step5'];

// ── Main Component ───────────────────────────────────────────────

export function CampaignNew() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  useDocumentTitle(id ? 'Edit Campaign' : 'New Campaign');

  const isEdit = !!id;
  const duplicateId = searchParams.get('duplicate');
  const { data: existingCampaign, isLoading: loadingCampaign } = useCampaignQuery(id || duplicateId || '', !!(id || duplicateId));

  const { data: sessions = [] } = useSessionsQuery();
  const { data: contacts = [] } = useContactsQuery();
  const { data: groups = [] } = useContactGroupsQuery();
  const createMutation = useCreateCampaignMutation();
  const updateMutation = useUpdateCampaignMutation();

  const readySessions = useMemo(() => sessions.filter(s => s.status === 'ready'), [sessions]);

  const [step, setStep] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [textContent, setTextContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [fileName, setFileName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [recipientTab, setRecipientTab] = useState<'contacts' | 'groups'>('contacts');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Load existing campaign data for edit/duplicate
  useEffect(() => {
    if (existingCampaign) {
      setName(existingCampaign.name);
      setDescription(existingCampaign.description || '');
      setSessionId(existingCampaign.sessionId);
      setMessageType(existingCampaign.messageContent.type as MessageType);
      const mc = existingCampaign.messageContent;
      setTextContent(mc.text || '');
      setMediaUrl(mc.url || '');
      setCaption(mc.caption || '');
      setFileName(mc.filename || '');
      setLatitude(mc.latitude?.toString() || '');
      setLongitude(mc.longitude?.toString() || '');
      setContactName(mc.contactName || '');
      setContactPhone(mc.contactPhone || '');
      if (existingCampaign.recipientType === 'contacts') {
        setRecipientTab('contacts');
        setSelectedContactIds(existingCampaign.recipientIds || []);
      } else {
        setRecipientTab('groups');
        setSelectedGroupIds(existingCampaign.recipientIds || []);
      }
      if (existingCampaign.scheduleAt) {
        setScheduleMode('later');
        const d = new Date(existingCampaign.scheduleAt);
        setScheduleDate(d.toISOString().split('T')[0]);
        setScheduleTime(d.toTimeString().slice(0, 5));
      }
    }
  }, [existingCampaign]);

  // Auto-select first session
  useEffect(() => {
    if (readySessions.length > 0 && !sessionId) {
      setSessionId(readySessions[0].id);
    }
  }, [readySessions, sessionId]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      c => (c.fullName ?? '').toLowerCase().includes(q) || `${c.countryCode}${c.phone}`.includes(q),
    );
  }, [contacts, searchQuery]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(q));
  }, [groups, searchQuery]);

  const totalRecipients = recipientTab === 'contacts' ? selectedContactIds.length : selectedGroupIds.length;

  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return name.trim().length > 0 && !!sessionId;
      case 1: {
        if (messageType === 'text') return textContent.trim().length > 0;
        if (['image', 'video', 'audio', 'document'].includes(messageType)) return mediaUrl.trim().length > 0;
        if (messageType === 'location') return latitude !== '' && longitude !== '';
        if (messageType === 'contact') return contactName.trim().length > 0 && contactPhone.trim().length > 0;
        return false;
      }
      case 2: return totalRecipients > 0;
      case 3: {
        if (scheduleMode === 'now') return true;
        return scheduleDate.length > 0 && scheduleTime.length > 0;
      }
      default: return true;
    }
  }, [step, name, sessionId, messageType, textContent, mediaUrl, latitude, longitude, contactName, contactPhone, totalRecipients, scheduleMode, scheduleDate, scheduleTime]);

  const handleSubmit = async () => {
    const payload: CampaignPayload = {
      name,
      description: description || undefined,
      sessionId,
      recipientType: recipientTab,
      recipientIds: recipientTab === 'contacts' ? selectedContactIds : selectedGroupIds,
      messageContent: {
        type: messageType,
        text: messageType === 'text' ? textContent : undefined,
        url: ['image', 'video', 'audio', 'document'].includes(messageType) ? mediaUrl : undefined,
        caption: ['image', 'video', 'location'].includes(messageType) ? caption : undefined,
        filename: ['document', 'audio'].includes(messageType) ? fileName : undefined,
        latitude: messageType === 'location' ? parseFloat(latitude) : undefined,
        longitude: messageType === 'location' ? parseFloat(longitude) : undefined,
        contactName: messageType === 'contact' ? contactName : undefined,
        contactPhone: messageType === 'contact' ? contactPhone : undefined,
      },
      scheduleAt: scheduleMode === 'later' ? `${scheduleDate}T${scheduleTime}:00` : undefined,
    };

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success(t('campaigns.toasts.updateSuccess'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('campaigns.toasts.createSuccess'));
      }
      navigate('/campaigns');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Campaign] Operation failed:', message);
      toast.error(isEdit ? t('campaigns.toasts.updateError') : `${t('campaigns.toasts.createError')}: ${message}`);
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId],
    );
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId],
    );
  };

  if (loadingCampaign) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full p-7 max-sm:p-4">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate('/campaigns')} className="icon-btn">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="m-0 text-[1.375rem] font-bold tracking-tight text-[var(--color-ink)]">
            {isEdit ? t('campaigns.editCampaign') : t('campaigns.newCampaign')}
          </h1>
          <p className="m-0 mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {t('campaigns.subtitle')}
          </p>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[0.75rem] font-bold transition-all border-none ${
                i === step
                  ? 'bg-[var(--color-primary)] text-white'
                  : i < step
                  ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                  : 'bg-[var(--color-muted)] text-[var(--color-ink-muted)]'
              }`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </button>
            <span className={`mx-2 whitespace-nowrap text-[0.75rem] font-medium ${
              i === step ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]'
            }`}>
              {t(STEP_LABELS[i])}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-px w-8 ${i < step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="card mx-auto max-w-2xl p-6">
        {/* Step 1: Details */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                {t('campaigns.wizard.name')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('campaigns.wizard.namePlaceholder')}
                className="input-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                {t('campaigns.wizard.description')}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('campaigns.wizard.descriptionPlaceholder')}
                rows={3}
                className="input-base resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                {t('campaigns.wizard.session')} *
              </label>
              <select
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
                className="w-full"
              >
                {readySessions.length === 0 && <option value="">{t('campaigns.wizard.noSessions')}</option>}
                {readySessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Message */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                {t('campaigns.wizard.messageType')} *
              </label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {[
                  { type: 'text' as MessageType, icon: MessageSquare, label: t('campaigns.wizard.text') },
                  { type: 'image' as MessageType, icon: Image, label: t('campaigns.wizard.image') },
                  { type: 'video' as MessageType, icon: Video, label: t('campaigns.wizard.video') },
                  { type: 'audio' as MessageType, icon: Music, label: t('campaigns.wizard.audio') },
                  { type: 'document' as MessageType, icon: FileText, label: t('campaigns.wizard.document') },
                  { type: 'location' as MessageType, icon: MapPin, label: t('campaigns.wizard.location') },
                  { type: 'contact' as MessageType, icon: Phone, label: t('campaigns.wizard.contact') },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setMessageType(type)}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                      messageType === type
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                    }`}
                  >
                    <Icon size={18} className={messageType === type ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-muted)]'} />
                    <span className="text-[0.65rem] font-medium text-[var(--color-ink-secondary)]">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Content Inputs */}
            {messageType === 'text' && (
              <div>
                <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                  {t('campaigns.wizard.text')} *
                </label>
                <textarea
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder={t('campaigns.wizard.textPlaceholder')}
                  rows={5}
                  className="input-base resize-none"
                />
                <p className="mt-1 text-right text-[0.65rem] text-[var(--color-ink-muted)]">{textContent.length} chars</p>
              </div>
            )}

            {['image', 'video', 'audio', 'document'].includes(messageType) && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                    {t('campaigns.wizard.mediaUrl')} *
                  </label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    placeholder={t('campaigns.wizard.mediaUrlPlaceholder')}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                    {t('campaigns.wizard.caption')}
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder={t('campaigns.wizard.captionPlaceholder')}
                    className="input-base"
                  />
                </div>
                {messageType === 'document' && (
                  <div>
                    <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                      {t('campaigns.wizard.fileName')}
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={e => setFileName(e.target.value)}
                      placeholder={t('campaigns.wizard.fileNamePlaceholder')}
                      className="input-base"
                    />
                  </div>
                )}
              </div>
            )}

            {messageType === 'location' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                    {t('campaigns.wizard.latitude')} *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    placeholder={t('campaigns.wizard.latitudePlaceholder')}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                    {t('campaigns.wizard.longitude')} *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    placeholder={t('campaigns.wizard.longitudePlaceholder')}
                    className="input-base"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                    {t('campaigns.wizard.caption')}
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder={t('campaigns.wizard.captionPlaceholder')}
                    className="input-base"
                  />
                </div>
              </div>
            )}

            {messageType === 'contact' && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                    {t('campaigns.wizard.contactName')} *
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder={t('campaigns.wizard.contactNamePlaceholder')}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                    {t('campaigns.wizard.contactPhone')} *
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder={t('campaigns.wizard.contactPhonePlaceholder')}
                    className="input-base"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Recipients */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-[var(--color-muted)] p-1">
              <button
                onClick={() => setRecipientTab('contacts')}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-medium transition-all border-none ${
                  recipientTab === 'contacts'
                    ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-secondary)]'
                }`}
              >
                <Users size={15} />
                {t('campaigns.wizard.contacts')}
              </button>
              <button
                onClick={() => setRecipientTab('groups')}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[0.8125rem] font-medium transition-all border-none ${
                  recipientTab === 'groups'
                    ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-secondary)]'
                }`}
              >
                <UserPlus size={15} />
                {t('campaigns.wizard.groups')}
              </button>
            </div>

            {/* Search */}
            <div className="search-bar">
              <Search size={14} className="text-[var(--color-ink-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={recipientTab === 'contacts' ? t('campaigns.wizard.searchContacts') : t('campaigns.wizard.searchGroups')}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="cursor-pointer border-none bg-transparent p-0 text-[var(--color-ink-muted)]">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Selected count */}
            <p className="text-[0.75rem] font-medium text-[var(--color-primary)]">
              {t('campaigns.wizard.selected', { count: totalRecipients })}
            </p>

            {/* List */}
            <div className="max-h-[300px] overflow-y-auto rounded-xl border border-[var(--color-border)]">
              {recipientTab === 'contacts' ? (
                filteredContacts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[0.8125rem] text-[var(--color-ink-muted)]">{t('campaigns.wizard.noContacts')}</p>
                ) : (
                  filteredContacts.map(contact => {
                    const selected = selectedContactIds.includes(contact.id);
                    return (
                      <button
                        key={contact.id}
                        onClick={() => toggleContact(contact.id)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[0.8125rem] transition-colors border-none bg-transparent ${
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
                  })
                )
              ) : (
                filteredGroups.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[0.8125rem] text-[var(--color-ink-muted)]">{t('campaigns.wizard.noGroups')}</p>
                ) : (
                  filteredGroups.map(group => {
                    const selected = selectedGroupIds.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleGroup(group.id)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[0.8125rem] transition-colors border-none bg-transparent ${
                          selected ? 'bg-[var(--color-primary-dim)]' : 'hover:bg-[var(--color-muted)]'
                        }`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${
                          selected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)] text-[var(--color-ink-secondary)]'
                        }`}>
                          {(group.name[0] || 'G').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate font-medium text-[var(--color-ink)]">{group.name}</p>
                          <p className="m-0 text-[0.65rem] text-[var(--color-ink-muted)]">
                            {group.memberCount} members
                          </p>
                        </div>
                        {selected && <Check size={16} className="shrink-0 text-[var(--color-primary)]" />}
                      </button>
                    );
                  })
                )
              )}
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <button
                onClick={() => setScheduleMode('now')}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all ${
                  scheduleMode === 'now'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <Clock size={24} className={scheduleMode === 'now' ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-muted)]'} />
                <span className="text-[0.875rem] font-medium text-[var(--color-ink)]">{t('campaigns.wizard.scheduleNow')}</span>
              </button>
              <button
                onClick={() => setScheduleMode('later')}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-5 transition-all ${
                  scheduleMode === 'later'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-dim)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <Calendar size={24} className={scheduleMode === 'later' ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-muted)]'} />
                <span className="text-[0.875rem] font-medium text-[var(--color-ink)]">{t('campaigns.wizard.scheduleLater')}</span>
              </button>
            </div>

            {scheduleMode === 'later' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                    {t('campaigns.wizard.scheduleDate')} *
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                    {t('campaigns.wizard.scheduleTime')} *
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="input-base"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {step === 4 && (
          <div className="space-y-5">
            <h3 className="m-0 text-[1rem] font-bold text-[var(--color-ink)]">{t('campaigns.wizard.reviewTitle')}</h3>
            <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">{t('campaigns.wizard.reviewName')}</span>
                <span className="text-[0.8125rem] font-medium text-[var(--color-ink)]">{name}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">{t('campaigns.wizard.reviewSession')}</span>
                <span className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
                  {readySessions.find(s => s.id === sessionId)?.name || sessionId}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">{t('campaigns.wizard.reviewMessageType')}</span>
                <span className="text-[0.8125rem] font-medium capitalize text-[var(--color-ink)]">{messageType}</span>
              </div>
              <div className="px-4 py-3">
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">{t('campaigns.wizard.reviewMessagePreview')}</span>
                <p className="m-0 mt-1 text-[0.8125rem] text-[var(--color-ink)]">
                  {messageType === 'text' ? textContent :
                   messageType === 'location' ? `📍 ${caption || 'Location'}` :
                   messageType === 'contact' ? `📇 ${contactName}` :
                   mediaUrl ? `${mediaUrl}${caption ? ` — ${caption}` : ''}` :
                   '—'}
                </p>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">{t('campaigns.wizard.reviewRecipients')}</span>
                <span className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
                  {t('campaigns.wizard.reviewRecipientCount', { count: totalRecipients })}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">{t('campaigns.wizard.reviewSchedule')}</span>
                <span className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
                  {scheduleMode === 'now'
                    ? t('campaigns.wizard.reviewScheduleNow')
                    : t('campaigns.wizard.reviewScheduleDate', { date: `${scheduleDate} ${scheduleTime}` })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate('/campaigns')}
            className="btn-secondary"
          >
            <ChevronLeft size={15} />
            {step === 0 ? t('common.cancel') : t('common.back')}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="btn-primary"
            >
              {t('common.next')}
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed || createMutation.isPending || updateMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <><Loader2 size={15} className="animate-spin" /> {isEdit ? t('campaigns.wizard.saving') : t('campaigns.wizard.creating')}</>
              ) : (
                <>{isEdit ? t('campaigns.wizard.saveBtn') : t('campaigns.wizard.createBtn')}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
