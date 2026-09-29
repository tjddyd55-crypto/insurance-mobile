import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

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
import { useNativeMenu } from '../../navigation/useNativeMenu';
import { resolveHomeMenuIcon } from './homeMenuIcons';

export function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const env = getEnvironmentConfig();
  const menu = useNativeMenu();

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
            <Stack key={section.id} gap="xs">
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
                      <View style={styles.menuCardInner}>
                        <View style={styles.menuIconPlate}>
                          <SymbolView
                            name={resolveHomeMenuIcon(item.id)}
                            size={18}
                            tintColor={theme.colors.primary}
                            fallback={
                              <AppText variant="caption" color="brandStrong">•</AppText>
                            }
                          />
                        </View>
                        <View style={styles.menuCopy}>
                          <AppText variant="bodyStrong" numberOfLines={2}>{item.label}</AppText>
                          {item.badge ? (
                            <Badge label={item.badge} tone="warning" />
                          ) : item.mode === 'WEBVIEW_TEMP' ? (
                            <Badge label="전환 중" />
                          ) : null}
                        </View>
                      </View>
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
  const menuCardMinHeight = Platform.select({ android: 68, default: 72 }) ?? 72;
  return StyleSheet.create({
    root: { flex: 1 },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.lg,
    },
    hero: { borderColor: theme.colors.primaryBorder },
    heroCopy: { flex: 1, gap: theme.spacing.xs },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    menuCard: {
      width: '48.5%',
      minHeight: menuCardMinHeight,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
    },
    menuCardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 44,
    },
    menuIconPlate: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    menuCopy: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
      justifyContent: 'center',
    },
    pressed: { opacity: theme.opacity.pressed, backgroundColor: theme.colors.surfaceSubtle },
    disabled: { opacity: theme.opacity.disabled },
    designLink: { alignItems: 'center', padding: theme.spacing.md },
  });
}
