import {
  buildTodoListParams,
  firstLineTodoTitle,
  formatTodoDate,
  isValidOptionalYmd,
  normalizeTodo,
  normalizeTodoList,
  suggestTodoDueDate,
  todoDisplayContent,
} from '../todoModel';

describe('todoModel', () => {
  test('normalizes snake_case API fields', () => {
    const todo = normalizeTodo({
      id: 'todo-1',
      ga_id: 12,
      title: '연락하기',
      description: '',
      due_date: '2026-09-01',
      source_type: 'customer_memo',
      related_entity_type: 'customer',
      related_entity_id: '33',
      customer_name: '홍길동',
      status: 'completed',
      priority: 'high',
    });
    expect(todo.gaId).toBe(12);
    expect(todo.sourceType).toBe('customer_memo');
    expect(todo.relatedEntityId).toBe('33');
    expect(todo.customerName).toBe('홍길동');
    expect(todo.status).toBe('completed');
  });

  test('normalizes array and wrapped list responses', () => {
    const raw = { id: '1', title: 'A' };
    expect(normalizeTodoList([raw])).toHaveLength(1);
    expect(normalizeTodoList({ data: [raw] })).toHaveLength(1);
  });

  test('maps UI filters to the server query contract', () => {
    expect(buildTodoListParams('today', 'yes', 'system')).toEqual({
      due: 'today',
      hasRelated: 'yes',
      sourceType: 'system',
    });
    expect(buildTodoListParams('open', 'any', 'all')).toEqual({ bucket: 'open' });
    expect(buildTodoListParams('overdue', 'no', 'all')).toEqual({
      overdue: 'true',
      hasRelated: 'no',
    });
  });

  test('uses description for display and first non-empty line for title', () => {
    expect(todoDisplayContent({ description: '본문', title: '제목' })).toBe('본문');
    expect(firstLineTodoTitle('\n  고객에게 연락하기\n추가')).toBe('고객에게 연락하기');
  });

  test('suggests Seoul due dates from today/tomorrow/day-after keywords', () => {
    const now = new Date('2026-08-31T03:00:00.000Z');
    expect(suggestTodoDueDate('오늘 연락', now)).toBe('2026-08-31');
    expect(suggestTodoDueDate('내일 연락', now)).toBe('2026-09-01');
    expect(suggestTodoDueDate('모레 연락', now)).toBe('2026-09-02');
    expect(suggestTodoDueDate('언젠가 연락', now)).toBeNull();
  });

  test('validates and formats date-only values', () => {
    expect(isValidOptionalYmd('')).toBe(true);
    expect(isValidOptionalYmd('2026-09-01')).toBe(true);
    expect(isValidOptionalYmd('2026-02-30')).toBe(false);
    expect(formatTodoDate('2026-09-01')).toContain('9월 1일');
  });
});
