/**
 * t402u — 일정 → ONE FC 할 일 열기 → 저장/취소 → 일정(보던 날짜 유지).
 * 실제 Drawer backBehavior, 실제 할 일 Stack _layout, 실제 leaveTodoForm 을 쓰고 화면만 stub.
 * TodoFormScreen 의 저장·취소·삭제·Android back 은 모두 leaveTodoForm 하나를 부른다(아래 정적 가드).
 */
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router, Tabs, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { leaveTodoForm, todoReturnSource } from '../../features/todos/todoNavigation';
import { todoRouteOfTask } from '../../features/schedule/scheduleModel';

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const repo = path.join(__dirname, '..', '..', '..');
const appDir = path.join(repo, 'app', '(app)');

function DrawerLayout() {
  const source = fs.readFileSync(path.join(appDir, '_layout.tsx'), 'utf8');
  const match = source.match(/backBehavior="([a-zA-Z]+)"/);
  return <Tabs backBehavior={(match?.[1] ?? 'firstRoute') as 'history'} screenOptions={{ headerShown: false }} />;
}

function ScheduleStub() {
  const [selected, setSelected] = useState('2026-10-01');
  return (
    <>
      <Text>SCHEDULE {selected}</Text>
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
const openFromSchedule = () => go(todoRouteOfTask({ source: 'onefc_todo', sourceId: '7' }));

describe('schedule -> ONE FC todo edit -> leave', () => {
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
    expect(form).toMatch(/invalidateQueries\(\{ queryKey: scheduleQueryKeys\.all \}\)/);
    expect(form).not.toMatch(/refresh: true/);
  });
});
