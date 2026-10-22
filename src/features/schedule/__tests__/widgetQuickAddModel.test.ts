import { plusOneHour, widgetQuickScheduleForm, widgetQuickTodoPayload } from '../widgetQuickAddModel';

describe('위젯 빠른 추가 저장 값', () => {
  it('제목만이면 고객 없음, 고른 날짜, 시각 없음(종일)', () => {
    const draft = { title: ' 미팅 ', date: '2026-10-22', time: '', customerId: null, customerName: '' };
    expect(widgetQuickScheduleForm(draft)).toMatchObject({
      title: '미팅',
      date: '2026-10-22',
      endDate: '2026-10-22',
      allDay: true,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(widgetQuickTodoPayload(draft)).toEqual({
      title: '미팅',
      description: null,
      dueDate: '2026-10-22',
      dueTime: null,
      priority: 'normal',
      sourceType: 'manual',
      relatedEntityType: null,
      relatedEntityId: null,
    });
  });

  it('시각은 시작이고 종료는 1시간 뒤다. 자정을 넘기면 다음 날', () => {
    expect(plusOneHour('14:15')).toEqual({ time: '15:15', dayOffset: 0 });
    expect(plusOneHour('23:30')).toEqual({ time: '00:30', dayOffset: 1 });
    expect(widgetQuickScheduleForm({
      title: '상담',
      date: '2026-10-22',
      time: '23:30',
      customerId: null,
      customerName: '',
    })).toMatchObject({ allDay: false, startTime: '23:30', endTime: '00:30', endDate: '2026-10-23' });
  });

  it('할 일만 고객 연결을 저장 본문에 넣는다', () => {
    const draft = { title: '서류', date: '2026-10-21', time: '09:00', customerId: '42', customerName: '홍길동' };
    expect(widgetQuickTodoPayload(draft)).toMatchObject({
      dueDate: '2026-10-21',
      dueTime: '09:00',
      relatedEntityType: 'customer',
      relatedEntityId: '42',
    });
    expect(widgetQuickScheduleForm(draft)).not.toHaveProperty('customerId');
  });
});
