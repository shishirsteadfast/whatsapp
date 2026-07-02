import type { TFunction } from 'i18next';

export function formatRelativeTime(date: string | number | undefined, t: TFunction): string {
  if (!date) return t('common.never');
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60_000) return t('common.justNow');
  if (diff < 3_600_000) return t('common.minAgo', { count: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t('common.hoursAgo', { count: Math.floor(diff / 3_600_000) });
  return new Date(date).toLocaleDateString();
}
