import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/drawer';

import { useAuth } from '../auth/AuthProvider';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getEnvironmentConfig } from '../config/environment';
import { AppText, Badge, Button, useAppTheme, type AppTheme } from '../design-system';
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
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        <AppText variant="title" color="brandStrong">{env.appDisplayName}</AppText>
        {env.isDevApp ? <Badge label="DEV" tone="warning" /> : null}
        <AppText>{user?.displayName ?? user?.username ?? ''}</AppText>
        <AppText variant="caption">{user?.role ?? ''}</AppText>
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
                <AppText variant="label" style={styles.sectionLabel}>{section.label}</AppText>
                <AppText color="textSecondary">{isOpen ? '▾' : '▸'}</AppText>
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
                      <AppText>{child.label}</AppText>
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

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flexGrow: 1, paddingBottom: theme.spacing.xl, backgroundColor: theme.colors.surface },
    header: { padding: theme.spacing.lg, gap: theme.spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    menuScroll: { flex: 1 },
    section: { paddingVertical: theme.spacing.sm },
    sectionHeader: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surfaceSubtle },
    sectionLabel: { color: theme.colors.text },
    link: { minHeight: theme.controlSize.minimumTouchTarget, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    linkDisabled: { opacity: theme.opacity.disabled },
    linkMeta: { flexDirection: 'row', gap: theme.spacing.xs },
    footer: { padding: theme.spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  });
}
