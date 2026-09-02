import { useEffect, useMemo, useState } from 'react';
import { AppState, BackHandler, ScrollView, StyleSheet, Switch, View } from 'react-native';
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
import {
  getOsNotificationPermissionGranted,
  openOsNotificationSettings,
} from '../push/pushRegistration';
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
  const [osPermissionGranted, setOsPermissionGranted] = useState<boolean | null>(null);
  const query = useQuery({
    queryKey: notificationQueryKeys.settings,
    queryFn: () => getNotificationSettings(token),
    enabled: Boolean(token),
  });

  const refreshOsPermission = () => {
    void getOsNotificationPermissionGranted().then(setOsPermissionGranted);
  };

  useEffect(() => {
    refreshOsPermission();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshOsPermission();
    });
    return () => sub.remove();
  }, []);

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

  const setToggle = (
    key: 'appPush' | 'newCustomer' | 'customerAppFile' | 'workAlert' | 'claimRequest',
    enabled: boolean,
  ) => setDraft((previous) => ({ ...previous, [key]: { enabled } }));

  const validateAndSave = () => {
    const invalid = [draft.insuranceAge, draft.carExpiry, draft.specialDate].some(
      (setting) => !Number.isInteger(setting.daysBefore) || setting.daysBefore < 0 || setting.daysBefore > 365,
    );
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
        <Card variant="outlined">
          <Stack gap="sm">
            <AppText variant="bodyStrong">기기 알림 권한</AppText>
            <AppText variant="caption">
              {osPermissionGranted == null
                ? '권한 상태를 확인하는 중…'
                : osPermissionGranted
                  ? 'Android 알림 권한이 허용되어 있습니다.'
                  : '기기 알림이 꺼져 있습니다. 앱 설정을 켜도 Push가 오지 않을 수 있습니다.'}
            </AppText>
            {osPermissionGranted === false ? (
              <Button label="기기 설정 열기" variant="secondary" onPress={openOsNotificationSettings} />
            ) : null}
          </Stack>
        </Card>

        <ToggleSettingCard
          title="전체 앱 알림"
          description="꺼두면 모든 Push 알림이 전송되지 않습니다. 알림센터 저장은 유지될 수 있습니다."
          enabled={draft.appPush.enabled}
          onEnabled={(enabled) => setToggle('appPush', enabled)}
        />
        <ToggleSettingCard
          title="신규 고객 등록"
          description="고객앱 초대로 신규 고객이 등록되면 Push로 알립니다."
          enabled={draft.newCustomer.enabled}
          onEnabled={(enabled) => setToggle('newCustomer', enabled)}
        />
        <ToggleSettingCard
          title="보험금 청구"
          description="고객앱 청구 요청이 도착하면 Push로 알립니다."
          enabled={draft.claimRequest.enabled}
          onEnabled={(enabled) => setToggle('claimRequest', enabled)}
        />
        <ToggleSettingCard
          title="고객 파일/문의"
          description="고객앱에서 파일 또는 문의가 등록되면 Push로 알립니다."
          enabled={draft.customerAppFile.enabled}
          onEnabled={(enabled) => setToggle('customerAppFile', enabled)}
        />
        <ToggleSettingCard
          title="업무 알림"
          description="상령일·자동차 만기·지정일 알림센터 표시를 제어합니다."
          enabled={draft.workAlert.enabled}
          onEnabled={(enabled) => setToggle('workAlert', enabled)}
        />

        <AppText variant="sectionTitle">업무 알림 상세</AppText>
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

function ToggleSettingCard({
  title,
  description,
  enabled,
  onEnabled,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onEnabled: (enabled: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <Card variant="outlined">
      <Inline justify="space-between">
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="caption">{description}</AppText>
        </View>
        <Switch
          value={enabled}
          onValueChange={onEnabled}
          trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryBorder }}
          thumbColor={enabled ? theme.colors.primary : theme.colors.textMuted}
        />
      </Inline>
    </Card>
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
    footerSafe: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    footer: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
    grow: { flex: 1 },
  });
}
