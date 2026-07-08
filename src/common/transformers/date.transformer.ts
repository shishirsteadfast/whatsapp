import { ValueTransformer } from 'typeorm';

/**
 * SQLite date transformer — stores dates as ISO string TEXT,
 * converts to/from Date on the way in and out.
 */
export const DateTransformer: ValueTransformer = {
  from: (value: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(value);
  },
  to: (value: Date | null): string | Date | null => {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
};
