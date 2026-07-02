import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const SENT_COLOR = 'var(--color-primary)';
const FAILED_COLOR = 'var(--color-error)';

export interface CampaignBarDatum {
  name: string;
  sent: number;
  failed: number;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[0.75rem] shadow-[var(--shadow-md)]">
      <p className="m-0 mb-1.5 max-w-[180px] truncate font-semibold text-[var(--color-ink)]">{label}</p>
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

export function CampaignPerformanceChart({ data }: { data: CampaignBarDatum[] }) {
  const { t } = useTranslation();

  return (
    <div className="card p-5">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="m-0 text-[0.9375rem] font-semibold text-[var(--color-ink)]">{t('dashboard.charts.campaignPerformance.title')}</h2>
          <p className="m-0 mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">{t('dashboard.charts.campaignPerformance.subtitle')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3.5">
          <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-ink-secondary)]">
            <span className="h-2 w-2 rounded-full" style={{ background: SENT_COLOR }} />
            {t('dashboard.charts.campaignPerformance.sent')}
          </span>
          <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-ink-secondary)]">
            <span className="h-2 w-2 rounded-full" style={{ background: FAILED_COLOR }} />
            {t('dashboard.charts.campaignPerformance.failed')}
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="empty-state py-10">
          <p>{t('dashboard.charts.campaignPerformance.empty')}</p>
        </div>
      ) : (
        <div className="mt-3 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="24%" barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--color-ink-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                interval={0}
                tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 12)}…` : v)}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--color-ink-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-muted)' }} />
              <Bar dataKey="sent" name={t('dashboard.charts.campaignPerformance.sent')} fill={SENT_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="failed" name={t('dashboard.charts.campaignPerformance.failed')} fill={FAILED_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
