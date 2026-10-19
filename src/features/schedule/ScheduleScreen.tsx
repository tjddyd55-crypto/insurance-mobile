import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../api/client';
import { describeApiError } from '../../api/apiErrorCopy';
import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Badge,
  Button,
  Card,
  Inline,
  ModalShell,
  SelectField,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import {
  createScheduleEvent,
  deleteScheduleEvent,
  fetchScheduleEvents,
  fetchWritableCalendars,
  updateScheduleEvent,
} from './scheduleApi';
import {
  SCHEDULE_TYPE_LABEL,
  canCreateGoogleEvent,
  canEditEvent,
  customerRouteOfEvent,
  customerRouteOfTask,
  daysWithItems,
  emptyEventForm,
  eventTimeLabel,
  eventToForm,
  eventsOnDay,
  formatDayTitle,
  formatMonthTitle,
  monthGrid,
  monthRange,
  newScheduleRequestId,
  readOnlyMessage,
  seoulYmd,
  shiftMonth,
  taskSourceLabel,
  tasksOnDay,
  todoRouteOfTask,
  validateEventForm,
  type ScheduleNativeRoute,
} from './scheduleModel';
import { scheduleQueryKeys } from './queryKeys';
import type { ScheduleEvent, ScheduleEventForm, ScheduleEventsResult, ScheduleTask } from './types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const SCHEDULE_COPY = {
  title: '일정 관리',
  connectHint: 'Google 캘린더 연결·쓰기 권한은 PC 일정 관리에서 설정할 수 있습니다.',
  refreshLimited: '잠시 후 다시 새로고침해 주세요.',
  deleteTitle: '일정을 삭제할까요?',
  deleteMessage: 'Google 캘린더에서도 삭제됩니다.',
} as const;

/** 새로고침(refresh=1)은 서버가 사용자당 10초에 1번만 허용한다(429). */
export function scheduleRefreshError(error: unknown): string | null {
  if (error instanceof ApiError && error.status === 429) return SCHEDULE_COPY.refreshLimited;
  return error ? describeApiError(error, '일정을 새로고침하지 못했습니다.') : null;
}

type FormState = { mode: 'create' | 'edit'; event: ScheduleEvent | null; form: ScheduleEventForm; requestId: string };

/** 일정 관리(Native). 웹 /schedule 과 같은 서버 API 를 쓴다. CRM 일정은 읽기 전용, Google 일정만 서버 권한이 있을 때 쓰기. */
export function ScheduleScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const today = seoulYmd();
  const [month, setMonth] = useState(() => `${today.slice(0, 7)}-01`);
  const [selected, setSelected] = useState(today);
  const [detail, setDetail] = useState<ScheduleEvent | ScheduleTask | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ScheduleEvent | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const range = monthRange(month);

  const query = useQuery({
    queryKey: scheduleQueryKeys.range(range.from, range.to),
    queryFn: () => fetchScheduleEvents(token, range),
    enabled: Boolean(token),
  });
  const data = query.data;
  const writeReady = data ? canCreateGoogleEvent(data.google) : false;
  const calendars = useQuery({
    queryKey: scheduleQueryKeys.calendars(),
    queryFn: () => fetchWritableCalendars(token),
    enabled: Boolean(token) && writeReady && formState !== null,
  });

  const afterWrite = async () => {
    setFormState(null);
    setDeleting(null);
    setDetail(null);
    await queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all });
  };
  const save = useMutation({
    mutationFn: (state: FormState) =>
      state.mode === 'create'
        ? createScheduleEvent(token, state.form, state.requestId)
        : updateScheduleEvent(token, state.event?.sourceId ?? '', state.form),
    onSuccess: afterWrite,
  });
  const remove = useMutation({
    mutationFn: (event: ScheduleEvent) => deleteScheduleEvent(token, event.calendarId ?? '', event.sourceId),
    onSuccess: afterWrite,
  });

  const refresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const next = await fetchScheduleEvents(token, { ...range, refresh: true });
      queryClient.setQueryData(scheduleQueryKeys.range(range.from, range.to), next);
    } catch (error) {
      setRefreshError(scheduleRefreshError(error));
    } finally {
      setRefreshing(false);
    }
  };

  const goMonth = (delta: number) => {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setSelected(next.slice(0, 7) === today.slice(0, 7) ? today : next);
  };
  const goToday = () => {
    setMonth(`${today.slice(0, 7)}-01`);
    setSelected(today);
  };
  const openRoute = (route: ScheduleNativeRoute | null) => {
    if (!route) return;
    setDetail(null);
    router.push(route);
  };
  const openCreate = () => {
    setFormError(null);
    setFormState({ mode: 'create', event: null, form: emptyEventForm(selected), requestId: newScheduleRequestId() });
  };
  const openEdit = (event: ScheduleEvent) => {
    setFormError(null);
    setDetail(null);
    setFormState({ mode: 'edit', event, form: eventToForm(event), requestId: newScheduleRequestId() });
  };
  const submitForm = () => {
    if (!formState) return;
    const form = {
      ...formState.form,
      calendarId: formState.form.calendarId || calendars.data?.find((item) => item.primary)?.id || calendars.data?.[0]?.id || '',
    };
    const problem = validateEventForm(form);
    setFormError(problem);
    if (!problem) save.mutate({ ...formState, form });
  };
  const patchForm = (patch: Partial<ScheduleEventForm>) =>
    setFormState((current) => (current ? { ...current, form: { ...current.form, ...patch } } : current));

  const header = <AppHeader title={SCHEDULE_COPY.title} showMenu />;
  if (query.isLoading) {
    return <View style={styles.root}>{header}<LoadingState message="일정을 불러오는 중…" /></View>;
  }
  if (query.isError || !data) {
    return (
      <View style={styles.root}>
        {header}
        <ErrorState title="일정을 불러오지 못했습니다" message={describeApiError(query.error, '잠시 후 다시 시도해 주세요.')} onRetry={() => void query.refetch()} />
      </View>
    );
  }

  const marked = daysWithItems(data);
  const dayEvents = eventsOnDay(data.events, selected);
  const dayTasks = tasksOnDay(data.tasks, selected);

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
        <Inline justify="space-between">
          <Button label="‹" variant="ghost" size="sm" accessibilityLabel="이전 달" onPress={() => goMonth(-1)} />
          <AppText variant="sectionTitle">{formatMonthTitle(month)}</AppText>
          <Inline gap="xs">
            <Button label="오늘" variant="ghost" size="sm" onPress={goToday} />
            <Button label="›" variant="ghost" size="sm" accessibilityLabel="다음 달" onPress={() => goMonth(1)} />
          </Inline>
        </Inline>
        <Card variant="outlined" padding="sm">
          <View style={styles.weekRow}>
            {WEEKDAYS.map((label) => (
              <AppText key={label} variant="caption" color="textMuted" align="center" style={styles.cell}>{label}</AppText>
            ))}
          </View>
          {monthGrid(month).map((week) => (
            <View key={week[0]!.ymd} style={styles.weekRow}>
              {week.map((cell) => {
                const active = cell.ymd === selected;
                return (
                  <Pressable
                    key={cell.ymd}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatDayTitle(cell.ymd)}${marked.has(cell.ymd) ? ', 일정 있음' : ''}`}
                    accessibilityState={{ selected: active }}
                    style={[styles.cell, styles.dayCell, active && styles.dayActive]}
                    onPress={() => {
                      setSelected(cell.ymd);
                      if (!cell.inMonth) setMonth(`${cell.ymd.slice(0, 7)}-01`);
                    }}
                  >
                    <AppText variant="body" color={active ? 'onPrimary' : cell.inMonth ? (cell.ymd === today ? 'primary' : 'text') : 'textMuted'}>
                      {cell.day}
                    </AppText>
                    <View style={[styles.dot, marked.has(cell.ymd) && (active ? styles.dotOnActive : styles.dotOn)]} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>
        {refreshError ? <AppText variant="caption" color="danger">{refreshError}</AppText> : null}
        <Inline justify="space-between">
          <AppText variant="sectionTitle">{formatDayTitle(selected)}</AppText>
          {writeReady ? <Button label="일정 추가" variant="primary" size="sm" onPress={openCreate} /> : null}
        </Inline>
        {!writeReady ? <AppText variant="helper" color="textMuted">{SCHEDULE_COPY.connectHint}</AppText> : null}
        {dayEvents.length === 0 && dayTasks.length === 0 ? (
          <AppText variant="body" color="textMuted">이 날 일정이 없습니다.</AppText>
        ) : null}
        {dayEvents.map((event) => (
          <Pressable key={event.id} accessibilityRole="button" onPress={() => setDetail(event)}>
            <Card variant="outlined" padding="md">
              <Stack gap="xs">
                <Inline justify="space-between">
                  <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>{event.title}</AppText>
                  <Badge label={SCHEDULE_TYPE_LABEL[event.type]} tone={event.source === 'google' ? 'info' : 'warning'} />
                </Inline>
                <AppText variant="caption" color="textSecondary">
                  {[eventTimeLabel(event), event.customerName, event.calendarName].filter(Boolean).join(' · ')}
                </AppText>
              </Stack>
            </Card>
          </Pressable>
        ))}
        {dayTasks.map((task) => (
          <Pressable key={task.id} accessibilityRole="button" onPress={() => setDetail(task)}>
            <Card variant="outlined" padding="md">
              <Inline justify="space-between">
                <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>{task.title}</AppText>
                <Badge label={task.status === 'completed' ? '완료' : taskSourceLabel(task)} tone={task.status === 'completed' ? 'success' : 'default'} />
              </Inline>
            </Card>
          </Pressable>
        ))}
      </ScrollView>

      <ScheduleDetailModal
        item={detail}
        data={data}
        onClose={() => setDetail(null)}
        onOpenRoute={openRoute}
        onEdit={openEdit}
        onDelete={(event) => setDeleting(event)}
      />

      <ModalShell
        open={formState !== null}
        title={formState?.mode === 'edit' ? '일정 수정' : '일정 추가'}
        presentation="fullscreen"
        busy={save.isPending}
        onRequestClose={() => setFormState(null)}
        footer={
          <Inline gap="sm">
            <View style={styles.flex}><Button label="취소" fullWidth disabled={save.isPending} onPress={() => setFormState(null)} /></View>
            <View style={styles.flex}><Button label="저장" variant="primary" fullWidth loading={save.isPending} onPress={submitForm} /></View>
          </Inline>
        }
      >
        {formState ? (
          <Stack gap="md">
            {formState.mode === 'create' ? (
              <SelectField
                label="캘린더"
                required
                value={formState.form.calendarId || calendars.data?.find((item) => item.primary)?.id || calendars.data?.[0]?.id || ''}
                options={(calendars.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
                placeholder={calendars.isLoading ? '불러오는 중…' : '캘린더 선택'}
                error={calendars.isError ? describeApiError(calendars.error, '캘린더를 불러오지 못했습니다.') : undefined}
                onChange={(calendarId) => patchForm({ calendarId })}
              />
            ) : (
              <AppText variant="caption" color="textMuted">{formState.event?.calendarName || 'Google 캘린더'}</AppText>
            )}
            <TextField label="제목" required value={formState.form.title} maxLength={300} onChangeText={(title) => patchForm({ title })} />
            <Inline gap="sm">
              <Button label="시간 지정" variant={formState.form.allDay ? 'secondary' : 'selected'} size="sm" onPress={() => patchForm({ allDay: false })} />
              <Button label="종일" variant={formState.form.allDay ? 'selected' : 'secondary'} size="sm" onPress={() => patchForm({ allDay: true })} />
            </Inline>
            <Inline gap="sm">
              <View style={styles.flex}><TextField label="시작일" placeholder="YYYY-MM-DD" value={formState.form.date} onChangeText={(date) => patchForm({ date })} /></View>
              <View style={styles.flex}><TextField label="종료일" placeholder="YYYY-MM-DD" value={formState.form.endDate} onChangeText={(endDate) => patchForm({ endDate })} /></View>
            </Inline>
            {!formState.form.allDay ? (
              <Inline gap="sm">
                <View style={styles.flex}><TextField label="시작 시각" placeholder="HH:mm" value={formState.form.startTime} onChangeText={(startTime) => patchForm({ startTime })} /></View>
                <View style={styles.flex}><TextField label="종료 시각" placeholder="HH:mm" value={formState.form.endTime} onChangeText={(endTime) => patchForm({ endTime })} /></View>
              </Inline>
            ) : null}
            <TextField label="설명" multiline value={formState.form.description} onChangeText={(description) => patchForm({ description })} />
            {formError || save.isError ? (
              <AppText variant="caption" color="danger">{formError ?? describeApiError(save.error, '일정을 저장하지 못했습니다.')}</AppText>
            ) : null}
          </Stack>
        ) : null}
      </ModalShell>

      <ConfirmDialog
        open={deleting !== null}
        title={SCHEDULE_COPY.deleteTitle}
        message={remove.isError ? describeApiError(remove.error, '일정을 삭제하지 못했습니다.') : SCHEDULE_COPY.deleteMessage}
        confirmLabel="삭제"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </View>
  );
}

function isTask(item: ScheduleEvent | ScheduleTask): item is ScheduleTask {
  return item.source === 'google_task' || item.source === 'onefc_todo';
}

function ScheduleDetailModal({
  item,
  data,
  onClose,
  onOpenRoute,
  onEdit,
  onDelete,
}: {
  item: ScheduleEvent | ScheduleTask | null;
  data: ScheduleEventsResult;
  onClose: () => void;
  onOpenRoute: (route: ScheduleNativeRoute | null) => void;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (event: ScheduleEvent) => void;
}) {
  if (!item) return null;
  if (isTask(item)) {
    const customer = customerRouteOfTask(item);
    const todo = todoRouteOfTask(item);
    return (
      <ModalShell open title={item.title} subtitle={taskSourceLabel(item)} presentation="dialog" scroll onRequestClose={onClose}>
        <Stack gap="md">
          <AppText variant="body">{[item.dueDate, item.dueTime].filter(Boolean).join(' ') || '날짜 없음'}</AppText>
          {item.customerName ? <AppText variant="body">고객: {item.customerName}</AppText> : null}
          {item.notes ? <AppText variant="body" selectable>{item.notes}</AppText> : null}
          {todo ? <Button label="할 일 열기" variant="primary" fullWidth onPress={() => onOpenRoute(todo)} /> : null}
          {customer ? <Button label="고객 보기" fullWidth onPress={() => onOpenRoute(customer)} /> : null}
        </Stack>
      </ModalShell>
    );
  }
  const customer = customerRouteOfEvent(item);
  const editable = canEditEvent(item, data.google);
  return (
    <ModalShell open title={item.title} subtitle={SCHEDULE_TYPE_LABEL[item.type]} presentation="dialog" scroll onRequestClose={onClose}>
      <Stack gap="md">
        <AppText variant="body">{`${formatDayTitle(eventDayStart(item))} · ${eventTimeLabel(item)}`}</AppText>
        {item.calendarName ? <AppText variant="caption" color="textMuted">{item.calendarName}</AppText> : null}
        {item.customerName ? <AppText variant="body">고객: {item.customerName}</AppText> : null}
        {item.location ? <AppText variant="body">장소: {item.location}</AppText> : null}
        {item.description ? <AppText variant="body" selectable>{item.description}</AppText> : null}
        {customer ? <Button label="고객 보기" variant="primary" fullWidth onPress={() => onOpenRoute(customer)} /> : null}
        {editable ? (
          <Inline gap="sm">
            <View style={detailStyles.flex}><Button label="수정" fullWidth onPress={() => onEdit(item)} /></View>
            <View style={detailStyles.flex}><Button label="삭제" variant="danger" fullWidth onPress={() => onDelete(item)} /></View>
          </Inline>
        ) : (
          <AppText variant="helper" color="textMuted">{readOnlyMessage(item, data.google)}</AppText>
        )}
      </Stack>
    </ModalShell>
  );
}

const detailStyles = StyleSheet.create({ flex: { flex: 1 } });

function eventDayStart(event: ScheduleEvent): string {
  return event.allDay ? event.startAt.slice(0, 10) : seoulYmd(new Date(event.startAt));
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    body: { padding: theme.layout.screenPaddingHorizontal, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
    flex: { flex: 1 },
    weekRow: { flexDirection: 'row' },
    cell: { flex: 1 },
    dayCell: { alignItems: 'center', paddingVertical: theme.spacing.xs, borderRadius: theme.radius.md, minHeight: 44 },
    dayActive: { backgroundColor: theme.colors.primary },
    dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: 'transparent' },
    dotOn: { backgroundColor: theme.colors.primary },
    dotOnActive: { backgroundColor: theme.colors.onPrimary },
  });
}
