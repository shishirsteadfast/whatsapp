import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search, ChevronLeft, ChevronRight, Loader2,
  Send, ArrowDownLeft, ArrowUpRight, MessageSquare, Filter,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PageHeader } from '../components/PageHeader';
import { useMessagesQuery } from '../hooks/queries';
import { useSessionsQuery } from '../hooks/queries';
import type { Message } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}

function statusColor(status: string): string {
  switch (status) {
    case 'sent': return 'text-[var(--color-primary)]';
    case 'delivered': return 'text-blue-500';
    case 'read': return 'text-green-600 dark:text-green-400';
    case 'failed': return 'text-red-500';
    case 'pending': return 'text-[var(--color-ink-muted)]';
    default: return 'text-[var(--color-ink-muted)]';
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'image': return '🖼️';
    case 'video': return '🎬';
    case 'audio': return '🎵';
    case 'document': return '📄';
    case 'location': return '📍';
    case 'contact': return '📇';
    case 'sticker': return '😀';
    default: return '💬';
  }
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function Messages() {
  const { t } = useTranslation();
  useDocumentTitle('Messages');

  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sessionFilter, setSessionFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const { data: sessions = [] } = useSessionsQuery();

  const { data: messages = [], isLoading } = useMessagesQuery({
    limit: 200,
    direction: directionFilter || undefined,
    sessionId: sessionFilter || undefined,
    status: statusFilter || undefined,
  });

  useEffect(() => { setCurrentPage(1); }, [directionFilter, statusFilter, sessionFilter]);

  const filtered = useMemo(() => {
    if (!search) return messages;
    const q = search.toLowerCase();
    return messages.filter(m =>
      (m.body ?? '').toLowerCase().includes(q) ||
      m.chatId.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      m.to.toLowerCase().includes(q)
    );
  }, [messages, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const paginated = filtered.slice(startIdx, startIdx + perPage);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + perPage, filtered.length);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={28} />
      </div>
    );
  }

  return (
    <div className="w-full p-7 max-sm:p-4">
      <PageHeader
        title="Messages"
        subtitle="View all sent and received messages"
      />

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="search-bar max-w-[300px] flex-1 max-sm:max-w-none">
          <Search size={15} className="shrink-0 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-[var(--color-ink-muted)]" />
          <select
            value={directionFilter}
            onChange={e => setDirectionFilter(e.target.value)}
            className="cursor-pointer rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)]"
          >
            <option value="">All Directions</option>
            <option value="outgoing">Outgoing</option>
            <option value="incoming">Incoming</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="cursor-pointer rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)]"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={sessionFilter}
            onChange={e => setSessionFilter(e.target.value)}
            className="cursor-pointer rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)]"
          >
            <option value="">All Sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.phone ? ` (${s.phone})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-muted)]">
              <MessageSquare size={26} strokeWidth={1.2} className="text-[var(--color-ink-muted)]" />
            </div>
            <h3>No messages found</h3>
            <p>{messages.length === 0 ? 'No messages have been sent or received yet.' : 'No messages match your filters.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 700 }}>
              {/* Header */}
              <div className="table-header grid-cols-[50px_80px_1fr_160px_120px_100px_140px]">
                <span></span>
                <span>Type</span>
                <span>Content</span>
                <span>Chat</span>
                <span>Status</span>
                <span>Direction</span>
                <span>Time</span>
              </div>

              {/* Rows */}
              {paginated.map(msg => (
                <div
                  key={msg.id}
                  className="table-row-base grid-cols-[50px_80px_1fr_160px_120px_100px_140px]"
                >
                  {/* Direction icon */}
                  <div className="flex items-center justify-center">
                    {msg.direction === 'outgoing'
                      ? <ArrowUpRight size={16} className="text-[var(--color-primary)]" />
                      : <ArrowDownLeft size={16} className="text-blue-500" />
                    }
                  </div>

                  {/* Type */}
                  <span className="text-[0.875rem]">{typeIcon(msg.type)} {msg.type}</span>

                  {/* Content */}
                  <span className="truncate text-[0.8125rem] text-[var(--color-ink)]" title={msg.body}>
                    {msg.body ? truncate(msg.body, 60) : <span className="text-[var(--color-ink-muted)]">—</span>}
                  </span>

                  {/* Chat */}
                  <span className="truncate font-mono text-[0.75rem] text-[var(--color-ink-secondary)]" title={msg.chatId}>
                    {msg.chatId.replace('@c.us', '').replace('@g.us', '')}
                  </span>

                  {/* Status */}
                  <span className={`text-[0.8125rem] font-medium capitalize ${statusColor(msg.status)}`}>
                    {msg.status}
                  </span>

                  {/* Direction */}
                  <span className="text-[0.8125rem] text-[var(--color-ink-secondary)] capitalize">
                    {msg.direction}
                  </span>

                  {/* Time */}
                  <span className="text-[0.75rem] text-[var(--color-ink-muted)]">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-[0.8125rem] text-[var(--color-ink-muted)]">
            <span>
              Showing {showingFrom} to {showingTo} of {filtered.length} messages
            </span>
            <div className="flex items-center gap-1.5">
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="cursor-pointer rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-dim)]"
              >
                {[10, 20, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="whitespace-nowrap text-[0.8125rem] text-[var(--color-ink-muted)]">per page</span>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft size={15} />
              </button>

              {(() => {
                const pages: (number | '...')[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (safePage > 3) pages.push('...');
                  const rangeStart = Math.max(2, safePage - 1);
                  const rangeEnd = Math.min(totalPages - 1, safePage + 1);
                  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
                  if (safePage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, idx) =>
                  p === '...' ? (
                    <span key={`e${idx}`} className="flex h-8 w-8 items-center justify-center text-[0.8125rem] text-[var(--color-ink-muted)]">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border text-[0.8125rem] font-medium transition-all ${
                        p === safePage
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_2px_8px_rgba(37,211,102,0.3)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-muted)]'
                      }`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}

              <button
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
