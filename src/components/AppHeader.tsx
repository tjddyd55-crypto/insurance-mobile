import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';

import { useAuth } from '../auth/AuthProvider';
import { getEnvironmentConfig } from '../config/environment';
import { colors, spacing, typography } from '../theme/tokens';
import { Badge } from './Badge';

type AppHeaderProps = {
  title: string;
  showMenu?: boolean;
};

export function AppHeader({ title, showMenu = true }: AppHeaderProps) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isDevApp } = getEnvironmentConfig();

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        {showMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="메뉴 열기"
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.right}>
        {isDevApp ? <Badge label="DEV" tone="warning" /> : null}
        {user?.displayName ? (
          <Text style={styles.user} numberOfLines={1}>
            {user.displayName}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: '40%' },
  menuButton: { padding: spacing.xs },
  menuIcon: { fontSize: 22, color: colors.brandDark },
  title: { ...typography.heading, flexShrink: 1 },
  user: { ...typography.caption, maxWidth: 100 },
});
