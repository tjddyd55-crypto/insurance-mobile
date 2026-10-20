/** 웹 src/features/schedule/api/scheduleApi.ts 와 같은 서버 공통 일정 모델(서버 /api/schedule/events 가 SSOT). */
export type ScheduleEventType = 'google_event' | 'customer_alert' | 'car_expiry' | 'insurance_age';

export type ScheduleEvent = {
  id: string;
  source: 'google' | 'crm';
  sourceId: string;
  calendarId: string | null;
  calendarName: string;
  type: ScheduleEventType;
  title: string;
  description: string;
  /** 종일: YYYY-MM-DD, 시간: RFC3339(오프셋 포함) */
  startAt: string;
  /** 종일: exclusive YYYY-MM-DD */
  endAt: string;
  allDay: boolean;
  customerId: number | null;
  customerName: string;
  location: string;
  writable: boolean;
  readOnlyReason: string;
};

export type ScheduleTask = {
  id: string;
  source: 'google_task' | 'onefc_todo';
  sourceId: string;
  title: string;
  notes: string;
  dueDate: string | null;
  dueTime: string | null;
  status: 'open' | 'completed';
  customerId: number | null;
  customerName: string;
};

export type ScheduleWriteState = { enabled: boolean; calendarWritable: boolean; tasksWritable: boolean; needsWriteConsent: boolean };

/** 서버 google.tasks.status (connected | scope_missing | needs_reauth | error | ...). */
export type ScheduleGoogleTasksState = { status: string; needsReconsent: boolean };

export type ScheduleGoogleState = {
  connected: boolean;
  status: string;
  /** 서버 isGoogleConnectAllowed(검증 기간 허용 목록). false 면 연결 버튼을 보이지 않는다. */
  connectAllowed: boolean;
  configured: boolean;
  write: ScheduleWriteState;
  tasks: ScheduleGoogleTasksState;
};

export type ScheduleEventsResult = {
  from: string;
  to: string;
  events: ScheduleEvent[];
  tasks: ScheduleTask[];
  google: ScheduleGoogleState;
  fetchedAt: string;
};

export type GoogleCalendarTarget = { id: string; name: string; primary: boolean };

export type GoogleTaskListTarget = { id: string; name: string };

export type GoogleWriteTargets = { calendars: GoogleCalendarTarget[]; taskLists: GoogleTaskListTarget[] };

/** 일정 관리 추가 저장 위치(웹 ScheduleGoogleWrite 와 같은 세 저장소). */
export type ScheduleStorage = 'google_event' | 'google_task' | 'onefc_todo';

export type ScheduleTaskForm = { taskListId: string; title: string; notes: string; dueDate: string; dueTime: string };

export type ScheduleEventForm = {
  calendarId: string;
  title: string;
  description: string;
  date: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
};

/** 일정 관리 Google 연결 상태 안내(웹 ScheduleChrome 와 같은 서버 상태 기준). */
export type GoogleConnectPurpose = 'connect' | 'write';
export type ScheduleGoogleBanner = {
  tone: 'info' | 'warning' | 'danger' | 'success';
  label: '연결 안 됨' | '재연결 필요' | '불러오기 실패' | '연결됨' | '권한 필요';
  message: string | null;
  action: { label: string; purpose: GoogleConnectPurpose } | null;
};
