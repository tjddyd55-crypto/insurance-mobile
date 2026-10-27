/**
 * 위젯(src=widget)에서 연 할 일·일정은 저장/취소/뒤로 에서 홈(위젯)으로 돌아간다.
 * 앱 안에서 연 흐름은 leaveTodoForm 그대로다. 앱을 종료(exit/kill)하지 않는다.
 */
import { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { router, Tabs, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { armScheduleTodoReturn, leaveTodoForm, todoReturnSource } from '../../todos/todoNavigation';
import {
  applyTodoWidgetExit,
  isEditOnlyTodoStack,
  leaveTodoOpenedFromWidget,
  planTodoWidgetExit,
  type TodoStackSnapshot,
  type TodoWidgetNavigation,
} from '../../todos/todoWidgetReturn';
import { setWidgetNativeForTests } from '../widgetBridge';
import {
  beginStashedWidgetOpen,
  clearWidgetOrigin,
  drawerHasPreviousRoute,
  INITIAL_SCHEDULE_WIDGET_FLOW,
  isPendingWidgetOrigin,
  isWarmStart,
  isWidgetOrigin,
  observeAppPath,
  planScheduleWidgetExit,
  reduceScheduleWidgetFlow,
  resetWidgetReturnForTests,
  returnToWidget,
  scheduleModalsOpen,
  shouldStartScheduleWidgetFlow,
  widgetEntryId,
  type ScheduleWidgetFlow,
} from '../widgetReturn';

jest.mock('../engine/widgetRefreshCoordinator', () => ({
  refreshWidgets: jest.fn(async () => ({})),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { refreshWidgets } = require('../engine/widgetRefreshCoordinator') as { refreshWidgets: jest.Mock };

declare const __dirname: string;
const fs = jest.requireActual<{ readdirSync: (dir: string, options: { withFileTypes: true }) => { name: string; isDirectory: () => boolean }[]; readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const repo = path.join(__dirname, '..', '..', '..', '..');

const moveNative = jest.fn(async () => true);
const calls: string[] = [];

const session = { token: 't', user: { id: 'u', gaId: 1 } };
const widgetTodo = { src: 'widget', wt: 'todo', _w: 'n1' };
const todoNames = ['index', 'new', '[todoId]/edit'];

function stack(index: number, routes: { name: string }[]): TodoStackSnapshot {
  return { type: 'stack', index, routeNames: todoNames, routes };
}

function navigationOf(
  state: TodoStackSnapshot,
  parent?: { goBack: jest.Mock; getState: () => { history?: { type?: string; key?: string }[] } },
): TodoWidgetNavigation {
  return {
    getState: () => state,
    dispatch: jest.fn(),
    getParent: () => parent,
  };
}

beforeEach(() => {
  (Platform as { OS: string }).OS = 'android';
  calls.length = 0;
  moveNative.mockReset();
  moveNative.mockImplementation(async () => {
    calls.push('move');
    return true;
  });
  refreshWidgets.mockReset();
  refreshWidgets.mockImplementation(async () => {
    calls.push('refresh');
    return {};
  });
  resetWidgetReturnForTests();
  setWidgetNativeForTests({
    configure: async () => undefined,
    writeEnvelope: async () => true,
    readEnvelope: async () => null,
    clearAll: async () => undefined,
    installedWidgetTypes: async () => ['todo', 'schedule'],
    moveTaskToBack: moveNative,
  });
});

describe('widget origin', () => {
  it('src=widget 만 위젯 출처이고, 처리한 nonce 는 다시 쓰지 않는다', async () => {
    expect(isWidgetOrigin({ src: 'widget' })).toBe(true);
    expect(isWidgetOrigin({ src: ['app', 'widget'] })).toBe(true);
    expect(isWidgetOrigin({ from: 'schedule' })).toBe(false);
    expect(isWidgetOrigin({})).toBe(false);
    expect(widgetEntryId(widgetTodo)).toBe('todo|n1');
    expect(isPendingWidgetOrigin(widgetTodo)).toBe(true);
    clearWidgetOrigin(widgetEntryId(widgetTodo));
    expect(isWidgetOrigin(widgetTodo)).toBe(true);
    expect(isPendingWidgetOrigin(widgetTodo)).toBe(false);
    expect(isPendingWidgetOrigin({ src: 'widget', wt: 'todo', _w: 'n2' })).toBe(true);
  });

  it('records a warm start only when an in-app screen was already showing', () => {
    observeAppPath('/todos/1/edit', widgetTodo);
    expect(isWarmStart()).toBe(false);
    observeAppPath('/schedule', {});
    observeAppPath('/todos/1/edit', widgetTodo);
    expect(isWarmStart()).toBe(true);
    resetWidgetReturnForTests();
    beginStashedWidgetOpen();
    observeAppPath('/', {});
    observeAppPath('/todos/1/edit', { src: 'widget', wt: 'todo' });
    expect(isWarmStart()).toBe(false);
  });
});

describe('returnToWidget', () => {
  it('refreshes the matching widget before moving the task back on save', async () => {
    await returnToWidget({ saved: true, widgetType: 'todo', session, entryId: 'todo|n1' });
    expect(calls).toEqual(['refresh', 'move']);
    expect(refreshWidgets).toHaveBeenCalledWith(session, { reason: 'appMutation', widgetTypes: ['todo'], force: true });
    expect(isPendingWidgetOrigin({ ...widgetTodo })).toBe(false);
  });

  it('does not refresh on cancel, and skips refresh when there is no session', async () => {
    await returnToWidget({ saved: false, widgetType: 'schedule', session, entryId: 'schedule|a' });
    expect(calls).toEqual(['move']);
    await returnToWidget({ saved: true, widgetType: 'todo', session: null, entryId: 'todo|b' });
    expect(refreshWidgets).not.toHaveBeenCalled();
  });

  it('returns false on an old binary without moveTaskToBack', async () => {
    setWidgetNativeForTests({
      configure: async () => undefined,
      writeEnvelope: async () => true,
      readEnvelope: async () => null,
      clearAll: async () => undefined,
      installedWidgetTypes: async () => [],
    });
    await expect(returnToWidget({ saved: false, widgetType: 'todo', session, entryId: 'todo|old' })).resolves.toBe(false);
    setWidgetNativeForTests(null);
    await expect(returnToWidget({ saved: false, widgetType: 'todo', session, entryId: 'todo|none' })).resolves.toBe(false);
  });
});

describe('todo stack plan', () => {
  const editOnly = stack(0, [{ name: '[todoId]/edit' }]);
  const listUnderEdit = stack(1, [{ name: 'index' }, { name: '[todoId]/edit' }]);

  it('cold edit-only stack is replaced with the list', () => {
    expect(isEditOnlyTodoStack(editOnly)).toBe(true);
    expect(planTodoWidgetExit({ warm: false, stack: editOnly, drawerHasPrevious: false })).toEqual({
      popToList: false,
      replaceWithList: true,
      restorePrevious: false,
    });
  });

  it('cold create-only stack (route new) is also replaced with the list', () => {
    const createOnly = stack(0, [{ name: 'new' }]);
    expect(isEditOnlyTodoStack(createOnly)).toBe(true);
    expect(planTodoWidgetExit({ warm: false, stack: createOnly, drawerHasPrevious: false })).toEqual({
      popToList: false,
      replaceWithList: true,
      restorePrevious: false,
    });
  });

  it('collapses to the list when the list is already underneath', () => {
    expect(planTodoWidgetExit({ warm: false, stack: listUnderEdit, drawerHasPrevious: true })).toEqual({
      popToList: true,
      replaceWithList: false,
      restorePrevious: false,
    });
  });

  it('warm start restores the previous screen and still collapses the todo stack', () => {
    expect(planTodoWidgetExit({ warm: true, stack: listUnderEdit, drawerHasPrevious: true })).toEqual({
      popToList: true,
      replaceWithList: false,
      restorePrevious: true,
    });
    expect(planTodoWidgetExit({ warm: true, stack: editOnly, drawerHasPrevious: false }).restorePrevious).toBe(false);
  });

  it('applies pop, replace, and drawer back in that order', () => {
    const goBack = jest.fn();
    const navigation = navigationOf(listUnderEdit, { goBack, getState: () => ({ history: [{ key: 'home' }, { key: 'todo' }] }) });
    const replace = jest.fn();
    applyTodoWidgetExit(navigation, { replace }, { popToList: true, replaceWithList: false, restorePrevious: true });
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP' });
    expect(replace).not.toHaveBeenCalled();
    expect(goBack).toHaveBeenCalledTimes(1);
    const cold = navigationOf(editOnly);
    applyTodoWidgetExit(cold, { replace }, { popToList: false, replaceWithList: true, restorePrevious: false });
    expect(replace).toHaveBeenCalledWith('/todos');
    const warmEdit = navigationOf(stack(0, [{ name: '[todoId]/edit' }]), {
      goBack,
      getState: () => ({ history: [{ key: 'home' }, { key: 'schedule' }] }),
    });
    applyTodoWidgetExit(warmEdit, { replace }, { popToList: false, replaceWithList: true, restorePrevious: true });
    expect(warmEdit.dispatch).toHaveBeenCalledWith({ type: 'RESET', payload: { index: 0, routes: [{ name: 'index' }] } });
    expect(goBack).toHaveBeenCalledTimes(2);
  });
});

describe('leaveTodoOpenedFromWidget', () => {
  it('save moves back after refresh; a second leave on the same entry falls back in-app', async () => {
    const navigation = navigationOf(stack(0, [{ name: '[todoId]/edit' }]));
    const replace = jest.fn();
    const fallback = jest.fn();
    await leaveTodoOpenedFromWidget({
      params: widgetTodo,
      navigation,
      router: { replace },
      saved: true,
      widgetType: 'todo',
      session,
      fallback,
    });
    expect(calls).toEqual(['refresh', 'move']);
    expect(replace).toHaveBeenCalledWith('/todos');
    expect(fallback).not.toHaveBeenCalled();
    await leaveTodoOpenedFromWidget({
      params: widgetTodo,
      navigation,
      router: { replace },
      saved: false,
      widgetType: 'todo',
      session,
      fallback,
    });
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['refresh', 'move']);
  });

  it('cancel does not refresh, and a failed move falls back without changing the stack', async () => {
    moveNative.mockImplementation(async () => {
      calls.push('move');
      return false;
    });
    const navigation = navigationOf(stack(1, [{ name: 'index' }, { name: '[todoId]/edit' }]));
    const replace = jest.fn();
    const fallback = jest.fn();
    await leaveTodoOpenedFromWidget({
      params: { src: 'widget', wt: 'todo', _w: 'cancel' },
      navigation,
      router: { replace },
      saved: false,
      widgetType: 'todo',
      session,
      fallback,
    });
    expect(calls).toEqual(['move']);
    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('warm start restores the previous drawer route after the task moves back', async () => {
    observeAppPath('/schedule', {});
    const goBack = jest.fn();
    const navigation = navigationOf(stack(1, [{ name: 'index' }, { name: '[todoId]/edit' }]), {
      goBack,
      getState: () => ({ history: [{ key: 'home' }, { key: 'schedule' }] }),
    });
    await leaveTodoOpenedFromWidget({
      params: { src: 'widget', wt: 'todo', _w: 'warm' },
      navigation,
      router: { replace: jest.fn() },
      saved: false,
      widgetType: 'todo',
      session,
      fallback: jest.fn(),
    });
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP' });
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(drawerHasPreviousRoute({ history: [{ key: 'home' }, { key: 'schedule' }] })).toBe(true);
  });
});

function play(events: Parameters<typeof reduceScheduleWidgetFlow>[1][]): { flow: ScheduleWidgetFlow; effects: string[]; saved: boolean[] } {
  let flow = INITIAL_SCHEDULE_WIDGET_FLOW;
  const effects: string[] = [];
  const saved: boolean[] = [];
  for (const event of events) {
    const next = reduceScheduleWidgetFlow(flow, event);
    flow = next.flow;
    effects.push(next.effect);
    saved.push(next.saved);
  }
  return { flow, effects, saved };
}

describe('schedule modal flow', () => {
  const link = { type: 'link' as const, entryId: 'schedule|w' };
  const open = { type: 'modals' as const, open: true };
  const close = { type: 'modals' as const, open: false };

  it('starts only for a widget detail or add link', () => {
    expect(shouldStartScheduleWidgetFlow({ src: 'widget' }, { itemId: 'e1', create: false })).toBe(true);
    expect(shouldStartScheduleWidgetFlow({ src: 'widget' }, { itemId: null, create: true })).toBe(true);
    expect(shouldStartScheduleWidgetFlow({ src: 'widget' }, { itemId: null, create: false })).toBe(false);
    expect(shouldStartScheduleWidgetFlow({}, { itemId: 'e1', create: true })).toBe(false);
    expect(scheduleModalsOpen({ detail: false, form: true, task: false, deleting: false })).toBe(true);
  });

  it.each([
    { action: 'cancel', events: [link, open, close], effect: 'return', saved: false },
    { action: 'back', events: [link, open, close], effect: 'return', saved: false },
    { action: 'save', events: [link, open, { type: 'mark-saved' as const }, close], effect: 'return', saved: true },
    { action: 'delete', events: [link, open, { type: 'mark-saved' as const }, close], effect: 'return', saved: true },
  ])('widget $action closes the last modal and returns (saved=$saved)', ({ events, effect, saved }) => {
    const played = play(events);
    expect(played.effects.at(-1)).toBe(effect);
    expect(played.saved.at(-1)).toBe(saved);
    expect(played.flow.active).toBe(false);
  });

  it('in-app open and close never returns to the widget', () => {
    const played = play([open, { type: 'mark-saved' }, close]);
    expect(played.effects).toEqual(['none', 'none', 'none']);
  });

  it('does not return before the widget modal has opened, then returns once', () => {
    const played = play([link, close, open, close, close]);
    expect(played.effects).toEqual(['none', 'none', 'none', 'return', 'none']);
  });

  it('navigating on to a customer or todo screen ends the flow', () => {
    const played = play([link, open, { type: 'navigate-away' }, close]);
    expect(played.effects).toEqual(['none', 'none', 'end', 'none']);
    expect(played.flow.active).toBe(false);
  });

  it('warm schedule restores the previous screen; cold schedule stays', () => {
    expect(planScheduleWidgetExit(true, true)).toEqual({ restorePrevious: true });
    expect(planScheduleWidgetExit(false, true)).toEqual({ restorePrevious: false });
    expect(planScheduleWidgetExit(true, false)).toEqual({ restorePrevious: false });
  });
});

describe('router: widget vs in-app leave', () => {
  const appDir = path.join(repo, 'app', '(app)');

  function DrawerLayout() {
    const source = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
    const match = source.match(/backBehavior="([a-zA-Z]+)"/);
    return <Tabs backBehavior={(match?.[1] ?? 'firstRoute') as 'history'} screenOptions={{ headerShown: false }} />;
  }

  function TodoEditStub() {
    const navigation = useNavigation();
    const appRouter = useRouter();
    const params = useLocalSearchParams<{ from?: string; src?: string; wt?: string; _w?: string }>();
    const [label, setLabel] = useState('TODO_EDIT');
    const leave = async (saved: boolean) => {
      if (!isWidgetOrigin(params)) {
        leaveTodoForm(navigation as never, appRouter, todoReturnSource(params.from));
        return;
      }
      await leaveTodoOpenedFromWidget({
        params,
        navigation: navigation as unknown as TodoWidgetNavigation,
        router: appRouter,
        saved,
        widgetType: params.wt === 'schedule' ? 'schedule' : 'todo',
        session,
        fallback: () => leaveTodoForm(navigation as never, appRouter, todoReturnSource(params.from)),
      });
      setLabel('LEFT');
    };
    return (
      <>
        <Text>{label}</Text>
        <Pressable onPress={() => void leave(false)}><Text>CANCEL</Text></Pressable>
        <Pressable onPress={() => void leave(true)}><Text>SAVE</Text></Pressable>
        <Pressable onPress={() => void leave(true)}><Text>DELETE</Text></Pressable>
        <Pressable onPress={() => void leave(false)}><Text>BACK</Text></Pressable>
      </>
    );
  }

  const leaf = (name: string) => {
    const Leaf = () => <Text>{name}</Text>;
    Leaf.displayName = `Leaf(${name})`;
    return Leaf;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const todosLayout = require('../../../../app/(app)/todos/_layout');
  const routes = () => ({
    _layout: DrawerLayout,
    index: leaf('HOME'),
    'schedule/index': leaf('SCHEDULE'),
    'todos/_layout': { default: todosLayout.default, unstable_settings: todosLayout.unstable_settings },
    'todos/index': leaf('TODO_LIST'),
    'todos/new': TodoEditStub,
    'todos/[todoId]/edit': TodoEditStub,
  });
  const pathname = () => (screen as unknown as { getPathname: () => string }).getPathname();
  const go = (href: string) => act(() => router.push(href as never));
  const press = async (label: string) => {
    fireEvent.press(screen.getByText(label));
    await waitFor(() => {
      expect(pathname()).not.toContain('/edit');
    });
  };

  it.each(['CANCEL', 'BACK'])('in-app from schedule: %s returns to schedule and does not move the task back', async (action) => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/schedule');
    armScheduleTodoReturn('2026-10-21');
    go('/todos/7/edit?from=schedule');
    await press(action);
    expect(pathname()).toBe('/schedule');
    expect(moveNative).not.toHaveBeenCalled();
    expect(refreshWidgets).not.toHaveBeenCalled();
  });

  it('in-app from the todo list: SAVE returns to the list', async () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/todos');
    go('/todos/3/edit');
    await press('SAVE');
    expect(pathname()).toBe('/todos');
    expect(screen.getByText('TODO_LIST')).toBeTruthy();
    expect(moveNative).not.toHaveBeenCalled();
  });

  it.each(['SAVE', 'DELETE'])('widget cold start: %s refreshes, moves back, and leaves the list', async (action) => {
    renderRouter(routes(), { initialUrl: '/todos/9/edit?src=widget&wt=todo&_w=cold-' + action });
    await press(action);
    expect(calls[0]).toBe('refresh');
    expect(calls).toContain('move');
    expect(pathname()).toBe('/todos');
    expect(screen.getByText('TODO_LIST')).toBeTruthy();
  });

  it.each(['CANCEL', 'BACK'])('widget cold start: %s moves back without refresh and leaves the list', async (action) => {
    renderRouter(routes(), { initialUrl: `/todos/9/edit?src=widget&wt=todo&_w=cold-${action}` });
    await press(action);
    expect(refreshWidgets).not.toHaveBeenCalled();
    expect(moveNative).toHaveBeenCalledTimes(1);
    expect(pathname()).toBe('/todos');
  });

  it.each(['SAVE', 'DELETE'])('widget cold start create: %s refreshes and leaves the list', async (action) => {
    renderRouter(routes(), { initialUrl: `/todos/new?src=widget&wt=todo&_w=create-${action}` });
    fireEvent.press(screen.getByText(action));
    await waitFor(() => expect(pathname()).toBe('/todos'));
    expect(calls[0]).toBe('refresh');
    expect(calls).toContain('move');
    expect(screen.getByText('TODO_LIST')).toBeTruthy();
  });

  it.each(['CANCEL', 'BACK'])('widget cold start create: %s moves back without refresh', async (action) => {
    renderRouter(routes(), { initialUrl: `/todos/new?src=widget&wt=todo&_w=create-${action}` });
    fireEvent.press(screen.getByText(action));
    await waitFor(() => expect(pathname()).toBe('/todos'));
    expect(refreshWidgets).not.toHaveBeenCalled();
    expect(moveNative).toHaveBeenCalledTimes(1);
  });

  it('widget warm start: cancel moves home without using drawer history', async () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/schedule');
    observeAppPath('/schedule', {});
    go('/todos/7/edit?src=widget&wt=todo&_w=warm-1');
    await press('CANCEL');
    expect(moveNative).toHaveBeenCalledTimes(1);
    expect(refreshWidgets).not.toHaveBeenCalled();
    expect(pathname()).toBe('/');
    expect(screen.getByText('HOME')).toBeTruthy();
  });

  it('old binary falls back to in-app navigation', async () => {
    moveNative.mockImplementation(async () => false);
    renderRouter(routes(), { initialUrl: '/' });
    go('/schedule');
    armScheduleTodoReturn('2026-10-21');
    go('/todos/7/edit?src=widget&wt=todo&_w=old&from=schedule');
    await press('CANCEL');
    expect(pathname()).toBe('/schedule');
    expect(moveNative).toHaveBeenCalledTimes(1);
  });
});

describe('static guards', () => {
  const read = (file: string) => fs.readFileSync(file, 'utf8');
  const form = read(path.join(repo, 'src', 'features', 'todos', 'TodoFormScreen.tsx'));
  const schedule = read(path.join(repo, 'src', 'features', 'schedule', 'ScheduleScreen.tsx'));
  const kotlin = read(path.join(repo, 'modules', 'onefc-home-widgets', 'android', 'src', 'main', 'java', 'expo', 'modules', 'onefchomewidgets', 'OnefcHomeWidgetsModule.kt'));
  const layout = read(path.join(repo, 'app', '_layout.tsx'));

  it('TodoFormScreen branches only at leave and otherwise calls leaveTodoForm', () => {
    expect(form).toMatch(/if \(!isWidgetOrigin\(params\)\) \{\s*leaveInApp\(\);/);
    expect(form).toMatch(/leaveTodoForm\(/);
    expect(form).toMatch(/leave\(true\)/);
    expect(form).toMatch(/leave\(false\)/);
    expect(form).toMatch(/hardwareBackPress[\s\S]*requestBack\(\)/);
    expect(form).toMatch(/onBackPress=\{requestBack\}/);
    expect(form).toMatch(/const requestBack = useCallback\(\(\) => \{[\s\S]*leave\(false\)/);
    expect(form).not.toMatch(/router\.replace\(/);
    expect(form).not.toMatch(/router\.back\(/);
  });

  it('ScheduleScreen arms only from the link effect, refreshes on save, and ends on navigation', () => {
    const linkEffect = schedule.slice(schedule.indexOf('useEffect(() => {\n    if (!linkTarget.date)'), schedule.indexOf('const query = useQuery'));
    const after = schedule.slice(schedule.indexOf('const afterWrite'), schedule.indexOf('const save = useMutation'));
    const open = schedule.slice(schedule.indexOf('const openRoute'), schedule.indexOf('const openCreate'));
    expect(linkEffect).toContain('armScheduleWidgetFlow');
    expect(after.indexOf('markScheduleWidgetSaved')).toBeGreaterThan(-1);
    expect(after.indexOf('markScheduleWidgetSaved')).toBeLessThan(after.indexOf('setFormState(null)'));
    expect(open.indexOf('endScheduleWidgetFlow')).toBeLessThan(open.indexOf('router.push'));
    // 일정 저장·삭제 2곳 (할 일 추가는 공통 Todo 폼 /todos/new 로 이동).
    expect(schedule.match(/onSuccess: afterWrite/g)).toHaveLength(2);
    expect(schedule).not.toMatch(/BackHandler|router\.replace|setTimeout/);
  });

  it('root layout remembers the in-app screen and skips the automatic home after login', () => {
    expect(layout).toContain('observeAppPath(pathname, searchParams)');
    expect(layout).toContain('beginStashedWidgetOpen()');
  });

  it('native moveTaskToBack does not finish or kill the activity', () => {
    expect(kotlin).toContain('moveTaskToBack(true)');
    expect(kotlin).not.toContain('finish(');
    expect(kotlin).not.toContain('kill');
  });

  it('the app never calls exit or kill', () => {
    // 유일한 예외(t595u): 홈 루트 '뒤로 2회 종료' 훅의 BackHandler.exitApp() 1회. 나머지 kill/exit 는 전부 금지.
    const ROOT_BACK_EXIT_HOOK = 'src/navigation/useRootBackExit.ts';
    const forbidden = [/exitApp/, /killProcess/, /System\.exit/, /finishAndRemoveTask/, /finishAffinity/];
    const files = collectSources(repo);
    const hits = files.filter((file) => {
      const source = read(file);
      if (file.replace(/\\/g, '/').endsWith(ROOT_BACK_EXIT_HOOK)) {
        const stripped = source.replace('leaveApp: () => BackHandler.exitApp(),', '');
        return forbidden.some((pattern) => pattern.test(stripped));
      }
      return forbidden.some((pattern) => pattern.test(source));
    });
    expect(hits).toEqual([]);
    const hook = files.find((file) => file.replace(/\\/g, '/').endsWith(ROOT_BACK_EXIT_HOOK));
    expect(hook).toBeDefined();
    expect(read(hook as string).match(/exitApp\(\)/g)).toHaveLength(1);
  });
});

function collectSources(root: string): string[] {
  const roots = ['src', 'app', 'modules/onefc-home-widgets'].map((dir) => path.join(root, dir));
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|kt|js)$/.test(entry.name)) files.push(full);
    }
  };
  roots.forEach(walk);
  return files;
}
