import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../../src/auth/AuthProvider';
import { getEnvironmentConfig } from '../../src/config/environment';
import {
  AppText,
  Badge,
  Button,
  Card,
  Inline,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../src/design-system';
import {
  checkUsernameAvailability,
  getSignupPhonePolicy,
  normalizePhone,
  registerAccount,
  sendSignupPhoneCode,
  validateGaCode,
  validatePassword,
  validateUsername,
  verifySignupPhoneCode,
  type SignupPhonePolicy,
} from '../../src/features/auth/publicAuthApi';

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function RegisterScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [gaCode, setGaCode] = useState('');
  const [gaName, setGaName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<CheckStatus>('idle');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [phoneProof, setPhoneProof] = useState('');
  const [policy, setPolicy] = useState<SignupPhonePolicy>({
    devBypassEnabled: false,
    signupPhoneVerificationRequired: true,
  });
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    void getSignupPhonePolicy().then(setPolicy).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const checkUsername = async () => {
    const validation = validateUsername(username);
    if (validation) { setError(validation); return; }
    setUsernameStatus('checking'); setError('');
    try {
      const available = await checkUsernameAvailability(username);
      setUsernameStatus(available ? 'available' : 'taken');
      if (!available) setError('이미 사용 중인 아이디입니다.');
    } catch (checkError) {
      setUsernameStatus('idle');
      setError(checkError instanceof Error ? checkError.message : '아이디를 확인하지 못했습니다.');
    }
  };

  const checkGa = async () => {
    if (!gaCode.trim()) { setGaName(''); setInfo('소속 코드를 비우면 공용 소속으로 가입합니다.'); return; }
    setBusy(true); setError(''); setInfo('');
    try {
      const result = await validateGaCode(gaCode);
      if (!result.success) { setGaName(''); setError('유효하지 않은 GA 코드입니다.'); return; }
      setGaName(result.gaName || gaCode.trim().toUpperCase());
      setInfo(`소속 확인: ${result.gaName || gaCode.trim().toUpperCase()}`);
    } catch (gaError) {
      setError(gaError instanceof Error ? gaError.message : 'GA 코드를 확인하지 못했습니다.');
    } finally { setBusy(false); }
  };

  const requestSms = async () => {
    if (normalizePhone(phone).length < 10) return setError('휴대폰 번호를 확인해 주세요.');
    setSmsBusy(true); setError(''); setInfo('');
    try {
      const result = await sendSignupPhoneCode({ phoneNumber: phone, inviteCode: gaCode || undefined });
      setCooldown(60);
      setPhoneProof('');
      setInfo(
        getEnvironmentConfig().isDevApp && result.debugCode
          ? `개발용 인증번호: ${result.debugCode}`
          : result.message || '인증번호를 전송했습니다.',
      );
    } catch (smsError) {
      setError(smsError instanceof Error ? smsError.message : '인증번호를 전송하지 못했습니다.');
    } finally { setSmsBusy(false); }
  };

  const verifySms = async () => {
    if (!/^\d{6}$/.test(smsCode.trim())) return setError('인증번호 6자리를 입력해 주세요.');
    setSmsBusy(true); setError('');
    try {
      const result = await verifySignupPhoneCode({ phoneNumber: phone, inviteCode: gaCode || undefined, code: smsCode });
      setPhoneProof(result.proof);
      setInfo('휴대폰 인증이 완료되었습니다.');
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : '휴대폰 인증에 실패했습니다.');
    } finally { setSmsBusy(false); }
  };

  const submit = async () => {
    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    if (usernameError) return setError(usernameError);
    if (usernameStatus !== 'available') return setError('아이디 중복 확인을 완료해 주세요.');
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError('비밀번호가 일치하지 않습니다.');
    if (!name.trim()) return setError('이름을 입력해 주세요.');
    if (gaCode.trim() && !gaName) return setError('GA 코드 확인을 완료해 주세요.');
    const needsProof = policy.signupPhoneVerificationRequired && !policy.devBypassEnabled;
    if (needsProof && !phoneProof) return setError('휴대폰 인증을 완료해 주세요.');
    setBusy(true); setError('');
    try {
      await registerAccount({
        username, password, name, inviteCode: gaCode || undefined,
        phoneNumber: phone || undefined, signupPhoneProof: phoneProof || undefined,
        referralCode: referralCode || undefined,
      });
      await login(username, password);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : '회원가입에 실패했습니다.');
    } finally { setBusy(false); }
  };

  const needsPhoneAuth = policy.signupPhoneVerificationRequired && !policy.devBypassEnabled;
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll>
        <Stack gap="md" style={styles.content}>
          <AppText variant="title" align="center">회원가입</AppText>
          <AppText color="textSecondary" align="center">ONE FC 업무 계정을 만듭니다.</AppText>
          <Card>
            <Stack gap="md">
              <Inline align="flex-end">
                <TextField label="GA 코드 (선택)" value={gaCode} onChangeText={(value) => { setGaCode(value.toUpperCase()); setGaName(''); setPhoneProof(''); }} placeholder="없으면 공용 소속" autoCapitalize="characters" containerStyle={styles.grow} />
                <Button label="코드 확인" variant="secondary" size="sm" onPress={() => void checkGa()} />
              </Inline>
              {gaName ? <Badge label={gaName} tone="success" /> : null}
              <Inline align="flex-end">
                <TextField label="아이디" required value={username} onChangeText={(value) => { setUsername(value); setUsernameStatus('idle'); }} autoCapitalize="none" autoCorrect={false} containerStyle={styles.grow} />
                <Button label={usernameStatus === 'checking' ? '확인 중' : '중복 확인'} variant="secondary" size="sm" disabled={usernameStatus === 'checking'} onPress={() => void checkUsername()} />
              </Inline>
              {usernameStatus === 'available' ? <AppText variant="caption" color="success">사용 가능한 아이디입니다.</AppText> : null}
              <TextField label="비밀번호" required value={password} onChangeText={setPassword} secureTextEntry helperText="4~100자" />
              <TextField label="비밀번호 확인" required value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              <TextField label="이름" required value={name} onChangeText={setName} />
              <TextField label="추천인 코드 (선택)" value={referralCode} onChangeText={(value) => setReferralCode(value.toUpperCase().replace(/\s/g, ''))} autoCapitalize="characters" />
            </Stack>
          </Card>

          <Card variant="outlined">
            <Stack gap="md">
              <Inline justify="space-between"><AppText variant="heading">휴대폰 인증</AppText>{phoneProof ? <Badge label="인증 완료" tone="success" /> : policy.devBypassEnabled ? <Badge label="DEV 생략 가능" tone="warning" /> : null}</Inline>
              <TextField label="휴대폰 번호" required={needsPhoneAuth} value={phone} onChangeText={(value) => { setPhone(value); setPhoneProof(''); }} keyboardType="phone-pad" placeholder="010-1234-5678" />
              <Button label={cooldown > 0 ? `재요청 (${cooldown}s)` : '인증번호 요청'} variant="secondary" loading={smsBusy && !smsCode} disabled={smsBusy || cooldown > 0 || Boolean(phoneProof)} onPress={() => void requestSms()} />
              <Inline align="flex-end">
                <TextField label="인증번호" value={smsCode} onChangeText={(value) => setSmsCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6자리" editable={!phoneProof} containerStyle={styles.grow} />
                <Button label="인증 확인" variant="secondary" size="sm" loading={smsBusy && Boolean(smsCode)} disabled={Boolean(phoneProof)} onPress={() => void verifySms()} />
              </Inline>
            </Stack>
          </Card>

          {info ? <AppText variant="caption" color="info">{info}</AppText> : null}
          {error ? <AppText color="danger">{error}</AppText> : null}
          <Button label="가입하기" loading={busy} onPress={() => void submit()} />
          <Button label="로그인으로 돌아가기" variant="ghost" onPress={() => router.back()} />
        </Stack>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingVertical: theme.spacing.xl },
    grow: { flex: 1 },
  });
}
