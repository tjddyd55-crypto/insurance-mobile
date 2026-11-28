import { seoulYmd, shiftMonth } from '../../schedule/scheduleModel';
import type { EducationSchedule } from '../educationScheduleApi';
import { buildEducationCalendar } from '../educationScheduleModel';

const schedule = (id: string, date: string): EducationSchedule => ({
  id, date, title: `교육 ${id}`, instructor: '강사',
  publicScope: 'BRANCH', scopeId: 1, canEdit: true, canDelete: true,
});

describe('education calendar', () => {
  test('starts on Sunday and keeps multiple schedules with the supplied holiday', () => {
    const first = schedule('a', '2026-12-25');
    const second = schedule('b', '2026-12-25');
    const weeks = buildEducationCalendar({
      month: '2026-12',
      schedules: [first, second],
      holidays: [{ date: '2026-12-25', name: '성탄절' }],
    });
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0][0]).toMatchObject({ ymd: '2026-11-29', inMonth: false, tone: 'sunday' });
    expect(weeks[0][6]).toMatchObject({ ymd: '2026-12-05', tone: 'saturday' });
    expect(weeks[3][5]).toMatchObject({ ymd: '2026-12-25', holiday: '성탄절', tone: 'sunday', schedules: [first, second] });
  });

  test('a holiday takes precedence over the Saturday color', () => {
    const weeks = buildEducationCalendar({
      month: '2026-08', schedules: [], holidays: [{ date: '2026-08-15', name: '광복절' }],
    });
    expect(weeks).toHaveLength(6);
    expect(weeks[2][6]).toMatchObject({ ymd: '2026-08-15', holiday: '광복절', tone: 'sunday' });
  });

  test('uses Seoul today and moves across a year on the first day of the target month', () => {
    expect(seoulYmd(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
    expect(shiftMonth('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftMonth('2027-01-31', -1)).toBe('2026-12-01');
  });
});
