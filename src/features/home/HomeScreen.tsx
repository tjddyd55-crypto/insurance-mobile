import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { getEnvironmentConfig } from '../../config/environment';
import {
  AppText,
  Badge,
  Card,
  Inline,
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { filterMenuForRole, USER_APP_MENU, type UserRole } from '../../navigation/menuConfig';

export function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const env = getEnvironmentConfig();
  const menu = useMemo(
    () => filterMenuForRole(USER_APP_MENU, user?.role as UserRole | undefined),
    [user?.role],
  );

  return (
    <View style={styles.root}>
      <AppHeader title="홈" />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card variant="elevated" style={styles.hero}>
            <Stack gap="sm">
              <Inline justify="space-between" align="flex-start">
                <View style={styles.heroCopy}>
                  <AppText variant="title" color="brandStrong">{env.appDisplayName}</AppText>
                  <AppText>안녕하세요, {user?.displayName || user?.username}님</AppText>
                </View>
                {env.isDevApp ? <Badge label="DEV" tone="warning" /> : null}
              </Inline>
              <AppText variant="caption">
                {user?.gaName || user?.gaCode || 'ONE FC'} · {user?.role || 'USER'}
              </AppText>
            </Stack>
          </Card>

          {menu.map((section) => (
            <Stack key={section.id} gap="sm">
              <AppText variant="heading">{section.label}</AppText>
              <View style={styles.grid}>
                {section.children.map((item) => {
                  const disabled = item.disabled || item.mode === 'DISABLED';
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() => router.push(item.nativePath as '/customers')}
                      style={({ pressed }) => [
                        styles.menuCard,
                        pressed && styles.pressed,
                        disabled && styles.disabled,
                      ]}
                    >
                      <Stack gap="sm">
                        <View style={styles.menuSymbol}>
                          <AppText variant="heading" color="brandStrong">
                            {item.label.slice(0, 1)}
                          </AppText>
                        </View>
                        <AppText variant="bodyStrong" numberOfLines={2}>{item.label}</AppText>
                        <Inline gap="xs" wrap>
                          {item.badge ? <Badge label={item.badge} tone="warning" /> : null}
                          {item.mode === 'NATIVE' ? <Badge label="앱" tone="success" /> : null}
                          {item.mode === 'WEBVIEW_TEMP' ? <Badge label="전환 중" /> : null}
                        </Inline>
                      </Stack>
                    </Pressable>
                  );
                })}
              </View>
            </Stack>
          ))}

          {env.isDevApp ? (
            <Pressable onPress={() => router.push('/design-system')} style={styles.designLink}>
              <AppText variant="caption" color="info">디자인 시스템 갤러리 열기</AppText>
            </Pressable>
          ) : null}
        </ScrollView>
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, gap: theme.spacing.xl },
    hero: { borderColor: theme.colors.primaryBorder },
    heroCopy: { flex: 1, gap: theme.spacing.xs },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    menuCard: {
      width: '48.5%',
      minHeight: 132,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    menuSymbol: {
      width: 36, height: 36, borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center',
    },
    pressed: { opacity: theme.opacity.pressed, backgroundColor: theme.colors.surfaceSubtle },
    disabled: { opacity: theme.opacity.disabled },
    designLink: { alignItems: 'center', padding: theme.spacing.md },
  });
}
