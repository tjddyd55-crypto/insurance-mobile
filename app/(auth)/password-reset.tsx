import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getEnvironmentConfig } from '../../src/config/environment';
import {
  AppText,
  Button,
  Card,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../src/design-system';
import {
  normalizePhone,
  requestPasswordResetCode,
  resetPasswordBySms,
  validatePassword,
  validateUsername,
} from '../../src/features/auth/publicAuthApi';

export default function PasswordResetScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const requestCode = async () => {
    const usernameError = validateUsername(username);
    if (usernameError) return setError(usernameError);
    if (normalizePhone(phone).length < 10) return setError('휴대폰 번호를 확인해 주세요.');
    setBusy(true); setError(''); setInfo('');
    try {
      const result = await requestPasswordResetCode(username, phone);
      setCodeSent(true);
      setCooldown(result.retryAfterSec ?? 60);
      setInfo(
        getEnvironmentConfig().isDevApp && result.debugCode
          ? `개발용 인증번호: ${result.debugCode}`
          : result.message || '인증번호를 전송했습니다.',
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '인증번호를 전송하지 못했습니다.');
    } finally { setBusy(false); }
  };

  const reset = async () => {
    const passwordError = validatePassword(password);
    if (!codeSent) return setError('인증번호를 먼저 요청해 주세요.');
    if (!/^\d{6}$/.test(code.trim())) return setError('인증번호 6자리를 입력해 주세요.');
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError('비밀번호가 일치하지 않습니다.');
    setBusy(true); setError('');
    try {
      await resetPasswordBySms({ username, phoneNumber: phone, code, newPassword: password });
      setCompleted(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : '비밀번호를 변경하지 못했습니다.');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll>
        <View style={styles.content}>
          <AppText variant="title" align="center">비밀번호 재설정</AppText>
          <AppText color="textSecondary" align="center">가입한 아이디와 휴대폰 번호로 본인 확인을 진행합니다.</AppText>
          <Card>
            {completed ? (
              <Stack gap="lg">
                <AppText variant="heading" color="success" align="center">비밀번호가 변경되었습니다</AppText>
                <Button label="로그인하기" onPress={() => router.replace('/(auth)/login')} />
              </Stack>
            ) : (
              <Stack gap="md">
                <TextField label="아이디" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} editable={!codeSent} />
                <TextField label="휴대폰 번호" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="010-1234-5678" editable={!codeSent} />
                <Button label={cooldown > 0 ? `재요청 (${cooldown}s)` : codeSent ? '인증번호 재요청' : '인증번호 요청'} variant="secondary" loading={busy && !codeSent} disabled={busy || cooldown > 0} onPress={() => void requestCode()} />
                {codeSent ? (
                  <>
                    <TextField label="인증번호" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6자리" />
                    <TextField label="새 비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
                    <TextField label="새 비밀번호 확인" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
                  </>
                ) : null}
                {info ? <AppText variant="caption" color="info">{info}</AppText> : null}
                {error ? <AppText color="danger">{error}</AppText> : null}
                <Button label="비밀번호 변경" loading={busy && codeSent} disabled={!codeSent} onPress={() => void reset()} />
              </Stack>
            )}
          </Card>
          {!completed ? <Button label="로그인으로 돌아가기" variant="ghost" onPress={() => router.back()} /> : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1, justifyContent: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xl },
  });
}
