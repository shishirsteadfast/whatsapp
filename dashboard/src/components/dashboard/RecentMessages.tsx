import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, MessageSquare, ArrowRight } from 'lucide-react';
import type { Message } from '../../services/api';
import { formatRelativeTime } from '../../utils/time';

function truncate(str: string, len: number): string {
  return str.length <= len ? str : `${str.slice(0, len)}...`;
}

export function RecentMessages({ messages }: { messages: Message[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recent = messages.slice(0, 6);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
        <div>
          <h2 className="m-0 text-[0.9375rem] font-semibold text-[var(--color-ink)]">{t('dashboard.recentMessages.title')}</h2>
          <p className="m-0 mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">{t('dashboard.recentMessages.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate('/messages')}
          className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-[0.8125rem] font-semibold text-[var(--color-primary)] transition-all hover:gap-2"
        >
          {t('common.viewAll')} <ArrowRight size={14} />
        </button>
      </div>

      {recent.length === 0 ? (
        <div className="empty-state py-10">
          <MessageSquare size={30} strokeWidth={1.2} className="mb-2 opacity-25" />
          <p>{t('dashboard.recentMessages.empty')}</p>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {recent.map(msg => (
            <li
              key={msg.id}
              className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5 last:border-none"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.direction === 'outgoing'
                  ? 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]'
                  : 'bg-blue-500/10 text-blue-500'
              }`}>
                {msg.direction === 'outgoing' ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[0.8125rem] text-[var(--color-ink)]" title={msg.body}>
                  {msg.body ? truncate(msg.body, 48) : <span className="italic text-[var(--color-ink-muted)]">{msg.type}</span>}
                </p>
                <p className="m-0 truncate font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                  {msg.chatId.replace('@c.us', '').replace('@g.us', '')}
                </p>
              </div>
              <span className="shrink-0 text-[0.6875rem] text-[var(--color-ink-muted)]">{formatRelativeTime(msg.createdAt, t)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
