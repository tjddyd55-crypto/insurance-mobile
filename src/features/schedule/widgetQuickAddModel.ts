import type { SaveTodoPayload } from '../todos/types';
import { addDaysYmd, emptyEventForm, plusOneHour } from './scheduleModel';
import type { ScheduleEventForm } from './types';

export { plusOneHour };

export type WidgetQuickDraft = {
  title: string;
  date: string;
  /** 비어 있으면 시각 없음. 일정은 종일, 할 일은 dueTime 없음. */
  time: string;
  customerId: string | null;
  customerName: string;
};

/** 제목만 저장하면 고객 없음·시각 없음(종일). 시각이 있으면 시작 시각이고 종료는 1시간 뒤. */
export function widgetQuickScheduleForm(draft: WidgetQuickDraft): ScheduleEventForm {
  const title = draft.title.trim();
  const base = emptyEventForm(draft.date);
  if (!draft.time.trim()) return { ...base, title, allDay: true };
  const end = plusOneHour(draft.time.trim());
  return {
    ...base,
    title,
    allDay: false,
    date: draft.date,
    endDate: end.dayOffset ? addDaysYmd(draft.date, end.dayOffset) : draft.date,
    startTime: draft.time.trim(),
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
