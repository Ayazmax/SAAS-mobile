import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../auth/AuthContext';
import { ApiRequestError, checkHealth, listMyJobs } from '../lib/api';
import {
  disableCalendarSync,
  enableCalendarSync,
  getCalendarSyncStatus,
  syncJobsToCalendar,
  type CalendarSyncStatus,
} from '../lib/calendar-sync';
import { apiUrl } from '../lib/env';
import { colors } from '../theme';

export function AccountScreen() {
  const { user, workspaceName, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CalendarSyncStatus>();
  const [result, setResult] = useState<string>();
  const [error, setError] = useState<string>();

  const reloadSyncStatus = useCallback(async () => {
    setSyncStatus(await getCalendarSyncStatus());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadSyncStatus().catch(() => undefined);
    }, [reloadSyncStatus]),
  );

  async function onCheckApi() {
    setChecking(true);
    setResult(undefined);
    setError(undefined);
    try {
      const health = await checkHealth();
      setResult(`API reachable · status ${health.status}`);
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Could not reach the API. Is it running?',
      );
    } finally {
      setChecking(false);
    }
  }

  async function onEnableSync() {
    setSyncBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const status = await enableCalendarSync();
      setSyncStatus(status);
      const jobs = await listMyJobs();
      const outcome = await syncJobsToCalendar(jobs);
      await reloadSyncStatus();
      setResult(
        `Calendar sync on · ${String(outcome.written)} visits written.`,
      );
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not enable calendar sync.',
      );
    } finally {
      setSyncBusy(false);
    }
  }

  async function onSyncNow() {
    setSyncBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const jobs = await listMyJobs();
      const outcome = await syncJobsToCalendar(jobs);
      await reloadSyncStatus();
      setResult(
        `Synced · ${String(outcome.written)} updated, ${String(outcome.removed)} removed.`,
      );
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : 'Could not sync calendar.',
      );
    } finally {
      setSyncBusy(false);
    }
  }

  async function onDisableSync() {
    setSyncBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      setSyncStatus(await disableCalendarSync(true));
      setResult('Calendar sync off. DreamWare events were removed.');
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not disable calendar sync.',
      );
    } finally {
      setSyncBusy(false);
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    setError(undefined);
    try {
      await signOut();
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Could not sign out cleanly. Local session was cleared.',
      );
    } finally {
      setSigningOut(false);
    }
  }

  const lastSynced =
    syncStatus?.lastSyncedAt != null
      ? new Date(syncStatus.lastSyncedAt).toLocaleString()
      : 'Never';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Account</Text>
      <Text style={styles.body}>Signed in as a cleaner on this device.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.displayName ?? user?.email ?? '—'}</Text>
        <Text style={[styles.label, styles.spaced]}>Email</Text>
        <Text style={styles.value}>{user?.email ?? '—'}</Text>
        <Text style={[styles.label, styles.spaced]}>Workspace</Text>
        <Text style={styles.value}>{workspaceName ?? '—'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Calendar sync</Text>
        <Text style={styles.value}>
          {syncStatus?.enabled ? 'On' : 'Off'}
          {syncStatus?.enabled
            ? ` · ${String(syncStatus.eventCount)} events`
            : ''}
        </Text>
        <Text style={styles.hint}>
          {syncStatus?.platformHint ??
            'Assigned visits are written one-way into your device calendar. DreamWare stays the source of truth.'}
        </Text>
        <Text style={styles.subvalue}>Last synced: {lastSynced}</Text>

        {!syncStatus?.enabled ? (
          <Pressable
            accessibilityRole="button"
            disabled={syncBusy}
            onPress={() => {
              void onEnableSync();
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              (pressed || syncBusy) && styles.buttonPressed,
            ]}
          >
            {syncBusy ? (
              <ActivityIndicator color={colors.brandText} />
            ) : (
              <Text style={styles.secondaryLabel}>Enable calendar sync</Text>
            )}
          </Pressable>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              disabled={syncBusy}
              onPress={() => {
                void onSyncNow();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || syncBusy) && styles.buttonPressed,
              ]}
            >
              {syncBusy ? (
                <ActivityIndicator color={colors.brandText} />
              ) : (
                <Text style={styles.secondaryLabel}>Sync now</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={syncBusy}
              onPress={() => {
                void onDisableSync();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || syncBusy) && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryLabel}>Turn off and remove events</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>API base URL</Text>
        <Text style={styles.value}>{apiUrl}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={checking}
          onPress={() => {
            void onCheckApi();
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            (pressed || checking) && styles.buttonPressed,
          ]}
        >
          {checking ? (
            <ActivityIndicator color={colors.brandText} />
          ) : (
            <Text style={styles.secondaryLabel}>Check API health</Text>
          )}
        </Pressable>
        {result ? <Text style={styles.ok}>{result}</Text> : null}
        {error ? <Text style={styles.fail}>{error}</Text> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={signingOut}
        onPress={() => {
          void onSignOut();
        }}
        style={({ pressed }) => [
          styles.button,
          (pressed || signingOut) && styles.buttonPressed,
        ]}
      >
        {signingOut ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonLabel}>Sign out</Text>
        )}
      </Pressable>
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
  body: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  card: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  spaced: {
    marginTop: 14,
  },
  value: {
    marginTop: 6,
    fontSize: 15,
    color: colors.text,
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  subvalue: {
    marginTop: 8,
    fontSize: 13,
    color: colors.muted,
  },
  button: {
    marginTop: 24,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: colors.brandText,
    fontSize: 15,
    fontWeight: '700',
  },
  ok: {
    marginTop: 12,
    color: colors.brandText,
    fontSize: 14,
    fontWeight: '600',
  },
  fail: {
    marginTop: 12,
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
