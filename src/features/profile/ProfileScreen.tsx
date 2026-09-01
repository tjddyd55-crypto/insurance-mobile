import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
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
import { formatProfileOrganization, formatProfileRole } from './profilePresentation';
import { profileQueryKeys } from './queryKeys';

export function ProfileScreen() {
  const { token, user, updateUser, logout } = useAuth();
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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
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
          <Card variant="elevated" padding="md">
            <Stack gap="sm">
              <Inline justify="space-between" align="flex-start">
                <View style={styles.identity}>
                  <AppText variant="heading" numberOfLines={2}>
                    {query.data.displayName || query.data.username}
                  </AppText>
                  <AppText color="textSecondary" numberOfLines={2}>
                    {formatProfileOrganization(user?.gaName, user?.gaCode)}
                  </AppText>
                </View>
                <Badge label={formatProfileRole(query.data.role)} tone="info" />
              </Inline>
            </Stack>
          </Card>

          <SectionTitle title="계정 정보" description="로그인 계정과 표시 이름을 관리합니다." />
          <Card variant="outlined">
            <Stack gap="md">
              <TextField label="이름" required value={displayName} onChangeText={setDisplayName} />
              <TextField label="아이디" value={query.data.username} editable={false} />
            </Stack>
          </Card>

          <SectionTitle title="연락처" description="휴대폰 번호 변경 시 본인 인증이 필요합니다." />
          <Card variant="outlined">
            <Stack gap="md">
              <TextField
                label="휴대폰 번호"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value);
                  setPhoneProof('');
                  setCode('');
                }}
                keyboardType="phone-pad"
                placeholder="010-1234-5678"
              />
              {phoneChanged ? (
                <Card variant="filled" padding="md">
                  <Stack gap="md">
                    <Inline justify="space-between">
                      <AppText variant="bodyStrong">휴대폰 변경 인증</AppText>
                      {phoneProof ? <Badge label="인증 완료" tone="success" /> : null}
                    </Inline>
                    <Button
                      label={cooldown > 0 ? `재요청 (${cooldown}s)` : '인증번호 요청'}
                      variant="secondary"
                      loading={sendMutation.isPending}
                      disabled={cooldown > 0 || Boolean(phoneProof)}
                      onPress={requestCode}
                    />
                    <TextField
                      label="인증번호"
                      value={code}
                      onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      placeholder="6자리"
                      editable={!phoneProof}
                    />
                    <Button
                      label="인증 확인"
                      variant="secondary"
                      loading={verifyMutation.isPending}
                      disabled={code.length !== 6 || Boolean(phoneProof)}
                      onPress={() => {
                        setError('');
                        verifyMutation.mutate();
                      }}
                    />
                  </Stack>
                </Card>
              ) : null}
              {message ? <AppText variant="caption" color="success">{message}</AppText> : null}
              {error ? <AppText color="danger">{error}</AppText> : null}
              <Button
                label="저장"
                loading={saveMutation.isPending}
                disabled={phoneChanged && !phoneProof}
                onPress={save}
              />
            </Stack>
          </Card>

          <SectionTitle title="보안" description="비밀번호를 안전하게 변경할 수 있습니다." />
          <Card variant="outlined">
            <Button
              label="비밀번호 재설정"
              variant="secondary"
              fullWidth
              onPress={() => router.push('/profile/password-reset')}
            />
          </Card>

          <SectionTitle title="서비스 관리" description="저장공간, 결제, 문의 내역으로 이동합니다." />
          <Card variant="outlined">
            <Stack gap="sm">
              <Button
                label="내 저장공간"
                variant="secondary"
                fullWidth
                onPress={() => router.push('/storage')}
              />
              <Button
                label="구독 및 결제"
                variant="secondary"
                fullWidth
                onPress={() => router.push('/billing')}
              />
              <Button
                label="문의요청"
                variant="secondary"
                fullWidth
                onPress={() => router.push('/feature-request')}
              />
            </Stack>
          </Card>

          <SectionTitle title="로그아웃" description="이 기기에서 ONE FC 사용을 종료합니다." />
          <Button
            label="로그아웃"
            variant="danger"
            fullWidth
            onPress={() => setConfirmLogout(true)}
          />
        </ScrollView>
      </Screen>
      <ConfirmDialog
        open={confirmLogout}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmLabel="로그아웃"
        tone="danger"
        busy={logoutBusy}
        closeOnBackdrop={false}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setLogoutBusy(true);
          try {
            await logout();
            setConfirmLogout(false);
            router.replace('/(auth)/login');
          } finally {
            setLogoutBusy(false);
          }
        }}
      />
    </View>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <Stack gap="xs">
      <AppText variant="sectionTitle">{title}</AppText>
      <AppText variant="caption">{description}</AppText>
    </Stack>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    identity: { flex: 1, gap: theme.spacing.xs },
  });
}
