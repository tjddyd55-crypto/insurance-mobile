import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';

import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { getEnvironmentConfig } from '../../config/environment';
import { AppText, Button, Card, Stack, TextField, useAppTheme, type AppTheme } from '../../design-system';

export function LoginForm() {
  const { login } = useAuth();
  const env = getEnvironmentConfig();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
      <AppText variant="display" color="brandStrong" align="center">{env.appDisplayName}</AppText>
      <AppText variant="caption" align="center" style={styles.subtitle}>ONE FC Native</AppText>
      <Card style={styles.card}>
        <TextField
          label="아이디"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          editable={!loading}
        />
        <TextField
          label="비밀번호"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
        {error ? <AppText color="danger">{error}</AppText> : null}
        <Button label="로그인" loading={loading} onPress={() => void onSubmit()} />
        <View style={styles.links}>
          <Link href="/(auth)/register" style={styles.link}>
            회원가입
          </Link>
          <AppText color="textMuted">·</AppText>
          <Link href="/(auth)/password-reset" style={styles.link}>
            비밀번호 재설정
          </Link>
        </View>
        <Stack gap="xxs">
          <AppText variant="caption" color="textMuted" align="center">API: {env.apiBaseUrl}</AppText>
          {env.isDevApp ? <AppText variant="caption" color="warningText" align="center">개발 서버 연결</AppText> : null}
        </Stack>
      </Card>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: { flex: 1, justifyContent: 'center', padding: theme.spacing.xl, backgroundColor: theme.colors.background, gap: theme.spacing.sm },
    subtitle: { marginBottom: theme.spacing.md },
    card: { gap: theme.spacing.md },
    links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm },
    link: { color: theme.colors.primary, fontWeight: '600' },
  });
}
