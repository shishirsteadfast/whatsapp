import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { DailyVolumePoint } from '../../utils/dashboardMetrics';

const INCOMING_COLOR = '#3b82f6';
const OUTGOING_COLOR = 'var(--color-primary)';

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[0.75rem] shadow-[var(--shadow-md)]">
      <p className="m-0 mb-1.5 font-semibold text-[var(--color-ink)]">{label}</p>
      {payload.map(item => (
        <div key={item.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="text-[var(--color-ink-secondary)]">{item.name}</span>
          <span className="ml-auto font-semibold tabular-nums text-[var(--color-ink)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MessageVolumeChart({ data }: { data: DailyVolumePoint[] }) {
  const { t } = useTranslation();
  const hasData = data.some(d => d.incoming > 0 || d.outgoing > 0);

  return (
    <div className="card p-5">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="m-0 text-[0.9375rem] font-semibold text-[var(--color-ink)]">{t('dashboard.charts.messageVolume.title')}</h2>
          <p className="m-0 mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">{t('dashboard.charts.messageVolume.subtitle')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3.5">
          <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-ink-secondary)]">
            <span className="h-2 w-2 rounded-full" style={{ background: OUTGOING_COLOR }} />
            {t('dashboard.charts.messageVolume.outgoing')}
          </span>
          <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-ink-secondary)]">
            <span className="h-2 w-2 rounded-full" style={{ background: INCOMING_COLOR }} />
            {t('dashboard.charts.messageVolume.incoming')}
          </span>
        </div>
      </div>

      {hasData ? (
        <div className="mt-3 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="fillOutgoing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={OUTGOING_COLOR} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={OUTGOING_COLOR} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillIncoming" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={INCOMING_COLOR} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={INCOMING_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--color-ink-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--color-ink-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="outgoing"
                name={t('dashboard.charts.messageVolume.outgoing')}
                stroke={OUTGOING_COLOR}
                strokeWidth={2}
                fill="url(#fillOutgoing)"
              />
              <Area
                type="monotone"
                dataKey="incoming"
                name={t('dashboard.charts.messageVolume.incoming')}
                stroke={INCOMING_COLOR}
                strokeWidth={2}
                fill="url(#fillIncoming)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-state py-10">
          <p>{t('dashboard.noChartData')}</p>
        </div>
      )}
    </div>
  );
}
