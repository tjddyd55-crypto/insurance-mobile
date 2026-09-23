import {
  TODO_EDIT_ROUTE_NAME,
  todoEditPath,
  todoEditScreenId,
  todoEditSingularId,
} from '../todoNavigation';
import {
  resolveTodoFormSession,
  todoFormDraftFromRecord,
} from '../todoFormSession';

describe('todo edit session', () => {
  test('treats each todo id as its own drawer screen', () => {
    const first = todoEditSingularId(TODO_EDIT_ROUTE_NAME, 'todo-a');
    const second = todoEditSingularId(TODO_EDIT_ROUTE_NAME, 'todo-b');

    expect(TODO_EDIT_ROUTE_NAME).toBe('todos/[todoId]/edit');
    expect(first).toBe('todos/[todoId]/edit/todo-a');
    expect(second).toBe('todos/[todoId]/edit/todo-b');
    expect(first).not.toBe(second);
  });

  test('keeps the same screen when the same todo is opened again', () => {
    const routeName = TODO_EDIT_ROUTE_NAME;
    expect(todoEditSingularId(routeName, 'todo-a')).toBe(todoEditSingularId(routeName, 'todo-a'));
    expect(resolveTodoFormSession('todo-a', 'todo-a')).toBe('keep');
  });

  test('drops the previous draft when a different todo is selected', () => {
    expect(resolveTodoFormSession('todo-a', 'todo-b')).toBe('reset');
    expect(resolveTodoFormSession(null, 'todo-b')).toBe('reset');
  });

  test('uses the latest id when the route param is a list', () => {
    expect(todoEditScreenId(['todo-a', 'todo-b'])).toBe('todo-b');
    expect(todoEditScreenId('  todo-c  ')).toBe('todo-c');
    expect(todoEditScreenId('')).toBeUndefined();
    expect(todoEditScreenId(['', '   '])).toBeUndefined();
    expect(todoEditSingularId(TODO_EDIT_ROUTE_NAME, undefined)).toBe(TODO_EDIT_ROUTE_NAME);
  });

  test('builds the edit path and draft from the newly selected todo', () => {
    expect(todoEditPath('todo-b')).toBe('/todos/todo-b/edit');
    expect(todoEditPath('todo-b')).not.toBe(todoEditPath('todo-a'));

    const draft = todoFormDraftFromRecord({
      description: '',
      title: '두번째 할 일',
      dueDate: '2026-09-02',
      relatedEntityType: 'customer',
      relatedEntityId: '9',
      customerName: '김고객',
    });

    expect(draft).toEqual({
      description: '두번째 할 일',
      dueDate: '2026-09-02',
      relatedCustomerId: '9',
      relatedCustomerName: '김고객',
    });
  });

  test('links a customer only when the selected todo relation is a customer', () => {
    const draft = todoFormDraftFromRecord({
      description: '본문',
      title: '제목',
      dueDate: null,
      relatedEntityType: 'document',
      relatedEntityId: '44',
      customerName: '홍길동',
    });

    expect(draft.description).toBe('본문');
    expect(draft.dueDate).toBe('');
    expect(draft.relatedCustomerId).toBe('');
    expect(draft.relatedCustomerName).toBe('홍길동');
  });
});
