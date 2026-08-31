import { StyleSheet, Text } from 'react-native';
import { Link } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { colors, spacing, typography } from '../../src/theme/tokens';

/** M1 shell — endpoints from passwordResetApi */
export default function PasswordResetScreen() {
  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={styles.title}>비밀번호 재설정</Text>
        <Text style={styles.body}>
          기존 API: `/api/auth/request-password-reset-code`, `/api/auth/reset-password-by-sms`
        </Text>
        <Text style={styles.body}>Native 전체 플로우는 후속 milestone에서 연결합니다.</Text>
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
  link: { color: colors.primary, fontWeight: '600' },
});
