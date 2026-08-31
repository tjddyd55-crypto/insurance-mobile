import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { getEnvironmentConfig } from '../../config/environment';
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
} from '../../design-system';
import {
  getProfile,
  saveProfile,
  sendPhoneChangeCode,
  verifyPhoneChangeCode,
} from './profileApi';
import { formatProfilePhone, validateProfilePhone } from './profileModel';
import { profileQueryKeys } from './queryKeys';

export function ProfileScreen() {
  const { token, user, updateUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [code, setCode] = useState('');
  const [phoneProof, setPhoneProof] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: profileQueryKeys.current,
    queryFn: () => getProfile(token),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!query.data || initialized) return;
    setDisplayName(query.data.displayName);
    setPhone(formatProfilePhone(query.data.phoneNumber));
    setInitialized(true);
  }, [initialized, query.data]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const phoneDigits = phone.replace(/\D/g, '');
  const phoneChanged = Boolean(query.data && phoneDigits !== query.data.phoneNumber);
  const verifyMutation = useMutation({
    mutationFn: () => verifyPhoneChangeCode(token, phoneDigits, code),
    onSuccess: ({ proof }) => { setPhoneProof(proof); setMessage('인증 완료 — 저장 시 새 번호가 반영됩니다.'); },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : '인증에 실패했습니다.'),
  });
  const sendMutation = useMutation({
    mutationFn: () => sendPhoneChangeCode(token, phoneDigits),
    onSuccess: (result) => {
      setCooldown(60); setCode(''); setPhoneProof('');
      setMessage(
        getEnvironmentConfig().isDevApp && result.debugCode
          ? `개발용 인증번호: ${result.debugCode}`
          : result.message || '인증번호를 전송했습니다.',
      );
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : '인증번호를 전송하지 못했습니다.'),
  });
  const saveMutation = useMutation({
    mutationFn: () => saveProfile(token, {
      displayName,
      ...(phoneChanged ? { phoneNumber: phoneDigits, phoneChangeProof: phoneProof } : {}),
    }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(profileQueryKeys.current, saved);
      await updateUser({ displayName: saved.displayName, teamId: saved.teamId });
      setPhone(formatProfilePhone(saved.phoneNumber));
      setPhoneProof(''); setCode(''); setMessage('저장했습니다.');
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : '저장에 실패했습니다.'),
  });

  const requestCode = () => {
    setError(''); setMessage('');
    const phoneError = validateProfilePhone(phone);
    if (phoneError) { setError(phoneError); return; }
    if (!phoneChanged) { setError('변경할 휴대폰 번호를 입력해 주세요.'); return; }
    sendMutation.mutate();
  };
  const save = () => {
    setError(''); setMessage('');
    if (!displayName.trim()) { setError('이름을 입력해 주세요.'); return; }
    if (phoneChanged && !phoneProof) { setError('휴대폰 번호 변경 인증을 완료해 주세요.'); return; }
    saveMutation.mutate();
  };

  if (query.isLoading) return <LoadingState message="내정보를 불러오는 중…" />;
  if (query.isError || !query.data) {
    return <ErrorState title="내정보를 불러오지 못했습니다" message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => void query.refetch()} />;
  }

  return (
    <View style={styles.root}>
      <AppHeader title="내정보관리" />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        >
          <Card variant="elevated">
            <Stack gap="md">
              <Inline justify="space-between" align="flex-start">
                <View style={styles.identity}><AppText variant="title">{query.data.displayName || query.data.username}</AppText><AppText color="textSecondary">@{query.data.username}</AppText></View>
                <Badge label={query.data.status || 'ACTIVE'} tone="success" />
              </Inline>
              <Inline gap="sm" wrap><Badge label={query.data.role} tone="info" />{user?.gaName ? <Badge label={user.gaName} /> : null}{query.data.teamId ? <Badge label="팀 소속" tone="success" /> : null}</Inline>
            </Stack>
          </Card>

          <Card variant="outlined">
            <Stack gap="md">
              <AppText variant="heading">기본 정보</AppText>
              <TextField label="이름" required value={displayName} onChangeText={setDisplayName} />
              <TextField label="아이디" value={query.data.username} editable={false} />
              <TextField label="휴대폰 번호" value={phone} onChangeText={(value) => { setPhone(value); setPhoneProof(''); setCode(''); }} keyboardType="phone-pad" placeholder="010-1234-5678" />
              {phoneChanged ? (
                <Card variant="filled">
                  <Stack gap="md">
                    <Inline justify="space-between"><AppText variant="bodyStrong">휴대폰 변경 인증</AppText>{phoneProof ? <Badge label="인증 완료" tone="success" /> : null}</Inline>
                    <Button label={cooldown > 0 ? `재요청 (${cooldown}s)` : '인증번호 요청'} variant="secondary" loading={sendMutation.isPending} disabled={cooldown > 0 || Boolean(phoneProof)} onPress={requestCode} />
                    <TextField label="인증번호" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6자리" editable={!phoneProof} />
                    <Button label="인증 확인" variant="secondary" loading={verifyMutation.isPending} disabled={code.length !== 6 || Boolean(phoneProof)} onPress={() => { setError(''); verifyMutation.mutate(); }} />
                  </Stack>
                </Card>
              ) : null}
              {message ? <AppText variant="caption" color="success">{message}</AppText> : null}
              {error ? <AppText color="danger">{error}</AppText> : null}
              <Button label="저장" loading={saveMutation.isPending} disabled={phoneChanged && !phoneProof} onPress={save} />
              <Button label="비밀번호 재설정" variant="secondary" onPress={() => router.push('/profile/password-reset')} />
            </Stack>
          </Card>
        </ScrollView>
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    identity: { flex: 1, gap: theme.spacing.xs },
  });
}
