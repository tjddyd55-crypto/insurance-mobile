import type { SaveTodoPayload } from '../todos/types';
import { emptyEventForm, setScheduleTimeSpecified } from './scheduleModel';
import type { ScheduleEventForm } from './types';

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

/** 제목만 저장하면 종일(시각 null). 시간을 켜면 같은 날 시작·종료다. 종료가 시작보다 이르면 sensibleEndTime. 일정 API에는 고객 필드가 없다. */
export function widgetQuickScheduleForm(draft: WidgetQuickDraft): ScheduleEventForm {
  const title = draft.title.trim();
  const base = emptyEventForm(draft.date);
  const start = draft.time.trim();
  if (!start) return { ...base, title, allDay: true };
  const clock = setScheduleTimeSpecified({ allDay: true, startTime: start, endTime: draft.endTime?.trim() ?? '' }, true);
  return { ...base, title, date: draft.date, endDate: draft.date, ...clock };
}

/** 할 일. 고객을 고르지 않으면 연결 없음. 시각 칸은 없고 dueTime 은 null. */
export function widgetQuickTodoPayload(draft: WidgetQuickDraft): SaveTodoPayload {
  const customerId = draft.customerId?.trim() || null;
  return {
    title: draft.title.trim(),
    description: null,
    dueDate: draft.date,
    dueTime: null,
    priority: 'normal',
    sourceType: 'manual',
    relatedEntityType: customerId ? 'customer' : null,
    relatedEntityId: customerId,
  };
}
