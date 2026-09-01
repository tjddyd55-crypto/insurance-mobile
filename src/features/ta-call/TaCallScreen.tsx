import { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Badge,
  Button,
  Card,
  IconButton,
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
  taSettingsSummary,
  TA_STATUS_LABELS,
} from './taCallModel';
import {
  formatTaWeekRangeCompactLabel,
  taAssignmentMeta,
  taDayEmptyCopy,
  taDayStatusTone,
  taStatusTone,
  taWeekProgressPercent,
  taWeekSummaryStatus,
} from './taCallPresentation';
import { taCallQueryKeys } from './queryKeys';
import type { TaCallAssignment, TaCallDay, TaCallStatus } from './types';

const STATUS_ORDER: TaCallStatus[] = ['not_called', 'completed', 'no_answer'];

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
        <FlatList
          data={week?.days ?? []}
          keyExtractor={(day) => day.date}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <Stack gap="md" style={styles.header}>
              <Inline justify="space-between" align="flex-start">
                <View style={styles.headingCopy}>
                  <AppText variant="caption">오늘 전화할 고객을 자동으로 배정했습니다.</AppText>
                  {settings ? (
                    <AppText variant="caption" color="textSecondary">
                      {week?.targetFilterSummary || taSettingsSummary(settings)}
                    </AppText>
                  ) : null}
                </View>
                <Button label="설정" size="sm" variant="secondary" onPress={() => router.push('/ta-call/settings')} />
              </Inline>

              {query.isError ? (
                <ErrorState
                  compact
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
                  <Stack gap="sm">
                    <Inline justify="space-between">
                      <AppText variant="caption">{formatTaDate(today.date)}</AppText>
                      <Badge
                        label={today.isMissionCompleted ? '미션 완료' : '진행 중'}
                        tone="success"
                      />
                    </Inline>
                    <AppText variant="cardTitle">
                      {today.isMissionCompleted ? '오늘 미션 완료' : '오늘 TA 진행 중'}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {today.isMissionCompleted
                        ? '오늘 배정된 TA 전화를 모두 완료했습니다.'
                        : `목표 ${settings.dailyTargetCount}명 중 ${today.completedCount}명 완료`}
                    </AppText>
                    <Inline gap="sm">
                      <Stat label="통화완료" value={today.completedCount} tone="success" />
                      <Stat label="부재중" value={today.noAnswerCount} tone="warning" />
                      <Stat label="미통화" value={today.notCalledCount} tone="muted" />
                    </Inline>
                    <Inline align="center">
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                      </View>
                      <AppText variant="caption">
                        {today.completedCount} / {settings.dailyTargetCount} 완료
                      </AppText>
                    </Inline>
                  </Stack>
                </Card>
              ) : null}

              {week ? (
                <>
                  <Card variant="outlined" padding="sm">
                    <Stack gap="sm">
                      <AppText variant="bodyStrong">이번 주 요약</AppText>
                      <AppText variant="caption" color="textSecondary">
                        {formatTaWeekRangeCompactLabel(week.weekStartDate, week.weekEndDate)}
                      </AppText>
                      {week.days.map((day) => {
                        const status = taWeekSummaryStatus(day);
                        const percent = taWeekProgressPercent(day);
                        return (
                          <Inline key={day.date} gap="sm" style={day.isToday ? styles.weekToday : undefined}>
                            <AppText variant="caption" style={styles.weekWeekday}>
                              {formatTaDate(day.date).split(' ').at(-1)}
                            </AppText>
                            <AppText variant="caption" style={styles.weekDate}>
                              {`${day.date.slice(5, 7)}.${day.date.slice(8, 10)}`}
                            </AppText>
                            {status === 'scheduled' ? (
                              <AppText variant="caption" color="textMuted">예정</AppText>
                            ) : status === 'empty' ? (
                              <AppText variant="caption" color="textMuted">없음</AppText>
                            ) : (
                              <View style={styles.weekProgressArea}>
                                <View style={styles.weekProgressTrack}>
                                  <View style={[styles.weekProgressFill, { width: `${percent}%` }]} />
                                </View>
                                <AppText variant="caption">
                                  {day.completedCount}/{day.dailyTargetCount}
                                </AppText>
                              </View>
                            )}
                          </Inline>
                        );
                      })}
                    </Stack>
                  </Card>
                  <Card variant="outlined" padding="sm">
                    <Inline justify="space-between">
                      <Button
                        label="‹"
                        size="sm"
                        variant="ghost"
                        onPress={() => setRequestedStart(shiftDate(week.weekStartDate, -7))}
                      />
                      <AppText variant="bodyStrong">
                        {formatTaWeekRangeCompactLabel(week.weekStartDate, week.weekEndDate)}
                      </AppText>
                      <Button
                        label="›"
                        size="sm"
                        variant="ghost"
                        onPress={() => setRequestedStart(shiftDate(week.weekStartDate, 7))}
                      />
                    </Inline>
                  </Card>
                </>
              ) : null}
            </Stack>
          }
          renderItem={({ item }) => (
            <TaDayCard
              day={item}
              expanded={expandedDates.has(item.date)}
              busyAssignmentId={statusMutation.isPending ? statusMutation.variables?.assignmentId : undefined}
              onToggle={() => setExpandedDates((previous) => {
                const next = new Set(previous);
                if (next.has(item.date)) next.delete(item.date); else next.add(item.date);
                return next;
              })}
              onStatus={(assignmentId, status) => statusMutation.mutate({ assignmentId, status })}
            />
          )}
          ListEmptyComponent={
            query.isLoading ? (
              <LoadingState compact message="오늘의 TA 대상을 준비하고 있습니다…" />
            ) : query.isError ? null : (
              <EmptyState compact title="현재 설정한 조건에 맞는 전화 대상 고객이 없습니다." />
            )
          }
        />
      </Screen>
    </View>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'muted';
}) {
  const theme = useAppTheme();
  const backgroundColor =
    tone === 'success'
      ? theme.colors.successSoft
      : tone === 'warning'
        ? theme.colors.warningSoft
        : theme.colors.surfaceSubtle;
  return (
    <View style={[statStyles.box, { backgroundColor, borderRadius: theme.radius.md, padding: theme.spacing.sm }]}>
      <AppText variant="bodyStrong" align="center">{value}</AppText>
      <AppText variant="caption" align="center">{label}</AppText>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1 },
});

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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const empty = taDayEmptyCopy(day);
  const showAssignments = expanded && !day.isFuture && day.totalCount > 0;
  const showEmpty = expanded && (day.isFuture || day.totalCount === 0);

  return (
    <Card variant="outlined" padding="none" style={day.isToday ? styles.todayDay : undefined}>
      <Pressable
        onPress={onToggle}
        style={styles.dayHeader}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Inline justify="space-between">
          <Inline gap="sm">
            <AppText variant="caption" color="textMuted">{expanded ? '▼' : '▶'}</AppText>
            <AppText variant={day.isToday ? 'bodyStrong' : 'body'} numberOfLines={1}>
              {formatTaDate(day.date)}
            </AppText>
          </Inline>
          <Inline gap="sm">
            {!day.isFuture ? (
              <AppText variant="caption">
                {day.completedCount}/{day.totalCount || day.dailyTargetCount}
              </AppText>
            ) : null}
            <Badge label={taDayStatus(day)} tone={taDayStatusTone(day)} />
          </Inline>
        </Inline>
      </Pressable>
      {showEmpty ? (
        <View style={styles.dayBody}>
          <AppText variant="caption" color="textSecondary">{empty.message}</AppText>
          {empty.subMessage ? <AppText variant="caption" color="textMuted">{empty.subMessage}</AppText> : null}
        </View>
      ) : null}
      {showAssignments ? (
        <View style={styles.dayBody}>
          {day.assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              emphasize={day.isToday}
              busy={busyAssignmentId === assignment.id}
              onStatus={(status) => onStatus(assignment.id, status)}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function AssignmentCard({
  assignment,
  emphasize,
  busy,
  onStatus,
}: {
  assignment: TaCallAssignment;
  emphasize: boolean;
  busy: boolean;
  onStatus: (status: TaCallStatus) => void;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const phone = assignment.customerPhone.replace(/\D/g, '');
  const canCall = phone.length >= 8;
  const meta = taAssignmentMeta(assignment);
  const canOpenCustomer = Boolean(assignment.customerId);

  return (
    <View style={[styles.assignment, emphasize && styles.assignmentToday]}>
      <Inline justify="space-between" align="flex-start">
        <View style={styles.assignmentCopy}>
          <Inline gap="sm" wrap>
            <Pressable
              disabled={!canOpenCustomer}
              onPress={() =>
                assignment.customerId &&
                router.push({ pathname: '/customers/[customerId]', params: { customerId: assignment.customerId } })
              }
            >
              <AppText variant="bodyStrong" color={canOpenCustomer ? 'info' : 'text'} numberOfLines={1}>
                {assignment.customerName}
              </AppText>
            </Pressable>
            <AppText variant="caption" color="textMuted">{meta.gender}</AppText>
            <Badge label={TA_STATUS_LABELS[assignment.status]} tone={taStatusTone(assignment.status)} />
          </Inline>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            생년월일 {meta.birthDate} · 연락처 {formatTaPhone(assignment.customerPhone)}
          </AppText>
        </View>
        {canCall ? (
          <IconButton
            accessibilityLabel={`${assignment.customerName}에게 전화`}
            size="sm"
            tone="primary"
            hitSlop={theme.interaction.compactHitSlop}
            style={styles.callButton}
            onPress={() => void Linking.openURL(`tel:${phone}`)}
            icon={() => (
              <AppText accessibilityElementsHidden style={[styles.callIcon, { color: theme.colors.onPrimary }]}>
                ☎
              </AppText>
            )}
          />
        ) : (
          <AppText variant="caption" color="textMuted">-</AppText>
        )}
      </Inline>
      <Inline gap="xs">
        {STATUS_ORDER.map((status) => {
          const active = assignment.status === status;
          return (
            <Pressable
              key={status}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: busy }}
              disabled={busy}
              onPress={() => onStatus(status)}
              style={[
                styles.statusBtn,
                active && status === 'completed' && styles.statusCompleted,
                active && status === 'no_answer' && styles.statusNoAnswer,
                active && status === 'not_called' && styles.statusNotCalled,
              ]}
            >
              <AppText
                variant="caption"
                style={active ? { color: theme.colors.onPrimary, fontWeight: '700' } : undefined}
              >
                {TA_STATUS_LABELS[status]}
              </AppText>
            </Pressable>
          );
        })}
      </Inline>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    list: {
      flexGrow: 1,
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingTop: theme.layout.screenPaddingTop,
      paddingBottom: theme.layout.contentBottomInset,
      gap: theme.layout.compactListGap,
    },
    header: { marginBottom: theme.spacing.xs },
    headingCopy: { flex: 1, gap: theme.spacing.xxs, minWidth: 0 },
    missionActive: { borderColor: theme.colors.primaryBorder, borderWidth: 2 },
    missionDone: { backgroundColor: theme.colors.successSoft, borderColor: theme.colors.success },
    progressTrack: {
      flex: 1,
      height: 8,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceSubtle,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: theme.radius.full },
    weekToday: {
      backgroundColor: theme.colors.successSoft,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    weekWeekday: { width: 28 },
    weekDate: { width: 44 },
    weekProgressArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minWidth: 0 },
    weekProgressTrack: {
      flex: 1,
      height: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceSubtle,
      overflow: 'hidden',
    },
    weekProgressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: theme.radius.full },
    todayDay: { borderWidth: 2, borderColor: theme.colors.primary },
    dayHeader: {
      minHeight: theme.interaction.minimumTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      justifyContent: 'center',
    },
    dayBody: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      gap: theme.layout.compactListGap,
    },
    assignment: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.sm,
    },
    assignmentToday: { borderColor: theme.colors.primaryBorder },
    assignmentCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
    callButton: {
      width: theme.density.compact.controlVisualHeight,
      height: theme.density.compact.controlVisualHeight,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    callIcon: { fontSize: 16, lineHeight: 18 },
    statusBtn: {
      flex: 1,
      minHeight: 40,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xs,
    },
    statusCompleted: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    statusNoAnswer: {
      backgroundColor: theme.colors.warningText,
      borderColor: theme.colors.warningText,
    },
    statusNotCalled: {
      backgroundColor: theme.colors.textSecondary,
      borderColor: theme.colors.textSecondary,
    },
  });
}
