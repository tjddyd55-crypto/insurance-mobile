import type { TodoRecord } from './types';

export type TodoFormDraft = {
  description: string;
  dueDate: string;
  relatedCustomerId: string;
  relatedCustomerName: string;
};

export const EMPTY_TODO_FORM_DRAFT: TodoFormDraft = {
  description: '',
  dueDate: '',
  relatedCustomerId: '',
  relatedCustomerName: '',
};

export function cloneTodoFormDraft(draft: TodoFormDraft = EMPTY_TODO_FORM_DRAFT): TodoFormDraft {
  return { ...draft };
}

export function todoFormDraftFromRecord(
  todo: Pick<
    TodoRecord,
    'description' | 'title' | 'dueDate' | 'relatedEntityType' | 'relatedEntityId' | 'customerName'
  >,
): TodoFormDraft {
  return {
    description: todo.description.trim() || todo.title,
    dueDate: todo.dueDate ?? '',
    relatedCustomerId: todo.relatedEntityType === 'customer' ? todo.relatedEntityId ?? '' : '',
    relatedCustomerName: todo.customerName ?? '',
  };
}

/**
 * 같은 할 일을 다시 그리는 경우에는 작성 중인 초안을 유지한다.
 * 다른 할 일이 선택되면 이전 초안을 버려야 한다.
 */
export function resolveTodoFormSession(
  boundTodoId: string | null,
  nextTodoId: string,
): 'keep' | 'reset' {
  return boundTodoId === nextTodoId ? 'keep' : 'reset';
}
