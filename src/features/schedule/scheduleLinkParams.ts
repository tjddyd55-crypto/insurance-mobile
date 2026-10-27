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

type LinkItemSource<E extends { id: string }, K extends { id: string }> = { events: E[]; tasks: K[] };
export type PendingLinkStep<T> = { kind: 'wait' } | { kind: 'refetch' } | { kind: 'open'; item: T } | { kind: 'missing' };

/**
 * 위젯 링크의 event id 를 현재 목록에서 찾는다.
 * 없으면: 받는 중이면 기다리고, 아직 새로 받지 않았으면 한 번 새로 받고, 새로 받은 뒤에도 없으면 missing.
 */
export function resolvePendingLinkItem<E extends { id: string }, K extends { id: string }>(
  data: LinkItemSource<E, K>,
  itemId: string,
  state: { fetching: boolean; refetched: boolean },
): PendingLinkStep<E | K> {
  const item = ([...data.events, ...data.tasks] as (E | K)[]).find((entry: E | K) => entry.id === itemId);
  if (item) return { kind: 'open', item };
  if (state.fetching) return { kind: 'wait' };
  if (!state.refetched) return { kind: 'refetch' };
  return { kind: 'missing' };
}
