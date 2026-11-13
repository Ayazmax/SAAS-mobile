export interface JobListItem {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  notes?: string | null;
  customer?: { displayName: string };
  property?: {
    name: string;
    addressLine1?: string;
    city?: string;
    timezone?: string;
  };
  service?: { name: string; durationMinutes?: number };
}

export type ChecklistItemStatus = 'PENDING' | 'DONE' | 'SKIPPED';

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  status: ChecklistItemStatus | string;
}

export interface JobNoteEntry {
  id: string;
  kind: string;
  body: string;
}

export interface JobDetail extends JobListItem {
  customer?: { displayName: string; primaryPhone?: string | null };
  property?: {
    name: string;
    addressLine1?: string;
    city?: string;
    timezone?: string;
    instructions?: Array<{
      id: string;
      title: string;
      category: string;
      content?: string;
    }>;
    rooms?: Array<{ id: string; name: string }>;
  };
  service?: { id?: string; name: string; durationMinutes?: number };
  checklist?: {
    id: string;
    items: ChecklistItem[];
  } | null;
  notesLog?: JobNoteEntry[];
}

export function requiredChecklistIncomplete(job: JobDetail): ChecklistItem[] {
  return (job.checklist?.items ?? []).filter(
    (item) => item.required && item.status !== 'DONE',
  );
}

export function canStartJob(status: string): boolean {
  return status === 'CONFIRMED' || status === 'IN_PROGRESS';
}

export function canRunInProgressActions(status: string): boolean {
  return status === 'IN_PROGRESS';
}

export type ScheduleRange = 'day' | 'week';

export function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatJobWhen(iso: string, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timeZone || undefined,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function formatJobTimeRange(
  startsAt: string,
  endsAt: string,
  timeZone?: string,
): string {
  try {
    const start = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timeZone || undefined,
    }).format(new Date(startsAt));
    const end = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timeZone || undefined,
    }).format(new Date(endsAt));
    return `${start} – ${end}`;
  } catch {
    return `${new Date(startsAt).toLocaleTimeString()} – ${new Date(endsAt).toLocaleTimeString()}`;
  }
}

export function addressLine(job: JobListItem): string {
  const parts = [job.property?.addressLine1, job.property?.city].filter(Boolean);
  return parts.join(', ') || job.property?.name || 'Address not set';
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

/** Week starts Monday to match the office calendar default. */
export function rangeBounds(range: ScheduleRange, now = new Date()): { from: Date; to: Date } {
  const dayStart = startOfLocalDay(now);
  if (range === 'day') {
    return { from: dayStart, to: addDays(dayStart, 1) };
  }
  const weekday = (dayStart.getDay() + 6) % 7; // Mon=0 … Sun=6
  const weekStart = addDays(dayStart, -weekday);
  return { from: weekStart, to: addDays(weekStart, 7) };
}

export function filterJobsInRange(
  jobs: JobListItem[],
  range: ScheduleRange,
  now = new Date(),
): JobListItem[] {
  const { from, to } = rangeBounds(range, now);
  return jobs.filter((job) => {
    const start = new Date(job.startsAt).getTime();
    return start >= from.getTime() && start < to.getTime();
  });
}

export function rangeLabel(range: ScheduleRange, now = new Date()): string {
  const { from, to } = rangeBounds(range, now);
  const end = addDays(to, -1);
  if (range === 'day') {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(from);
  }
  const left = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(from);
  const right = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(end);
  return `${left} – ${right}`;
}
