import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TextInput } from '../../components/TextInput';
import { getEnvironmentConfig } from '../../config/environment';
import { colors, spacing, typography } from '../../theme/tokens';

export function LoginForm() {
  const { login } = useAuth();
  const env = getEnvironmentConfig();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('로그인에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>{env.appDisplayName}</Text>
      <Text style={styles.subtitle}>Native client · Phase 1</Text>
      <Card style={styles.card}>
        <TextInput
          label="아이디"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          editable={!loading}
        />
        <TextInput
          label="비밀번호"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="로그인" loading={loading} onPress={() => void onSubmit()} />
        <View style={styles.links}>
          <Link href="/(auth)/register" style={styles.link}>
            회원가입
          </Link>
          <Text style={styles.dot}>·</Text>
          <Link href="/(auth)/password-reset" style={styles.link}>
            비밀번호 재설정
          </Link>
        </View>
        <Text style={styles.envHint}>API: {env.apiBaseUrl}</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bgBase,
    gap: spacing.sm,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.brandDark,
    textAlign: 'center',
  },
  subtitle: { ...typography.caption, textAlign: 'center', marginBottom: spacing.md },
  card: { gap: spacing.md },
  error: { color: colors.danger, fontSize: 13 },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  link: { color: colors.primary, fontWeight: '600' },
  dot: { color: colors.textMuted },
  envHint: { ...typography.caption, textAlign: 'center', color: colors.textMuted },
});
