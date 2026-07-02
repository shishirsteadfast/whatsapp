import type { Message } from '../services/api';

export interface DailyVolumePoint {
  date: string;
  label: string;
  incoming: number;
  outgoing: number;
}

/** Buckets messages into the trailing `days` calendar days (oldest first). */
export function bucketMessagesByDay(messages: Message[], days: number): DailyVolumePoint[] {
  const buckets = new Map<string, DailyVolumePoint>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      incoming: 0,
      outgoing: 0,
    });
  }

  for (const msg of messages) {
    const key = new Date(msg.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (msg.direction === 'incoming') bucket.incoming += 1;
    else bucket.outgoing += 1;
  }

  return Array.from(buckets.values());
}

export function countMessagesToday(messages: Message[]): number {
  const todayKey = new Date().toISOString().slice(0, 10);
  return messages.filter(m => new Date(m.createdAt).toISOString().slice(0, 10) === todayKey).length;
}

export interface StatusCount {
  status: Message['status'];
  count: number;
}

const STATUS_ORDER: Message['status'][] = ['pending', 'sent', 'delivered', 'read', 'failed'];

export function countMessagesByStatus(messages: Message[]): StatusCount[] {
  const counts: Record<string, number> = {};
  for (const msg of messages) counts[msg.status] = (counts[msg.status] ?? 0) + 1;
  return STATUS_ORDER
    .map(status => ({ status, count: counts[status] ?? 0 }))
    .filter(entry => entry.count > 0);
}
