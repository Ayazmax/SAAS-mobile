import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ApiRequestError, getMyEarnings, type CleanerEarnings } from '../lib/api';
import { colors } from '../theme';

type IncomeRange = 'month' | 'previous';

function utcMonthBounds(offset: number): { from: string; to: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + offset;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { from: isoDate(start), to: isoDate(end) };
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatMoney(amount: string, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatRangeLabel(from: string, to: string): string {
  try {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T00:00:00.000Z`);
    const left = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(start);
    const right = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(end);
    return `${left} – ${right}`;
  } catch {
    return `${from} – ${to}`;
  }
}

export function IncomeScreen() {
  const [range, setRange] = useState<IncomeRange>('month');
  const [earnings, setEarnings] = useState<CleanerEarnings>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();

  const bounds = useMemo(
    () => utcMonthBounds(range === 'month' ? 0 : -1),
    [range],
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(undefined);
      try {
        setEarnings(await getMyEarnings(bounds.from, bounds.to));
      } catch (caught: unknown) {
        setError(
          caught instanceof ApiRequestError
            ? caught.message
            : 'Could not load your earnings.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bounds.from, bounds.to],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void load('refresh');
          }}
          tintColor={colors.brandText}
        />
      }
    >
      <Text style={styles.title}>Income</Text>
      <Text style={styles.rangeTitle}>
        {formatRangeLabel(bounds.from, bounds.to)}
      </Text>

      <View style={styles.segment}>
        {(['month', 'previous'] as const).map((value) => {
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
                {value === 'month' ? 'This month' : 'Last month'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.brandText} />
      ) : earnings ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Estimated pay</Text>
            <Text style={styles.heroValue}>
              {formatMoney(earnings.amount, earnings.currency)}
            </Text>
            <Text style={styles.heroHint}>
              Completed time × the hourly rate in effect that day.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Hours</Text>
            <Text style={styles.value}>
              {earnings.hours.toFixed(2)} ({String(earnings.minutes)} min)
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Current rate</Text>
            <Text style={styles.value}>
              {earnings.hourlyPay == null
                ? 'Not set'
                : `${formatMoney(String(earnings.hourlyPay), earnings.currency)} / hour`}
            </Text>
          </View>
          {earnings.minutes === 0 ? (
            <Text style={styles.empty}>
              No completed visits in this range yet. Pay appears after you
              finish a job.
            </Text>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  rangeTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  segment: {
    marginTop: 16,
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    marginTop: 16,
    color: colors.danger,
    fontWeight: '600',
  },
  loader: {
    marginTop: 32,
  },
  hero: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: colors.brand,
    padding: 20,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a7f3d0',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroValue: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.6,
  },
  heroHint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#d1fae5',
  },
  card: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  empty: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
});
