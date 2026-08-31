import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/drawer';

import { useAuth } from '../auth/AuthProvider';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getEnvironmentConfig } from '../config/environment';
import { colors, spacing, typography } from '../theme/tokens';
import {
  filterMenuForRole,
  USER_APP_MENU,
  type NativeMenuLink,
  type UserRole,
} from './menuConfig';

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const env = getEnvironmentConfig();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [busy, setBusy] = useState(false);

  const menu = useMemo(
    () => filterMenuForRole(USER_APP_MENU, (user?.role as UserRole | undefined) ?? 'USER'),
    [user?.role],
  );

  const onPressLink = (item: NativeMenuLink) => {
    if (item.disabled || item.mode === 'DISABLED') {
      return;
    }
    props.navigation.closeDrawer();
    router.push(item.nativePath as `/customers`);
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>{env.appDisplayName}</Text>
        {env.isDevApp ? <Badge label="DEV" tone="warning" /> : null}
        <Text style={styles.user}>{user?.displayName ?? user?.username ?? ''}</Text>
        <Text style={styles.role}>{user?.role ?? ''}</Text>
      </View>

      <ScrollView style={styles.menuScroll}>
        {menu.map((section) => {
          const isOpen = expanded[section.id] ?? true;
          return (
            <View key={section.id} style={styles.section}>
              <Pressable
                onPress={() =>
                  setExpanded((prev) => ({ ...prev, [section.id]: !isOpen }))
                }
                style={styles.sectionHeader}
              >
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <Text style={styles.chevron}>{isOpen ? '▾' : '▸'}</Text>
              </Pressable>
              {isOpen
                ? section.children.map((child) => (
                    <Pressable
                      key={child.id}
                      disabled={child.disabled || child.mode === 'DISABLED'}
                      onPress={() => onPressLink(child)}
                      style={[
                        styles.link,
                        (child.disabled || child.mode === 'DISABLED') && styles.linkDisabled,
                      ]}
                    >
                      <Text style={styles.linkLabel}>{child.label}</Text>
                      <View style={styles.linkMeta}>
                        {child.badge ? <Badge label={child.badge} tone="warning" /> : null}
                        {child.mode === 'WEBVIEW_TEMP' ? (
                          <Badge label="WEB" tone="default" />
                        ) : null}
                        {child.mode === 'NATIVE' ? <Badge label="N" tone="success" /> : null}
                      </View>
                    </Pressable>
                  ))
                : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="로그아웃" variant="secondary" onPress={() => setConfirmLogout(true)} />
      </View>

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
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: spacing.xl },
  header: {
    padding: spacing.lg,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  brand: { fontSize: 20, fontWeight: '800', color: colors.brandDark },
  user: typography.body,
  role: typography.caption,
  menuScroll: { flex: 1 },
  section: { paddingVertical: spacing.sm },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSoft,
  },
  sectionLabel: { ...typography.label, color: colors.textPrimary },
  chevron: { color: colors.textSecondary },
  link: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkDisabled: { opacity: 0.45 },
  linkLabel: typography.body,
  linkMeta: { flexDirection: 'row', gap: spacing.xs },
  footer: { padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
