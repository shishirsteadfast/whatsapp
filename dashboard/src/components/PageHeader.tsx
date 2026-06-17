import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4 max-sm:flex-col">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="m-0 text-[1.625rem] font-bold tracking-tight text-[var(--color-ink)] max-sm:text-[1.375rem]">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1 m-0 text-[0.875rem] text-[var(--color-ink-muted)] leading-snug">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2.5 max-sm:w-full max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center">
          {actions}
        </div>
      )}
    </div>
  );
}
