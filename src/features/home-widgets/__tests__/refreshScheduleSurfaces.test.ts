import { QueryClient } from '@tanstack/react-query';

jest.mock('../engine/widgetRefreshCoordinator', () => ({ refreshWidgets: jest.fn(async () => ({ schedule: 'written', todo: 'written' })) }));

import { markScheduleTodoStatus, refreshScheduleSurfaces } from '../refreshScheduleSurfaces';
import { refreshWidgets } from '../engine/widgetRefreshCoordinator';
import { scheduleQueryKeys } from '../../schedule/queryKeys';
import type { ScheduleEventsResult } from '../../schedule/types';

const session = { token: 't', user: { id: 'u', gaId: 1 } };

function result(): ScheduleEventsResult {
  return {
    from: '2026-10-01',
    to: '2026-10-31',
    events: [],
    tasks: [
      { id: 'onefc_todo:7', source: 'onefc_todo', sourceId: '7', title: '서류', notes: '', dueDate: '2026-10-22', dueTime: null, status: 'open', customerId: null, customerName: '' },
    ],
    google: { connected: false, status: 'disconnected', connectAllowed: false, configured: false, write: { enabled: false, calendarWritable: false, tasksWritable: false, needsWriteConsent: false }, tasks: { status: 'disconnected', needsReconsent: false } },
    fetchedAt: '2026-10-22T00:00:00.000Z',
  };
}

describe('일정·위젯 갱신', () => {
  it('완료로 표시하면 일정 배지 대상에서 빠지고, 무효화와 위젯 갱신은 지연 없이 바로 한다', async () => {
    const client = new QueryClient();
    client.setQueryData(scheduleQueryKeys.range('2026-10-01', '2026-10-31'), result());
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    markScheduleTodoStatus(client, '7', 'completed');
    const cached = client.getQueryData<ScheduleEventsResult>(scheduleQueryKeys.range('2026-10-01', '2026-10-31'));
    expect(cached?.tasks[0]?.status).toBe('completed');
    await refreshScheduleSurfaces(client, session);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['schedule'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['todos'] });
    expect(refreshWidgets).toHaveBeenCalledWith(session, { reason: 'appMutation', widgetTypes: ['schedule', 'todo'], force: true });
  });
});
