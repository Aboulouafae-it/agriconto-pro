/**
 * Altro (More) Screen — additional features.
 *
 * Sections:
 * - Nuova vendita (Sales form)
 * - Lavoratori summary
 * - Sincronizzazione
 * - Profilo / Impostazioni
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/useAuth';
import { salesApi } from '../../src/api/sales';
import { workersApi } from '../../src/api/workers';
import { api, BASE_URL } from '../../src/api/client';
import { useNetworkStatus } from '../../src/offline/networkStatus';
import { getDrafts, getPendingDrafts, removeSyncedDrafts, removeDraft } from '../../src/offline/draftQueue';
import { syncAllDrafts, syncDraft } from '../../src/offline/syncService';
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
  SyncStatusBadge,
  RoleBadge,
  LoadingState,
} from '../../src/components';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../src/design';
import {
  todayISO,
  formatEuro,
  formatDateIT,
  parseCommaDecimal,
} from '../../src/utils';
import { ROLE_LABELS, type OfflineDraft } from '../../src/types';
import { createDraft } from '../../src/offline/draftQueue';

type ActiveSection = 'menu' | 'vendita' | 'lavoratori' | 'sync' | 'profilo';

export default function AltroScreen() {
  const { user, activeFarm, activeFarmId, logout } = useAuth();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<ActiveSection>('menu');

  // ─── VENDITA ──────────────────────────────────────────
  const [saleAmount, setSaleAmount] = useState('');
  const [saleProduct, setSaleProduct] = useState('');
  const [saleQuantity, setSaleQuantity] = useState('');
  const [salePaymentStatus, setSalePaymentStatus] = useState('Pagata');
  const [saleDescription, setSaleDescription] = useState('');
  const [saleSaving, setSaleSaving] = useState(false);

  const handleSaveSale = useCallback(async () => {
    const amountNum = parseCommaDecimal(saleAmount);
    const quantityNum = parseCommaDecimal(saleQuantity);
    if (!saleProduct.trim()) {
      Alert.alert('Attenzione', 'Inserisci il prodotto venduto.');
      return;
    }
    if (amountNum <= 0) {
      Alert.alert('Attenzione', 'Inserisci un importo valido.');
      return;
    }
    if (quantityNum <= 0) {
      Alert.alert('Attenzione', 'Inserisci una quantità valida.');
      return;
    }
    if (!activeFarmId) return;

    setSaleSaving(true);
    const saleData = {
      sale_date: todayISO(),
      amount: amountNum * quantityNum,
      description: [
        `Prodotto: ${saleProduct.trim()}`,
        `Quantità: ${saleQuantity}`,
        `Prezzo unitario: ${formatEuro(amountNum)}`,
        `Stato pagamento: ${salePaymentStatus}`,
        saleDescription.trim() ? `Note: ${saleDescription.trim()}` : null,
      ].filter(Boolean).join(' - '),
    };

    if (isOnline) {
      const res = await salesApi.create(activeFarmId, saleData);
      if (res.error) {
        Alert.alert('Errore', 'Non è stato possibile completare l\'operazione. Riprova tra poco.');
        setSaleSaving(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
    } else {
      await createDraft('sale', saleData, activeFarmId);
    }

    setSaleSaving(false);
    setSaleAmount('');
    setSaleProduct('');
    setSaleQuantity('');
    setSalePaymentStatus('Pagata');
    setSaleDescription('');
    Alert.alert(
      '✓ Registrata',
      isOnline ? 'Vendita registrata correttamente.' : 'Bozza salvata. Verrà sincronizzata quando online.',
    );
  }, [saleAmount, saleProduct, saleQuantity, salePaymentStatus, saleDescription, activeFarmId, isOnline, queryClient]);

  // ─── LAVORATORI ───────────────────────────────────────
  const { data: workersData, isLoading: workersLoading } = useQuery({
    queryKey: ['workers', activeFarmId],
    queryFn: async () => {
      if (!activeFarmId) return null;
      const res = await workersApi.list(activeFarmId);
      return res.data;
    },
    enabled: !!activeFarmId && activeSection === 'lavoratori',
  });

  // ─── SYNC ────────────────────────────────────────────
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [syncing, setSyncing] = useState(false);
  const backendStatusQuery = useQuery({
    queryKey: ['backend-health', activeSection],
    queryFn: async () => {
      const res = await api.health();
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    enabled: activeSection === 'profilo' || activeSection === 'sync',
    retry: 1,
    refetchInterval: activeSection === 'profilo' || activeSection === 'sync' ? 30000 : false,
  });

  const loadDrafts = useCallback(async () => {
    if (!activeFarmId) return;
    const all = await getDrafts(activeFarmId);
    setDrafts(all);
  }, [activeFarmId]);

  useEffect(() => {
    if (activeSection === 'sync') loadDrafts();
  }, [activeSection, loadDrafts]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleSync = useCallback(async () => {
    if (!activeFarmId || !isOnline) return;
    setSyncing(true);
    const result = await syncAllDrafts(activeFarmId);
    await removeSyncedDrafts();
    await loadDrafts();
    queryClient.invalidateQueries();
    setSyncing(false);
    Alert.alert(
      'Sincronizzazione',
      result.failed === 0 && result.synced > 0
        ? 'Bozza sincronizzata correttamente.'
        : `${result.synced} sincronizzat${result.synced === 1 ? 'a' : 'e'}, ${result.failed} non riuscit${result.failed === 1 ? 'a' : 'e'}.`,
    );
  }, [activeFarmId, isOnline, loadDrafts, queryClient]);

  const handleDeleteDraft = useCallback(async (draftId: string) => {
    Alert.alert(
      'Elimina bozza',
      'Sei sicuro di voler eliminare questa bozza?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            await removeDraft(draftId);
            await loadDrafts();
          },
        },
      ],
    );
  }, [loadDrafts]);

  const handleRetryDraft = useCallback(async (draftId: string) => {
    if (!activeFarmId || !isOnline) return;
    setSyncing(true);
    const success = await syncDraft(activeFarmId, draftId);
    await removeSyncedDrafts();
    await loadDrafts();
    queryClient.invalidateQueries();
    setSyncing(false);
    Alert.alert(
      'Sincronizzazione',
      success ? 'Bozza sincronizzata correttamente.' : 'Non è stato possibile completare l\'operazione.',
    );
  }, [activeFarmId, isOnline, loadDrafts, queryClient]);

  // ─── MENU ────────────────────────────────────────────
  if (activeSection === 'menu') {
    const pendingDrafts = drafts.filter((d) => d.status !== 'synced').length;
    return (
      <SafeAreaView style={styles.safe}>
        <OfflineBanner visible={!isOnline} />
        <ScreenHeader title="Altro" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <SectionTitle title="Operazioni" />
          <ListItem
            title="Nuova vendita"
            subtitle="Registra una vendita"
            icon="cash-outline"
            iconColor={colors.success}
            onPress={() => setActiveSection('vendita')}
          />
          <ListItem
            title="Lavoratori"
            subtitle="Riepilogo lavoratori"
            icon="people-outline"
            iconColor={colors.accent}
            onPress={() => setActiveSection('lavoratori')}
          />

          <SectionTitle title="Sistema" />
          <ListItem
            title="Sincronizzazione"
            subtitle={pendingDrafts > 0 ? `${pendingDrafts} bozze in attesa` : 'Tutto sincronizzato'}
            icon="sync-outline"
            iconColor={colors.warning}
            onPress={() => setActiveSection('sync')}
          />
          <ListItem
            title="Profilo e impostazioni"
            subtitle={user?.email}
            icon="person-outline"
            iconColor={colors.textSecondary}
            onPress={() => setActiveSection('profilo')}
          />

          <View style={{ height: spacing.section }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Back button helper ───────────────────────────────
  const BackButton = () => (
    <TouchableOpacity onPress={() => setActiveSection('menu')} style={styles.backBtn}>
      <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
  );

  // ─── VENDITA FORM ─────────────────────────────────────
  if (activeSection === 'vendita') {
    return (
      <SafeAreaView style={styles.safe}>
        <OfflineBanner visible={!isOnline} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.subHeader}>
            <BackButton />
            <Text style={styles.subTitle}>Nuova vendita</Text>
          </View>

          <View style={styles.section}>
            <FormField
              label="Prodotto"
              value={saleProduct}
              onChangeText={setSaleProduct}
              placeholder="es. Olive, grano, ortaggi"
              icon="leaf-outline"
            />
          </View>
          <View style={styles.section}>
            <MoneyInput label="Prezzo unitario" value={saleAmount} onChangeText={setSaleAmount} />
          </View>
          <View style={styles.section}>
            <FormField
              label="Quantità"
              value={saleQuantity}
              onChangeText={setSaleQuantity}
              placeholder="es. 12,5"
              keyboardType="decimal-pad"
              icon="scale-outline"
            />
          </View>
          {saleAmount && saleQuantity && (
            <Card>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Totale vendita</Text>
                <Text style={styles.previewAmount}>
                  {formatEuro(parseCommaDecimal(saleAmount) * parseCommaDecimal(saleQuantity))}
                </Text>
              </View>
            </Card>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>STATO PAGAMENTO</Text>
            <CategoryChips
              categories={['Pagata', 'Da incassare', 'Parziale']}
              selected={salePaymentStatus}
              onSelect={setSalePaymentStatus}
            />
          </View>
          <View style={styles.section}>
            <FormField
              label="Descrizione"
              value={saleDescription}
              onChangeText={setSaleDescription}
              placeholder="es. Vendita olive a Frantoio Rossi"
              multiline
              icon="document-text-outline"
            />
          </View>
          <View style={styles.buttonSection}>
            <PrimaryButton
              label="Registra vendita"
              onPress={handleSaveSale}
              loading={saleSaving}
              icon="checkmark-circle-outline"
              disabled={!saleProduct.trim() || !saleAmount || !saleQuantity}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── LAVORATORI LIST ──────────────────────────────────
  if (activeSection === 'lavoratori') {
    const workers = workersData?.items || [];
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.subHeader}>
            <BackButton />
            <Text style={styles.subTitle}>Lavoratori</Text>
          </View>

          <Card style={styles.disclaimerCard}>
            <View style={styles.disclaimerRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
              <Text style={styles.disclaimerText}>
                Dati gestionali. Non sostituiscono documenti ufficiali del consulente del lavoro.
              </Text>
            </View>
          </Card>

          {workersLoading ? (
            <LoadingState />
          ) : workers.length === 0 ? (
            <EmptyState icon="people-outline" title="Nessun lavoratore" />
          ) : (
            workers.map((w) => (
              <ListItem
                key={w.id}
                title={`${w.first_name} ${w.last_name}`}
                subtitle={w.contract_type || 'Tipo contratto non specificato'}
                rightText={w.hourly_rate ? `${formatEuro(Number(w.hourly_rate))}/h` : undefined}
                icon="person-outline"
                iconColor={colors.accent}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── SYNC CENTER ──────────────────────────────────────
  if (activeSection === 'sync') {
    const pendingDrafts = drafts.filter((d) => d.status !== 'synced');
    return (
      <SafeAreaView style={styles.safe}>
        <OfflineBanner visible={!isOnline} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.subHeader}>
            <BackButton />
            <Text style={styles.subTitle}>Sincronizzazione</Text>
          </View>

          <Card>
            <View style={styles.syncStatus}>
              <View style={[
                styles.statusDot,
                { backgroundColor: backendStatusQuery.isLoading ? colors.warning : backendStatusQuery.isError || !isOnline ? colors.offline : colors.success },
              ]} />
              <Text style={styles.syncStatusText}>
                {backendStatusQuery.isLoading ? 'In verifica' : backendStatusQuery.isError || !isOnline ? 'Non raggiungibile' : 'Online'}
              </Text>
            </View>
          </Card>

          {pendingDrafts.length > 0 && (
            <View style={styles.buttonSection}>
              <PrimaryButton
                label="Sincronizza tutto"
                onPress={handleSync}
                loading={syncing}
                icon="sync-outline"
                disabled={!isOnline}
              />
            </View>
          )}

          <SectionTitle title={`Bozze (${pendingDrafts.length})`} />
          {pendingDrafts.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Tutto sincronizzato"
              subtitle="Non ci sono bozze in attesa"
            />
          ) : (
            pendingDrafts.map((draft) => (
              <Card key={draft.id}>
                <View style={styles.draftRow}>
                  <View style={styles.draftInfo}>
                    <Text style={styles.draftType}>
                      {draft.type === 'expense' ? 'Spesa' :
                       draft.type === 'sale' ? 'Vendita' :
                       draft.type === 'workday_entry' ? 'Giornata' :
                       draft.type === 'workday' ? 'Giornata' : 'Documento'}
                    </Text>
                    <Text style={styles.draftDate}>
                      {formatDateIT(draft.createdAt)}
                    </Text>
                    {draft.errorMessage && (
                      <Text style={styles.draftError}>{draft.errorMessage}</Text>
                    )}
                  </View>
                  <View style={styles.draftActions}>
                    <SyncStatusBadge status={draft.status} />
                    {draft.status === 'error' && (
                      <TouchableOpacity
                        onPress={() => handleRetryDraft(draft.id)}
                        disabled={!isOnline || syncing}
                        style={styles.draftIconButton}
                      >
                        <Ionicons name="refresh-outline" size={20} color={isOnline ? colors.accent : colors.textMuted} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDeleteDraft(draft.id)}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── PROFILO ──────────────────────────────────────────
  if (activeSection === 'profilo') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.subHeader}>
            <BackButton />
            <Text style={styles.subTitle}>Profilo</Text>
          </View>

          <Card>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitials}>
                  {user?.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.profileName}>{user?.full_name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </Card>

          {activeFarm && (
            <>
              <SectionTitle title="Azienda attiva" />
              <Card>
                <Text style={styles.farmInfoName}>{activeFarm.name}</Text>
                {activeFarm.city && (
                  <Text style={styles.farmInfoLocation}>
                    {activeFarm.city}{activeFarm.province ? ` (${activeFarm.province})` : ''}
                  </Text>
                )}
                {activeFarm.partita_iva && (
                  <Text style={styles.farmInfoDetail}>P.IVA: {activeFarm.partita_iva}</Text>
                )}
                {activeFarm.role && (
                  <View style={styles.profileRole}>
                    <RoleBadge role={activeFarm.role} label={ROLE_LABELS[activeFarm.role]} />
                  </View>
                )}
              </Card>
            </>
          )}

          <SectionTitle title="App" />
          <ListItem
            title="Versione"
            rightText="0.1.0"
            icon="information-circle-outline"
            iconColor={colors.textMuted}
          />
          <ListItem
            title="Backend"
            subtitle={BASE_URL}
            rightText={backendStatusQuery.isLoading ? 'In verifica' : backendStatusQuery.isError || !isOnline ? 'Non raggiungibile' : 'Online'}
            icon="server-outline"
            iconColor={backendStatusQuery.isError || !isOnline ? colors.offline : colors.success}
          />

          <View style={styles.buttonSection}>
            <PrimaryButton
              label="Esci"
              onPress={() => {
                Alert.alert('Logout', 'Sei sicuro di voler uscire?', [
                  { text: 'Annulla', style: 'cancel' },
                  {
                    text: 'Esci',
                    style: 'destructive',
                    onPress: async () => {
                      await logout();
                      router.replace('/login');
                    },
                  },
                ]);
              }}
              variant="outline"
              icon="log-out-outline"
            />
          </View>

          <Text style={styles.legalText}>
            AgriConto Pro è un software gestionale. Non sostituisce la consulenza di un commercialista abilitato.
          </Text>

          <View style={{ height: spacing.section }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  subTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
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
    marginBottom: spacing.lg,
  },
  // Sync
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  syncStatusText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
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
    color: colors.success,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftInfo: {
    flex: 1,
  },
  draftType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  draftDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  draftError: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: 4,
  },
  draftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  draftIconButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Profile
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  profileInitials: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  profileName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  farmInfoName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  farmInfoLocation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  farmInfoDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  profileRole: {
    alignItems: 'flex-start',
    marginTop: spacing.md,
  },
  disclaimerCard: {
    marginTop: spacing.sm,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  disclaimerText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.accent,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  legalText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
    marginTop: spacing.xxl,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
