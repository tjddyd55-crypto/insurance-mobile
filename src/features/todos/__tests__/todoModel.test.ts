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

  test('lists newest created todos first', () => {
    const rows = normalizeTodoList([
      { id: '1', title: 'older', created_at: '2026-10-01T01:00:00.000Z', updated_at: '2026-10-01T01:00:00.000Z' },
      { id: '2', title: 'newer', created_at: '2026-10-02T01:00:00.000Z', updated_at: '2026-10-02T01:00:00.000Z' },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['2', '1']);
  });

  test('moves an edited older todo above a newer unedited one', () => {
    const rows = normalizeTodoList([
      {
        id: 'newer',
        title: '미수정',
        createdAt: '2026-10-02T01:00:00.000Z',
        updatedAt: '2026-10-02T01:00:00.000Z',
      },
      {
        id: 'edited',
        title: '수정됨',
        createdAt: '2026-10-01T01:00:00.000Z',
        updatedAt: '2026-10-03T01:00:00.000Z',
      },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['edited', 'newer']);
  });

  test('breaks recent-write ties by createdAt then id', () => {
    const sameWrite = '2026-10-03T09:00:00.000Z';
    const rows = normalizeTodoList([
      { id: '2', title: 'a', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: sameWrite },
      { id: '10', title: 'b', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: sameWrite },
      { id: '3', title: 'c', createdAt: '2026-10-02T00:00:00.000Z', updatedAt: sameWrite },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['3', '10', '2']);
  });

  test('uses createdAt when updatedAt is missing', () => {
    const rows = normalizeTodoList([
      { id: 'old', title: 'a', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'new', title: 'b', createdAt: '2026-10-01T00:00:00.000Z' },
    ]);
    expect(rows.map((row) => row.id)).toEqual(['new', 'old']);
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
