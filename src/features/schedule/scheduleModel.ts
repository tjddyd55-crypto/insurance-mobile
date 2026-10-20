import { TODO_RETURN_SOURCE_SCHEDULE } from '../todos/todoNavigation';
import { ApiError } from '../../api/client';
import type {
  GoogleIntegrationPermission,
  ScheduleGoogleWarning,
  GoogleCalendarTarget,
  GoogleWriteTargets,
  ScheduleEvent,
  ScheduleEventForm,
  ScheduleEventsResult,
  ScheduleEventType,
  ScheduleGoogleBanner,
  ScheduleStorage,
  ScheduleTask,
  ScheduleTaskForm,
} from './types';

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const SCHEDULE_TITLE_MAX = 300;
export const SCHEDULE_NOTES_MAX = 8000;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}
function positiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// ---------------- 날짜(Asia/Seoul) ----------------

export function seoulYmd(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function seoulHm(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
}

function utc(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!);
}
function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
export function addDaysYmd(ymd: string, days: number): string {
  return fromUtc(utc(ymd) + days * 86_400_000);
}

/** 달 이동(1일 기준). */
export function shiftMonth(anchor: string, delta: number): string {
  const [year, month] = anchor.split('-').map(Number);
  const next = new Date(Date.UTC(year!, month! - 1 + delta, 1));
  return fromUtc(next.getTime());
}

/** 화면 달 조회 범위(그 달 1일 ~ 말일). 서버 최대 400일 이내. */
export function monthRange(anchor: string): { from: string; to: string } {
  const from = `${anchor.slice(0, 7)}-01`;
  return { from, to: addDaysYmd(shiftMonth(from, 1), -1) };
}

export type MonthCell = { ymd: string; day: number; inMonth: boolean };

/** 일요일 시작 주 단위 달력 칸. */
export function monthGrid(anchor: string): MonthCell[][] {
  const { from, to } = monthRange(anchor);
  const weekday = new Date(utc(from)).getUTCDay();
  const start = addDaysYmd(from, -weekday);
  const weeks: MonthCell[][] = [];
  let cursor = start;
  while (cursor <= to || weeks.length === 0) {
    const week: MonthCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      week.push({ ymd: cursor, day: Number(cursor.slice(8, 10)), inMonth: cursor >= from && cursor <= to });
      cursor = addDaysYmd(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatMonthTitle(anchor: string): string {
  return `${Number(anchor.slice(0, 4))}년 ${Number(anchor.slice(5, 7))}월`;
}

export function formatDayTitle(ymd: string): string {
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(utc(ymd)).getUTCDay()];
  return `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8, 10))}일 (${weekday})`;
}

// ---------------- 응답 정규화 ----------------

const EVENT_TYPES: ScheduleEventType[] = ['google_event', 'customer_alert', 'car_expiry', 'insurance_age'];

function normalizeEvent(value: unknown): ScheduleEvent | null {
  const row = record(value);
  const id = text(row.id).trim();
  const startAt = text(row.startAt).trim();
  if (!id || !startAt) return null;
  const type = EVENT_TYPES.includes(row.type as ScheduleEventType) ? (row.type as ScheduleEventType) : 'customer_alert';
  return {
    id,
    source: row.source === 'google' ? 'google' : 'crm',
    sourceId: text(row.sourceId),
    calendarId: text(row.calendarId).trim() || null,
    calendarName: text(row.calendarName),
    type,
    title: text(row.title).trim() || '(제목 없음)',
    description: text(row.description),
    startAt,
    endAt: text(row.endAt).trim() || startAt,
    allDay: row.allDay === true,
    customerId: positiveInt(row.customerId),
    customerName: text(row.customerName),
    location: text(row.location),
    writable: row.writable === true,
    readOnlyReason: text(row.readOnlyReason),
  };
}

function normalizeTask(value: unknown): ScheduleTask | null {
  const row = record(value);
  const id = text(row.id).trim();
  if (!id) return null;
  const dueDate = text(row.dueDate).trim();
  return {
    id,
    source: row.source === 'google_task' ? 'google_task' : 'onefc_todo',
    sourceId: text(row.sourceId),
    title: text(row.title).trim() || '(제목 없음)',
    notes: text(row.notes),
    dueDate: YMD.test(dueDate) ? dueDate : null,
    dueTime: text(row.dueTime).trim() || null,
    status: row.status === 'completed' ? 'completed' : 'open',
    customerId: positiveInt(row.customerId),
    customerName: text(row.customerName),
  };
}

/** apiRequest 가 { success, data } 를 풀었든 아니든 둘 다 읽는다(웹 readScheduleEventsResponse 와 같은 규칙). */
export function normalizeScheduleEvents(payload: unknown): ScheduleEventsResult {
  const body = record(payload);
  const data = Array.isArray(body.events) ? body : record(body.data);
  if (!Array.isArray(data.events)) throw new ApiError('일정 응답이 올바르지 않습니다.', 500);
  const google = record(data.google);
  const write = record(google.write);
  return {
    from: text(data.from),
    to: text(data.to),
    events: data.events.flatMap((row) => {
      const event = normalizeEvent(row);
      return event ? [event] : [];
    }),
    tasks: (Array.isArray(data.tasks) ? data.tasks : []).flatMap((row) => {
      const task = normalizeTask(row);
      return task ? [task] : [];
    }),
    google: {
      connected: google.connected === true,
      status: text(google.status) || 'unconfigured',
      connectAllowed: google.connectAllowed !== false,
      configured: google.configured !== false,
      write: {
        enabled: write.enabled === true,
        calendarWritable: write.calendarWritable === true,
        tasksWritable: write.tasksWritable === true,
        needsWriteConsent: write.needsWriteConsent === true,
      },
      tasks: {
        status: text(record(google.tasks).status) || 'skipped',
        needsReconsent: record(google.tasks).needsReconsent === true,
      },
    },
    fetchedAt: text(data.fetchedAt),
  };
}

export function normalizeCalendarTargets(payload: unknown): GoogleCalendarTarget[] {
  return normalizeWriteTargets(payload).calendars;
}

/** GET /google/write/targets → 쓰기 가능한 캘린더·할 일 목록(서버가 Google 에서 다시 읽은 것). */
export function normalizeWriteTargets(payload: unknown): GoogleWriteTargets {
  const body = record(payload);
  const data = Array.isArray(body.calendars) || Array.isArray(body.taskLists) ? body : record(body.data);
  const taskLists = (Array.isArray(data.taskLists) ? data.taskLists : []).flatMap((row) => {
    const item = record(row);
    const id = text(item.id).trim();
    return id ? [{ id, name: text(item.name ?? item.title).trim() || id }] : [];
  });
  return { calendars: calendarTargets(data), taskLists };
}

function calendarTargets(data: Record<string, unknown>): GoogleCalendarTarget[] {
  return (Array.isArray(data.calendars) ? data.calendars : []).flatMap((row) => {
    const item = record(row);
    const id = text(item.id).trim();
    return id ? [{ id, name: text(item.name).trim() || id, primary: item.primary === true }] : [];
  });
}

// ---------------- 날짜별 표시 ----------------

/** 이벤트가 걸친 KST 날짜(시작일 ~ 마지막 날). 종일 endAt 은 exclusive. */
export function eventDayRange(event: Pick<ScheduleEvent, 'allDay' | 'startAt' | 'endAt'>): { first: string; last: string } {
  if (event.allDay) {
    const first = event.startAt.slice(0, 10);
    const endExclusive = event.endAt.slice(0, 10);
    const last = YMD.test(endExclusive) && endExclusive > first ? addDaysYmd(endExclusive, -1) : first;
    return { first, last };
  }
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const first = Number.isNaN(start.getTime()) ? event.startAt.slice(0, 10) : seoulYmd(start);
  if (Number.isNaN(end.getTime()) || end <= start) return { first, last: first };
  // 끝이 정확히 자정이면 그 날은 포함하지 않는다.
  const last = seoulYmd(new Date(end.getTime() - 1));
  return { first, last: last < first ? first : last };
}

export function eventsOnDay(events: ScheduleEvent[], ymd: string): ScheduleEvent[] {
  return events
    .filter((event) => {
      const range = eventDayRange(event);
      return range.first <= ymd && ymd <= range.last;
    })
    .sort((left, right) => Number(right.allDay) - Number(left.allDay) || left.startAt.localeCompare(right.startAt));
}

export function tasksOnDay(tasks: ScheduleTask[], ymd: string): ScheduleTask[] {
  return tasks.filter((task) => task.dueDate === ymd).sort((left, right) => (left.dueTime ?? '').localeCompare(right.dueTime ?? ''));
}

export function daysWithItems(result: Pick<ScheduleEventsResult, 'events' | 'tasks'>): Set<string> {
  const days = new Set<string>();
  for (const event of result.events) {
    const range = eventDayRange(event);
    for (let day = range.first, guard = 0; day <= range.last && guard < 400; day = addDaysYmd(day, 1), guard += 1) days.add(day);
  }
  for (const task of result.tasks) if (task.dueDate) days.add(task.dueDate);
  return days;
}

export function eventTimeLabel(event: Pick<ScheduleEvent, 'allDay' | 'startAt' | 'endAt'>): string {
  if (event.allDay) {
    const range = eventDayRange(event);
    return range.first === range.last ? '종일' : `종일 · ${range.first.slice(5).replace('-', '/')} ~ ${range.last.slice(5).replace('-', '/')}`;
  }
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  if (Number.isNaN(start.getTime())) return '';
  return Number.isNaN(end.getTime()) || end <= start ? seoulHm(start) : `${seoulHm(start)} ~ ${seoulHm(end)}`;
}

export const SCHEDULE_TYPE_LABEL: Record<ScheduleEventType, string> = {
  google_event: 'Google 일정',
  customer_alert: '알림일',
  car_expiry: '자동차 만기',
  insurance_age: '상령일',
};

export function taskSourceLabel(task: Pick<ScheduleTask, 'source'>): string {
  return task.source === 'google_task' ? 'Google 할 일' : 'ONE FC 할 일';
}

// ---------------- 연결 고객 / 할 일 이동 ----------------

export type ScheduleNativeRoute =
  | { pathname: '/customers/[customerId]'; params: { customerId: string } }
  | { pathname: '/customers/[customerId]/consultations'; params: { customerId: string } }
  | { pathname: '/todos/[todoId]/edit'; params: { todoId: string; from: typeof TODO_RETURN_SOURCE_SCHEDULE } };

/** 서버가 준 customerId 로만 고객을 연다(이름으로 찾지 않는다). 자동차 만기 → 고객 상세, 그 밖 → 상담. */
export function customerRouteOfEvent(event: Pick<ScheduleEvent, 'source' | 'type' | 'customerId'>): ScheduleNativeRoute | null {
  if (event.source !== 'crm' || !event.customerId) return null;
  const customerId = String(event.customerId);
  return event.type === 'car_expiry'
    ? { pathname: '/customers/[customerId]', params: { customerId } }
    : { pathname: '/customers/[customerId]/consultations', params: { customerId } };
}

export function customerRouteOfTask(task: Pick<ScheduleTask, 'source' | 'customerId'>): ScheduleNativeRoute | null {
  if (task.source !== 'onefc_todo' || !task.customerId) return null;
  return { pathname: '/customers/[customerId]/consultations', params: { customerId: String(task.customerId) } };
}

/** 일정에서 연 할 일은 저장·취소 후 일정으로 돌아온다(from=schedule, todoNavigation.leaveTodoForm). */
export function todoRouteOfTask(task: Pick<ScheduleTask, 'source' | 'sourceId'>): ScheduleNativeRoute | null {
  if (task.source !== 'onefc_todo' || !/^\d+$/.test(task.sourceId)) return null;
  return { pathname: '/todos/[todoId]/edit', params: { todoId: task.sourceId, from: TODO_RETURN_SOURCE_SCHEDULE } };
}

// ---------------- Google 일정 쓰기(기존 /api/service-integrations/google/write/events) ----------------

export function canCreateGoogleEvent(google: ScheduleEventsResult['google']): boolean {
  return google.connected && google.write.enabled && google.write.calendarWritable;
}

export function canEditEvent(event: Pick<ScheduleEvent, 'source' | 'writable'>, google: ScheduleEventsResult['google']): boolean {
  return event.source === 'google' && event.writable && canCreateGoogleEvent(google);
}

export function emptyEventForm(date: string, calendarId = ''): ScheduleEventForm {
  return { calendarId, title: '', description: '', date, endDate: date, allDay: false, startTime: '09:00', endTime: '10:00' };
}

export function eventToForm(event: ScheduleEvent): ScheduleEventForm {
  const range = eventDayRange(event);
  if (event.allDay) {
    return { calendarId: event.calendarId ?? '', title: event.title, description: event.description, date: range.first, endDate: range.last, allDay: true, startTime: '09:00', endTime: '10:00' };
  }
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  return {
    calendarId: event.calendarId ?? '',
    title: event.title,
    description: event.description,
    date: range.first,
    endDate: Number.isNaN(end.getTime()) ? range.first : seoulYmd(end),
    allDay: false,
    startTime: Number.isNaN(start.getTime()) ? '09:00' : seoulHm(start),
    endTime: Number.isNaN(end.getTime()) ? '10:00' : seoulHm(end),
  };
}

/** 서버 googleEventTimes 와 같은 규칙으로 미리 확인한다. 문제 없으면 null. */
export function validateEventForm(form: ScheduleEventForm): string | null {
  const title = form.title.trim();
  if (!form.calendarId.trim()) return '캘린더를 선택해 주세요.';
  if (!title) return '제목을 입력해 주세요.';
  if (title.length > SCHEDULE_TITLE_MAX) return `제목은 ${SCHEDULE_TITLE_MAX}자 이하로 입력해 주세요.`;
  if (form.description.length > SCHEDULE_NOTES_MAX) return '설명이 너무 깁니다.';
  if (!YMD.test(form.date)) return '날짜는 YYYY-MM-DD 로 입력해 주세요.';
  const endDate = form.endDate.trim() || form.date;
  if (!YMD.test(endDate) || endDate < form.date) return '종료일은 시작일과 같거나 늦어야 합니다.';
  if (form.allDay) return null;
  if (!HM.test(form.startTime)) return '시작 시각은 HH:mm 으로 입력해 주세요.';
  if (!HM.test(form.endTime)) return '종료 시각은 HH:mm 으로 입력해 주세요.';
  if (`${endDate}T${form.endTime}` <= `${form.date}T${form.startTime}`) return '종료 시각은 시작 시각보다 늦어야 합니다.';
  return null;
}

export function formToGoogleInput(form: ScheduleEventForm) {
  return {
    calendarId: form.calendarId.trim(),
    title: form.title.trim(),
    description: form.description,
    date: form.date,
    endDate: form.endDate.trim() || form.date,
    allDay: form.allDay,
    startTime: form.allDay ? '' : form.startTime,
    endTime: form.allDay ? '' : form.endTime,
  };
}

/** 중복 저장 방지용 요청 id(32 hex). 보안 토큰이 아니라 같은 저장 시도를 묶는 키다. */
export function newScheduleRequestId(random: () => number = Math.random): string {
  let out = '';
  for (let index = 0; index < 32; index += 1) out += Math.floor(random() * 16).toString(16);
  return out;
}

export const GOOGLE_READ_ONLY_REASON: Record<string, string> = {
  calendar_read_only: '이 캘린더는 읽기 전용입니다.',
  recurring: '반복 일정은 Google Calendar에서 수정해 주세요.',
  attendees: '참석자가 있는 일정은 Google Calendar에서 수정해 주세요.',
  conference: '화상 회의가 연결된 일정은 Google Calendar에서 수정해 주세요.',
  not_organizer: '다른 사람이 만든 일정은 수정할 수 없습니다.',
  special_type: '이 유형의 일정은 Google Calendar에서 수정해 주세요.',
  locked: '잠긴 일정은 수정할 수 없습니다.',
};

export function readOnlyMessage(event: Pick<ScheduleEvent, 'source' | 'readOnlyReason'>, google: ScheduleEventsResult['google']): string {
  if (event.source === 'crm') return '고객 정보에서 만든 일정입니다. 고객 화면에서 관리해 주세요.';
  if (!google.write.enabled) return 'Google 일정 수정은 아직 이 계정에서 사용할 수 없습니다.';
  if (!google.write.calendarWritable || google.write.needsWriteConsent) return 'Google 캘린더 쓰기 권한이 필요합니다. PC 일정 관리에서 다시 연결해 주세요.';
  return GOOGLE_READ_ONLY_REASON[event.readOnlyReason] ?? '이 일정은 수정할 수 없습니다.';
}

// ---------------- 추가 저장 위치(웹 ScheduleGoogleWrite 와 같은 판정) ----------------

export const SCHEDULE_STORAGE_LABEL: Record<ScheduleStorage, string> = {
  google_event: 'Google 일정',
  google_task: 'Google 할 일',
  onefc_todo: 'ONE FC 할 일',
};

/** 저장 위치별 사용 가능 여부와 불가 사유. ONE FC 할 일은 Google 연결과 무관하게 항상 가능. 최종 판단은 서버가 매 요청 다시 한다. */
export function storageAvailability(
  google: ScheduleEventsResult['google'],
  storage: ScheduleStorage,
): { available: boolean; reason: string | null } {
  if (storage === 'onefc_todo') return { available: true, reason: null };
  if (google.status === 'needs_reauth') return { available: false, reason: 'Google 연결이 만료되었습니다. 위 재연결 버튼으로 다시 연결해 주세요.' };
  if (!google.connected) return { available: false, reason: 'Google 계정이 연결되어 있지 않습니다. 위 Google 연결 버튼으로 연결해 주세요.' };
  if (!google.write.enabled) return { available: false, reason: '이 계정에서는 아직 Google 쓰기를 사용할 수 없습니다.' };
  const writable = storage === 'google_event' ? google.write.calendarWritable : google.write.tasksWritable;
  if (!writable) {
    return {
      available: false,
      reason: storage === 'google_event'
        ? 'Google 캘린더 쓰기 권한이 필요합니다. 위 권한 허용 버튼으로 다시 연결해 주세요.'
        : 'Google 할 일 쓰기 권한이 필요합니다. 위 권한 허용 버튼으로 다시 연결해 주세요.',
    };
  }
  return { available: true, reason: null };
}

export function emptyTaskForm(date: string, taskListId = ''): ScheduleTaskForm {
  return { taskListId, title: '', notes: '', dueDate: date, dueTime: '' };
}

/** Google 할 일·ONE FC 할 일 공통 확인. 예정일은 비워도 된다(날짜 없음). 시각은 ONE FC 할 일만. */
export function validateTaskForm(form: ScheduleTaskForm, storage: 'google_task' | 'onefc_todo'): string | null {
  const title = form.title.trim();
  if (storage === 'google_task' && !form.taskListId.trim()) return '할 일 목록을 선택해 주세요.';
  if (!title) return '제목을 입력해 주세요.';
  if (title.length > SCHEDULE_TITLE_MAX) return `제목은 ${SCHEDULE_TITLE_MAX}자 이하로 입력해 주세요.`;
  if (form.notes.length > SCHEDULE_NOTES_MAX) return '메모가 너무 깁니다.';
  const due = form.dueDate.trim();
  if (due && !YMD.test(due)) return '예정일은 YYYY-MM-DD 로 입력해 주세요.';
  const time = form.dueTime.trim();
  if (storage === 'onefc_todo' && time) {
    if (!due) return '시각을 지정하려면 예정일을 입력해 주세요.';
    if (!HM.test(time)) return '시각은 HH:mm 으로 입력해 주세요.';
  }
  return null;
}

/** POST /api/service-integrations/google/write/tasks 본문(웹과 같은 필드). */
export function taskFormToGoogleInput(form: ScheduleTaskForm, requestId: string) {
  const due = form.dueDate.trim();
  return { taskListId: form.taskListId.trim(), title: form.title.trim(), notes: form.notes, dueDate: due || null, requestId };
}

/** POST /api/todos 본문(기존 할 일 API). */
export function taskFormToTodoPayload(form: ScheduleTaskForm) {
  const due = form.dueDate.trim();
  const time = form.dueTime.trim();
  return {
    title: form.title.trim(),
    description: form.notes.trim() || null,
    dueDate: due || null,
    dueTime: due && time ? time : null,
  };
}

export function defaultTaskListId(targets: GoogleWriteTargets | undefined): string {
  return targets?.taskLists[0]?.id ?? '';
}

/** 예정일 없는 미완료 할 일(웹 목록 "날짜 없음"과 같은 묶음). */
export function undatedOpenTasks(tasks: ScheduleTask[]): ScheduleTask[] {
  return tasks
    .filter((task) => !task.dueDate && task.status === 'open')
    .sort((left, right) => left.title.localeCompare(right.title, 'ko'));
}

/** Google 할 일 조회 상태 안내(웹 ScheduleChrome 와 같은 문구). 정상이면 null. */
export function googleTasksNotice(google: ScheduleEventsResult['google']): string | null {
  if (google.status !== 'connected') return null;
  if (google.tasks.status === 'scope_missing' || google.tasks.needsReconsent) {
    return 'Google 할 일을 보려면 Google을 다시 연결해 Google Tasks 읽기 권한을 허용해 주세요.';
  }
  if (google.tasks.status === 'error' || google.tasks.status === 'needs_reauth') {
    return 'Google 할 일을 불러오지 못했습니다. 다른 일정은 계속 표시됩니다.';
  }
  return null;
}

// ---------------- Google 연결 상태 안내 + 연결/재연결(t396) ----------------

/**
 * 서버 상태 → 배너. 연결·재연결은 읽기 연결(connect), 쓰기 권한만 없으면 증분 동의(write).
 * 서버 미설정·준비 중(connectAllowed=false)이면 버튼 없이 안내만.
 */
export function googleStatusBanner(google: ScheduleEventsResult['google']): ScheduleGoogleBanner | null {
  if (!google.configured || google.status === 'unconfigured' || google.status === 'skipped') return null;
  const can = google.connectAllowed;
  if (google.status === 'needs_reauth') {
    return { tone: 'warning', label: '재연결 필요', message: 'Google 연결이 만료되었습니다. 다시 연결하면 일정이 표시됩니다.', action: can ? { label: 'Google 재연결', purpose: 'connect' } : null };
  }
  if (google.status === 'error') {
    return { tone: 'danger', label: '오류', message: 'Google 일정을 불러오지 못했습니다. 새로고침해 보세요.', action: null };
  }
  if (!google.connected || google.status === 'disconnected') {
    return { tone: 'info', label: '연결 안 됨', message: can ? 'Google 캘린더·할 일을 함께 보려면 Google을 연결해 주세요.' : 'Google 연동 준비 중입니다.', action: can ? { label: 'Google 연결', purpose: 'connect' } : null };
  }
  if (google.tasks.status === 'scope_missing' || google.tasks.needsReconsent) {
    return { tone: 'warning', label: '권한 필요', message: 'Google 할 일을 보려면 Google Tasks 읽기 권한이 필요합니다.', action: can ? { label: 'Google 재연결', purpose: 'connect' } : null };
  }
  if (google.write.enabled && (google.write.needsWriteConsent || !google.write.calendarWritable || !google.write.tasksWritable)) {
    return { tone: 'warning', label: '쓰기 권한 필요', message: '앱에서 Google 일정·할 일을 추가하려면 쓰기 권한을 허용해 주세요.', action: { label: '쓰기 권한 허용', purpose: 'write' } };
  }
  return { tone: 'success', label: '연결됨', message: null, action: null };
}

/** 시스템 브라우저 복귀 URL(<scheme>://google-connect?google=...&reason=) → 결과 문구. 실패·취소도 화면은 다시 읽는다. */
export function googleConnectResultMessage(result: { type: string; url?: string }): { ok: boolean; text: string } {
  if (result.type !== 'success' || !result.url) return { ok: false, text: 'Google 연결을 완료하지 않았습니다.' };
  let google = '';
  let reason = '';
  try {
    const query = result.url.split('?')[1] ?? '';
    const params = new URLSearchParams(query);
    google = params.get('google') ?? '';
    reason = params.get('reason') ?? '';
  } catch {
    google = '';
  }
  if (google === 'connected' || google === 'write_connected') {
    if (reason === 'tasks_scope_missing') return { ok: true, text: 'Google을 연결했습니다. Google 할 일은 Tasks 권한을 허용해야 보입니다.' };
    if (reason === 'write_scope_partial') return { ok: true, text: '일부 쓰기 권한만 허용되었습니다.' };
    return { ok: true, text: 'Google을 연결했습니다.' };
  }
  if (reason === 'access_denied') return { ok: false, text: 'Google 동의를 취소했습니다.' };
  if (reason === 'account_mismatch') return { ok: false, text: '이미 연결된 Google 계정과 같은 계정으로 다시 연결해 주세요.' };
  return { ok: false, text: 'Google 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
}

/**
 * 일정 화면 상단 작은 경고. 정상 연결(쓰기 권한 미허용 포함)이면 아무것도 안 보인다.
 * 연결/재연결/권한은 일정 본문이 아니라 내 정보 > Google 연동에서 한다.
 */
export function scheduleGoogleWarning(google: ScheduleEventsResult['google']): ScheduleGoogleWarning | null {
  if (!google.configured || google.status === 'unconfigured' || google.status === 'skipped') return null;
  if (google.status === 'needs_reauth') return { text: 'Google 재연결 필요' };
  if (google.status === 'error') return { text: 'Google 일정을 불러오지 못했습니다' };
  if (!google.connected || google.status === 'disconnected') return google.connectAllowed ? { text: 'Google 일정 연결 필요' } : null;
  if (google.tasks.status === 'scope_missing' || google.tasks.needsReconsent) return { text: 'Google 할 일 권한 필요' };
  if (google.tasks.status === 'error' || google.tasks.status === 'needs_reauth') return { text: 'Google 할 일을 불러오지 못했습니다' };
  return null;
}

/** 내 정보 > Google 연동 권한 목록(서버 google 상태 SSOT). */
export function googleIntegrationPermissions(google: ScheduleEventsResult['google']): GoogleIntegrationPermission[] {
  const connected = google.connected && google.status !== 'needs_reauth';
  return [
    { key: 'read', label: '일정 읽기', granted: connected },
    { key: 'tasks_read', label: 'Google 할 일 읽기', granted: connected && google.tasks.status === 'connected' && !google.tasks.needsReconsent },
    { key: 'calendar_write', label: '캘린더 쓰기', granted: connected && google.write.enabled && google.write.calendarWritable },
    { key: 'tasks_write', label: 'Google 할 일 쓰기', granted: connected && google.write.enabled && google.write.tasksWritable },
  ];
}
