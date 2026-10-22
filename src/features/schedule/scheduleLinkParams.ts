import { singleParam, validWidgetDate } from '../home-widgets/engine/widgetDeepLink';

export type ScheduleLinkTarget = { date: string | undefined; itemId: string | null; create: boolean; nonce: string };

/** 일정 화면 진입 파라미터(위젯 deep link). 날짜가 올바르지 않으면 아무것도 바꾸지 않는다. */
export function scheduleLinkTarget(params: Record<string, unknown>): ScheduleLinkTarget {
  const date = validWidgetDate(params.date);
  return {
    date,
    itemId: date ? singleParam(params.event) ?? null : null,
    create: Boolean(date) && singleParam(params.create) === '1',
    nonce: singleParam(params._w) ?? '',
  };
}
