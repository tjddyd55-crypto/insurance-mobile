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

export type ScheduleWriteState = { enabled: boolean; calendarWritable: boolean; needsWriteConsent: boolean };

export type ScheduleGoogleState = {
  connected: boolean;
  status: string;
  write: ScheduleWriteState;
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
