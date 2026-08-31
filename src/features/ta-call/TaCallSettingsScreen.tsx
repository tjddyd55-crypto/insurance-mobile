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
import { getTaSettings, saveTaSettings } from './taCallApi';
import { DEFAULT_TA_SETTINGS } from './taCallModel';
import { taCallQueryKeys } from './queryKeys';
import type { TaCallSettings, TaTargetGender } from './types';

type Draft = {
  dailyTargetCount: string;
  targetGender: TaTargetGender;
  targetSangnyeongDays: string;
  targetInsuranceAgeMin: string;
  targetInsuranceAgeMax: string;
  excludeMinors: boolean;
};

function toDraft(settings: TaCallSettings): Draft {
  return {
    dailyTargetCount: String(settings.dailyTargetCount),
    targetGender: settings.targetGender,
    targetSangnyeongDays: settings.targetSangnyeongDays == null ? '' : String(settings.targetSangnyeongDays),
    targetInsuranceAgeMin: settings.targetInsuranceAgeMin == null ? '' : String(settings.targetInsuranceAgeMin),
    targetInsuranceAgeMax: settings.targetInsuranceAgeMax == null ? '' : String(settings.targetInsuranceAgeMax),
    excludeMinors: settings.excludeMinors,
  };
}

const EMPTY_DRAFT = toDraft(DEFAULT_TA_SETTINGS);

function optionalNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

export function TaCallSettingsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(EMPTY_DRAFT));
  const [initialized, setInitialized] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const query = useQuery({
    queryKey: taCallQueryKeys.settings,
    queryFn: () => getTaSettings(token),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!query.data || initialized) return;
    const next = toDraft(query.data);
    setDraft(next);
    setInitialSnapshot(JSON.stringify(next));
    setInitialized(true);
  }, [initialized, query.data]);
  const dirty = initialized && JSON.stringify(draft) !== initialSnapshot;

  const saveMutation = useMutation({
    mutationFn: () => saveTaSettings(token, {
      dailyTargetCount: Number(draft.dailyTargetCount),
      targetGender: draft.targetGender,
      targetSangnyeongDays: optionalNumber(draft.targetSangnyeongDays),
      targetInsuranceAgeMin: optionalNumber(draft.targetInsuranceAgeMin),
      targetInsuranceAgeMax: optionalNumber(draft.targetInsuranceAgeMax),
      excludeMinors: draft.excludeMinors,
      updatedAt: query.data?.updatedAt ?? null,
    }),
    onSuccess: async (saved) => {
      setInitialSnapshot(JSON.stringify(toDraft(saved)));
      queryClient.setQueryData(taCallQueryKeys.settings, saved);
      await queryClient.invalidateQueries({ queryKey: taCallQueryKeys.all });
      router.back();
    },
  });

  const requestBack = () => {
    if (dirty && !saveMutation.isPending) setDiscardOpen(true); else router.back();
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestBack();
      return true;
    });
    return () => subscription.remove();
  });

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const submit = () => {
    const target = Number(draft.dailyTargetCount);
    const optional = [draft.targetSangnyeongDays, draft.targetInsuranceAgeMin, draft.targetInsuranceAgeMax];
    if (!Number.isInteger(target) || target < 1 || target > 50) {
      setFormError('하루 목표는 1~50명 사이 정수여야 합니다.');
      return;
    }
    if (optional.some((value) => value.trim() && (!Number.isInteger(Number(value)) || Number(value) < 0))) {
      setFormError('선택 조건은 0 이상의 정수로 입력해 주세요.');
      return;
    }
    const min = optionalNumber(draft.targetInsuranceAgeMin);
    const max = optionalNumber(draft.targetInsuranceAgeMax);
    if (min != null && max != null && min > max) {
      setFormError('최소 보험나이는 최대 보험나이보다 클 수 없습니다.');
      return;
    }
    setFormError('');
    saveMutation.mutate();
  };

  if (query.isLoading) return <LoadingState message="TA 설정을 불러오는 중…" />;
  if (query.isError) {
    return <ErrorState title="TA 설정을 불러오지 못했습니다" message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => void query.refetch()} />;
  }

  return (
    <View style={styles.root}>
      <AppHeader title="오늘의 TA 설정" showMenu={false} showBack onBackPress={requestBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card variant="outlined">
          <Stack gap="lg">
            <TextField label="하루 목표 인원" value={draft.dailyTargetCount} onChangeText={(value) => /^\d{0,2}$/.test(value) && update('dailyTargetCount', value)} keyboardType="number-pad" helperText="1~50명" />
            <Stack gap="xs">
              <AppText variant="label">대상 성별</AppText>
              <Inline>
                {([['all', '전체'], ['male', '남성'], ['female', '여성']] as const).map(([value, label]) => (
                  <Button key={value} label={label} size="sm" variant={draft.targetGender === value ? 'primary' : 'secondary'} onPress={() => update('targetGender', value)} style={styles.grow} />
                ))}
              </Inline>
            </Stack>
            <TextField label="상령일 기준" value={draft.targetSangnyeongDays} onChangeText={(value) => /^\d{0,3}$/.test(value) && update('targetSangnyeongDays', value)} keyboardType="number-pad" placeholder="제한 없음" helperText="입력한 일수 이내 고객" />
            <Inline>
              <TextField label="최소 보험나이" value={draft.targetInsuranceAgeMin} onChangeText={(value) => /^\d{0,3}$/.test(value) && update('targetInsuranceAgeMin', value)} keyboardType="number-pad" placeholder="제한 없음" containerStyle={styles.grow} />
              <TextField label="최대 보험나이" value={draft.targetInsuranceAgeMax} onChangeText={(value) => /^\d{0,3}$/.test(value) && update('targetInsuranceAgeMax', value)} keyboardType="number-pad" placeholder="제한 없음" containerStyle={styles.grow} />
            </Inline>
            <Inline justify="space-between">
              <View style={styles.copy}><AppText variant="bodyStrong">미성년 고객 제외</AppText><AppText variant="caption">업무 대상에서 만 19세 미만 고객을 제외합니다.</AppText></View>
              <Switch value={draft.excludeMinors} onValueChange={(value) => update('excludeMinors', value)} trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryBorder }} thumbColor={draft.excludeMinors ? theme.colors.primary : theme.colors.textMuted} />
            </Inline>
          </Stack>
        </Card>
        <Card variant="filled"><AppText variant="caption">설정 변경 후 이미 생성된 오늘 목록은 유지되며, 변경된 조건은 다음 배정부터 적용됩니다.</AppText></Card>
        {formError ? <AppText color="danger">{formError}</AppText> : null}
        {saveMutation.isError ? <AppText color="danger">{saveMutation.error instanceof Error ? saveMutation.error.message : '설정을 저장하지 못했습니다.'}</AppText> : null}
      </ScrollView>
      <SafeAreaView style={styles.footerSafe} edges={['bottom']}>
        <View style={styles.footer}><Button label="취소" variant="secondary" onPress={requestBack} disabled={saveMutation.isPending} style={styles.grow} /><Button label="저장" onPress={submit} loading={saveMutation.isPending} style={styles.grow} /></View>
      </SafeAreaView>
      <ConfirmDialog
        open={discardOpen}
        title="변경사항 닫기"
        message="변경사항이 저장되지 않았습니다. 닫으시겠습니까?"
        confirmLabel="저장하지 않고 닫기"
        tone="danger"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => { setDiscardOpen(false); setInitialSnapshot(JSON.stringify(draft)); router.back(); }}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    grow: { flex: 1 }, copy: { flex: 1, gap: theme.spacing.xs },
    footerSafe: { backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
    footer: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md },
  });
}
