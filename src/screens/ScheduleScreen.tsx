import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import { ApiRequestError, listMyJobs } from '../lib/api';
import { getCalendarSyncStatus, syncJobsToCalendar } from '../lib/calendar-sync';
import {
  addressLine,
  filterJobsInRange,
  formatJobTimeRange,
  formatJobWhen,
  formatStatus,
  rangeLabel,
  type JobListItem,
  type ScheduleRange,
} from '../lib/jobs';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

export function ScheduleScreen() {
  const { user, workspaceName } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [range, setRange] = useState<ScheduleRange>('day');
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setError(undefined);
    try {
      const rows = await listMyJobs();
      setJobs(rows);
      const sync = await getCalendarSyncStatus();
      if (sync.enabled) {
        void syncJobsToCalendar(rows).catch(() => undefined);
      }
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Could not load your schedule.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  const visible = filterJobsInRange(jobs, range);

  return (
    <View style={styles.screen}>
      <Text style={styles.meta}>
        {user?.displayName ?? user?.email ?? 'Cleaner'}
        {workspaceName ? ` · ${workspaceName}` : ''}
      </Text>
      <Text style={styles.rangeTitle}>{rangeLabel(range)}</Text>

      <View style={styles.segment}>
        {(['day', 'week'] as const).map((value) => {
          const active = range === value;
          return (
            <Pressable
              key={value}
              onPress={() => setRange(value)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  active && styles.segmentLabelActive,
                ]}
              >
                {value === 'day' ? 'Today' : 'This week'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.brandText} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            visible.length === 0 ? styles.emptyContainer : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void load('refresh');
              }}
              tintColor={colors.brandText}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No visits in this range</Text>
              <Text style={styles.emptyBody}>
                Pull down to refresh. Assigned jobs outside this {range} still
                appear when you switch the filter.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const zone = item.property?.timezone || item.timezone;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                onPress={() =>
                  navigation.navigate('JobDetail', { bookingId: item.id })
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.service}>
                    {item.service?.name ?? 'Cleaning'}
                  </Text>
                  <Text style={styles.status}>{formatStatus(item.status)}</Text>
                </View>
                <Text style={styles.when}>{formatJobWhen(item.startsAt, zone)}</Text>
                <Text style={styles.time}>
                  {formatJobTimeRange(item.startsAt, item.endsAt, zone)}
                </Text>
                <Text style={styles.address}>{addressLine(item)}</Text>
                {item.customer?.displayName ? (
                  <Text style={styles.customer}>{item.customer.displayName}</Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  meta: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandText,
  },
  rangeTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },
  segment: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.brandSoft,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  segmentLabelActive: {
    color: colors.brandText,
  },
  error: {
    marginTop: 8,
    marginBottom: 4,
    color: colors.danger,
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 24,
    paddingTop: 8,
    gap: 12,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  emptyBody: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  service: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandText,
    backgroundColor: colors.brandSoft,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  when: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  time: {
    marginTop: 2,
    fontSize: 14,
    color: colors.muted,
  },
  address: {
    marginTop: 10,
    fontSize: 14,
    color: colors.text,
  },
  customer: {
    marginTop: 4,
    fontSize: 13,
    color: colors.muted,
  },
});
