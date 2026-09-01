import { normalizeTaWeek } from '../taCallModel';
import {
  formatTaBirthDate,
  formatTaWeekRangeCompactLabel,
  taDayEmptyCopy,
  taDayStatusTone,
  taStatusTone,
  taWeekProgressPercent,
  taWeekSummaryStatus,
} from '../taCallPresentation';

describe('taCallPresentation', () => {
  test('maps assignment status to semantic badge tones', () => {
    expect(taStatusTone('completed')).toBe('success');
    expect(taStatusTone('no_answer')).toBe('warning');
    expect(taStatusTone('not_called')).toBe('default');
  });

  test('keeps today and completed day badges on the success tone', () => {
    expect(taDayStatusTone({ isToday: true, isMissionCompleted: false })).toBe('success');
    expect(taDayStatusTone({ isToday: false, isMissionCompleted: true })).toBe('success');
    expect(taDayStatusTone({ isToday: false, isMissionCompleted: false })).toBe('default');
  });

  test('formats birth date and compact week range like mobile web', () => {
    expect(formatTaBirthDate(null)).toBe('-');
    expect(formatTaBirthDate('1990-01-02T00:00:00.000Z')).toBe('1990-01-02');
    expect(formatTaWeekRangeCompactLabel('2026-08-31', '2026-09-06')).toBe('08.31 ~ 09.06');
  });

  test('summarizes week progress and empty copy without changing counts', () => {
    const today = normalizeTaWeek({
      days: [{
        date: '2026-09-01',
        isToday: true,
        totalCount: 0,
        completedCount: 0,
        dailyTargetCount: 10,
        emptyMessage: null,
      }],
    }).days[0];
    expect(taWeekSummaryStatus(today)).toBe('empty');
    expect(taWeekProgressPercent(today)).toBe(0);
    expect(taDayEmptyCopy(today).message).toBe('현재 설정한 조건에 맞는 전화 대상 고객이 없습니다.');
  });
});
