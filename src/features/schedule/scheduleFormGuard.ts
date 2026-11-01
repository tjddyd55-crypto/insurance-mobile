import type { ScheduleEventForm } from './types';

/** 나가기 확인 문구(ONE FC ConfirmDialog). */
export const SCHEDULE_LEAVE_CONFIRM_COPY = {
  title: '작성 취소',
  message: '작성 중인 내용이 있습니다. 나가시겠습니까?',
  cancelLabel: '계속 작성',
  confirmLabel: '나가기',
} as const;

/**
 * 비교용 정규화 값. 사용자가 보는 입력만 비교한다.
 * 종일이면 시작/종료 시각은 화면에 없으므로 비교하지 않는다. 제목·설명은 앞뒤 공백을 무시한다.
 */
export function scheduleFormSnapshot(form: ScheduleEventForm): string {
  return JSON.stringify({
    calendarId: form.calendarId,
    title: form.title.trim(),
    description: form.description.trim(),
    date: form.date,
    endDate: form.endDate,
    allDay: form.allDay,
    startTime: form.allDay ? null : form.startTime,
    endTime: form.allDay ? null : form.endTime,
  });
}

/** 폼을 연 순간의 스냅샷과 현재 값이 다르면 나가기 전에 확인한다. */
export function isScheduleFormDirty(initialSnapshot: string, current: ScheduleEventForm): boolean {
  return scheduleFormSnapshot(current) !== initialSnapshot;
}

export type ScheduleCloseDecision = 'close' | 'confirm' | 'ignore';

/** 닫기 요청(Android Back·취소 버튼) 판단. 저장 중이면 무시, 변경이 있으면 확인, 아니면 바로 닫는다. */
export function decideScheduleFormClose(input: { busy: boolean; initialSnapshot: string; current: ScheduleEventForm }): ScheduleCloseDecision {
  if (input.busy) return 'ignore';
  return isScheduleFormDirty(input.initialSnapshot, input.current) ? 'confirm' : 'close';
}
