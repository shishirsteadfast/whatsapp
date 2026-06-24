import { useEffect, useRef } from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';

// ─── Link Detection ───────────────────────────────────────────────────

const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,:;!?)\]}>])/gi;

function FormattedText({ text }: { text: string }) {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(URL_REGEX.source, 'gi');
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    const url = match[0];
    parts.push(
      <a
        key={key++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#5b8ef5] dark:text-[#7aa2f7] hover:underline"
        onClick={e => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    lastIndex = match.index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts.length > 0 ? parts : text}</>;
}

// ─── Types ────────────────────────────────────────────────────────────

export interface WhatsAppPreviewMessage {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  content: string;
  caption?: string;
  mediaUrl?: string;
  fileName?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactNumber?: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isOutgoing: boolean;
}

export interface WhatsAppPreviewData {
  contactName: string;
  contactAvatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
  messages: WhatsAppPreviewMessage[];
}

// ─── Theme Colors ─────────────────────────────────────────────────────

const themeColors = (dark: boolean) => ({
  bg: dark ? '#0b141a' : '#efeae2',
  headerBg: dark ? '#202c33' : '#f0f2f5',
  headerText: dark ? '#e9edef' : '#111b21',
  headerSecondary: dark ? '#8696a0' : '#667781',
  headerIcon: dark ? '#aebac1' : '#54656f',
  incomingBg: dark ? '#202c33' : '#ffffff',
  incomingText: dark ? '#e9edef' : '#111b21',
  outgoingBg: dark ? '#005c4b' : '#d9fdd3',
  outgoingText: dark ? '#e9edef' : '#111b21',
  timestamp: dark ? '#8796a0' : '#667781',
  statusSent: dark ? '#8796a0' : '#8696a0',
  statusRead: dark ? '#53bdeb' : '#53bdeb',
  dateBg: dark ? '#182229' : '#e7f8ff',
  dateText: dark ? '#8696a0' : '#54656f',
  inputBg: dark ? '#202c33' : '#f0f2f5',
  inputFieldBg: dark ? '#2a3942' : '#ffffff',
  inputText: dark ? '#d1d7db' : '#667781',
  patternOpacity: dark ? '0.04' : '0.06',
  patternFill: dark ? '%23fff' : '%23000',
  shadow: dark ? '0 1px 1px rgba(0,0,0,0.2)' : '0 1px 1px rgba(0,0,0,0.05)',
});

// ─── Status Icon ──────────────────────────────────────────────────────

function StatusIcon({ status, dark }: { status: WhatsAppPreviewMessage['status']; dark: boolean }) {
  const c = themeColors(dark);
  const color = status === 'read' ? c.statusRead : c.statusSent;
  if (status === 'sending') return <Clock size={12} style={{ color }} />;
  if (status === 'sent') return <Check size={12} style={{ color }} />;
  if (status === 'delivered') return <CheckCheck size={12} style={{ color }} />;
  return <CheckCheck size={12} style={{ color }} />;
}

// ─── Time formatter ──────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Message Bubble ───────────────────────────────────────────────────

function MessageBubble({ msg, dark }: { msg: WhatsAppPreviewMessage; dark: boolean }) {
  const c = themeColors(dark);
  return (
    <div className={`flex ${msg.isOutgoing ? 'justify-end' : 'justify-start'} mb-1.5 px-3`}>
      <div
        className={`relative max-w-[75%] rounded-lg px-3 py-1.5 text-[0.8125rem] leading-[1.4] shadow-sm ${
          msg.isOutgoing ? 'rounded-tr-sm' : 'rounded-tl-sm'
        }`}
        style={{
          background: msg.isOutgoing ? c.outgoingBg : c.incomingBg,
          boxShadow: msg.isOutgoing ? 'none' : c.shadow,
        }}
      >
        {msg.type === 'text' && (
          <p className="m-0 whitespace-pre-wrap break-words" style={{ color: msg.isOutgoing ? c.outgoingText : c.incomingText }}>
            <FormattedText text={msg.content} />
          </p>
        )}

        {msg.type === 'image' && (
          <div>
            <div className="mb-1 overflow-hidden rounded-md" style={{ background: dark ? '#1a2733' : '#e5e7eb' }}>
              <div
                className="h-32 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${msg.mediaUrl || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Image'})` }}
              />
            </div>
            {msg.caption && <p className="m-0" style={{ color: c.outgoingText }}>{msg.caption}</p>}
          </div>
        )}

        {msg.type === 'video' && (
          <div>
            <div className="relative mb-1 overflow-hidden rounded-md bg-black">
              <div
                className="h-32 w-full bg-cover bg-center opacity-80"
                style={{ backgroundImage: `url(${msg.mediaUrl || 'https://placehold.co/400x300/1e293b/64748b?text=Video'})` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            </div>
            {msg.caption && <p className="m-0" style={{ color: c.outgoingText }}>{msg.caption}</p>}
          </div>
        )}

        {msg.type === 'audio' && (
          <div className="flex items-center gap-2 min-w-[180px]">
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a884]">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <div className="flex-1">
              <div className="h-1 rounded-full" style={{ background: dark ? '#374045' : '#e9edef' }}>
                <div className="h-1 w-1/3 rounded-full bg-[#00a884]" />
              </div>
              <div className="mt-1 flex justify-between text-[0.625rem]" style={{ color: c.timestamp }}>
                <span>0:05</span>
                <span>{msg.fileName || 'audio.ogg'}</span>
              </div>
            </div>
          </div>
        )}

        {msg.type === 'document' && (
          <div className="flex items-center gap-2.5 min-w-[160px]">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#00a884]/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#00a884]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[0.8125rem] font-medium" style={{ color: msg.isOutgoing ? c.outgoingText : c.incomingText }}>{msg.fileName || 'document.pdf'}</p>
              <p className="m-0 text-[0.625rem]" style={{ color: c.timestamp }}>Document</p>
            </div>
          </div>
        )}

        {msg.type === 'location' && (
          <div>
            <div className="relative mb-1 overflow-hidden rounded-md">
              <div
                className="h-28 w-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://placehold.co/400x280/d1d5db/6b7280?text=${encodeURIComponent(msg.content || '📍 Location')})`,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-7 w-7 drop-shadow-lg" fill="#ef4444"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              </div>
            </div>
            <p className="m-0 font-medium" style={{ color: c.outgoingText }}>{msg.content}</p>
            {msg.latitude && msg.longitude && (
              <p className="m-0 text-[0.6875rem]" style={{ color: c.timestamp }}>{msg.latitude.toFixed(4)}, {msg.longitude.toFixed(4)}</p>
            )}
          </div>
        )}

        {msg.type === 'contact' && (
          <div className="flex items-center gap-2.5 min-w-[160px]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884]/10">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#00a884]"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[0.8125rem] font-medium" style={{ color: msg.isOutgoing ? c.outgoingText : c.incomingText }}>{msg.contactName || 'Contact'}</p>
              <p className="m-0 text-[0.625rem]" style={{ color: c.timestamp }}>{msg.contactNumber || ''}</p>
            </div>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#00a884]"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          </div>
        )}

        {/* Timestamp + Status row */}
        <div className="-mr-1 -mb-1 mt-0.5 flex items-center justify-end gap-1">
          <span style={{ color: c.timestamp, fontSize: '0.625rem' }}>{formatTime(msg.timestamp)}</span>
          {msg.isOutgoing && <StatusIcon status={msg.status} dark={dark} />}
        </div>
      </div>
    </div>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────

function DateSeparator({ date, dark }: { date: Date; dark: boolean }) {
  const c = themeColors(dark);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  let label: string;
  if (isToday) label = 'Today';
  else if (isYesterday) label = 'Yesterday';
  else label = date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex justify-center py-2">
      <span
        className="rounded px-2 py-0.5 text-[0.7rem] shadow-sm"
        style={{ background: c.dateBg, color: c.dateText }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

interface IPhonePreviewProps {
  data: WhatsAppPreviewData;
  showEmptyState?: boolean;
  isDark?: boolean;
}

export function IPhonePreview({ data, showEmptyState, isDark = false }: IPhonePreviewProps) {
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const c = themeColors(isDark);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data.messages.length]);

  return (
    <div className="flex items-center justify-center">
      {/* iPhone 16 Pro Max Frame */}
      <div className="relative" style={{ width: 330, height: 676 }}>
        {/* Phone Image Bezel */}
        <img
          src="/iphone_16_pro_max.webp"
          alt="iPhone 16 Pro Max"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          draggable={false}
          style={{ objectFit: 'fill' }}
        />

        {/* Screen Content - positioned to match the image */}
        <div
          className="absolute overflow-hidden rounded-[2px]"
          style={{
            top: '8.5%',
            left: '5%',
            width: '90%',
            height: '83%',
            background: c.bg,
          }}
        >
          {/* WhatsApp Chat Interface */}
          <div className="flex h-full flex-col">
            {/* WhatsApp Background Pattern */}
            <div
              className="absolute inset-0"
              style={{
                opacity: c.patternOpacity,
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='${c.patternFill}' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* ── Chat Header ── */}
            <div
              className="relative z-10 flex items-center gap-2 px-3 py-2"
              style={{
                background: c.headerBg,
                boxShadow: `0 1px 3px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`,
              }}
            >
              {/* Back arrow */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 cursor-pointer" style={{ fill: c.headerIcon }}><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
              {/* Avatar */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{ background: isDark ? '#2a3942' : '#dfe5e7', color: c.headerSecondary }}
              >
                {data.contactAvatar ? (
                  <img src={data.contactAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  (data.contactName?.[0] || '?').toUpperCase()
                )}
              </div>
              {/* Name + Status */}
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[0.85rem] font-semibold" style={{ color: c.headerText }}>
                  {data.contactName || 'Contact'}
                </p>
                <p className="m-0 text-[0.65rem]" style={{ color: c.headerSecondary }}>
                  {data.isOnline ? 'online' : data.lastSeen || ''}
                </p>
              </div>
              {/* Menu icons */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 cursor-pointer" style={{ fill: c.headerIcon }}><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              <svg viewBox="0 0 24 24" className="h-5 w-5 cursor-pointer" style={{ fill: c.headerIcon }}><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </div>

            {/* ── Messages Area ── */}
            <div className="relative z-10 flex-1 overflow-y-auto px-1 py-1">
              {showEmptyState && data.messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#00a884]/10">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 fill-[#00a884]"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>
                  </div>
                  <p className="m-0 text-[0.8125rem]" style={{ color: c.timestamp }}>No messages yet</p>
                  <p className="mt-1 text-[0.6875rem]" style={{ color: c.statusSent }}>Send a message to start the conversation</p>
                </div>
              ) : null}

              {data.messages.length > 0 && (
                <>
                  <DateSeparator date={data.messages[0].timestamp} dark={isDark} />
                  {data.messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} dark={isDark} />
                  ))}
                </>
              )}

              {/* Typing indicator */}
              {data.isOnline && data.messages.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1">
                  <div className="flex h-3 w-3 items-center justify-center">
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8696a0] [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8696a0] [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8696a0] [animation-delay:300ms]" />
                    </span>
                  </div>
                  <span className="text-[0.625rem] italic" style={{ color: c.statusSent }}>typing</span>
                </div>
              )}
              <div ref={msgsEndRef} />
            </div>

            {/* ── Chat Input Bar ── */}
            <div
              className="relative z-10 flex items-center gap-2 px-3 py-1.5"
              style={{ background: c.inputBg }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 cursor-pointer" style={{ fill: c.headerIcon }}><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
              <div
                className="flex-1 rounded-lg px-3 py-1.5 shadow-sm"
                style={{ background: c.inputFieldBg }}
              >
                <p className="m-0 text-[0.75rem]" style={{ color: c.inputText }}>Type a message</p>
              </div>
              <svg viewBox="0 0 24 24" className="h-5 w-5 cursor-pointer" style={{ fill: c.headerIcon }}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </div>

            {/* Status Bar (fake) */}
            <div className="absolute left-0 right-0 top-0 z-20 flex justify-between px-6 pt-1 text-[0.5rem] font-semibold text-white">
              <span>9:41</span>
              <div className="flex items-center gap-0.5">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
