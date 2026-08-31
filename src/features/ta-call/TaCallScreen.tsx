import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Badge,
  Button,
  Card,
  Inline,
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { getTaSettings, getTaWeek, setTaAssignmentStatus } from './taCallApi';
import {
  formatTaDate,
  formatTaPhone,
  shiftDate,
  taDayStatus,
  taGenderLabel,
  taSettingsSummary,
  TA_STATUS_LABELS,
} from './taCallModel';
import { taCallQueryKeys } from './queryKeys';
import type { TaCallAssignment, TaCallDay, TaCallStatus } from './types';

export function TaCallScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [requestedStart, setRequestedStart] = useState<string | undefined>();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const query = useQuery({
    queryKey: taCallQueryKeys.week(requestedStart),
    queryFn: async () => {
      const [settings, week] = await Promise.all([getTaSettings(token), getTaWeek(token, requestedStart)]);
      return { settings, week };
    },
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!query.data?.week) return;
    setExpandedDates(new Set(query.data.week.days.filter((day) => day.isToday).map((day) => day.date)));
  }, [query.data?.week]);

  const statusMutation = useMutation({
    mutationFn: ({ assignmentId, status }: { assignmentId: string; status: TaCallStatus }) =>
      setTaAssignmentStatus(token, assignmentId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taCallQueryKeys.all }),
  });
  const week = query.data?.week;
  const settings = query.data?.settings;
  const today = week?.days.find((day) => day.isToday) ?? null;
  const progress = today && settings?.dailyTargetCount
    ? Math.min(100, Math.round((today.completedCount / settings.dailyTargetCount) * 100))
    : 0;

  return (
    <View style={styles.root}>
      <AppHeader title="오늘의 TA" />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Inline justify="space-between" align="flex-start">
            <View style={styles.headingCopy}>
              <AppText variant="heading">오늘 전화할 고객</AppText>
              <AppText variant="caption">설정한 조건에 따라 자동 배정됩니다.</AppText>
            </View>
            <Button label="설정" size="sm" variant="secondary" onPress={() => router.push('/ta-call/settings')} />
          </Inline>

          {settings ? <AppText variant="caption">{week?.targetFilterSummary || taSettingsSummary(settings)}</AppText> : null}
          {query.isLoading ? <LoadingState message="오늘의 TA 대상을 준비하고 있습니다…" /> : null}
          {query.isError ? (
            <ErrorState
              title="오늘의 TA를 불러오지 못했습니다"
              message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
              onRetry={() => void query.refetch()}
            />
          ) : null}
          {statusMutation.isError ? (
            <AppText color="danger">
              {statusMutation.error instanceof Error ? statusMutation.error.message : '상태를 변경하지 못했습니다.'}
            </AppText>
          ) : null}

          {today && settings ? (
            <Card variant="elevated" style={today.isMissionCompleted ? styles.missionDone : styles.missionActive}>
              <Stack gap="md">
                <Inline justify="space-between">
                  <AppText variant="label">{formatTaDate(today.date)}</AppText>
                  <Badge label={today.isMissionCompleted ? '미션 완료' : '진행 중'} tone={today.isMissionCompleted ? 'success' : 'warning'} />
                </Inline>
                <AppText variant="title">{today.isMissionCompleted ? '오늘 미션 완료' : '오늘 TA 진행 중'}</AppText>
                <AppText color="textSecondary">목표 {settings.dailyTargetCount}명 중 {today.completedCount}명 완료</AppText>
                <Inline>
                  <Stat label="통화완료" value={today.completedCount} />
                  <Stat label="부재중" value={today.noAnswerCount} />
                  <Stat label="미통화" value={today.notCalledCount} />
                </Inline>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
                <AppText variant="caption" align="right">{today.completedCount} / {settings.dailyTargetCount} 완료</AppText>
              </Stack>
            </Card>
          ) : null}

          {week ? (
            <>
              <Card variant="outlined">
                <Stack gap="md">
                  <Inline justify="space-between">
                    <Button
                      label="‹ 이전 주"
                      size="sm"
                      variant="ghost"
                      onPress={() => setRequestedStart(shiftDate(week.weekStartDate, -7))}
                    />
                    <AppText variant="bodyStrong">{week.weekStartDate.slice(5).replace('-', '.')} ~ {week.weekEndDate.slice(5).replace('-', '.')}</AppText>
                    <Button
                      label="다음 주 ›"
                      size="sm"
                      variant="ghost"
                      onPress={() => setRequestedStart(shiftDate(week.weekStartDate, 7))}
                    />
                  </Inline>
                  {week.days.map((day) => (
                    <Inline key={day.date} justify="space-between">
                      <AppText variant={day.isToday ? 'bodyStrong' : 'body'}>{formatTaDate(day.date)}</AppText>
                      <Inline>
                        {!day.isFuture ? <AppText variant="caption">{day.completedCount}/{day.dailyTargetCount}</AppText> : null}
                        <Badge label={taDayStatus(day)} tone={day.isMissionCompleted ? 'success' : day.isToday ? 'warning' : 'default'} />
                      </Inline>
                    </Inline>
                  ))}
                </Stack>
              </Card>

              {week.days.map((day) => (
                <TaDayCard
                  key={day.date}
                  day={day}
                  expanded={expandedDates.has(day.date)}
                  busyAssignmentId={statusMutation.isPending ? statusMutation.variables?.assignmentId : undefined}
                  onToggle={() => setExpandedDates((previous) => {
                    const next = new Set(previous);
                    if (next.has(day.date)) next.delete(day.date); else next.add(day.date);
                    return next;
                  })}
                  onStatus={(assignmentId, status) => statusMutation.mutate({ assignmentId, status })}
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      </Screen>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <AppText variant="title" align="center">{value}</AppText>
      <AppText variant="caption" align="center">{label}</AppText>
    </View>
  );
}

function TaDayCard({
  day, expanded, busyAssignmentId, onToggle, onStatus,
}: {
  day: TaCallDay;
  expanded: boolean;
  busyAssignmentId?: string;
  onToggle: () => void;
  onStatus: (assignmentId: string, status: TaCallStatus) => void;
}) {
  const theme = useAppTheme();
  const emptyMessage = day.isFuture
    ? '해당 날짜가 되면 자동으로 전화 대상이 생성됩니다.'
    : day.emptyMessage || '현재 설정한 조건에 맞는 전화 대상 고객이 없습니다.';
  return (
    <Card variant="outlined" padding="none">
      <Pressable onPress={onToggle} style={{ padding: theme.spacing.lg }} accessibilityRole="button" accessibilityState={{ expanded }}>
        <Inline justify="space-between">
          <Inline><AppText>{expanded ? '▼' : '▶'}</AppText><AppText variant={day.isToday ? 'bodyStrong' : 'body'}>{formatTaDate(day.date)}</AppText></Inline>
          <Inline><AppText variant="caption">{day.isFuture ? '' : `${day.completedCount}/${day.totalCount || day.dailyTargetCount}`}</AppText><Badge label={taDayStatus(day)} tone={day.isMissionCompleted ? 'success' : day.isToday ? 'warning' : 'default'} /></Inline>
        </Inline>
      </Pressable>
      {expanded ? (
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: theme.spacing.md }}>
          {day.assignments.length ? day.assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              busy={busyAssignmentId === assignment.id}
              onStatus={(status) => onStatus(assignment.id, status)}
            />
          )) : (
            <Stack gap="xs"><AppText color="textSecondary">{emptyMessage}</AppText>{day.emptySubMessage ? <AppText variant="caption">{day.emptySubMessage}</AppText> : null}</Stack>
          )}
        </View>
      ) : null}
    </Card>
  );
}

function AssignmentCard({ assignment, busy, onStatus }: { assignment: TaCallAssignment; busy: boolean; onStatus: (status: TaCallStatus) => void }) {
  const router = useRouter();
  const phone = assignment.customerPhone.replace(/\D/g, '');
  return (
    <Card variant="filled">
      <Stack gap="sm">
        <Inline justify="space-between" align="flex-start">
          <Pressable onPress={() => assignment.customerId && router.push({ pathname: '/customers/[customerId]', params: { customerId: assignment.customerId } })}>
            <Stack gap="xxs"><AppText variant="bodyStrong" color="info">{assignment.customerName}</AppText><AppText variant="caption">{taGenderLabel(assignment.customerGender)} · 생년월일 {assignment.customerBirthDate || '—'}</AppText></Stack>
          </Pressable>
          <Button label="전화" size="sm" variant="ghost" disabled={phone.length < 8} onPress={() => void Linking.openURL(`tel:${phone}`)} />
        </Inline>
        <AppText variant="caption">{formatTaPhone(assignment.customerPhone)}</AppText>
        <Inline>
          {(Object.keys(TA_STATUS_LABELS) as TaCallStatus[]).map((status) => (
            <Button
              key={status}
              label={TA_STATUS_LABELS[status]}
              size="sm"
              variant={assignment.status === status ? 'primary' : 'secondary'}
              disabled={busy}
              onPress={() => onStatus(status)}
              style={{ flex: 1 }}
            />
          ))}
        </Inline>
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1 },
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    headingCopy: { flex: 1, gap: theme.spacing.xs },
    missionActive: { borderColor: theme.colors.primaryBorder },
    missionDone: { backgroundColor: theme.colors.successSoft },
    progressTrack: { height: 8, borderRadius: theme.radius.full, backgroundColor: theme.colors.surfaceSubtle, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: theme.radius.full },
  });
}
