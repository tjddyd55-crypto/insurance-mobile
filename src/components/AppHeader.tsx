import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { getEnvironmentConfig } from '../config/environment';
import { AppText, Badge, useAppTheme, type AppTheme } from '../design-system';

type AppHeaderProps = {
  title: string;
  showMenu?: boolean;
  showBack?: boolean;
};

export function AppHeader({ title, showMenu = true, showBack = false }: AppHeaderProps) {
  const navigation = useNavigation() as ReturnType<typeof useNavigation> & { openDrawer: () => void };
  const router = useRouter();
  const { user } = useAuth();
  const { isDevApp } = getEnvironmentConfig();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.wrap}>
        <View style={styles.left}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="뒤로 가기"
              onPress={() => router.back()}
              style={styles.menuButton}
            >
              <AppText style={styles.backIcon}>‹</AppText>
            </Pressable>
          ) : showMenu ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="메뉴 열기"
              onPress={() => navigation.openDrawer()}
              style={styles.menuButton}
            >
              <AppText style={styles.menuIcon}>☰</AppText>
            </Pressable>
          ) : null}
          <AppText variant="heading" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
        </View>
        <View style={styles.right}>
          {isDevApp ? <Badge label="DEV" tone="warning" /> : null}
          {user?.displayName ? (
            <AppText variant="caption" numberOfLines={1} style={styles.user}>
              {user.displayName}
            </AppText>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { backgroundColor: theme.colors.surface },
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: theme.spacing.sm },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      maxWidth: '40%',
    },
    menuButton: {
      minWidth: theme.controlSize.minimumTouchTarget,
      minHeight: theme.controlSize.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIcon: { fontSize: 22, color: theme.colors.brandStrong },
    backIcon: { fontSize: 36, lineHeight: 38, color: theme.colors.text },
    title: { flexShrink: 1 },
    user: { maxWidth: 100 },
  });
}
