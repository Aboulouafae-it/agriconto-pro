/**
 * Documenti (Documents) Screen — document capture and upload.
 *
 * Core mobile advantage:
 * - Camera-first capture.
 * - Gallery/file selection.
 * - Document type selection.
 * - Upload to backend.
 * - Recent documents list.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/useAuth';
import { documentsApi } from '../../src/api/documents';
import { useNetworkStatus } from '../../src/offline/networkStatus';
import {
  ScreenHeader,
  PrimaryButton,
  FormField,
  CategoryChips,
  Card,
  ListItem,
  SectionTitle,
  EmptyState,
  OfflineBanner,
  StatusBadge,
} from '../../src/components';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../../src/design';
import { formatDateIT } from '../../src/utils';
import { DOCUMENT_TYPES } from '../../src/types';

export default function DocumentiScreen() {
  const { activeFarmId } = useAuth();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [docType, setDocType] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch recent documents
  const { data: docsData } = useQuery({
    queryKey: ['documents', activeFarmId],
    queryFn: async () => {
      if (!activeFarmId) return null;
      const res = await documentsApi.list(activeFarmId, 1, 10);
      return res.data;
    },
    enabled: !!activeFarmId,
  });

  const recentDocs = docsData?.items || [];

  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso necessario', 'AgriConto Pro necessita dell\'accesso alla fotocamera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  }, []);

  const handleGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso necessario', 'AgriConto Pro necessita dell\'accesso alla galleria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedImage || !docType || !title.trim() || !activeFarmId) {
      Alert.alert('Attenzione', 'Compila tutti i campi obbligatori.');
      return;
    }

    if (!isOnline) {
      Alert.alert(
        'Offline',
        'Il caricamento documenti offline sarà disponibile in una prossima versione. Puoi riprovare quando la connessione è attiva.',
      );
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('document_type', docType);
    if (notes.trim()) formData.append('notes', notes.trim());

    // Append file
    const uri = selectedImage.uri;
    const filename = uri.split('/').pop() || 'document.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as unknown as Blob);

    const res = await documentsApi.upload(activeFarmId, formData);

    setUploading(false);

    if (res.error) {
      Alert.alert('Errore', 'Non è stato possibile completare l\'operazione. Riprova tra poco.');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['documents'] });

    // Reset form
    setSelectedImage(null);
    setDocType('');
    setTitle('');
    setNotes('');

    Alert.alert('✓ Caricato', 'Documento caricato correttamente.');
  }, [selectedImage, docType, title, notes, activeFarmId, isOnline, queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return { color: colors.success, bg: colors.successLight, label: 'Caricato' };
      case 'REQUESTED':
        return { color: colors.warning, bg: colors.warningLight, label: 'Da caricare' };
      case 'MISSING':
        return { color: colors.error, bg: colors.errorLight, label: 'Mancante' };
      default:
        return { color: colors.textMuted, bg: colors.background, label: status };
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner visible={!isOnline} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Documenti"
          subtitle="Cattura e carica documenti"
        />

        {/* Capture Actions */}
        <View style={styles.captureRow}>
          <TouchableOpacity
            style={[styles.captureBtn, shadows.card]}
            onPress={handleCamera}
            activeOpacity={0.85}
          >
            <View style={[styles.captureIcon, { backgroundColor: colors.primarySurface }]}>
              <Ionicons name="camera" size={28} color={colors.primary} />
            </View>
            <Text style={styles.captureLabel}>Fotocamera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.captureBtn, shadows.card]}
            onPress={handleGallery}
            activeOpacity={0.85}
          >
            <View style={[styles.captureIcon, { backgroundColor: colors.accentSurface }]}>
              <Ionicons name="images" size={28} color={colors.accent} />
            </View>
            <Text style={styles.captureLabel}>Galleria</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Image Preview */}
        {selectedImage && (
          <Card>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.preview}
              resizeMode="cover"
            />
            <View style={styles.previewActions}>
              <TouchableOpacity onPress={() => setSelectedImage(null)}>
                <Text style={styles.retakeText}>Riprendi foto</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Form (visible when image selected) */}
        {selectedImage && (
          <View style={styles.form}>
            {!isOnline && (
              <Card style={styles.limitCard}>
                <View style={styles.limitRow}>
                  <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
                  <Text style={styles.limitText}>
                    Il caricamento documenti offline sarà disponibile in una prossima versione.
                  </Text>
                </View>
              </Card>
            )}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TIPO DOCUMENTO</Text>
              <CategoryChips
                categories={DOCUMENT_TYPES}
                selected={docType}
                onSelect={setDocType}
              />
            </View>

            <View style={styles.section}>
              <FormField
                label="Titolo"
                value={title}
                onChangeText={setTitle}
                placeholder="es. Fattura carburante marzo"
                icon="document-text-outline"
              />
            </View>

            <View style={styles.section}>
              <FormField
                label="Note"
                value={notes}
                onChangeText={setNotes}
                placeholder="Note opzionali"
                multiline
                icon="chatbubble-outline"
              />
            </View>

            <View style={styles.buttonSection}>
              <PrimaryButton
                label={uploading ? 'Caricamento in corso...' : 'Carica documento'}
                onPress={handleUpload}
                loading={uploading}
                icon="cloud-upload-outline"
                disabled={!docType || !title.trim()}
              />
            </View>
          </View>
        )}

        {/* Recent Documents */}
        <SectionTitle title="Documenti recenti" />
        {recentDocs.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="Nessun documento"
            subtitle="I documenti caricati appariranno qui"
          />
        ) : (
          recentDocs.map((doc) => {
            const s = getStatusColor(doc.status);
            return (
              <ListItem
                key={doc.id}
                title={doc.title}
                subtitle={`${doc.document_type} — ${formatDateIT(doc.uploaded_at)}`}
                icon="document-outline"
                iconColor={colors.accent}
              />
            );
          })
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
  captureRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  captureBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  captureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  captureLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  previewActions: {
    alignItems: 'center',
  },
  retakeText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  form: {
    marginTop: spacing.md,
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
    marginBottom: spacing.xl,
  },
  limitCard: {
    borderWidth: 1,
    borderColor: colors.warningLight,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  limitText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: 20,
  },
});
