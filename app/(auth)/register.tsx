import { StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { colors, spacing, typography } from '../../src/theme/tokens';

/** M1: registration entry shell — full signup flow is a later milestone. */
export default function RegisterScreen() {
  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.title}>회원가입</Text>
        <Text style={styles.body}>
          Native 회원가입 UI는 M1 이후 단계에서 구현합니다. 기존 Web 경로는 `/register` 입니다.
        </Text>
        <Text style={styles.meta}>API: POST /api/auth/register</Text>
        <Link href="/(auth)/login" style={styles.link}>
          로그인으로 돌아가기
        </Link>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  title: typography.title,
  body: typography.body,
  meta: typography.caption,
  link: { color: colors.primary, fontWeight: '600' },
});
