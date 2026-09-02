import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { type DrawerContentComponentProps } from 'expo-router/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { BillingStatusPill } from '../components/BillingStatusPill';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AppText, Button, IconButton, useAppTheme, type AppTheme } from '../design-system';
import { type NativeMenuLink } from './menuConfig';
import { formatGaBannerLabel } from './gaTenantLabel';
import { useNativeMenu } from './useNativeMenu';

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const menu = useNativeMenu();

  const onPressLink = (item: NativeMenuLink) => {
    if (item.disabled || item.mode === 'DISABLED' || item.mode === 'PC_ONLY') return;
    props.navigation.closeDrawer();
    router.push(item.nativePath as '/customers');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <IconButton
          accessibilityLabel="메뉴 닫기"
          onPress={() => props.navigation.closeDrawer()}
          icon={(color) => (
            <AppText accessibilityElementsHidden style={[styles.menuIcon, { color }]}>☰</AppText>
          )}
        />
        <AppText variant="navigationTitle" numberOfLines={1} style={styles.gaName}>
          {formatGaBannerLabel(user?.gaName, user?.gaCode, user?.username)}
        </AppText>
        <BillingStatusPill />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.nav}>
          {menu.map((section, index) => (
            <View key={section.id} style={[styles.section, index > 0 && styles.sectionDivided]}>
              <AppText variant="label" style={styles.sectionLabel}>{section.label}</AppText>
              {section.children.map((child) => {
                const disabled =
                  child.disabled || child.mode === 'DISABLED' || child.mode === 'PC_ONLY';
                const selected = pathname === child.nativePath;
                return (
                  <Pressable
                    key={child.id}
                    accessibilityRole="button"
                    accessibilityState={{ disabled, selected }}
                    disabled={disabled}
                    onPress={() => onPressLink(child)}
                    style={({ pressed }) => [
                      styles.link,
                      selected && styles.linkSelected,
                      pressed && styles.linkPressed,
                      disabled && styles.linkDisabled,
                    ]}
                  >
                    <AppText
                      variant={selected ? 'bodyStrong' : 'body'}
                      style={[styles.linkText, selected && styles.linkTextSelected]}
                    >
                      {child.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <Button label="로그아웃" variant="secondary" fullWidth onPress={() => setConfirmLogout(true)} />
        </View>
      </ScrollView>
      <ConfirmDialog
        open={confirmLogout}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmLabel="로그아웃"
        tone="danger"
        busy={busy}
        closeOnBackdrop={false}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await logout();
            setConfirmLogout(false);
            router.replace('/(auth)/login');
          } finally {
            setBusy(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.surface },
    topbar: {
      minHeight: theme.layout.headerHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    menuIcon: { fontSize: 20, lineHeight: 24 },
    gaName: { flex: 1, minWidth: 0 },
    container: { flexGrow: 1, backgroundColor: theme.colors.surface },
    nav: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm },
    section: { paddingTop: theme.spacing.md },
    sectionDivided: { borderTopWidth: 1, borderTopColor: theme.colors.border },
    sectionLabel: { paddingBottom: theme.spacing.xs, color: theme.colors.textSecondary, fontWeight: '700', letterSpacing: 0.5 },
    link: {
      minHeight: theme.interaction.minimumTouchTarget,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    linkSelected: { backgroundColor: theme.colors.primarySoft },
    linkPressed: { backgroundColor: theme.colors.surfaceSubtle },
    linkDisabled: { opacity: theme.opacity.disabled },
    linkText: { color: theme.colors.textSecondary },
    linkTextSelected: { color: theme.colors.primaryPressed },
    footer: { padding: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  });
}
