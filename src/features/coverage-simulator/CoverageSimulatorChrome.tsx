import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { simulatorTheme as theme } from './simulatorTheme';

type HeaderProps = {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRight?: () => void;
  rightDisabled?: boolean;
};

export function CoverageSimulatorScreen({ children }: { children: ReactNode }) {
  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>{children}</SafeAreaView>;
}

export function CoverageSimulatorHeader({ title, onBack, rightLabel, onRight, rightDisabled }: HeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack} style={styles.iconBtn}>
          <Text style={styles.icon}>←</Text>
        </Pressable>
      ) : (
        <View style={styles.iconBtn} />
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {rightLabel && onRight ? (
        <Pressable accessibilityRole="button" disabled={rightDisabled} onPress={onRight} style={styles.rightBtn}>
          <Text style={[styles.right, rightDisabled && styles.rightDisabled]}>{rightLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.rightSlot} />
      )}
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
};

export function CoveragePrimaryButton({ label, onPress, disabled = false, testID }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[styles.primary, disabled && styles.disabled]}
    >
      <Text style={styles.primaryLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{label}</Text>
    </Pressable>
  );
}

export function CoverageSecondaryButton({ label, onPress, disabled = false, testID }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[styles.secondary, disabled && styles.disabled]}
    >
      <Text style={styles.secondaryLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  header: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 20, color: theme.text },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: theme.text },
  rightSlot: { width: 72 },
  rightBtn: { width: 72, alignItems: 'flex-end', justifyContent: 'center' },
  right: { color: theme.primary, fontSize: 13, fontWeight: '600' },
  rightDisabled: { opacity: 0.45 },
  primary: {
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryLabel: { color: '#ffffff', fontSize: 13, fontWeight: '700', textAlign: 'center', width: '100%' },
  secondary: {
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryLabel: { color: theme.text, fontSize: 13, fontWeight: '700', textAlign: 'center', width: '100%' },
  disabled: { opacity: 0.45 },
});
