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
  /**
   * ONE FC calendar_items 일정. 목록 id 는 `onefc:` 접두사.
   * 수정·삭제는 접두사를 뺀 raw id 로 PATCH/DELETE /api/schedules.
   * 없으면 Google 에서 온 일정(기존 write/events).
   */
  origin?: 'onefc';
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
  label: '연결 안 됨' | '재연결 필요' | '오류' | '연결됨' | '권한 필요' | '쓰기 권한 필요';
  message: string | null;
  action: { label: string; purpose: GoogleConnectPurpose } | null;
};

/** 일정 화면의 작은 경고 줄(정상 연결이면 null). 누르면 내 정보 > Google 연동으로 간다. */
export type ScheduleGoogleWarning = { text: string };

/** 내 정보 > Google 연동의 권한 표시. 서버 상태 그대로(토큰·계정 비밀값 없음). */
export type GoogleIntegrationPermission = { key: 'read' | 'tasks_read' | 'calendar_write' | 'tasks_write'; label: string; granted: boolean };
