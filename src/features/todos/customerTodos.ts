import { formatTodoDate } from './todoModel';
import type { ListTodosParams, TodoRecord, TodoStatus } from './types';

/** 고객 상세 > 할 일 화면의 추가 버튼. 웹 CustomerTodosPage와 같은 문구. */
export const CUSTOMER_ADD_TODO_LABEL = '+ 할 일 추가';

/** 라우트 파라미터 from 값: 고객 할 일 화면에서 연 추가/수정. */
export const TODO_RETURN_SOURCE_CUSTOMER = 'customer' as const;

export function customerTodosPath(customerId: number | string): `/customers/${string}/todos` {
  return `/customers/${String(customerId)}/todos`;
}

/** 숫자 고객 id만 인정한다(서버도 숫자가 아니면 400). */
export function validCustomerId(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value.at(-1) : value;
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;
  const text = String(raw).trim();
  return /^[1-9][0-9]*$/.test(text) ? text : undefined;
}

export function customerTodosListParams(customerId: number): ListTodosParams {
  return { customerId: String(customerId) };
}

/**
 * 서버 필터 결과를 한 번 더 확인한다. 고객 필터를 모르는 서버(구버전)가 전체 목록을 돌려줘도
 * 다른 고객의 할 일이 이 화면에 섞이지 않게 막는 안전장치이며, 서버 필터를 대신하지 않는다.
 */
export function onlyCustomerTodos(todos: TodoRecord[], customerId: number): TodoRecord[] {
  const id = String(customerId);
  return todos.filter(
    (todo) => todo.relatedEntityType === 'customer' && (todo.relatedEntityId ?? '').trim() === id,
  );
}

const STATUS_RANK: Record<TodoStatus, number> = { pending: 0, completed: 1, canceled: 2 };

/** 미완료 먼저, 완료(·취소)는 뒤. 같은 상태 안에서는 서버 순서(날짜순)를 유지한다. */
export function sortCustomerTodos(todos: TodoRecord[]): TodoRecord[] {
  return todos
    .map((todo, index) => ({ todo, index }))
    .sort((a, b) => (STATUS_RANK[a.todo.status] ?? 9) - (STATUS_RANK[b.todo.status] ?? 9) || a.index - b.index)
    .map(({ todo }) => todo);
}

/** 고객 할 일 화면은 날짜만 보인다(시간·상태 문구 없음). */
export function customerTodoDateLine(todo: Pick<TodoRecord, 'dueDate'>): string {
  return `날짜 ${formatTodoDate(todo.dueDate)}`;
}

export type CustomerTodoCreatePrefill = { customerId: string; customerName: string };

const stagedCustomers = new Map<string, string>();

let formSessionSeq = 0;

/** 고객 할 일 '+ 할 일 추가'를 누를 때마다 새 값. 신규 폼 key 에 들어가 이전 입력·저장 상태를 재사용하지 않는다. */
export function nextCustomerTodoFormSession(now = Date.now()): string {
  formSessionSeq += 1;
  return `${now.toString(36)}-${formSessionSeq}`;
}

export function customerTodoCreateRoute(input: { customerId: number; customerName?: string | null }): {
  pathname: '/todos/new';
  params: { customerId: string; from: typeof TODO_RETURN_SOURCE_CUSTOMER; formSession: string };
} {
  const customerId = String(input.customerId);
  stagedCustomers.set(customerId, input.customerName?.trim() ?? '');
  return { pathname: '/todos/new', params: { customerId, from: TODO_RETURN_SOURCE_CUSTOMER, formSession: nextCustomerTodoFormSession() } };
}

/** 고객이 고정된 추가 초안. 이름을 못 받았으면 `고객 #id`로 보인다. */
export function peekCustomerTodoCreate(customerId: string | undefined): CustomerTodoCreatePrefill | null {
  const id = validCustomerId(customerId);
  if (!id) return null;
  return { customerId: id, customerName: stagedCustomers.get(id) ?? '' };
}

export function customerTodoEditRoute(todoId: string, customerId: number): {
  pathname: '/todos/[todoId]/edit';
  params: { todoId: string; customerId: string; from: typeof TODO_RETURN_SOURCE_CUSTOMER };
} {
  return {
    pathname: '/todos/[todoId]/edit',
    params: { todoId, customerId: String(customerId), from: TODO_RETURN_SOURCE_CUSTOMER },
  };
}

/** 할 일 추가/수정 폼의 연결 고객 한 줄. 제목·보조 문구 없이 이것만 보인다. */
export function linkedCustomerLabel(name: string): string {
  return `선택됨 · ${name}`;
}
