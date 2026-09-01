import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { BillingStatusPill } from './BillingStatusPill';
import { getEnvironmentConfig } from '../config/environment';
import {
  AppText,
  Badge,
  IconButton,
  useAppTheme,
  type AppTheme,
} from '../design-system';
import { formatGaBannerLabel } from '../navigation/gaTenantLabel';

type AppHeaderProps = {
  title: string;
  showMenu?: boolean;
  showBack?: boolean;
  onBackPress?: () => void;
  subtitle?: string;
  rightAction?: ReactNode;
  showBillingStatus?: boolean;
};

export function AppHeader({
  title,
  showMenu = true,
  showBack = false,
  onBackPress,
  subtitle,
  rightAction,
  showBillingStatus,
}: AppHeaderProps) {
  const navigation = useNavigation() as ReturnType<typeof useNavigation> & { openDrawer: () => void };
  const router = useRouter();
  const { user } = useAuth();
  const { isDevApp } = getEnvironmentConfig();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const titleLabel = showBack
    ? title
    : formatGaBannerLabel(user?.gaName, user?.gaCode, user?.username);
  const billingVisible = showBillingStatus ?? !showBack;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.wrap}>
        <View style={styles.left}>
          {showBack ? (
            <IconButton
              accessibilityLabel="뒤로 가기"
              onPress={() => (onBackPress ? onBackPress() : router.back())}
              icon={(color) => (
                <AppText accessibilityElementsHidden style={[styles.backIcon, { color }]}>‹</AppText>
              )}
            />
          ) : showMenu ? (
            <IconButton
              accessibilityLabel="메뉴 열기"
              onPress={() => navigation.openDrawer()}
              icon={(color) => (
                <AppText accessibilityElementsHidden style={[styles.menuIcon, { color }]}>☰</AppText>
              )}
            />
          ) : null}
          <View style={styles.titleBlock}>
            <AppText variant="navigationTitle" numberOfLines={1}>{titleLabel}</AppText>
            {subtitle ? <AppText variant="helper" numberOfLines={1}>{subtitle}</AppText> : null}
          </View>
        </View>
        <View style={styles.right}>
          {isDevApp ? <Badge label="DEV" tone="warning" /> : null}
          {billingVisible ? <BillingStatusPill /> : null}
          {rightAction}
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
      minHeight: theme.layout.headerHeight,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0, gap: theme.spacing.sm },
    titleBlock: { flexShrink: 1, minWidth: 0, gap: theme.spacing.xxs },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flexShrink: 1,
      marginLeft: theme.spacing.sm,
    },
    menuIcon: { fontSize: 20, lineHeight: 24 },
    backIcon: { fontSize: 30, lineHeight: 32 },
  });
}
