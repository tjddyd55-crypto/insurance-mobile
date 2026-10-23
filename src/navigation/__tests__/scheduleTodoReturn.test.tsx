/**
 * 일정 → ONE FC 할 일 열기 → 저장/취소 → 일정.
 * Drawer 는 main 과 같이 backBehavior 를 지정하지 않는다(기본 firstRoute).
 * 복귀는 armScheduleTodoReturn + from=schedule + dismissTo 이고 Drawer history 가 아니다.
 */
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router, Tabs, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { armScheduleTodoReturn, leaveTodoForm, resetScheduleTodoReturnForTests, todoReturnSource } from '../../features/todos/todoNavigation';
import { todoRouteOfTask } from '../../features/schedule/scheduleModel';

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const repo = path.join(__dirname, '..', '..', '..');
const appDir = path.join(repo, 'app', '(app)');

function DrawerLayout() {
  const source = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
  if (/backBehavior=/.test(source)) {
    throw new Error('drawer backBehavior must stay at the main default');
  }
  return <Tabs backBehavior="firstRoute" screenOptions={{ headerShown: false }} />;
}

function ScheduleStub() {
  const params = useLocalSearchParams<{ date?: string }>();
  const [selected, setSelected] = useState('2026-10-01');
  const shown = (Array.isArray(params.date) ? params.date.at(-1) : params.date) || selected;
  return (
    <>
      <Text>SCHEDULE {shown}</Text>
      <Pressable onPress={() => setSelected('2026-10-20')}><Text>PICK_20</Text></Pressable>
    </>
  );
}
function TodoEditStub() {
  const navigation = useNavigation();
  const appRouter = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const leave = () => leaveTodoForm(navigation as never, appRouter, todoReturnSource(from));
  return (
    <>
      <Text>TODO_EDIT</Text>
      <Pressable onPress={leave}><Text>CANCEL</Text></Pressable>
      <Pressable onPress={leave}><Text>SAVE</Text></Pressable>
    </>
  );
}
const leaf = (name: string) => {
  const Leaf = () => <Text>{name}</Text>;
  Leaf.displayName = `Leaf(${name})`;
  return Leaf;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const todosLayout = require('../../../app/(app)/todos/_layout');
const routes = () => ({
  _layout: DrawerLayout,
  index: leaf('HOME'),
  'schedule/index': ScheduleStub,
  notifications: leaf('NOTIFICATIONS'),
  'todos/_layout': { default: todosLayout.default, unstable_settings: todosLayout.unstable_settings },
  'todos/index': leaf('TODO_LIST'),
  'todos/new': leaf('TODO_NEW'),
  'todos/[todoId]/edit': TodoEditStub,
});

const go = (href: unknown) => act(() => router.push(href as never));
const back = () => act(() => router.back());
const press = (label: string) => act(() => fireEvent.press(screen.getByText(label)));
const pathname = () => (screen as unknown as { getPathname: () => string }).getPathname();
const openFromSchedule = () => {
  armScheduleTodoReturn('2026-10-20');
  go(todoRouteOfTask({ source: 'onefc_todo', sourceId: '7' }));
};

describe('schedule -> ONE FC todo edit -> leave', () => {
  beforeEach(() => {
    resetScheduleTodoReturnForTests();
  });

  it.each(['CANCEL', 'SAVE'])('%s returns to schedule with the selected date kept', (action) => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/schedule');
    press('PICK_20');
    openFromSchedule();
    expect(pathname()).toBe('/todos/7/edit');
    press(action);
    expect(pathname()).toBe('/schedule');
    expect(screen.getByText('SCHEDULE 2026-10-20')).toBeTruthy();
    // 할 일 메뉴를 다시 열면 지난 수정 화면이 아니라 목록
    go('/todos');
    expect(screen.getByText('TODO_LIST')).toBeTruthy();
    // 일정에서 back 은 홈(할 일 수정이 다시 나오지 않음)
    go('/schedule');
    back();
    expect(pathname()).not.toBe('/todos/7/edit');
  });

  it('schedule back stack stays intact: schedule -> todo -> cancel -> back = home', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/schedule');
    openFromSchedule();
    press('CANCEL');
    back();
    expect(pathname()).toBe('/');
  });
});

describe('todo list -> edit -> leave = list (unchanged)', () => {
  it.each(['CANCEL', 'SAVE'])('%s returns to the todo list', (action) => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/schedule');
    go('/todos');
    go('/todos/3/edit');
    press(action);
    expect(pathname()).toBe('/todos');
    expect(screen.getByText('TODO_LIST')).toBeTruthy();
  });
});

describe('deep link / notification', () => {
  it('direct-open edit (even with from=schedule but no schedule in history) falls back to the todo list', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/notifications');
    go('/todos/9/edit?from=schedule');
    press('CANCEL');
    expect(pathname()).toBe('/todos');
  });
});

describe('static guards', () => {
  const form = fs.readFileSync(path.join(repo, 'src', 'features', 'todos', 'TodoFormScreen.tsx'), 'utf8');
  it('TodoFormScreen leaves only through leaveTodoForm (no unconditional /todos replace)', () => {
    expect(form).toMatch(/leaveTodoForm\(/);
    expect(form).not.toMatch(/router\.replace\(/);
    expect(form).not.toMatch(/returnToTodoList\(/);
  });
  it('todo save/delete also invalidates schedule queries (normal refetch, not refresh=1)', () => {
    expect(form).toContain('refreshScheduleSurfaces');
    const surfaces = fs.readFileSync(path.join(repo, 'src', 'features', 'home-widgets', 'refreshScheduleSurfaces.ts'), 'utf8');
    expect(surfaces).toMatch(/invalidateQueries\(\{ queryKey: scheduleQueryKeys\.all \}\)/);
    expect(form).not.toMatch(/refresh: true/);
  });
});
