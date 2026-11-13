import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  ApiRequestError,
  addJobNote,
  completeJob,
  getJob,
  pauseJob,
  resumeJob,
  startJob,
  updateChecklistItem,
} from '../lib/api';
import {
  addressLine,
  canRunInProgressActions,
  canStartJob,
  formatJobTimeRange,
  formatJobWhen,
  formatStatus,
  requiredChecklistIncomplete,
  type ChecklistItem,
  type JobDetail,
} from '../lib/jobs';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

export function JobDetailScreen({ route }: Props) {
  const { bookingId } = route.params;
  const [job, setJob] = useState<JobDetail>();
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [checklistBusyId, setChecklistBusyId] = useState<string>();

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      setError(undefined);
      try {
        setJob(await getJob(bookingId));
      } catch (caught: unknown) {
        setError(
          caught instanceof ApiRequestError
            ? caught.message
            : 'Could not load this visit.',
        );
      } finally {
        setRefreshing(false);
      }
    },
    [bookingId],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  async function runAction(
    action: () => Promise<unknown>,
    fallback: string,
  ): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      setJob(await getJob(bookingId));
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError ? caught.message : fallback,
      );
    } finally {
      setBusy(false);
    }
  }

  async function onToggleChecklist(item: ChecklistItem) {
    const next = item.status === 'DONE' ? 'PENDING' : 'DONE';
    setChecklistBusyId(item.id);
    setError(undefined);
    try {
      await updateChecklistItem(bookingId, item.id, next);
      setJob(await getJob(bookingId));
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Could not update the checklist.',
      );
    } finally {
      setChecklistBusyId(undefined);
    }
  }

  async function onSkipChecklist(item: ChecklistItem) {
    setChecklistBusyId(item.id);
    setError(undefined);
    try {
      await updateChecklistItem(bookingId, item.id, 'SKIPPED');
      setJob(await getJob(bookingId));
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Could not update the checklist.',
      );
    } finally {
      setChecklistBusyId(undefined);
    }
  }

  async function onSaveNote() {
    const body = noteDraft.trim();
    if (body.length < 2) {
      setError('Notes need at least 2 characters.');
      return;
    }
    await runAction(async () => {
      await addJobNote(bookingId, body);
      setNoteDraft('');
    }, 'Could not save this note.');
  }

  if (!job && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brandText} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const zone = job.property?.timezone || job.timezone;
  const instructions = job.property?.instructions ?? [];
  const checklistItems = job.checklist?.items ?? [];
  const incompleteRequired = requiredChecklistIncomplete(job);
  const showStart = canStartJob(job.status) && job.status !== 'IN_PROGRESS';
  const showInProgress = canRunInProgressActions(job.status);
  const isCompleted = job.status === 'COMPLETED';
  const actionsDisabled = busy || isCompleted;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.service}>{job.service?.name ?? 'Cleaning'}</Text>
      <Text style={styles.status}>{formatStatus(job.status)}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>When</Text>
        <Text style={styles.value}>{formatJobWhen(job.startsAt, zone)}</Text>
        <Text style={styles.subvalue}>
          {formatJobTimeRange(job.startsAt, job.endsAt, zone)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Property</Text>
        <Text style={styles.value}>{job.property?.name ?? 'Property'}</Text>
        <Text style={styles.subvalue}>{addressLine(job)}</Text>
      </View>

      {job.customer?.displayName ? (
        <View style={styles.card}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{job.customer.displayName}</Text>
          {job.customer.primaryPhone ? (
            <Text style={styles.subvalue}>{job.customer.primaryPhone}</Text>
          ) : null}
        </View>
      ) : null}

      {!isCompleted ? (
        <View style={styles.card}>
          <Text style={styles.label}>Job actions</Text>
          {showInProgress && incompleteRequired.length > 0 ? (
            <Text style={styles.hint}>
              Mark {String(incompleteRequired.length)} required checklist item
              {incompleteRequired.length === 1 ? '' : 's'} done before
              completing.
            </Text>
          ) : null}
          <View style={styles.actions}>
            {showStart ? (
              <ActionButton
                label="Start"
                primary
                disabled={actionsDisabled}
                onPress={() =>
                  void runAction(
                    () => startJob(bookingId),
                    'Could not start this job.',
                  )
                }
              />
            ) : null}
            {showInProgress ? (
              <>
                <ActionButton
                  label="Pause"
                  disabled={actionsDisabled}
                  onPress={() =>
                    void runAction(
                      () => pauseJob(bookingId),
                      'Could not pause this job.',
                    )
                  }
                />
                <ActionButton
                  label="Resume"
                  disabled={actionsDisabled}
                  onPress={() =>
                    void runAction(
                      () => resumeJob(bookingId),
                      'Could not resume this job.',
                    )
                  }
                />
                <ActionButton
                  label="Complete"
                  primary
                  disabled={actionsDisabled}
                  onPress={() =>
                    void runAction(
                      () => completeJob(bookingId),
                      'Could not complete this job.',
                    )
                  }
                />
              </>
            ) : null}
            {job.status === 'CONFIRMED' ? (
              <Text style={styles.hint}>
                Start the visit when you arrive. Checklist appears after start.
              </Text>
            ) : null}
          </View>
          {busy ? (
            <ActivityIndicator
              style={styles.busy}
              color={colors.brandText}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Checklist</Text>
        {checklistItems.length === 0 ? (
          <Text style={styles.subvalue}>
            {job.status === 'CONFIRMED'
              ? 'Checklist is created when you start the job.'
              : 'No checklist items for this visit.'}
          </Text>
        ) : (
          checklistItems.map((item) => {
            const done = item.status === 'DONE';
            const skipped = item.status === 'SKIPPED';
            const itemBusy = checklistBusyId === item.id;
            return (
              <View key={item.id} style={styles.checklistRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done, disabled: isCompleted }}
                  disabled={isCompleted || itemBusy || busy}
                  onPress={() => {
                    void onToggleChecklist(item);
                  }}
                  style={({ pressed }) => [
                    styles.checkHit,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      done && styles.checkboxDone,
                      skipped && styles.checkboxSkipped,
                    ]}
                  >
                    {itemBusy ? (
                      <ActivityIndicator size="small" color={colors.brandText} />
                    ) : (
                      <Text style={styles.checkboxMark}>
                        {done ? '✓' : skipped ? '–' : ''}
                      </Text>
                    )}
                  </View>
                  <View style={styles.checklistText}>
                    <Text
                      style={[
                        styles.checklistLabel,
                        done && styles.checklistDone,
                        skipped && styles.checklistSkipped,
                      ]}
                    >
                      {item.label}
                      {item.required ? ' *' : ''}
                    </Text>
                    <Text style={styles.checklistMeta}>
                      {skipped
                        ? 'Skipped'
                        : done
                          ? 'Done'
                          : item.required
                            ? 'Required'
                            : 'Optional'}
                    </Text>
                  </View>
                </Pressable>
                {!item.required && !done && !skipped && !isCompleted ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={itemBusy || busy}
                    onPress={() => {
                      void onSkipChecklist(item);
                    }}
                    style={({ pressed }) => [
                      styles.skipButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.skipLabel}>Skip</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Notes</Text>
        {!isCompleted ? (
          <>
            <TextInput
              accessibilityLabel="Job note"
              multiline
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Add a note or issue for the office"
              placeholderTextColor={colors.muted}
              style={styles.noteInput}
              editable={!busy}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy || noteDraft.trim().length < 2}
              onPress={() => {
                void onSaveNote();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                (pressed || busy) && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryLabel}>Save note</Text>
            </Pressable>
          </>
        ) : null}
        {(job.notesLog ?? []).length === 0 && !job.notes ? (
          <Text style={styles.subvalue}>No notes yet.</Text>
        ) : null}
        {job.notes ? (
          <Text style={[styles.subvalue, styles.noteEntry]}>
            Booking: {job.notes}
          </Text>
        ) : null}
        {(job.notesLog ?? []).map((entry) => (
          <Text key={entry.id} style={[styles.subvalue, styles.noteEntry]}>
            {entry.kind}: {entry.body}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Instructions</Text>
        {instructions.length === 0 ? (
          <Text style={styles.subvalue}>No instructions for this property.</Text>
        ) : (
          instructions.map((item) => (
            <View key={item.id} style={styles.instruction}>
              <Text style={styles.instructionTitle}>
                {item.title}
                {item.category ? ` · ${item.category}` : ''}
              </Text>
              {item.content ? (
                <Text style={styles.instructionBody}>{item.content}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      {job.property?.rooms && job.property.rooms.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.label}>Rooms</Text>
          <Text style={styles.subvalue}>
            {job.property.rooms.map((room) => room.name).join(', ')}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ActionButton({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        primary ? styles.primaryButton : styles.outlineButton,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={primary ? styles.primaryLabel : styles.outlineLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  service: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  status: {
    alignSelf: 'flex-start',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandText,
    backgroundColor: colors.brandSoft,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  card: {
    marginTop: 16,
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
  subvalue: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  outlineButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  outlineLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryLabel: {
    color: colors.brandText,
    fontSize: 14,
    fontWeight: '700',
  },
  busy: {
    marginTop: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  checklistRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkHit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxDone: {
    borderColor: colors.brandText,
    backgroundColor: colors.brandSoft,
  },
  checkboxSkipped: {
    borderColor: colors.muted,
    backgroundColor: colors.background,
  },
  checkboxMark: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandText,
  },
  checklistText: {
    flex: 1,
  },
  checklistLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  checklistDone: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  checklistSkipped: {
    color: colors.muted,
  },
  checklistMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  skipButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  skipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  noteInput: {
    marginTop: 10,
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  noteEntry: {
    marginTop: 10,
  },
  instruction: {
    marginTop: 12,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  instructionBody: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  error: {
    color: colors.danger,
    fontWeight: '600',
    marginBottom: 8,
  },
});
