import {
  buildCustomerWorkspaceActions,
  resolveCustomerWorkspaceActionHref,
} from '../../customers/customerWorkspaceActions';
import { seedTodoCreateForm } from '../consultationTodoCreate';
import {
  CUSTOMER_ADD_TODO_LABEL,
  customerTodoCreateRoute,
  customerTodoDateLine,
  customerTodoEditRoute,
  customerTodosListParams,
  onlyCustomerTodos,
  sortCustomerTodos,
  validCustomerId,
} from '../customerTodos';
import { leaveTodoForm, POP_TODO_STACK_TO_LIST, todoReturnSource } from '../todoNavigation';
import { listTodos } from '../todosApi';
import type { TodoRecord } from '../types';

jest.mock('../../../api/client', () => ({
  ApiError: class ApiError extends Error {},
  apiRequest: jest.fn().mockResolvedValue({ data: [] }),
}));
const { apiRequest } = jest.requireMock('../../../api/client');

function todo(partial: Partial<TodoRecord>): TodoRecord {
  return {
    id: '1', tenantId: null, gaId: 1, ownerUserId: 'u', assigneeUserId: null, title: 't', description: 't',
    dueDate: null, dueTime: null, status: 'pending', priority: 'normal', sourceType: 'manual', sourceId: null,
    relatedEntityType: 'customer', relatedEntityId: '12', metadata: null, createdAt: null, updatedAt: null,
    completedAt: null, canceledAt: null, customerName: null, ...partial,
  };
}

describe('고객 상세 할 일 버튼', () => {
  it('노출 버튼은 10개(짝수)라 시뮬레이션이 2열을 차지하지 않고 할 일이 옆 칸에 온다', () => {
    const ids = buildCustomerWorkspaceActions('홍길동').map((a) => a.id);
    expect(ids).toHaveLength(10);
    expect(ids.length % 2).toBe(0);
    expect(ids.slice(-2)).toEqual(['coverageSimulations', 'todos']);
    const todos = buildCustomerWorkspaceActions('홍길동').find((a) => a.id === 'todos');
    expect(todos?.label).toBe('할 일');
    expect(todos?.accessibilityLabel).toBe('홍길동 고객 할 일');
  });

  it('할 일 버튼은 고객 할 일 화면으로 간다', () => {
    expect(resolveCustomerWorkspaceActionHref(12, 'todos')).toBe('/customers/12/todos');
  });
});

describe('고객 할 일 목록', () => {
  it('서버 customerId 필터로 조회한다', async () => {
    expect(customerTodosListParams(12)).toEqual({ customerId: '12' });
    await listTodos('tok', customerTodosListParams(12));
    expect(apiRequest).toHaveBeenCalledWith('/api/todos?customerId=12', expect.anything());
  });

  it('다른 고객·비고객 할 일은 섞이지 않는다', () => {
    const rows = [
      todo({ id: 'a' }),
      todo({ id: 'b', relatedEntityId: '13' }),
      todo({ id: 'c', relatedEntityType: null, relatedEntityId: null }),
      todo({ id: 'd', relatedEntityId: ' 12 ' }),
      todo({ id: 'e', relatedEntityType: 'document', relatedEntityId: '12' }),
    ];
    expect(onlyCustomerTodos(rows, 12).map((t) => t.id)).toEqual(['a', 'd']);
  });

  it('미완료 먼저, 완료도 보이며 같은 상태 안 순서는 유지', () => {
    const rows = [
      todo({ id: '1', status: 'completed' }),
      todo({ id: '2', status: 'pending' }),
      todo({ id: '3', status: 'canceled' }),
      todo({ id: '4', status: 'pending' }),
      todo({ id: '5', status: 'completed' }),
    ];
    expect(sortCustomerTodos(rows).map((t) => t.id)).toEqual(['2', '4', '1', '5', '3']);
  });

  it('날짜만 날짜 라벨로 보인다', () => {
    expect(customerTodoDateLine({ dueDate: '2026-10-25' })).toMatch(/^날짜 /);
    expect(customerTodoDateLine({ dueDate: '2026-10-25' })).not.toMatch(/대기|완료|:/);
    expect(CUSTOMER_ADD_TODO_LABEL).toBe('+ 할 일 추가');
  });

  it('숫자 고객 id만 인정', () => {
    expect(validCustomerId('12')).toBe('12');
    expect(validCustomerId(['1', '7'])).toBe('7');
    expect(validCustomerId('0')).toBeUndefined();
    expect(validCustomerId('abc')).toBeUndefined();
    expect(validCustomerId(undefined)).toBeUndefined();
  });
});

describe('고객 고정 할 일 추가', () => {
  it('기존 TodoForm 초안에 고객이 고정되고 출처는 manual', () => {
    const route = customerTodoCreateRoute({ customerId: 12, customerName: '홍길동' });
    expect(route).toEqual({ pathname: '/todos/new', params: { customerId: '12', from: 'customer' } });
    const seed = seedTodoCreateForm(undefined, '2026-10-30', new Date('2026-10-25T00:00:00Z'), '12');
    expect(seed.lockedCustomer).toBe(true);
    expect(seed.draft.relatedCustomerId).toBe('12');
    expect(seed.draft.relatedCustomerName).toBe('홍길동');
    expect(seed.draft.dueDate).toBe('2026-10-30');
    expect(seed.source).toEqual({ sourceType: 'manual', sourceId: null });
  });

  it('고객 없이 열면 기존처럼 잠금 없음', () => {
    const seed = seedTodoCreateForm(undefined, undefined, new Date('2026-10-25T00:00:00Z'));
    expect(seed.lockedCustomer).toBe(false);
    expect(seed.draft.relatedCustomerId).toBe('');
  });

  it('수정 경로도 고객 복귀 정보를 가진다', () => {
    expect(customerTodoEditRoute('t9', 12)).toEqual({
      pathname: '/todos/[todoId]/edit',
      params: { todoId: 't9', customerId: '12', from: 'customer' },
    });
  });
});

describe('저장·수정·완료·삭제 후 복귀', () => {
  it('from=customer 는 같은 고객 할 일 화면으로 돌아간다', () => {
    const source = todoReturnSource('customer', '12');
    expect(source).toEqual({ kind: 'customer', customerId: '12' });
    const dispatch = jest.fn();
    const router = { replace: jest.fn(), push: jest.fn() };
    leaveTodoForm(
      { getState: () => ({ type: 'stack', index: 1, routeNames: ['index', 'new', '[todoId]/edit'] }), dispatch },
      router,
      source,
    );
    expect(dispatch).toHaveBeenCalledWith(POP_TODO_STACK_TO_LIST);
    expect(router.replace).toHaveBeenCalledWith('/customers/12/todos');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('고객 id 가 없거나 이상하면 기존 할 일 목록 규칙', () => {
    expect(todoReturnSource('customer', undefined)).toBe('todos');
    expect(todoReturnSource('customer', 'x')).toBe('todos');
    expect(todoReturnSource(undefined, '12')).toBe('todos');
  });
});
