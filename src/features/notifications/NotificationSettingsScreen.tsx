import { useEffect, useMemo, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Card,
  Inline,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { DEFAULT_ALERT_SETTINGS } from './notificationModel';
import { getNotificationSettings, saveNotificationSettings } from './notificationsApi';
import { notificationQueryKeys } from './queryKeys';
import type { UserAlertSettings } from './types';

export function NotificationSettingsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [draft, setDraft] = useState<UserAlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(DEFAULT_ALERT_SETTINGS));
  const [initialized, setInitialized] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const query = useQuery({
    queryKey: notificationQueryKeys.settings,
    queryFn: () => getNotificationSettings(token),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!query.data || initialized) return;
    setDraft(query.data);
    setInitialSnapshot(JSON.stringify(query.data));
    setInitialized(true);
  }, [initialized, query.data]);
  const dirty = initialized && JSON.stringify(draft) !== initialSnapshot;
  const saveMutation = useMutation({
    mutationFn: () => saveNotificationSettings(token, draft),
    onSuccess: async (saved) => {
      setInitialSnapshot(JSON.stringify(saved));
      queryClient.setQueryData(notificationQueryKeys.settings, saved);
      await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
      router.back();
    },
  });

  const requestBack = () => {
    if (dirty && !saveMutation.isPending) setDiscardOpen(true);
    else router.back();
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestBack();
      return true;
    });
    return () => subscription.remove();
  });

  if (query.isLoading) return <LoadingState message="알림 설정을 불러오는 중…" />;
  if (query.isError) {
    return (
      <ErrorState
        title="알림 설정을 불러오지 못했습니다"
        message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const setWindowed = (
    key: 'insuranceAge' | 'carExpiry' | 'specialDate',
    next: Partial<UserAlertSettings[typeof key]>,
  ) => setDraft((previous) => ({ ...previous, [key]: { ...previous[key], ...next } }));

  const validateAndSave = () => {
    const invalid = [draft.insuranceAge, draft.carExpiry, draft.specialDate]
      .some((setting) => !Number.isInteger(setting.daysBefore) || setting.daysBefore < 0 || setting.daysBefore > 365);
    if (invalid) {
      setFormError('표시 시작일은 0~365 사이 정수여야 합니다.');
      return;
    }
    setFormError('');
    saveMutation.mutate();
  };

  return (
    <View style={styles.root}>
      <AppHeader title="알림 설정" showMenu={false} showBack onBackPress={requestBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <WindowedSettingCard
          title="상령일 알림"
          setting={draft.insuranceAge}
          onEnabled={(enabled) => setWindowed('insuranceAge', { enabled })}
          onDays={(daysBefore) => setWindowed('insuranceAge', { daysBefore })}
        />
        <WindowedSettingCard
          title="자동차 만기 알림"
          setting={draft.carExpiry}
          onEnabled={(enabled) => setWindowed('carExpiry', { enabled })}
          onDays={(daysBefore) => setWindowed('carExpiry', { daysBefore })}
        />
        <WindowedSettingCard
          title="지정일 알림"
          setting={draft.specialDate}
          onEnabled={(enabled) => setWindowed('specialDate', { enabled })}
          onDays={(daysBefore) => setWindowed('specialDate', { daysBefore })}
        />
        <Card variant="outlined">
          <Inline justify="space-between">
            <View style={styles.settingCopy}>
              <AppText variant="bodyStrong">청구요청 알림</AppText>
              <AppText variant="caption">고객앱에서 문의 또는 파일이 올라오면 표시합니다.</AppText>
            </View>
            <Switch
              value={draft.claimRequest.enabled}
              onValueChange={(enabled) =>
                setDraft((previous) => ({ ...previous, claimRequest: { enabled } }))
              }
              trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryBorder }}
              thumbColor={draft.claimRequest.enabled ? theme.colors.primary : theme.colors.textMuted}
            />
          </Inline>
        </Card>
        {formError ? <AppText color="danger">{formError}</AppText> : null}
        {saveMutation.isError ? (
          <AppText color="danger">
            {saveMutation.error instanceof Error ? saveMutation.error.message : '설정을 저장하지 못했습니다.'}
          </AppText>
        ) : null}
      </ScrollView>
      <SafeAreaView style={styles.footerSafe} edges={['bottom']}>
        <View style={styles.footer}>
          <Button label="취소" variant="secondary" onPress={requestBack} disabled={saveMutation.isPending} style={styles.grow} />
          <Button label="저장" onPress={validateAndSave} loading={saveMutation.isPending} style={styles.grow} />
        </View>
      </SafeAreaView>
      <ConfirmDialog
        open={discardOpen}
        title="변경사항 닫기"
        message="변경사항이 저장되지 않았습니다. 닫으시겠습니까?"
        confirmLabel="저장하지 않고 닫기"
        tone="danger"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          setInitialSnapshot(JSON.stringify(draft));
          router.back();
        }}
      />
    </View>
  );
}

function WindowedSettingCard({
  title,
  setting,
  onEnabled,
  onDays,
}: {
  title: string;
  setting: { enabled: boolean; daysBefore: number };
  onEnabled: (enabled: boolean) => void;
  onDays: (days: number) => void;
}) {
  const theme = useAppTheme();
  return (
    <Card variant="outlined">
      <Stack gap="md">
        <Inline justify="space-between">
          <AppText variant="bodyStrong">{title}</AppText>
          <Switch
            value={setting.enabled}
            onValueChange={onEnabled}
            trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryBorder }}
            thumbColor={setting.enabled ? theme.colors.primary : theme.colors.textMuted}
          />
        </Inline>
        <TextField
          label="표시 시작일"
          value={String(setting.daysBefore)}
          onChangeText={(value) => {
            if (/^\d{0,3}$/.test(value)) onDays(value === '' ? 0 : Number(value));
          }}
          keyboardType="number-pad"
          editable={setting.enabled}
          helperText="0~365일 전부터 표시"
        />
      </Stack>
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    settingCopy: { flex: 1, gap: theme.spacing.xs },
    footerSafe: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    footer: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
    grow: { flex: 1 },
  });
}
