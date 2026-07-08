import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { StatusCount } from '../../utils/dashboardMetrics';
import type { Message } from '../../services/api';

const STATUS_COLOR: Record<Message['status'], string> = {
  pending: 'var(--color-ink-muted)',
  sent: '#3b82f6',
  delivered: '#f59e0b',
  read: 'var(--color-primary)',
  failed: 'var(--color-error)',
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { fill: string };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[0.75rem] shadow-[var(--shadow-md)]">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.payload.fill }} />
        <span className="text-[var(--color-ink-secondary)]">{item.name}</span>
        <span className="ml-auto font-semibold tabular-nums text-[var(--color-ink)]">{item.value}</span>
      </div>
    </div>
  );
}

export function MessageStatusChart({ data, sampleSize }: { data: StatusCount[]; sampleSize: number }) {
  const { t } = useTranslation();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="card p-5">
      <h2 className="m-0 text-[0.9375rem] font-semibold text-[var(--color-ink)]">{t('dashboard.charts.messageStatus.title')}</h2>
      <p className="m-0 mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">
        {t('dashboard.charts.messageStatus.subtitle', { count: sampleSize })}
      </p>

      {total === 0 ? (
        <div className="empty-state py-10">
          <p>{t('dashboard.noChartData')}</p>
        </div>
      ) : (
        <>
          <div className="mx-auto mt-2 h-[180px] w-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  cornerRadius={4}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                >
                  {data.map(entry => (
                    <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend — direct labels with counts + share, satisfying the relief rule */}
          <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {data.map(entry => (
              <li key={entry.status} className="flex items-center gap-2 text-[0.8125rem]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[entry.status] }} />
                <span className="text-[var(--color-ink-secondary)]">{t(`messageStatus.${entry.status}`)}</span>
                <span className="ml-auto font-semibold tabular-nums text-[var(--color-ink)]">{entry.count}</span>
                <span className="w-11 text-right tabular-nums text-[var(--color-ink-muted)]">
                  {Math.round((entry.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
