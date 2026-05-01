/**
 * Farm Selection Screen.
 *
 * - Shows farms available to the authenticated user.
 * - Auto-selects if only one farm.
 * - Displays role badge per farm.
 * - Navigates to home after selection.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/auth/useAuth';
import { RoleBadge, LoadingState, ScreenHeader } from '../src/components';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../src/design';
import { ROLE_LABELS, type FarmRead } from '../src/types';

export default function FarmSelectScreen() {
  const { farms, setActiveFarmId, activeFarmId, isLoading } = useAuth();

  // Auto-select if only one farm
  useEffect(() => {
    if (!isLoading && farms.length === 1) {
      setActiveFarmId(farms[0].id);
      router.replace('/(tabs)/home');
    }
  }, [isLoading, farms, setActiveFarmId]);

  useEffect(() => {
    if (activeFarmId) {
      router.replace('/(tabs)/home');
    }
  }, [activeFarmId]);

  if (isLoading) return <LoadingState />;

  const renderFarm = ({ item }: { item: FarmRead }) => (
    <TouchableOpacity
      style={[styles.farmCard, shadows.card]}
      onPress={() => setActiveFarmId(item.id)}
      activeOpacity={0.85}
    >
      <View style={styles.farmIcon}>
        <Ionicons name="business-outline" size={28} color={colors.primary} />
      </View>
      <View style={styles.farmInfo}>
        <Text style={styles.farmName}>{item.name}</Text>
        {item.city && (
          <Text style={styles.farmLocation}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />{' '}
            {item.city}{item.province ? ` (${item.province})` : ''}
          </Text>
        )}
        {item.role && (
          <View style={styles.roleWrap}>
            <RoleBadge role={item.role} label={ROLE_LABELS[item.role]} />
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Seleziona azienda"
        subtitle="Scegli l'azienda con cui lavorare"
      />
      <FlatList
        data={farms}
        renderItem={renderFarm}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.xl,
  },
  farmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  farmIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  farmLocation: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  roleWrap: {
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
});
