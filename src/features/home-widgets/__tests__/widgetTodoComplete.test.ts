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
jest.mock('../../todos/todosApi', () => ({ completeTodo: jest.fn() }));
jest.mock('../engine/widgetRefreshCoordinator', () => ({ refreshWidgets: jest.fn(), purgeWidgets: jest.fn() }));

import { AppRegistry } from 'react-native';

import { ApiError } from '../../../api/client';
import { readAuthSession } from '../../../auth/secureStorage';
import { completeTodo } from '../../todos/todosApi';
import { refreshWidgets } from '../engine/widgetRefreshCoordinator';
import { setWidgetNativeForTests } from '../widgetBridge';
import { registerWidgetHeadlessTask } from '../widgetHeadlessTask';
import {
  runWidgetTodoComplete,
  validateTodoComplete,
  WIDGET_TODO_COMPLETE_TASK,
} from '../widgetTodoComplete';

const RID = 'b'.repeat(32);
const session = { token: 'tok', user: { id: 1 } };
const report = jest.fn(async () => true);

function lastReport() {
  const call = report.mock.calls.at(-1) as unknown as [string, string];
  return { requestId: call[0], body: JSON.parse(call[1]) };
}

beforeEach(() => {
  jest.clearAllMocks();
  setWidgetNativeForTests({ reportQuickAddResult: report } as never);
  (readAuthSession as jest.Mock).mockResolvedValue(session);
  (completeTodo as jest.Mock).mockResolvedValue({ id: '42', status: 'completed' });
  (refreshWidgets as jest.Mock).mockResolvedValue({ todo: 'written', schedule: 'written' });
});

afterAll(() => setWidgetNativeForTests(undefined));

describe('widget todo complete', () => {
  it('validates input', () => {
    expect(validateTodoComplete({ requestId: RID, todoId: '42' })).toEqual({ requestId: RID, todoId: '42' });
    expect(validateTodoComplete({ requestId: RID, todoId: ' 7 ' })).toEqual({ requestId: RID, todoId: '7' });
    expect(validateTodoComplete({ requestId: 'x', todoId: '42' })).toBeNull();
    expect(validateTodoComplete({ requestId: RID, todoId: '' })).toBeNull();
    expect(validateTodoComplete({ requestId: RID, todoId: 'bad id' })).toBeNull();
    expect(validateTodoComplete({ requestId: RID, todoId: '' })).toBeNull();
  });

  it('completes via existing API, refreshes widgets, reports ok', async () => {
    const result = await runWidgetTodoComplete({ requestId: RID, todoId: '42' });
    expect(completeTodo).toHaveBeenCalledWith('tok', '42');
    expect(refreshWidgets).toHaveBeenCalledWith(session, {
      reason: 'appMutation',
      widgetTypes: ['todo', 'schedule'],
      force: true,
    });
    expect(result).toEqual({ ok: true, requestId: RID, todoId: '42', refreshed: true });
    expect(lastReport()).toEqual({ requestId: RID, body: result });
  });

  it('does not mark complete when API fails', async () => {
    (completeTodo as jest.Mock).mockRejectedValue(new ApiError('거부', 400));
    const result = await runWidgetTodoComplete({ requestId: RID, todoId: '42' });
    expect(result).toMatchObject({ ok: false, code: 'server', message: '거부' });
    expect(refreshWidgets).not.toHaveBeenCalled();
  });

  it('logged out → login, no complete call', async () => {
    (readAuthSession as jest.Mock).mockResolvedValue(null);
    const result = await runWidgetTodoComplete({ requestId: RID, todoId: '42' });
    expect(result).toMatchObject({ ok: false, code: 'login' });
    expect(completeTodo).not.toHaveBeenCalled();
  });

  it('maps network errors', async () => {
    (completeTodo as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
    expect(await runWidgetTodoComplete({ requestId: RID, todoId: '42' })).toMatchObject({
      ok: false,
      code: 'network',
    });
  });

  it('still ok when refresh fails after complete', async () => {
    (refreshWidgets as jest.Mock).mockRejectedValue(new Error('x'));
    const result = await runWidgetTodoComplete({ requestId: RID, todoId: '42' });
    expect(result).toMatchObject({ ok: true, todoId: '42', refreshed: false });
  });

  it('registers the headless task', () => {
    registerWidgetHeadlessTask();
    const names = (AppRegistry.registerHeadlessTask as jest.Mock).mock.calls.map((c) => c[0]);
    expect(names).toContain(WIDGET_TODO_COMPLETE_TASK);
  });
});
