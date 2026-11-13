import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import { addressLine, type JobListItem } from './jobs';

const enabledKey = 'dw_calendar_sync_enabled';
const calendarIdKey = 'dw_calendar_id';
const eventMapKey = 'dw_calendar_event_map';
const lastSyncedKey = 'dw_calendar_last_synced';
const calendarTitle = 'DreamWare Cleaner';

export interface CalendarSyncStatus {
  enabled: boolean;
  calendarId: string | null;
  lastSyncedAt: string | null;
  eventCount: number;
  platformHint: string;
}

type EventMap = Record<string, string>;

export async function getCalendarSyncStatus(): Promise<CalendarSyncStatus> {
  const [enabled, calendarId, mapRaw, lastSyncedAt] = await Promise.all([
    AsyncStorage.getItem(enabledKey),
    AsyncStorage.getItem(calendarIdKey),
    AsyncStorage.getItem(eventMapKey),
    AsyncStorage.getItem(lastSyncedKey),
  ]);
  let eventCount = 0;
  if (mapRaw) {
    try {
      eventCount = Object.keys(JSON.parse(mapRaw) as EventMap).length;
    } catch {
      eventCount = 0;
    }
  }
  return {
    enabled: enabled === '1',
    calendarId,
    lastSyncedAt,
    eventCount,
    platformHint:
      Platform.OS === 'ios'
        ? 'Events are written to Apple Calendar (EventKit).'
        : 'Events are written to your device calendar (often Google Calendar on Android).',
  };
}

export async function enableCalendarSync(): Promise<CalendarSyncStatus> {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Calendar permission is required to sync visits.');
  }
  const calendarId = await ensureDreamWareCalendar();
  await AsyncStorage.setItem(enabledKey, '1');
  await AsyncStorage.setItem(calendarIdKey, calendarId);
  return getCalendarSyncStatus();
}

export async function disableCalendarSync(removeEvents = true): Promise<CalendarSyncStatus> {
  if (removeEvents) {
    const map = await readEventMap();
    for (const eventId of Object.values(map)) {
      try {
        await Calendar.deleteEventAsync(eventId);
      } catch {
        // Event may already be deleted in the system calendar.
      }
    }
    await AsyncStorage.removeItem(eventMapKey);
  }
  await AsyncStorage.setItem(enabledKey, '0');
  await AsyncStorage.removeItem(calendarIdKey);
  await AsyncStorage.removeItem(lastSyncedKey);
  return getCalendarSyncStatus();
}

export async function syncJobsToCalendar(
  jobs: JobListItem[],
): Promise<{ written: number; removed: number }> {
  const enabled = (await AsyncStorage.getItem(enabledKey)) === '1';
  if (!enabled) return { written: 0, removed: 0 };

  const permission = await Calendar.getCalendarPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Calendar permission was revoked. Enable sync again from Account.');
  }

  let calendarId = await AsyncStorage.getItem(calendarIdKey);
  if (!calendarId) {
    calendarId = await ensureDreamWareCalendar();
    await AsyncStorage.setItem(calendarIdKey, calendarId);
  }

  const map = await readEventMap();
  const seen = new Set<string>();
  let written = 0;

  for (const job of jobs) {
    seen.add(job.id);
    const details = eventDetailsForJob(job);
    const existingId = map[job.id];
    if (existingId) {
      try {
        await Calendar.updateEventAsync(existingId, details);
        written += 1;
        continue;
      } catch {
        delete map[job.id];
      }
    }
    const createdId = await Calendar.createEventAsync(calendarId, details);
    map[job.id] = createdId;
    written += 1;
  }

  let removed = 0;
  for (const [bookingId, eventId] of Object.entries(map)) {
    if (seen.has(bookingId)) continue;
    try {
      await Calendar.deleteEventAsync(eventId);
    } catch {
      // Already gone.
    }
    delete map[bookingId];
    removed += 1;
  }

  await writeEventMap(map);
  await AsyncStorage.setItem(lastSyncedKey, new Date().toISOString());
  return { written, removed };
}

async function ensureDreamWareCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find(
    (calendar) => calendar.title === calendarTitle && calendar.allowsModifications,
  );
  if (existing) return existing.id;

  const defaultCalendar = calendars.find(
    (calendar) =>
      calendar.allowsModifications &&
      (calendar.isPrimary || calendar.source?.name === 'Default'),
  );

  if (Platform.OS === 'ios') {
    const sources = await Calendar.getSourcesAsync();
    const local =
      sources.find((source) => source.type === Calendar.SourceType.LOCAL) ??
      sources.find((source) => source.name === 'Default') ??
      sources[0];
    if (!local) {
      throw new Error('No calendar source is available on this device.');
    }
    return Calendar.createCalendarAsync({
      title: calendarTitle,
      color: '#064e3b',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: local.id,
      source: local,
      name: calendarTitle,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  }

  const androidOwner =
    defaultCalendar?.ownerAccount ?? defaultCalendar?.source?.name ?? 'DreamWare';
  return Calendar.createCalendarAsync({
    title: calendarTitle,
    color: '#064e3b',
    entityType: Calendar.EntityTypes.EVENT,
    source: defaultCalendar?.source ?? {
      isLocalAccount: true,
      name: 'DreamWare',
      type: Calendar.SourceType.LOCAL,
    },
    name: calendarTitle,
    ownerAccount: androidOwner,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

type CalendarEventDetails = NonNullable<Parameters<typeof Calendar.createEventAsync>[1]>;

function eventDetailsForJob(job: JobListItem): CalendarEventDetails {
  const service = job.service?.name ?? 'Cleaning';
  const place = job.property?.name ?? 'Visit';
  const customer = job.customer?.displayName;
  const timeZone = job.property?.timezone || job.timezone || undefined;
  return {
    title: customer ? `${service} · ${customer}` : `${service} · ${place}`,
    location: addressLine(job),
    notes: [
      'Synced from DreamWare Cleaner.',
      job.notes ? `Notes: ${job.notes}` : null,
      `Status: ${job.status}`,
    ]
      .filter(Boolean)
      .join('\n'),
    startDate: new Date(job.startsAt),
    endDate: new Date(job.endsAt),
    ...(timeZone ? { timeZone } : {}),
  };
}

async function readEventMap(): Promise<EventMap> {
  const raw = await AsyncStorage.getItem(eventMapKey);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as EventMap;
  } catch {
    return {};
  }
}

async function writeEventMap(map: EventMap): Promise<void> {
  await AsyncStorage.setItem(eventMapKey, JSON.stringify(map));
}
