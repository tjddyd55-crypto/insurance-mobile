import { View, Text, StyleSheet } from 'react-native';
import { AppHeader } from '../../src/components/AppHeader';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { getEnvironmentConfig } from '../../src/config/environment';
import { useAuth } from '../../src/auth/AuthProvider';
import { colors, spacing, typography } from '../../src/theme/tokens';

export default function HomeScreen() {
  const { user } = useAuth();
  const env = getEnvironmentConfig();
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="홈" />
      <Screen>
        <Card style={styles.card}>
          <Text style={styles.title}>{env.appDisplayName}</Text>
          <Text style={styles.body}>안녕하세요, {user?.displayName ?? user?.username}님</Text>
          <Text style={styles.caption}>햄버거 메뉴에서 기능을 선택하세요.</Text>
          <Text style={styles.caption}>M1 Foundation — 본기능은 후속 milestone</Text>
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  title: { ...typography.title, color: colors.brandDark },
  body: typography.body,
  caption: typography.caption,
});
