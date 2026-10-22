import type { SaveTodoPayload } from '../todos/types';
import { addDaysYmd, emptyEventForm, plusOneHour } from './scheduleModel';
import type { ScheduleEventForm } from './types';

export { plusOneHour };

export type WidgetQuickDraft = {
  title: string;
  date: string;
  /** 비어 있으면 시각 없음. 일정은 종일, 할 일은 dueTime 없음. */
  time: string;
  /** 일정에서 시간 지정을 켰을 때의 종료 시각. 비어 있으면 시작에서 1시간 뒤. */
  endTime?: string;
  customerId: string | null;
  customerName: string;
};

/** 제목만 저장하면 시각 없음(종일). 시각이 있으면 시작이고 종료는 1시간 뒤. 일정 저장 API에는 고객 필드가 없다. */
export function widgetQuickScheduleForm(draft: WidgetQuickDraft): ScheduleEventForm {
  const title = draft.title.trim();
  const base = emptyEventForm(draft.date);
  const start = draft.time.trim();
  if (!start) return { ...base, title, allDay: true };
  const explicitEnd = draft.endTime?.trim() ?? '';
  const end = /^([01]\d|2[0-3]):[0-5]\d$/.test(explicitEnd) ? { time: explicitEnd, dayOffset: explicitEnd <= start ? 1 as const : 0 as const } : plusOneHour(start);
  return {
    ...base,
    title,
    allDay: false,
    date: draft.date,
    endDate: end.dayOffset ? addDaysYmd(draft.date, end.dayOffset) : draft.date,
    startTime: start,
    endTime: end.time,
  };
}

/** 할 일. 고객을 고르지 않으면 연결 없음. 시각을 고르지 않으면 dueTime 없음. */
export function widgetQuickTodoPayload(draft: WidgetQuickDraft): SaveTodoPayload {
  const customerId = draft.customerId?.trim() || null;
  return {
    title: draft.title.trim(),
    description: null,
    dueDate: draft.date,
    dueTime: draft.time.trim() || null,
    priority: 'normal',
    sourceType: 'manual',
    relatedEntityType: customerId ? 'customer' : null,
    relatedEntityId: customerId,
  };
}
