import {
  formatTaPhone,
  normalizeTaSettings,
  normalizeTaWeek,
  shiftDate,
  taDayStatus,
  taSettingsSummary,
} from '../taCallModel';

describe('taCallModel', () => {
  test('normalizes week, day, assignment and snake_case fields', () => {
    const week = normalizeTaWeek({
      week_start_date: '2026-08-31', week_end_date: '2026-09-06',
      days: [{
        date: '2026-08-31', is_today: true, total_count: 1,
        assignments: [{ id: 'a', customer_id: 7, customer_name: '홍길동', status: 'completed' }],
      }],
    });
    expect(week.weekStartDate).toBe('2026-08-31');
    expect(week.days[0].isToday).toBe(true);
    expect(week.days[0].assignments[0].customerId).toBe('7');
    expect(week.days[0].assignments[0].status).toBe('completed');
  });

  test('normalizes settings and builds a readable summary', () => {
    const settings = normalizeTaSettings({
      dailyTargetCount: 20, targetGender: 'female', targetSangnyeongDays: 30, excludeMinors: true,
    });
    expect(settings.dailyTargetCount).toBe(20);
    expect(taSettingsSummary(settings)).toContain('여성');
    expect(taSettingsSummary(settings)).toContain('상령일 30일 이내');
  });

  test('shifts week dates safely', () => {
    expect(shiftDate('2026-08-31', 7)).toBe('2026-09-07');
    expect(shiftDate('2026-08-31', -7)).toBe('2026-08-24');
  });

  test('formats phone and day status', () => {
    expect(formatTaPhone('01012345678')).toBe('010-1234-5678');
    expect(taDayStatus(normalizeTaWeek({ days: [{ date: '2026-09-01', isFuture: true }] }).days[0])).toBe('예정');
  });
});
