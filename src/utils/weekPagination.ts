import { startOfDay, addDays, subDays, format, isBefore, isAfter } from 'date-fns';

export interface WeekBucket<T> {
  weekStart: Date; // Friday
  weekEnd: Date;   // Thursday
  label: string;   // e.g. "May 9 - May 15"
  reports: T[];
}

function parseDateSafe(raw: string | Date): Date | null {
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : startOfDay(raw);
  }
  const datePart = String(raw).split('T')[0]; // handle ISO strings safely
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day); // local date, no timezone shift
}

// Returns the Friday that starts the business week containing `date`.
// Fri(5)→0, Sat(6)→1, Sun(0)→2, Mon(1)→3, Tue(2)→4, Wed(3)→5, Thu(4)→6
export function getWeekFridayStart(date: Date): Date {
  const d = startOfDay(new Date(date));
  const day = d.getDay();
  const daysBack = day >= 5 ? day - 5 : day + 2;
  return subDays(d, daysBack);
}

export function getWeekThursdayEnd(fridayStart: Date): Date {
  return addDays(fridayStart, 6);
}

export function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
}

/**
 * Groups an array of reports into Friday→Thursday weekly buckets.
 * Buckets are sorted ascending (oldest first) for intuitive prev/next navigation.
 */
export function groupReportsByWeek<T>(
  reports: T[],
  getDate: (report: T) => string | Date | null | undefined
): WeekBucket<T>[] {
  const bucketMap = new Map<string, WeekBucket<T>>();

  for (const report of reports) {
    const raw = getDate(report);
    if (raw == null) continue;
    const date = parseDateSafe(raw instanceof Date ? raw : String(raw));
    if (!date) continue;

    const weekStart = getWeekFridayStart(date);
    const key = format(weekStart, 'yyyy-MM-dd');

    if (!bucketMap.has(key)) {
      const weekEnd = getWeekThursdayEnd(weekStart);
      bucketMap.set(key, {
        weekStart,
        weekEnd,
        label: formatWeekLabel(weekStart, weekEnd),
        reports: [],
      });
    }
    bucketMap.get(key)!.reports.push(report);
  }

  return Array.from(bucketMap.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );
}

/**
 * Returns the index of the bucket that contains today.
 * Falls back to the last (most recent) bucket if today is not in any bucket.
 */
export function getCurrentWeekBucketIndex<T>(buckets: WeekBucket<T>[]): number {
  if (buckets.length === 0) return 0;
  const today = startOfDay(new Date());
  for (let i = 0; i < buckets.length; i++) {
    if (!isBefore(today, buckets[i].weekStart) && !isAfter(today, buckets[i].weekEnd)) {
      return i;
    }
  }
  return buckets.length - 1; // default to most recent
}
