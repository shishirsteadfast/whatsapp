import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 max-sm:flex-col max-sm:items-start">
        <div className="flex items-center gap-3">
          <h1 className="m-0 text-[1.875rem] font-bold tracking-tight text-ink max-sm:text-2xl">{title}</h1>
          {badge && <span className="inline-flex">{badge}</span>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3 max-sm:w-full max-sm:[&>:is(button,.btn-primary,.btn-secondary)]:w-full max-sm:[&>:is(button,.btn-primary,.btn-secondary)]:justify-center">{actions}</div>}
      </div>
      {subtitle && <p className="mt-2 text-[0.9375rem] leading-1.5 text-ink-muted max-sm:text-sm">{subtitle}</p>}
    </header>
  );
}
