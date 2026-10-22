import { monthRange, shiftMonth } from '../../schedule/scheduleModel';

/**
 * 날짜형 위젯 공통 조회 기간: 이번 달 −1 ~ +2개월(요청 1번, 서버 400일 제한 이내).
 * 위젯 안 달/날짜 이동은 이 캐시만 쓰고 탭마다 서버를 부르지 않는다.
 */
export function widgetWindow(today: string): { from: string; to: string } {
  const thisMonth = `${today.slice(0, 7)}-01`;
  return { from: shiftMonth(thisMonth, -1), to: monthRange(shiftMonth(thisMonth, 2)).to };
}
