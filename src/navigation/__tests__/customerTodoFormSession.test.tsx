/**
 * 고객 → 고객 할 일 → '+ 할 일 추가' → 저장/취소/삭제 → 고객 할 일 → 다시 추가 = 빈 폼.
 * 실제 todos Stack 레이아웃 + TodoFormScreen 과 같은 key 규칙(customer:id:formSession)으로 검증한다.
 */
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router, Tabs, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { customerTodoCreateRoute, customerTodoEditRoute } from '../../features/todos/customerTodos';
import {
  isTodoStack,
  leaveTodoForm,
  RESET_TODO_STACK_TO_LIST,
  todoEditScreenId,
  todoReturnSource,
} from '../../features/todos/todoNavigation';

function FormBody() {
  const navigation = useNavigation();
  const appRouter = useRouter();
  const params = useLocalSearchParams<{ from?: string; customerId?: string }>();
  const [title, setTitle] = useState('');
  const [processing, setProcessing] = useState(false);
  const leave = () => leaveTodoForm(navigation as never, appRouter, todoReturnSource(params.from, params.customerId));
  return (
    <>
      <Text>{`FORM[${title}]${processing ? ' 처리 중' : ''}`}</Text>
      <Pressable onPress={() => setTitle('QA_t529_NATIVE_입력')}><Text>TYPE</Text></Pressable>
      <Pressable onPress={() => { setProcessing(true); leave(); }}><Text>SAVE</Text></Pressable>
      <Pressable onPress={leave}><Text>CANCEL</Text></Pressable>
      <Pressable onPress={() => { setProcessing(true); leave(); }}><Text>DELETE</Text></Pressable>
    </>
  );
}
function NewForm() {
  const p = useLocalSearchParams<{ customerId?: string; formSession?: string }>();
  // TodoFormScreen 의 create key 와 같은 규칙
  const key = p.customerId ? `customer:${p.customerId}:${todoEditScreenId(p.formSession) ?? ''}` : 'manual:';
  return <FormBody key={key} />;
}
function EditForm() {
  const p = useLocalSearchParams<{ todoId?: string }>();
  return <FormBody key={todoEditScreenId(p.todoId)} />;
}
function CustomerTodos() {
  return (
    <>
      <Text>CUSTOMER_TODOS</Text>
      <Pressable onPress={() => router.push(customerTodoCreateRoute({ customerId: 7 }) as never)}><Text>ADD</Text></Pressable>
      <Pressable onPress={() => router.push(customerTodoEditRoute('t1', 7) as never)}><Text>CARD</Text></Pressable>
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
  _layout: () => <Tabs backBehavior="firstRoute" screenOptions={{ headerShown: false }} />,
  index: leaf('HOME'),
  'customers/[customerId]/todos': CustomerTodos,
  'todos/_layout': { default: todosLayout.default, unstable_settings: todosLayout.unstable_settings },
  'todos/index': leaf('TODO_LIST'),
  'todos/new': NewForm,
  'todos/[todoId]/edit': EditForm,
});
const go = (href: unknown) => act(() => router.push(href as never));
const press = (label: string) => act(() => fireEvent.press(screen.getByText(label)));
const pathname = () => (screen as unknown as { getPathname: () => string }).getPathname();

describe('고객 할 일 신규 폼 세션', () => {
  it('누를 때마다 formSession 이 다르다', () => {
    const a = customerTodoCreateRoute({ customerId: 7 }).params.formSession;
    const b = customerTodoCreateRoute({ customerId: 7 }).params.formSession;
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it.each(['SAVE', 'CANCEL', 'DELETE'])('%s 후 다시 추가하면 빈 폼(처리 중 없음), 5회 반복', (action) => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/customers/7/todos');
    for (let i = 0; i < 5; i += 1) {
      press('ADD');
      expect(screen.getByText('FORM[]')).toBeTruthy();
      press('TYPE');
      press(action);
      expect(pathname()).toBe('/customers/7/todos');
      expect(screen.getByText('CUSTOMER_TODOS')).toBeTruthy();
    }
    press('ADD');
    expect(screen.getByText('FORM[]')).toBeTruthy();
    expect(screen.queryByText(/처리 중/)).toBeNull();
  });

  it('고객 흐름 저장 뒤 할 일 메뉴는 오래된 폼이 아니라 목록', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/customers/7/todos');
    press('ADD');
    press('TYPE');
    press('SAVE');
    go('/todos');
    expect(pathname()).toBe('/todos');
    expect(screen.getByText('TODO_LIST')).toBeTruthy();
    expect(screen.queryByText(/FORM\[/)).toBeNull();
  });

  it('고객 카드 → 수정 → 삭제 → 다시 추가는 빈 폼', () => {
    renderRouter(routes(), { initialUrl: '/' });
    go('/customers/7/todos');
    press('CARD');
    press('TYPE');
    press('DELETE');
    expect(pathname()).toBe('/customers/7/todos');
    press('ADD');
    expect(screen.getByText('FORM[]')).toBeTruthy();
  });
});

describe('leaveTodoForm 고객 분기', () => {
  const TODO = { type: 'stack', routeNames: ['index', 'new', '[todoId]/edit'] };
  it('폼이 할 일 스택 첫 화면(index 0)이어도 스택을 목록으로 리셋', () => {
    const dispatch = jest.fn();
    const r = { replace: jest.fn(), push: jest.fn() };
    leaveTodoForm({ getState: () => ({ ...TODO, index: 0 }), dispatch }, r, { kind: 'customer', customerId: '7' });
    expect(dispatch).toHaveBeenCalledWith(RESET_TODO_STACK_TO_LIST);
    expect(r.replace).toHaveBeenCalledWith('/customers/7/todos');
  });
  it('할 일 스택이 아니면 리셋하지 않는다', () => {
    expect(isTodoStack({ type: 'stack', index: 1, routeNames: ['(auth)', '(app)'] })).toBe(false);
    expect(isTodoStack({ type: 'drawer', index: 0, routeNames: ['index'] })).toBe(false);
  });
});
