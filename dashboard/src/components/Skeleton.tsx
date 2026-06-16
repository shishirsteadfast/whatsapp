interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rect' | 'circle';
  className?: string;
}

export function Skeleton({ width = '100%', height = '1rem', variant = 'rect', className = '' }: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  const variantClass = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded' : 'rounded-md';

  return (
    <div
      className={`animate-[shimmer_1.5s_infinite] bg-[linear-gradient(90deg,var(--border)_25%,rgba(0,0,0,0.05)_50%,var(--border)_75%)] bg-[length:200%_100%] dark:bg-[linear-gradient(90deg,var(--border)_25%,rgba(255,255,255,0.05)_50%,var(--border)_75%)] ${variantClass} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SessionCardSkeleton() {
  return (
    <div className="pointer-events-none">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton width={120} height={20} />
        <Skeleton width={80} height={24} variant="rect" />
      </div>
      <div className="mb-4 space-y-2">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={14} />
      </div>
      <div className="mb-4 flex gap-2">
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </div>
      <div className="flex gap-3">
        <Skeleton width={60} height={32} variant="rect" />
        <Skeleton width={60} height={32} variant="rect" />
        <Skeleton width={60} height={32} variant="rect" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-3 py-4">
          <Skeleton width={`${60 + Math.random() * 40}%`} height={16} />
        </td>
      ))}
    </tr>
  );
}
