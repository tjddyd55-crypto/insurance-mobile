jest.mock('react-native', () => ({ Platform: { OS: 'android' }, AppRegistry: { registerHeadlessTask: jest.fn() } }));
jest.mock('../../../api/client', () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, apiRequest: jest.fn() };
});
jest.mock('../../../auth/secureStorage', () => ({ readAuthSession: jest.fn() }));
jest.mock('../../schedule/scheduleApi', () => ({ createOnefcSchedule: jest.fn() }));
jest.mock('../../todos/todosApi', () => ({ createTodo: jest.fn() }));
jest.mock('../engine/widgetRefreshCoordinator', () => ({ refreshWidgets: jest.fn(), purgeWidgets: jest.fn() }));

import { readAuthSession } from '../../../auth/secureStorage';
import { createOnefcSchedule } from '../../schedule/scheduleApi';
import { createTodo } from '../../todos/todosApi';
import { refreshWidgets } from '../engine/widgetRefreshCoordinator';
import { setWidgetNativeForTests } from '../widgetBridge';
import { runWidgetQuickAdd, validateQuickAdd } from '../widgetQuickAdd';

const RID = 'b'.repeat(32);
const report = jest.fn(async () => true);

beforeEach(() => {
  jest.clearAllMocks();
  setWidgetNativeForTests({ reportQuickAddResult: report } as never);
  (readAuthSession as jest.Mock).mockResolvedValue({ token: 'tok', user: { id: 1 } });
  (createOnefcSchedule as jest.Mock).mockResolvedValue('onefc:x');
  (createTodo as jest.Mock).mockResolvedValue({ id: 77 });
  (refreshWidgets as jest.Mock).mockResolvedValue({ schedule: 'written', todo: 'written' });
});

describe('widget quick add modes', () => {
  it('legacy payload stays an all-day event', async () => {
    await runWidgetQuickAdd({ requestId: RID, date: '2026-10-27', title: '미팅' });
    expect((createOnefcSchedule as jest.Mock).mock.calls[0][1]).toMatchObject({ allDay: true, date: '2026-10-27', title: '미팅' });
    expect(createTodo).not.toHaveBeenCalled();
  });

  it('timed event uses start/end (string allDay from Bundle)', async () => {
    await runWidgetQuickAdd({ requestId: RID, date: '2026-10-27', title: '미팅', allDay: 'false', startTime: '14:00', endTime: '15:30' });
    expect((createOnefcSchedule as jest.Mock).mock.calls[0][1]).toMatchObject({ allDay: false, startTime: '14:00', endTime: '15:30' });
  });

  it('timed event with end <= start falls back to the schedule policy end', async () => {
    await runWidgetQuickAdd({ requestId: RID, date: '2026-10-27', title: '미팅', allDay: 'false', startTime: '14:00', endTime: '13:00' });
    expect((createOnefcSchedule as jest.Mock).mock.calls[0][1]).toMatchObject({ startTime: '14:00', endTime: '15:00' });
  });

  it('rejects timed event without a valid start', () => {
    expect(validateQuickAdd({ requestId: RID, date: '2026-10-27', title: 'x', allDay: 'false', startTime: '' })).toBeNull();
  });

  it('todo uses createTodo with dueTime null and refreshes todo+schedule widgets', async () => {
    const result = await runWidgetQuickAdd({ requestId: RID, date: '2026-10-28', title: '서류 확인', kind: 'todo', allDay: 'false', startTime: '09:00' });
    const payload = (createTodo as jest.Mock).mock.calls[0][1];
    expect(payload).toMatchObject({ description: '서류 확인', dueDate: '2026-10-28', dueTime: null, sourceType: 'manual' });
    expect(createOnefcSchedule).not.toHaveBeenCalled();
    expect((refreshWidgets as jest.Mock).mock.calls[0][1]).toMatchObject({ widgetTypes: ['todo', 'schedule'], force: true });
    expect(result).toMatchObject({ ok: true, eventId: '77' });
  });
});
