import { todoDisplayContent } from '../todoModel';
import {
  formatTodoCreatedDate,
  formatTodoDueLine,
  todoListEmptyCopy,
  todoRelatedDisplay,
  todoSourceLine,
  todoStatusTone,
} from '../todoPresentation';
import type { TodoRecord } from '../types';

const sample: TodoRecord = {
  id: '1',
  tenantId: null,
  gaId: null,
  ownerUserId: 'u',
  assigneeUserId: null,
  title: '제목',
  description: '고객에게 연락',
  dueDate: '2026-09-01',
  dueTime: '14:00',
  status: 'pending',
  priority: 'normal',
  sourceType: 'manual',
  sourceId: null,
  relatedEntityType: 'customer',
  relatedEntityId: '33',
  metadata: null,
  createdAt: '2026-08-31',
  updatedAt: null,
  completedAt: null,
  canceledAt: null,
  customerName: '홍길동',
};

describe('todoPresentation', () => {
  test('maps status to semantic tones', () => {
    expect(todoStatusTone('completed')).toBe('success');
    expect(todoStatusTone('canceled')).toBe('danger');
    expect(todoStatusTone('pending')).toBe('warning');
  });

  test('keeps list hierarchy copy aligned with mobile web', () => {
    expect(todoDisplayContent(sample)).toBe('고객에게 연락');
    expect(formatTodoCreatedDate(sample.createdAt)).toContain('2026-08-31');
    expect(formatTodoDueLine(sample)).toContain('마감');
    expect(formatTodoDueLine(sample)).toContain('14:00');
    expect(todoRelatedDisplay(sample)).toEqual({ label: '홍길동', customerId: '33' });
    expect(todoSourceLine(sample)).toBe('출처 직접 작성');
    expect(todoListEmptyCopy(false).title).toBe('표시할 할 일이 없습니다.');
  });
});
