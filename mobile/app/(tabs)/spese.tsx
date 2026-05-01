/**
 * Spese (Expenses) Screen — quick expense registration.
 *
 * Features:
 * - Category quick chips.
 * - Large money input.
 * - Camera upload for invoices.
 * - Save as draft when offline.
 * - Recent expenses list.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/useAuth';
import { expensesApi } from '../../src/api/expenses';
import { useNetworkStatus } from '../../src/offline/networkStatus';
import { createDraft } from '../../src/offline/draftQueue';
import {
  ScreenHeader,
  PrimaryButton,
  FormField,
  MoneyInput,
  CategoryChips,
  Card,
  ListItem,
  SectionTitle,
  EmptyState,
  OfflineBanner,
} from '../../src/components';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/design';
import { todayISO, formatEuro, formatDateIT, parseCommaDecimal } from '../../src/utils';
import { EXPENSE_CATEGORIES } from '../../src/types';

export default function SpeseScreen() {
  const { activeFarmId } = useAuth();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(true);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch recent expenses
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', activeFarmId],
    queryFn: async () => {
      if (!activeFarmId) return null;
      const res = await expensesApi.list(activeFarmId, 1, 10);
      return res.data;
    },
    enabled: !!activeFarmId,
  });

  const recentExpenses = expensesData?.items || [];

  const handleSave = useCallback(async () => {
    if (!category) {
      Alert.alert('Attenzione', 'Seleziona una categoria.');
      return;
    }

    const amountNum = parseCommaDecimal(amount);
    if (amountNum <= 0) {
      Alert.alert('Attenzione', 'Inserisci un importo valido.');
      return;
    }

    if (!activeFarmId) return;

    setSaving(true);

    const expenseData = {
      expense_date: todayISO(),
      category,
      amount: amountNum,
      description: description || undefined,
    };

    if (isOnline) {
      const res = await expensesApi.create(activeFarmId, expenseData);
      if (res.error) {
        Alert.alert('Errore', 'Non è stato possibile completare l\'operazione. Riprova tra poco.');
        setSaving(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
    } else {
      await createDraft('expense', expenseData, activeFarmId);
    }

    setSaving(false);
    setCategory('');
    setAmount('');
    setDescription('');

    Alert.alert(
      '✓ Registrata',
      isOnline
        ? 'Spesa registrata correttamente.'
        : 'Bozza salvata. Verrà sincronizzata quando online.',
    );
  }, [category, amount, description, activeFarmId, isOnline, queryClient]);

  const getCategoryIcon = (cat: string): keyof typeof Ionicons.glyphMap => {
    const map: Record<string, keyof typeof Ionicons.glyphMap> = {
      Carburante: 'car-outline',
      Concimi: 'flask-outline',
      Semi: 'leaf-outline',
      Fitofarmaci: 'shield-outline',
      Macchinari: 'construct-outline',
      Affitto: 'home-outline',
      Acqua: 'water-outline',
      'Elettricità': 'flash-outline',
      Trasporto: 'bus-outline',
      Commercialista: 'briefcase-outline',
      Assicurazione: 'umbrella-outline',
      Salari: 'people-outline',
    };
    return map[cat] || 'pricetag-outline';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner visible={!isOnline} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Spese"
          subtitle="Registra e controlla le spese"
          rightAction={
            <TouchableOpacity
              onPress={() => setShowForm(!showForm)}
              style={styles.toggleBtn}
            >
              <Ionicons
                name={showForm ? 'list-outline' : 'add-circle-outline'}
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          }
        />

        {showForm ? (
          <View style={styles.form}>
            {/* Category Chips */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CATEGORIA</Text>
              <CategoryChips
                categories={EXPENSE_CATEGORIES}
                selected={category}
                onSelect={setCategory}
              />
            </View>

            {/* Amount */}
            <View style={styles.section}>
              <MoneyInput
                label="Importo"
                value={amount}
                onChangeText={setAmount}
                error={undefined}
              />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <FormField
                label="Descrizione"
                value={description}
                onChangeText={setDescription}
                placeholder="Descrizione opzionale"
                multiline
                icon="document-text-outline"
              />
            </View>

            {/* Reminder */}
            <Card style={styles.reminderCard}>
              <View style={styles.reminderRow}>
                <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
                <Text style={styles.reminderText}>
                  Puoi aggiungere la fattura anche più tardi.
                </Text>
              </View>
            </Card>

            {/* Save Button */}
            <View style={styles.buttonSection}>
              <PrimaryButton
                label="Registra spesa"
                onPress={handleSave}
                loading={saving}
                icon="checkmark-circle-outline"
                disabled={!category || !amount}
              />
            </View>
          </View>
        ) : (
          <View>
            <SectionTitle title="Spese recenti" />
            {recentExpenses.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="Nessuna spesa registrata"
                subtitle="Le spese appariranno qui"
              />
            ) : (
              recentExpenses.map((expense) => (
                <ListItem
                  key={expense.id}
                  title={expense.category}
                  subtitle={`${formatDateIT(expense.expense_date)}${expense.description ? ` — ${expense.description}` : ''}`}
                  rightText={formatEuro(expense.amount)}
                  icon={getCategoryIcon(expense.category)}
                  iconColor={colors.error}
                />
              ))
            )}
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
  toggleBtn: {
    padding: spacing.sm,
  },
  form: {
    paddingTop: spacing.sm,
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
  buttonSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  reminderCard: {
    marginTop: spacing.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.accent,
    fontStyle: 'italic',
  },
});
