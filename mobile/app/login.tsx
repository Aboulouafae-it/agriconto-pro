/**
 * Login Screen — professional mobile authentication.
 *
 * Features:
 * - AgriConto Pro branding with tagline.
 * - Email and password fields.
 * - Loading state.
 * - Friendly Italian error messages.
 * - Secure token storage after successful login.
 * - Auto-navigates to farm selection or home.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/auth/useAuth';
import { FormField, PrimaryButton } from '../src/components';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../src/design';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    setError(null);

    if (!email.trim()) {
      setError('Inserisci il tuo indirizzo email.');
      return;
    }
    if (!password) {
      setError('Inserisci la password.');
      return;
    }

    setLoading(true);
    const err = await login(email.trim().toLowerCase(), password);
    setLoading(false);

    if (err) {
      setError('Credenziali non valide. Verifica email e password.');
      return;
    }

    // Navigate based on farm count
    router.replace('/farm-select');
  }, [email, password, login]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Area */}
          <View style={styles.logoArea}>
            <View style={[styles.logoCircle, shadows.cardElevated]}>
              <Ionicons name="leaf" size={42} color={colors.textInverse} />
            </View>
            <Text style={styles.appName}>AgriConto Pro</Text>
            <Text style={styles.tagline}>La gestione agricola, sempre con te.</Text>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, shadows.cardElevated]}>
            <Text style={styles.formTitle}>Accedi</Text>

            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="nome@esempio.it"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
            />

            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="La tua password"
              secureTextEntry
              icon="lock-closed-outline"
            />

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <PrimaryButton
              label="Accedi"
              onPress={handleLogin}
              loading={loading}
              icon="log-in-outline"
            />
          </View>

          <Text style={styles.footer}>
            AgriConto Pro v0.1.0 — Mobile Companion
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  appName: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
  },
  formTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  footer: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xxxl,
  },
});
