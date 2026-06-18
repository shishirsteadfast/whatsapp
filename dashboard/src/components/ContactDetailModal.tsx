import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Loader2, ArrowDownLeft, ArrowUpRight,
  MapPin, StickyNote, Calendar, Phone,
  CheckCheck, Check, Clock, AlertCircle,
  ChevronDown, MessageSquare,
} from 'lucide-react';
import { contactApi } from '../services/api';
import type { Contact, ContactMessage } from '../services/api';

interface ContactDetailModalProps {
  contact: Contact;
  onClose: () => void;
}

const PAGE_SIZE = 20;

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatMsgDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'read':
      return <CheckCheck size={13} className="text-[var(--color-primary)]" />;
    case 'delivered':
      return <CheckCheck size={13} className="text-blue-400" />;
    case 'sent':
      return <Check size={13} className="text-[var(--color-ink-muted)]" />;
    case 'pending':
      return <Clock size={13} className="text-[var(--color-ink-muted)]" />;
    case 'failed':
      return <AlertCircle size={13} className="text-red-400" />;
    default:
      return <Check size={13} className="text-[var(--color-ink-muted)]" />;
  }
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export function ContactDetailModal({ contact, onClose }: ContactDetailModalProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  const loadMessages = useCallback(async (currentOffset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await contactApi.getMessages(contact.id, PAGE_SIZE, currentOffset);
      setMessages(prev => append ? [...prev, ...res.messages] : res.messages);
      setTotal(res.total);
      setOffset(currentOffset + res.messages.length);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [contact.id]);

  useEffect(() => { loadMessages(0, false); }, [loadMessages]);

  const hasMore = messages.length < total;

  // Stats
  const outgoingCount = messages.filter(m => m.direction === 'outgoing').length;
  const incomingCount = messages.filter(m => m.direction === 'incoming').length;

  const avatarLetter = (contact.fullName?.[0] ?? contact.phone[0] ?? '?').toUpperCase();
  const locationParts = [contact.city, contact.state, contact.country].filter(Boolean);
  const location = locationParts.join(', ');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box max-w-[800px] overflow-hidden"
        style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Gradient Header with Profile ── */}
        <div className="relative shrink-0 overflow-hidden">
          {/* Background gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #128c7e 50%, #075e54 100%)',
            }}
          />
          {/* Decorative pattern */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative flex items-center gap-5 px-6 py-5">
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/20 text-[1.75rem] font-bold text-white shadow-lg backdrop-blur-sm ring-3 ring-white/25">
                {avatarLetter}
              </div>
              {/* Online dot */}
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-[#25d366]" />
            </div>

            {/* Name & Phone */}
            <div className="min-w-0 flex-1">
              <h2 className="m-0 truncate text-[1.375rem] font-bold text-white leading-tight">
                {contact.fullName || <span className="text-white/60">{contact.phone}</span>}
              </h2>
              <p className="m-0 mt-0.5 flex items-center gap-1.5 text-[0.875rem] text-white/80 font-medium">
                <Phone size={13} className="shrink-0" />
                <span className="font-mono">{contact.countryCode}{contact.phone}</span>
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/90 backdrop-blur-sm transition-all hover:bg-white/25 hover:text-white cursor-pointer border-none"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Quick Stats Bar ── */}
        {total > 0 && (
          <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
            <div className="flex items-center divide-x divide-[var(--color-border)]">
              <div className="flex flex-1 items-center justify-center gap-2 py-3">
                <MessageSquare size={14} className="text-[var(--color-ink-muted)]" />
                <span className="text-[0.8125rem] font-semibold text-[var(--color-ink)]">{total}</span>
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">
                  {t('contacts.detail.totalMessages', { count: total })}
                </span>
              </div>
              <div className="flex flex-1 items-center justify-center gap-2 py-3">
                <ArrowUpRight size={13} className="text-[var(--color-primary)]" />
                <span className="text-[0.8125rem] font-semibold text-[var(--color-ink)]">{outgoingCount}</span>
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">{t('contacts.detail.outgoing')}</span>
              </div>
              <div className="flex flex-1 items-center justify-center gap-2 py-3">
                <ArrowDownLeft size={13} className="text-blue-500" />
                <span className="text-[0.8125rem] font-semibold text-[var(--color-ink)]">{incomingCount}</span>
                <span className="text-[0.75rem] text-[var(--color-ink-muted)]">{t('contacts.detail.incoming')}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Contact Info (Collapsible) ── */}
          <div className="border-b border-[var(--color-border)]">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="flex w-full items-center justify-between px-5 py-3.5 cursor-pointer bg-transparent border-none text-left transition-colors hover:bg-[var(--color-muted)]"
            >
              <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[var(--color-ink)] uppercase tracking-wide">
                {t('contacts.detail.title')}
              </span>
              <ChevronDown
                size={16}
                className={`text-[var(--color-ink-muted)] transition-transform duration-200 ${showInfo ? 'rotate-180' : ''}`}
              />
            </button>

            {showInfo && (
              <div className="px-5 pb-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Location */}
                  {location && (
                    <InfoCard icon={<MapPin size={15} />} label={t('contacts.detail.country')}>
                      {location}
                    </InfoCard>
                  )}

                  {/* Address */}
                  {contact.address && (
                    <InfoCard icon={<MapPin size={15} />} label={t('contacts.detail.address')}>
                      {contact.address}
                    </InfoCard>
                  )}

                  {/* Note */}
                  {contact.note && (
                    <InfoCard icon={<StickyNote size={15} />} label={t('contacts.detail.note')} span>
                      {contact.note}
                    </InfoCard>
                  )}

                  {/* Created */}
                  <InfoCard icon={<Calendar size={15} />} label={t('contacts.detail.created')}>
                    {formatFullDate(contact.createdAt)}
                  </InfoCard>
                </div>
              </div>
            )}
          </div>

          {/* ── Message History ── */}
          <div className="flex flex-col">
            {/* Section header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]/80 px-5 py-3 backdrop-blur-sm">
              <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[var(--color-ink)] uppercase tracking-wide">
                <MessageSquare size={14} className="text-[var(--color-ink-muted)]" />
                {t('contacts.detail.messages')}
              </span>
              {total > 0 && (
                <span className="rounded-full bg-[var(--color-primary-dim)] px-2.5 py-0.5 text-[0.6875rem] font-bold text-[var(--color-primary)]">
                  {total}
                </span>
              )}
            </div>

            {/* Messages */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={28} className="animate-spin text-[var(--color-primary)]" />
                  <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">{t('contacts.detail.loadingMessages')}</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-muted)]">
                  <MessageSquare size={24} className="text-[var(--color-ink-muted)]" />
                </div>
                <p className="m-0 text-[0.875rem] text-[var(--color-ink-muted)]">{t('contacts.detail.noMessages')}</p>
              </div>
            ) : (
              <div className="space-y-0.5 p-3">
                {messages.map((msg, idx) => {
                  const isOutgoing = msg.direction === 'outgoing';
                  const showTimestamp = idx === 0 || !isSameDay(messages[idx - 1].createdAt, msg.createdAt);

                  return (
                    <div key={msg.id}>
                      {/* Date separator */}
                      {showTimestamp && (
                        <div className="flex items-center justify-center py-3">
                          <span className="rounded-full bg-[var(--color-muted-deep)] px-3 py-1 text-[0.6875rem] font-medium text-[var(--color-ink-muted)] shadow-xs">
                            {new Date(msg.createdAt).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`relative max-w-[85%] rounded-2xl px-4 py-2.5 transition-shadow hover:shadow-sm ${
                            isOutgoing
                              ? 'rounded-br-md bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/15'
                              : 'rounded-bl-md bg-[var(--color-surface)] border border-[var(--color-border)]'
                          }`}
                        >
                          {/* Direction badge */}
                          <div className={`mb-1 flex items-center gap-1.5`}>
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full ${
                              isOutgoing
                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                                : 'bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400'
                            }`}>
                              {isOutgoing ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                            </div>
                            <span className={`text-[0.625rem] font-bold uppercase tracking-wider ${
                              isOutgoing ? 'text-[var(--color-primary)]' : 'text-blue-500'
                            }`}>
                              {isOutgoing ? t('contacts.detail.outgoing') : t('contacts.detail.incoming')}
                            </span>
                            <span className="text-[0.625rem] text-[var(--color-ink-muted)]">
                              · {msg.type}
                            </span>
                          </div>

                          {/* Message body */}
                          <p className="m-0 text-[0.8125rem] leading-relaxed text-[var(--color-ink)] break-words">
                            {msg.body || (
                              <span className="italic text-[var(--color-ink-muted)]">📎 {msg.type}</span>
                            )}
                          </p>

                          {/* Footer: timestamp + status */}
                          <div className="mt-1.5 flex items-center justify-end gap-1.5">
                            <span className="text-[0.625rem] text-[var(--color-ink-muted)]">
                              {formatMsgDate(msg.createdAt)}
                            </span>
                            {isOutgoing && <StatusIcon status={msg.status} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center pt-4 pb-2">
                    <button
                      className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-[0.8125rem] font-medium text-[var(--color-ink-secondary)] transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:shadow-sm cursor-pointer"
                      onClick={() => loadMessages(offset, true)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {t('contacts.detail.loadingMessages')}
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          {t('contacts.detail.loadMore')}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */

function InfoCard({
  icon,
  label,
  children,
  span,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3.5 transition-colors hover:border-[var(--color-border-strong)] ${
        span ? 'sm:col-span-2' : ''
      }`}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
        {icon}
        {label}
      </div>
      <p className="m-0 text-[0.8125rem] text-[var(--color-ink)] break-words">
        {children}
      </p>
    </div>
  );
}

function isSameDay(d1: string, d2: string): boolean {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
