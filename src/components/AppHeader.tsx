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
import { openAppDrawer } from '../navigation/openAppDrawer';

/** @internal 테스트·스냅샷 검증용 */
export const APP_HEADER_TITLE_TEXT_PROPS = {
  numberOfLines: 1 as const,
  ellipsizeMode: 'tail' as const,
};

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
  const navigation = useNavigation();
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
        {showBack || showMenu ? (
          <View style={styles.leading}>
            {showBack ? (
              <IconButton
                accessibilityLabel="뒤로 가기"
                onPress={() => (onBackPress ? onBackPress() : router.back())}
                icon={(color) => (
                  <AppText accessibilityElementsHidden style={[styles.backIcon, { color }]}>‹</AppText>
                )}
              />
            ) : (
              <IconButton
                accessibilityLabel="메뉴 열기"
                onPress={() => openAppDrawer(navigation)}
                icon={(color) => (
                  <AppText accessibilityElementsHidden style={[styles.menuIcon, { color }]}>☰</AppText>
                )}
              />
            )}
          </View>
        ) : null}
        <View style={styles.titleBlock}>
          <AppText variant="navigationTitle" {...APP_HEADER_TITLE_TEXT_PROPS}>
            {titleLabel}
          </AppText>
          {subtitle ? (
            <AppText variant="helper" {...APP_HEADER_TITLE_TEXT_PROPS}>{subtitle}</AppText>
          ) : null}
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

export function createAppHeaderStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { backgroundColor: theme.colors.surface },
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: theme.layout.headerHeight,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    leading: {
      flexShrink: 0,
      marginRight: theme.spacing.sm,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
      flexShrink: 1,
      gap: theme.spacing.xxs,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flexShrink: 0,
      marginLeft: theme.spacing.sm,
    },
    menuIcon: { fontSize: 20, lineHeight: 24 },
    backIcon: { fontSize: 30, lineHeight: 32 },
  });
}

function createStyles(theme: AppTheme) {
  return createAppHeaderStyles(theme);
}
