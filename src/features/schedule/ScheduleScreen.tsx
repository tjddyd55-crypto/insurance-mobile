import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
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
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import {
  createOnefcSchedule,
  deleteOnefcSchedule,
  deleteScheduleEvent,
  fetchScheduleEvents,
  updateOnefcSchedule,
  updateScheduleEvent,
} from './scheduleApi';
import { listCustomers } from '../customers/customersApi';
import { customerQueryKeys } from '../customers/queryKeys';
import { createTodo } from '../todos/todosApi';
import { todoQueryKeys } from '../todos/queryKeys';
import {
  scheduleEventSourceLabel,
  emptyTaskForm,
  isOnefcSchedule,
  onefcScheduleRawId,
  scheduleDeletePrompt,
  scheduleGoogleWarning,
  taskFormToTodoPayload,
  validateTaskForm,
  canEditEvent,
  customerRouteOfEvent,
  customerRouteOfTask,
  countItemsByDay,
  dayCountLabel,
  emptyEventForm,
  scheduleEventWriteTimes,
  toggleScheduleTime,
  withScheduleEndTime,
  withScheduleStartTime,
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
import { ScheduleDateField } from './ScheduleDateField';
import { ScheduleTimeField } from './ScheduleTimeField';
import { refreshWidgets } from '../home-widgets/engine/widgetRefreshCoordinator';
import { WidgetQuickAddSheet, type QuickAddCustomer } from './WidgetQuickAddSheet';
import { widgetQuickScheduleForm, type WidgetQuickDraft } from './widgetQuickAddModel';
import { scheduleQueryKeys } from './queryKeys';
import { scheduleLinkTarget } from './scheduleLinkParams';
import {
  scheduleModalsOpen,
  shouldStartScheduleWidgetFlow,
  useScheduleWidgetReturn,
  widgetEntryId,
  widgetTypeOf,
  isPendingWidgetOrigin,
  type WidgetDrawerNavigation,
} from '../home-widgets/widgetReturn';
import { GOOGLE_INTEGRATION_HREF } from '../profile/googleIntegrationRoute';
import type { ScheduleEvent, ScheduleEventForm, ScheduleEventsResult, ScheduleTask, ScheduleTaskForm } from './types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const SCHEDULE_COPY = {
  title: '일정 관리',
  refreshLimited: '잠시 후 다시 새로고침해 주세요.',
} as const;

/** 새로고침(refresh=1)은 서버가 사용자당 10초에 1번만 허용한다(429). */
export function scheduleRefreshError(error: unknown): string | null {
  if (error instanceof ApiError && error.status === 429) return SCHEDULE_COPY.refreshLimited;
  return error ? describeApiError(error, '일정을 새로고침하지 못했습니다.') : null;
}

type FormState = { mode: 'create' | 'edit'; event: ScheduleEvent | null; form: ScheduleEventForm; requestId: string };
type TaskFormState = { form: ScheduleTaskForm };

function saveSchedule(token: string | null, state: FormState): Promise<unknown> {
  if (state.mode === 'create') return createOnefcSchedule(token, state.form, state.requestId);
  const event = state.event;
  if (event && isOnefcSchedule(event)) return updateOnefcSchedule(token, onefcScheduleRawId(event.sourceId || event.id), state.form);
  return updateScheduleEvent(token, event?.sourceId ?? '', state.form);
}

function scheduleFormTitle(state: FormState | null): string {
  if (!state || state.mode === 'create') return '일정 추가';
  return isOnefcSchedule(state.event ?? {}) ? '일정 수정' : 'Google 일정 수정';
}

function scheduleFormPlace(state: FormState): string {
  if (state.mode === 'create' || isOnefcSchedule(state.event ?? {})) return 'ONE FC';
  return state.event?.calendarName || 'Google 캘린더';
}

/** 일정 관리(Native). 새 일정은 ONE FC(/api/schedules), 할 일은 기존 todos. Google 에서 온 일정만 기존 write/events. */
export function ScheduleScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
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
  const [customerLookup, setCustomerLookup] = useState(false);
  const [taskState, setTaskState] = useState<TaskFormState | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [widgetQuick, setWidgetQuick] = useState<{ date: string; requestId: string } | null>(null);
  const range = monthRange(month);
  // 홈 화면 위젯 deep link(<scheme>://schedule?date&event&create). 같은 날짜를 다시 눌러도 _w 로 다시 적용된다.
  const linkParams = useLocalSearchParams<{ date?: string; event?: string; create?: string; _w?: string; src?: string | string[]; wt?: string | string[] }>();
  const linkTarget = scheduleLinkTarget(linkParams);
  const [pendingLinkItem, setPendingLinkItem] = useState<string | null>(null);
  const widgetSession = token && user ? { token, user } : null;
  const { armScheduleWidgetFlow, markScheduleWidgetSaved, endScheduleWidgetFlow } = useScheduleWidgetReturn({
    open: scheduleModalsOpen({
      detail: detail !== null || pendingLinkItem !== null,
      form: formState !== null || widgetQuick !== null,
      task: taskState !== null,
      deleting: deleting !== null,
    }),
    widgetType: widgetTypeOf(linkParams) ?? 'schedule',
    session: widgetSession,
    navigation: navigation as unknown as WidgetDrawerNavigation,
  });
  // 링크 효과는 날짜·nonce 가 바뀔 때만 돌린다. 출처 판단은 그 직전에 ref 에 담아 최신 값을 읽는다.
  const widgetArm = useRef({ start: false, entryId: null as string | null });
  useLayoutEffect(() => {
    widgetArm.current = {
      entryId: widgetEntryId(linkParams),
      start: isPendingWidgetOrigin(linkParams) && shouldStartScheduleWidgetFlow(linkParams, {
        itemId: linkTarget.itemId,
        create: linkTarget.create,
      }),
    };
  }, [linkParams, linkTarget.create, linkTarget.date, linkTarget.itemId, linkTarget.nonce]);
  useEffect(() => {
    if (!linkTarget.date) return;
    setMonth(`${linkTarget.date.slice(0, 7)}-01`);
    setSelected(linkTarget.date);
    setDetail(null);
    setPendingLinkItem(linkTarget.itemId);
    if (linkTarget.create) {
      setTaskState(null);
      setFormError(null);
      if (widgetArm.current.start) {
        setFormState(null);
        setCustomerLookup(false);
        setWidgetQuick({ date: linkTarget.date, requestId: newScheduleRequestId() });
      } else {
        setWidgetQuick(null);
        setFormState({ mode: 'create', event: null, form: emptyEventForm(linkTarget.date), requestId: newScheduleRequestId() });
      }
    }
    const arm = widgetArm.current;
    if (arm.start && arm.entryId) armScheduleWidgetFlow(arm.entryId);
  }, [armScheduleWidgetFlow, linkTarget.date, linkTarget.itemId, linkTarget.create, linkTarget.nonce]);

  const query = useQuery({
    queryKey: scheduleQueryKeys.range(range.from, range.to),
    queryFn: () => fetchScheduleEvents(token, range),
    enabled: Boolean(token),
  });
  const customersQuery = useQuery({
    queryKey: customerQueryKeys.all,
    queryFn: () => listCustomers(token),
    enabled: Boolean(token) && customerLookup,
    staleTime: 60_000,
  });
  const quickCustomers: QuickAddCustomer[] = (customersQuery.data?.customers ?? []).map((customer) => ({
    id: String(customer.id),
    name: customer.name,
    phone: customer.phone,
  }));
  const data = query.data;
  useEffect(() => {
    if (!pendingLinkItem || !data) return;
    const item = [...data.events, ...data.tasks].find((entry) => entry.id === pendingLinkItem);
    if (item) setDetail(item);
    setPendingLinkItem(null);
  }, [pendingLinkItem, data]);
  /** 저장 직후 refresh=1 로 다시 읽는다(서버는 쓰기 성공 시 그 사용자 Google 캐시도 비운다). 새로고침 간격 제한(429)이면 일반 재조회. */
  const reloadAfterWrite = async () => {
    try {
      const next = await fetchScheduleEvents(token, { ...range, refresh: true });
      queryClient.setQueryData(scheduleQueryKeys.range(range.from, range.to), next);
      await queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all, refetchType: 'none' });
    } catch {
      await queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.all });
    }
  };
  const afterWrite = async () => {
    markScheduleWidgetSaved();
    setFormState(null);
    setWidgetQuick(null);
    setCustomerLookup(false);
    setTaskState(null);
    setDeleting(null);
    setDetail(null);
    await reloadAfterWrite();
    await queryClient.invalidateQueries({ queryKey: todoQueryKeys.all });
    if (token && user) {
      await refreshWidgets({ token, user }, { reason: 'appMutation', widgetTypes: ['schedule', 'todo'], force: true });
    }
  };
  const save = useMutation({
    mutationFn: (state: FormState) => saveSchedule(token, state),
    onSuccess: afterWrite,
  });
  const saveTask = useMutation({
    mutationFn: async (state: TaskFormState) => {
      await createTodo(token, taskFormToTodoPayload(state.form));
      await queryClient.invalidateQueries({ queryKey: todoQueryKeys.all });
    },
    onSuccess: afterWrite,
  });
  const remove = useMutation({
    mutationFn: (event: ScheduleEvent) =>
      isOnefcSchedule(event)
        ? deleteOnefcSchedule(token, onefcScheduleRawId(event.sourceId || event.id))
        : deleteScheduleEvent(token, event.calendarId ?? '', event.sourceId),
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
    endScheduleWidgetFlow();
    setDetail(null);
    router.push(route);
  };
  const openScheduleCreate = () => {
    setFormError(null);
    save.reset();
    setTaskState(null);
    setWidgetQuick(null);
    setFormState({ mode: 'create', event: null, form: emptyEventForm(selected), requestId: newScheduleRequestId() });
  };
  const submitWidgetQuick = (draft: WidgetQuickDraft) => {
    if (!widgetQuick) return;
    const form = widgetQuickScheduleForm(draft);
    const problem = validateEventForm(form, { calendarRequired: false });
    setFormError(problem);
    if (!problem) save.mutate({ mode: 'create', event: null, form, requestId: widgetQuick.requestId });
  };
  const openTodoCreate = () => {
    setTaskError(null);
    saveTask.reset();
    setFormState(null);
    setWidgetQuick(null);
    setTaskState({ form: emptyTaskForm(selected) });
  };
  const submitTask = () => {
    if (!taskState) return;
    const form = { ...taskState.form, dueTime: '' };
    const problem = validateTaskForm(form, 'onefc_todo');
    setTaskError(problem);
    if (!problem) saveTask.mutate({ form });
  };
  const patchTask = (patch: Partial<ScheduleTaskForm>) =>
    setTaskState((current) => (current ? { ...current, form: { ...current.form, ...patch } } : current));
  const openEdit = (event: ScheduleEvent) => {
    setFormError(null);
    setDetail(null);
    setFormState({ mode: 'edit', event, form: eventToForm(event), requestId: newScheduleRequestId() });
  };
  const submitForm = () => {
    if (!formState) return;
    const date = formState.form.date.trim() || selected || seoulYmd();
    const endDate = formState.form.endDate.trim() || date;
    const clock = scheduleEventWriteTimes(formState.form);
    const form = {
      ...formState.form,
      date,
      endDate,
      allDay: clock.allDay,
      startTime: clock.startTime ?? formState.form.startTime,
      endTime: clock.endTime ?? formState.form.endTime,
    };
    const calendarRequired = formState.mode === 'edit' && !isOnefcSchedule(formState.event ?? { origin: undefined });
    const problem = validateEventForm(form, { calendarRequired });
    setFormError(problem);
    if (!problem) save.mutate({ ...formState, form });
  };
  const patchForm = (patch: Partial<ScheduleEventForm>) =>
    setFormState((current) => (current ? { ...current, form: { ...current.form, ...patch } } : current));

  const header = (
    <AppHeader
      title={SCHEDULE_COPY.title}
      showMenu
      rightAction={
        <Button label="새로고침" variant="ghost" size="sm" accessibilityLabel="일정 새로고침" loading={refreshing} disabled={refreshing} onPress={() => void refresh()} />
      }
    />
  );
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

  const dayCounts = countItemsByDay(data);
  const dayEvents = eventsOnDay(data.events, selected);
  const dayTasks = tasksOnDay(data.tasks, selected).filter((task) => task.status !== 'completed');
  // 날짜 없는 할 일(ONE FC·Google)은 특정 날짜 일정이 아니다. 날짜별 목록(tasksOnDay)에만 의존하고 별도 섹션도 두지 않는다.
  const googleWarning = scheduleGoogleWarning(data.google);
  const deletePrompt = deleting ? scheduleDeletePrompt(deleting) : scheduleDeletePrompt({});

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
                const count = dayCounts.get(cell.ymd) ?? 0;
                const countLabel = dayCountLabel(count);
                return (
                  <Pressable
                    key={cell.ymd}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatDayTitle(cell.ymd)}${count > 0 ? `, 일정 ${count}건` : ''}`}
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
                    <AppText
                      variant="caption"
                      align="center"
                      numberOfLines={1}
                      allowFontScaling={false}
                      style={[styles.count, active ? styles.countOnActive : styles.countOn]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {countLabel}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>
        {googleWarning ? (
          <Inline justify="space-between">
            <AppText variant="caption" color="warning" style={styles.flex}>{googleWarning.text}</AppText>
            <Button label="연동 관리" variant="ghost" size="sm" accessibilityLabel="Google 연동 관리" onPress={() => router.push(GOOGLE_INTEGRATION_HREF)} />
          </Inline>
        ) : null}
        {refreshError ? <AppText variant="caption" color="danger">{refreshError}</AppText> : null}
        <AppText variant="sectionTitle">{formatDayTitle(selected)}</AppText>
        <Inline gap="sm">
          <View style={styles.flex}><Button label="일정 추가" variant="primary" size="sm" fullWidth accessibilityLabel="일정 추가" onPress={openScheduleCreate} /></View>
          <View style={styles.flex}><Button label="할 일 추가" variant="secondary" size="sm" fullWidth accessibilityLabel="할 일 추가" onPress={openTodoCreate} /></View>
        </Inline>
        {dayEvents.length === 0 && dayTasks.length === 0 ? (
          <AppText variant="body" color="textMuted">이 날 일정이 없습니다.</AppText>
        ) : null}
        {dayEvents.map((event) => (
          <Pressable key={event.id} accessibilityRole="button" onPress={() => setDetail(event)}>
            <Card variant="outlined" padding="md">
              <Stack gap="xs">
                <Inline justify="space-between">
                  <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>{event.title}</AppText>
                  <Badge label={scheduleEventSourceLabel(event)} tone={event.source === 'google' ? 'info' : 'warning'} />
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

      <WidgetQuickAddSheet
        open={widgetQuick !== null}
        kind="schedule"
        date={widgetQuick?.date ?? selected}
        busy={save.isPending}
        error={formError ?? (save.isError ? describeApiError(save.error, '일정을 저장하지 못했습니다.') : null)}
        customers={quickCustomers}
        customersLoading={customersQuery.isLoading}
        onClose={() => { setWidgetQuick(null); setCustomerLookup(false); }}
        onNeedCustomers={() => setCustomerLookup(true)}
        onSubmit={submitWidgetQuick}
      />

      <ModalShell
        open={taskState !== null}
        title="할 일 추가"
        presentation="fullscreen"
        busy={saveTask.isPending}
        onRequestClose={() => setTaskState(null)}
        footer={
          <Inline gap="sm">
            <View style={styles.flex}><Button label="취소" fullWidth disabled={saveTask.isPending} onPress={() => setTaskState(null)} /></View>
            <View style={styles.flex}><Button label="저장" variant="primary" fullWidth loading={saveTask.isPending} onPress={submitTask} /></View>
          </Inline>
        }
      >
        {taskState ? (
          <Stack gap="md">
            <TextField label="제목" required value={taskState.form.title} maxLength={300} onChangeText={(title) => patchTask({ title })} />
            <Inline gap="sm">
              <ScheduleDateField
                label="날짜"
                withTime={false}
                value={taskState.form.dueDate}
                clearable
                placeholder="날짜 없음"
                onComplete={({ date }) => patchTask({ dueDate: date, dueTime: '' })}
              />
            </Inline>
            <TextField label="메모" multiline value={taskState.form.notes} onChangeText={(notes) => patchTask({ notes })} />
            {taskError || saveTask.isError ? (
              <AppText variant="caption" color="danger">{taskError ?? describeApiError(saveTask.error, '할 일을 저장하지 못했습니다.')}</AppText>
            ) : null}
          </Stack>
        ) : null}
      </ModalShell>

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
        title={scheduleFormTitle(formState)}
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
            <AppText variant="caption" color="textMuted">{scheduleFormPlace(formState)}</AppText>
            <TextField label="제목" required value={formState.form.title} maxLength={300} onChangeText={(title) => patchForm({ title })} />
            <Inline gap="sm">
              <ScheduleDateField
                label="시작일"
                withTime={false}
                value={formState.form.date}
                onComplete={({ date }) => patchForm({ date, endDate: formState.form.endDate < date ? date : formState.form.endDate })}
              />
              <ScheduleDateField
                label="종료일"
                withTime={false}
                value={formState.form.endDate}
                onComplete={({ date }) => patchForm({ endDate: date < formState.form.date ? formState.form.date : date })}
              />
            </Inline>
            <Button
              label="시간 지정"
              variant={formState.form.allDay ? 'secondary' : 'selected'}
              accessibilityState={{ selected: !formState.form.allDay }}
              onPress={() => patchForm(toggleScheduleTime(formState.form))}
            />
            {formState.form.allDay ? null : (
              <Inline gap="sm">
                <ScheduleTimeField label="시작 시간" value={formState.form.startTime} onChange={(startTime) => patchForm(withScheduleStartTime(formState.form, startTime))} />
                <ScheduleTimeField label="종료 시간" value={formState.form.endTime} onChange={(endTime) => patchForm(withScheduleEndTime(formState.form, endTime))} />
              </Inline>
            )}
            <TextField label="설명" multiline value={formState.form.description} onChangeText={(description) => patchForm({ description })} />
            {formError || save.isError ? (
              <AppText variant="caption" color="danger">{formError ?? describeApiError(save.error, '일정을 저장하지 못했습니다.')}</AppText>
            ) : null}
          </Stack>
        ) : null}
      </ModalShell>

      <ConfirmDialog
        open={deleting !== null}
        title={deletePrompt.title}
        message={remove.isError ? describeApiError(remove.error, '일정을 삭제하지 못했습니다.') : deletePrompt.message}
        confirmLabel="삭제"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </View>
  );
}

function taskDateLine(task: ScheduleTask): string {
  const when = [task.dueDate, task.dueTime].filter(Boolean).join(' ');
  return when ? `날짜 ${when}` : '날짜 없음';
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
          <AppText variant="body">{taskDateLine(item)}</AppText>
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
    <ModalShell open title={item.title} subtitle={scheduleEventSourceLabel(item)} presentation="dialog" scroll onRequestClose={onClose}>
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
    // 고정 높이: 숫자가 없어도 칸 높이가 같아 레이아웃이 흔들리지 않는다.
    count: { height: 14, lineHeight: 14, fontSize: 11, fontWeight: '700', marginTop: 1 },
    countOn: { color: theme.colors.primary },
    countOnActive: { color: theme.colors.onPrimary },
  });
}
