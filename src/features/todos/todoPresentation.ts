import type { BadgeTone } from '../../design-system';
import { formatDeviceLocalYmd } from '../../utils/deviceLocalDate';
import { formatTodoDate, todoSourceLabel, todoStatusLabel } from './todoModel';
import type { TodoRecord, TodoStatus } from './types';

export function todoStatusTone(status: TodoStatus): BadgeTone {
  if (status === 'completed') return 'success';
  if (status === 'canceled') return 'danger';
  return 'warning';
}

export function formatTodoCreatedDate(value: string | null): string {
  if (!value) return '—';
  const ymd = formatDeviceLocalYmd(value);
  if (!ymd) return value;
  const weekday = weekdayLabel(ymd);
  return weekday ? `${ymd} (${weekday})` : ymd;
}

function weekdayLabel(ymd: string): string | null {
  const date = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
}

export function formatTodoDueLine(todo: Pick<TodoRecord, 'dueDate' | 'dueTime' | 'status'>): string {
  const due = formatTodoDate(todo.dueDate);
  const time = todo.dueTime?.trim();
  return `마감 ${due}${time ? ` ${time}` : ''} · ${todoStatusLabel(todo.status)}`;
}

export function todoRelatedDisplay(todo: Pick<TodoRecord, 'relatedEntityType' | 'relatedEntityId' | 'customerName'>): {
  label: string;
  customerId: string | null;
} {
  if (todo.relatedEntityType === 'customer' && todo.relatedEntityId) {
    return {
      label: todo.customerName?.trim() || `고객 #${todo.relatedEntityId}`,
      customerId: todo.relatedEntityId,
    };
  }
  if (todo.relatedEntityType || todo.relatedEntityId) {
    return {
      label: [todo.relatedEntityType ?? '—', todo.relatedEntityId ? `#${todo.relatedEntityId}` : '']
        .filter(Boolean)
        .join(' '),
      customerId: null,
    };
  }
  return { label: '연결 없음', customerId: null };
}

export function todoSourceLine(todo: Pick<TodoRecord, 'sourceType'>): string {
  return `출처 ${todoSourceLabel(todo.sourceType)}`;
}

export function todoListEmptyCopy(hasFilter: boolean): { title: string; message?: string } {
  return hasFilter
    ? { title: '표시할 할 일이 없습니다.', message: '필터를 바꾸거나 새 할 일을 추가해 주세요.' }
    : { title: '표시할 할 일이 없습니다.' };
}
