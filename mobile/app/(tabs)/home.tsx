/**
 * Home Dashboard — mobile-focused overview.
 *
 * Shows:
 * - Farm name and role.
 * - Today's date and sync status.
 * - Monthly KPI summary cards.
 * - Quick action buttons.
 * - "Da controllare" alerts section.
 */
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/useAuth';
import { reportsApi } from '../../src/api/reports';
import { useNetworkStatus } from '../../src/offline/networkStatus';
import { getPendingDrafts } from '../../src/offline/draftQueue';
import {
  ScreenHeader,
  StatCard,
  QuickActionButton,
  SectionTitle,
  Card,
  OfflineBanner,
  RoleBadge,
  LoadingState,
} from '../../src/components';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../src/design';
import { formatEuro, monthNameIT, currentYearMonth, formatDateIT, todayISO } from '../../src/utils';
import { ROLE_LABELS } from '../../src/types';

export default function HomeScreen() {
  const { user, activeFarm, activeFarmId } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { year, month } = useMemo(() => currentYearMonth(), []);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch monthly summary
  const { data: monthlyData, isLoading, refetch } = useQuery({
    queryKey: ['monthly-summary', activeFarmId, year, month],
    queryFn: async () => {
      if (!activeFarmId) return null;
      const res = await reportsApi.monthly(activeFarmId, year, month);
      return res.data;
    },
    enabled: !!activeFarmId,
  });

  // Check pending drafts
  useEffect(() => {
    if (!activeFarmId) return;
    getPendingDrafts(activeFarmId).then((d) => setPendingCount(d.length));
  }, [activeFarmId]);

  const summary = monthlyData?.data as Record<string, number> | undefined;

  const today = new Date();
  const dateStr = today.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner visible={!isOnline} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Ciao, {user?.full_name?.split(' ')[0] || 'Utente'}</Text>
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.offline }]} />
          </View>
          {activeFarm && (
            <View style={styles.farmRow}>
              <Ionicons name="business" size={16} color={colors.primary} />
              <Text style={styles.farmName}>{activeFarm.name}</Text>
              {activeFarm.role && (
                <RoleBadge role={activeFarm.role} label={ROLE_LABELS[activeFarm.role]} />
              )}
            </View>
          )}
        </View>

        {/* KPI Summary */}
        <SectionTitle title={`${monthNameIT(month)} ${year}`} />
        <View style={styles.statsGrid}>
          <StatCard
            label="Ricavi mese"
            value={formatEuro(summary?.total_revenue ?? 0)}
            icon="trending-up-outline"
            color={colors.success}
            bgColor={colors.successLight}
          />
          <StatCard
            label="Spese mese"
            value={formatEuro(summary?.total_expenses ?? 0)}
            icon="trending-down-outline"
            color={colors.error}
            bgColor={colors.errorLight}
          />
          <StatCard
            label="Risultato netto"
            value={formatEuro((summary?.total_revenue ?? 0) - (summary?.total_expenses ?? 0))}
            icon="stats-chart-outline"
            color={colors.accent}
            bgColor={colors.accentSurface}
          />
          <StatCard
            label="Giornate"
            value={String(summary?.workdays_count ?? 0)}
            icon="calendar-outline"
            color={colors.primary}
          />
        </View>

        {/* Quick Actions */}
        <SectionTitle title="Azioni rapide" />
        <View style={styles.statsGrid}>
          <QuickActionButton
            label="Nuova spesa"
            icon="receipt-outline"
            color={colors.error}
            onPress={() => router.push('/(tabs)/spese')}
          />
          <QuickActionButton
            label="Nuova giornata"
            icon="sunny-outline"
            color={colors.gold}
            onPress={() => router.push('/(tabs)/giornata')}
          />
          <QuickActionButton
            label="Carica documento"
            icon="camera-outline"
            color={colors.accent}
            onPress={() => router.push('/(tabs)/documenti')}
          />
          <QuickActionButton
            label="Nuova vendita"
            icon="cash-outline"
            color={colors.success}
            onPress={() => router.push('/(tabs)/altro')}
          />
        </View>

        {/* Da controllare */}
        {pendingCount > 0 && (
          <>
            <SectionTitle title="Da controllare" />
            <Card>
              <View style={styles.alertRow}>
                <Ionicons name="sync-outline" size={20} color={colors.warning} />
                <View style={styles.alertText}>
                  <Text style={styles.alertTitle}>
                    {pendingCount} bozz{pendingCount === 1 ? 'a' : 'e'} non sincronizzat{pendingCount === 1 ? 'a' : 'e'}
                  </Text>
                  <Text style={styles.alertSub}>Sincronizza quando possibile</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Card>
          </>
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
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: spacing.sm,
  },
  farmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  farmName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  alertSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
});
