/**
 * Giornata (Workday) Screen — quick daily work registration.
 *
 * Optimized for field use:
 * - Default to today.
 * - Worker selection with search.
 * - Task type chips.
 * - Hours/days entry.
 * - Save draft if offline.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/useAuth';
import { workdaysApi } from '../../src/api/workdays';
import { workersApi } from '../../src/api/workers';
import { useNetworkStatus } from '../../src/offline/networkStatus';
import { createDraft } from '../../src/offline/draftQueue';
import {
  ScreenHeader,
  PrimaryButton,
  MoneyInput,
  CategoryChips,
  Card,
  EmptyState,
  LoadingState,
  OfflineBanner,
} from '../../src/components';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../src/design';
import { todayISO, formatEuro, formatDecimalInput, parseCommaDecimal } from '../../src/utils';
import { TASK_TYPES, type WorkerOut } from '../../src/types';

export default function GiornataScreen() {
  const { activeFarmId } = useAuth();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  // Form state
  const [workDate] = useState(todayISO());
  const [selectedWorker, setSelectedWorker] = useState<WorkerOut | null>(null);
  const [activity, setActivity] = useState('');
  const [hours, setHours] = useState('');
  const [workerSearch, setWorkerSearch] = useState('');
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [todayEntries, setTodayEntries] = useState<
    { worker: string; activity: string; hours: string }[]
  >([]);
  const [saving, setSaving] = useState(false);

  // Fetch workers
  const { data: workersData, isLoading: workersLoading } = useQuery({
    queryKey: ['workers', activeFarmId],
    queryFn: async () => {
      if (!activeFarmId) return null;
      const res = await workersApi.list(activeFarmId);
      return res.data;
    },
    enabled: !!activeFarmId,
  });

  const workers = workersData?.items || [];
  const filteredWorkers = workers.filter(
    (w) =>
      `${w.first_name} ${w.last_name}`.toLowerCase().includes(workerSearch.toLowerCase()),
  );

  const handleSaveEntry = useCallback(async () => {
    if (!selectedWorker || !hours || !activeFarmId) {
      Alert.alert('Attenzione', 'Seleziona un lavoratore e inserisci le ore.');
      return;
    }

    const hoursNum = parseCommaDecimal(hours);
    if (hoursNum <= 0 || hoursNum > 24) {
      Alert.alert('Attenzione', 'Le ore devono essere tra 0 e 24.');
      return;
    }

    setSaving(true);

    if (isOnline) {
      // Create workday then add entry
      const wdRes = await workdaysApi.create(activeFarmId, {
        work_date: workDate,
        description: activity || undefined,
      });

      if (wdRes.error || !wdRes.data) {
        Alert.alert('Errore', 'Non è stato possibile completare l\'operazione. Riprova tra poco.');
        setSaving(false);
        return;
      }

      const entryRes = await workdaysApi.addEntry(activeFarmId, wdRes.data.id, {
        workday_id: wdRes.data.id,
        worker_id: selectedWorker.id,
        hours: hoursNum,
        hourly_rate: selectedWorker.hourly_rate ?? undefined,
        activity: activity || undefined,
      });

      if (entryRes.error) {
        Alert.alert('Errore', 'Non è stato possibile completare l\'operazione. Riprova tra poco.');
        setSaving(false);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['workdays'] });
    } else {
      // Save as offline draft
      await createDraft(
        'workday_entry',
        {
          work_date: workDate,
          worker_id: selectedWorker.id,
          worker_name: `${selectedWorker.first_name} ${selectedWorker.last_name}`,
          hours: hoursNum,
          hourly_rate: selectedWorker.hourly_rate,
          activity: activity || null,
        },
        activeFarmId,
      );
    }

    // Add to today's summary
    setTodayEntries((prev) => [
      ...prev,
      {
        worker: `${selectedWorker.first_name} ${selectedWorker.last_name}`,
        activity: activity || '-',
        hours,
      },
    ]);

    // Reset form for next worker
    setSelectedWorker(null);
    setActivity('');
    setHours('');
    setSaving(false);

    Alert.alert(
      '✓ Registrato',
      isOnline ? 'Giornata registrata correttamente.' : 'Bozza salvata. Verrà sincronizzata quando online.',
    );
  }, [selectedWorker, hours, activity, workDate, activeFarmId, isOnline, queryClient]);

  // Worker picker modal
  if (showWorkerPicker) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.pickerHeader}>
          <TouchableOpacity onPress={() => setShowWorkerPicker(false)}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.pickerTitle}>Seleziona lavoratore</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={workerSearch}
            onChangeText={setWorkerSearch}
            placeholder="Cerca lavoratore..."
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>
        <FlatList
          data={filteredWorkers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.workerItem}
              onPress={() => {
                setSelectedWorker(item);
                setShowWorkerPicker(false);
                setWorkerSearch('');
              }}
            >
              <View style={styles.workerAvatar}>
                <Text style={styles.workerInitials}>
                  {item.first_name[0]}
                  {item.last_name[0]}
                </Text>
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>
                  {item.first_name} {item.last_name}
                </Text>
                {item.hourly_rate && (
                  <Text style={styles.workerRate}>{formatEuro(Number(item.hourly_rate))}/ora</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="Nessun lavoratore trovato" />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner visible={!isOnline} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Giornata di lavoro"
          subtitle={new Date(workDate).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        />

        {/* Worker Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LAVORATORE</Text>
          <TouchableOpacity
            style={[styles.pickerButton, shadows.card]}
            onPress={() => setShowWorkerPicker(true)}
            activeOpacity={0.85}
          >
            {selectedWorker ? (
              <View style={styles.selectedWorker}>
                <View style={styles.workerAvatarSmall}>
                  <Text style={styles.workerInitialsSmall}>
                    {selectedWorker.first_name[0]}
                    {selectedWorker.last_name[0]}
                  </Text>
                </View>
                <Text style={styles.selectedName}>
                  {selectedWorker.first_name} {selectedWorker.last_name}
                </Text>
              </View>
            ) : (
              <View style={styles.selectedWorker}>
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                <Text style={styles.placeholderText}>Seleziona lavoratore</Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Task Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TIPO DI ATTIVITÀ</Text>
          <CategoryChips
            categories={TASK_TYPES}
            selected={activity}
            onSelect={setActivity}
          />
        </View>

        {/* Hours */}
        <View style={styles.section}>
          <MoneyInput
            label="Ore lavorate"
            value={hours}
            onChangeText={setHours}
          />
        </View>

        {/* Calculated amount preview */}
        {selectedWorker?.hourly_rate && hours && (
          <Card>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Importo stimato</Text>
              <Text style={styles.previewAmount}>
                {formatEuro(Number(selectedWorker.hourly_rate) * parseCommaDecimal(hours))}
              </Text>
            </View>
          </Card>
        )}

        {/* Save Button */}
        <View style={styles.buttonSection}>
          <PrimaryButton
            label="Registra giornata"
            onPress={handleSaveEntry}
            loading={saving}
            icon="checkmark-circle-outline"
            disabled={!selectedWorker || !hours}
          />
        </View>

        {/* Today's entries summary */}
        {todayEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>REGISTRATE OGGI</Text>
            {todayEntries.map((entry, i) => (
              <Card key={i}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryWorker}>{entry.worker}</Text>
                  <Text style={styles.entryDetail}>
                    {entry.activity} — {entry.hours}h
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: spacing.section }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 60,
  },
  selectedWorker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  workerAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInitialsSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  buttonSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  previewAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  entryRow: {
    gap: 2,
  },
  entryWorker: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  entryDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  // Worker picker
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  workerInitials: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  workerRate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
});
