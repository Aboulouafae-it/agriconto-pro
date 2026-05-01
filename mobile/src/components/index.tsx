/**
 * Reusable UI components — AgriConto Pro Mobile design system.
 *
 * Premium agricultural SaaS feel with large touch targets,
 * clear typography, and elegant shadows.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '../design';

// ─── ScreenHeader ────────────────────────────────────────────
interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, rightAction }: ScreenHeaderProps) {
  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.left}>
        <Text style={headerStyles.title}>{title}</Text>
        {subtitle && <Text style={headerStyles.subtitle}>{subtitle}</Text>}
      </View>
      {rightAction && <View>{rightAction}</View>}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  left: { flex: 1 },
  title: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

// ─── StatCard ────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  bgColor?: string;
}

export function StatCard({
  label,
  value,
  icon,
  color = colors.primary,
  bgColor = colors.primarySurface,
}: StatCardProps) {
  return (
    <View style={[statStyles.card, shadows.card]}>
      <View style={[statStyles.iconBg, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '48%',
    marginBottom: spacing.md,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// ─── QuickActionButton ──────────────────────────────────────
interface QuickActionButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}

export function QuickActionButton({
  label,
  icon,
  color = colors.primary,
  onPress,
}: QuickActionButtonProps) {
  return (
    <TouchableOpacity
      style={[actionStyles.button, shadows.card]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[actionStyles.iconCircle, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={actionStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const actionStyles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    width: '48%',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

// ─── PrimaryButton ───────────────────────────────────────────
interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  style,
}: PrimaryButtonProps) {
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';
  const bgColor = isOutline
    ? 'transparent'
    : isSecondary
      ? colors.accentSurface
      : colors.primary;
  const textColor = isOutline
    ? colors.primary
    : isSecondary
      ? colors.accent
      : colors.textInverse;

  return (
    <TouchableOpacity
      style={[
        btnStyles.button,
        { backgroundColor: bgColor },
        isOutline && btnStyles.outlined,
        !isOutline && shadows.button,
        disabled && btnStyles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={btnStyles.inner}>
          {icon && <Ionicons name={icon} size={20} color={textColor} style={{ marginRight: 8 }} />}
          <Text style={[btnStyles.text, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});

// ─── FormField ───────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: TextInput['props']['keyboardType'];
  secureTextEntry?: boolean;
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  multiline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  multiline,
  icon,
}: FormFieldProps) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[fieldStyles.inputContainer, error && fieldStyles.inputError]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? colors.error : colors.textMuted}
            style={{ marginRight: 10 }}
          />
        )}
        <TextInput
          style={[fieldStyles.input, multiline && fieldStyles.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
        />
      </View>
      {error && <Text style={fieldStyles.error}>{error}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
});

// ─── MoneyInput ──────────────────────────────────────────────
interface MoneyInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export function MoneyInput({ label, value, onChangeText, error }: MoneyInputProps) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[moneyStyles.container, error && fieldStyles.inputError]}>
        <Text style={moneyStyles.currency}>€</Text>
        <TextInput
          style={moneyStyles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
        />
      </View>
      {error && <Text style={fieldStyles.error}>{error}</Text>}
    </View>
  );
}

const moneyStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
  },
  currency: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
});

// ─── CategoryChips ───────────────────────────────────────────
interface CategoryChipsProps {
  categories: readonly string[];
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  return (
    <View style={chipStyles.container}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[chipStyles.chip, selected === cat && chipStyles.chipActive]}
          onPress={() => onSelect(cat)}
          activeOpacity={0.8}
        >
          <Text style={[chipStyles.chipText, selected === cat && chipStyles.chipTextActive]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeight.semibold,
  },
});

// ─── StatusBadge ─────────────────────────────────────────────
interface StatusBadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
}

export function StatusBadge({
  label,
  color = colors.primary,
  bgColor = colors.primarySurface,
}: StatusBadgeProps) {
  return (
    <View style={[badgeStyles.badge, { backgroundColor: bgColor }]}>
      <Text style={[badgeStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

// ─── RoleBadge ───────────────────────────────────────────────
const roleColors: Record<string, { color: string; bg: string }> = {
  OWNER: { color: colors.primary, bg: colors.primarySurface },
  ACCOUNTANT: { color: colors.accent, bg: colors.accentSurface },
  LABOR_CONSULTANT: { color: colors.warning, bg: colors.warningLight },
  WORKER: { color: colors.textSecondary, bg: colors.background },
};

interface RoleBadgeProps {
  role: string;
  label: string;
}

export function RoleBadge({ role, label }: RoleBadgeProps) {
  const c = roleColors[role] || roleColors.WORKER;
  return <StatusBadge label={label} color={c.color} bgColor={c.bg} />;
}

// ─── OfflineBanner ───────────────────────────────────────────
export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={offlineStyles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.textInverse} />
      <Text style={offlineStyles.text}>Modalità offline — Le bozze verranno sincronizzate</Text>
    </View>
  );
}

const offlineStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.offline,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  text: {
    fontSize: fontSize.xs,
    color: colors.textInverse,
    fontWeight: fontWeight.medium,
  },
});

// ─── SyncStatusBadge ─────────────────────────────────────────
const syncColors: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { color: colors.warning, bg: colors.warningLight, icon: 'time-outline' },
  syncing: { color: colors.accent, bg: colors.accentSurface, icon: 'sync-outline' },
  error: { color: colors.error, bg: colors.errorLight, icon: 'alert-circle-outline' },
  synced: { color: colors.success, bg: colors.successLight, icon: 'checkmark-circle-outline' },
};

export function SyncStatusBadge({ status }: { status: string }) {
  const c = syncColors[status] || syncColors.pending;
  const labels: Record<string, string> = {
    pending: 'In attesa',
    syncing: 'Sincronizzazione...',
    error: 'Errore',
    synced: 'Sincronizzato',
  };
  return (
    <View style={[syncBadgeStyles.container, { backgroundColor: c.bg }]}>
      <Ionicons name={c.icon} size={14} color={c.color} />
      <Text style={[syncBadgeStyles.text, { color: c.color }]}>{labels[status] || status}</Text>
    </View>
  );
}

const syncBadgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 4,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});

// ─── EmptyState ──────────────────────────────────────────────
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={emptyStyles.container}>
      <Ionicons name={icon} size={56} color={colors.textMuted} />
      <Text style={emptyStyles.title}>{title}</Text>
      {subtitle && <Text style={emptyStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxxl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

// ─── LoadingState ────────────────────────────────────────────
export function LoadingState({ message = 'Caricamento...' }: { message?: string }) {
  return (
    <View style={loadingStyles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={loadingStyles.text}>{message}</Text>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxxl,
  },
  text: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});

// ─── ErrorState ──────────────────────────────────────────────
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Non è stato possibile completare l\'operazione. Riprova tra poco.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={errorStyles.container}>
      <Ionicons name="alert-circle-outline" size={56} color={colors.error} />
      <Text style={errorStyles.text}>{message}</Text>
      {onRetry && (
        <PrimaryButton label="Riprova" onPress={onRetry} variant="outline" style={{ marginTop: spacing.lg }} />
      )}
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxxl,
  },
  text: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
});

// ─── SectionTitle ────────────────────────────────────────────
export function SectionTitle({ title, style }: { title: string; style?: TextStyle }) {
  return <Text style={[sectionStyles.title, style]}>{title}</Text>;
}

const sectionStyles = StyleSheet.create({
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
});

// ─── Card ────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyles.card, shadows.card, style]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyles.card, shadows.card, style]}>{children}</View>;
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
});

// ─── ListItem ────────────────────────────────────────────────
interface ListItemProps {
  title: string;
  subtitle?: string;
  rightText?: string;
  rightSubtext?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
}

export function ListItem({
  title,
  subtitle,
  rightText,
  rightSubtext,
  icon,
  iconColor = colors.primary,
  onPress,
}: ListItemProps) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={listStyles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
    >
      {icon && (
        <View style={[listStyles.iconBg, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      )}
      <View style={listStyles.content}>
        <Text style={listStyles.title}>{title}</Text>
        {subtitle && <Text style={listStyles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={listStyles.right}>
        {rightText && <Text style={listStyles.rightText}>{rightText}</Text>}
        {rightSubtext && <Text style={listStyles.rightSubtext}>{rightSubtext}</Text>}
        {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
      </View>
    </Container>
  );
}

const listStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rightText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  rightSubtext: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
