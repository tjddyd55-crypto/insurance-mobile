import { ApiError } from '../../api/client';
import { formatDeviceLocalYmd } from '../../utils/deviceLocalDate';
import type {
  ListTodosParams,
  TodoPriority,
  TodoQuickFilter,
  TodoRecord,
  TodoRelatedEntityType,
  TodoRelatedFilter,
  TodoSourceType,
  TodoStatus,
} from './types';

function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function nullableText(value: unknown): string | null {
  const valueText = text(value).trim();
  return valueText || null;
}

function todoStatus(value: unknown): TodoStatus {
  return value === 'completed' || value === 'canceled' ? value : 'pending';
}

function todoPriority(value: unknown): TodoPriority {
  return value === 'low' || value === 'high' ? value : 'normal';
}

const SOURCE_TYPES: TodoSourceType[] = [
  'manual',
  'customer_memo',
  'consultation_note',
  'pdf_document',
  'e_document',
  'system',
];

function todoSourceType(value: unknown): TodoSourceType {
  return SOURCE_TYPES.includes(value as TodoSourceType) ? (value as TodoSourceType) : 'manual';
}

const RELATED_TYPES: TodoRelatedEntityType[] = [
  'customer',
  'document',
  'e_document',
  'case',
  'tenant',
];

function relatedEntityType(value: unknown): TodoRelatedEntityType | null {
  return RELATED_TYPES.includes(value as TodoRelatedEntityType)
    ? (value as TodoRelatedEntityType)
    : null;
}

export function normalizeTodo(value: unknown, context = '할 일 데이터'): TodoRecord {
  if (!value || typeof value !== 'object') {
    throw new ApiError(`${context}가 올바르지 않습니다.`, 500);
  }
  const row = value as Record<string, unknown>;
  const id = text(row.id).trim();
  if (!id) {
    throw new ApiError(`${context}에 유효한 id가 없습니다.`, 500);
  }
  const rawMetadata = row.metadata;
  return {
    id,
    tenantId: nullableText(row.tenantId ?? row.tenant_id),
    gaId: Number.isFinite(Number(row.gaId ?? row.ga_id)) ? Number(row.gaId ?? row.ga_id) : null,
    ownerUserId: text(row.ownerUserId ?? row.owner_user_id),
    assigneeUserId: nullableText(row.assigneeUserId ?? row.assignee_user_id),
    title: text(row.title),
    description: text(row.description),
    dueDate: nullableText(row.dueDate ?? row.due_date),
    dueTime: nullableText(row.dueTime ?? row.due_time),
    status: todoStatus(row.status),
    priority: todoPriority(row.priority),
    sourceType: todoSourceType(row.sourceType ?? row.source_type),
    sourceId: nullableText(row.sourceId ?? row.source_id),
    relatedEntityType: relatedEntityType(row.relatedEntityType ?? row.related_entity_type),
    relatedEntityId: nullableText(row.relatedEntityId ?? row.related_entity_id),
    metadata:
      rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
        ? (rawMetadata as Record<string, unknown>)
        : null,
    createdAt: nullableText(row.createdAt ?? row.created_at),
    updatedAt: nullableText(row.updatedAt ?? row.updated_at),
    completedAt: nullableText(row.completedAt ?? row.completed_at),
    canceledAt: nullableText(row.canceledAt ?? row.canceled_at),
    customerName: nullableText(row.customerName ?? row.customer_name),
  };
}

/** 작성 시각. 수정이 있으면 수정 시각, 없으면 작성 시각. */
export function todoWrittenAt(todo: Pick<TodoRecord, 'updatedAt' | 'createdAt'>): string {
  return todo.updatedAt ?? todo.createdAt ?? '';
}

/**
 * 할 일 목록 기본 정렬: 최근 작성·수정이 위.
 * 같은 작성/수정 시각이면 createdAt DESC, 그다음 id DESC.
 */
export function compareTodosByRecentWrite(
  left: Pick<TodoRecord, 'id' | 'updatedAt' | 'createdAt'>,
  right: Pick<TodoRecord, 'id' | 'updatedAt' | 'createdAt'>,
): number {
  const written = todoWrittenAt(right).localeCompare(todoWrittenAt(left));
  if (written !== 0) return written;
  const created = (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
  if (created !== 0) return created;
  return right.id.localeCompare(left.id, undefined, { numeric: true });
}

export function sortTodosByRecentWrite<T extends Pick<TodoRecord, 'id' | 'updatedAt' | 'createdAt'>>(
  todos: readonly T[],
): T[] {
  return [...todos].sort(compareTodosByRecentWrite);
}

export function normalizeTodoList(value: unknown): TodoRecord[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)
      ? (value as { data: unknown[] }).data
      : null;
  if (!rows) {
    throw new ApiError('할 일 목록 응답 구조가 올바르지 않습니다.', 500);
  }
  return sortTodosByRecentWrite(
    rows.map((row, index) => normalizeTodo(row, `할 일 목록 ${index + 1}번째 항목`)),
  );
}

export function buildTodoListParams(
  quick: TodoQuickFilter,
  related: TodoRelatedFilter,
  source: TodoSourceType | 'all',
): ListTodosParams {
  const params: ListTodosParams = {};
  if (quick === 'open') params.bucket = 'open';
  if (quick === 'completed') params.status = 'completed';
  if (quick === 'today' || quick === 'tomorrow' || quick === 'week') params.due = quick;
  if (quick === 'overdue') params.overdue = 'true';
  if (related === 'yes' || related === 'no') params.hasRelated = related;
  if (source !== 'all') params.sourceType = source;
  return params;
}

export function todoDisplayContent(todo: Pick<TodoRecord, 'description' | 'title'>): string {
  return todo.description.trim() || todo.title.trim() || '내용 없음';
}

export function firstLineTodoTitle(value: string, maxLength = 40): string {
  const first = value.split(/\r?\n/).find((line) => line.trim())?.trim() ?? '';
  return first.slice(0, maxLength) || '할일';
}

export function todoSourceLabel(source: TodoSourceType): string {
  const labels: Record<TodoSourceType, string> = {
    manual: '직접 작성',
    customer_memo: '고객 메모',
    consultation_note: '상담 내역',
    pdf_document: 'PDF 문서',
    e_document: '전자문서',
    system: '시스템',
  };
  return labels[source];
}

export function todoStatusLabel(status: TodoStatus): string {
  return status === 'completed' ? '완료' : status === 'canceled' ? '취소' : '미완료';
}

export function formatTodoDate(value: string | null): string {
  if (!value) return '없음';
  const ymd = formatDeviceLocalYmd(value);
  if (!ymd) return value;
  const date = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(date.getTime())) return ymd;
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date);
  const month = Number(ymd.slice(5, 7));
  const day = Number(ymd.slice(8, 10));
  return `${month}월 ${day}일(${weekday})`;
}

export function formatSeoulYmd(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function suggestTodoDueDate(content: string, now = new Date()): string | null {
  const offset = content.includes('모레') ? 2 : content.includes('내일') ? 1 : content.includes('오늘') ? 0 : null;
  if (offset == null) return null;
  const base = new Date(`${formatSeoulYmd(now)}T12:00:00+09:00`);
  base.setDate(base.getDate() + offset);
  return formatSeoulYmd(base);
}

export function isValidOptionalYmd(value: string): boolean {
  if (!value.trim()) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00+09:00`);
  return !Number.isNaN(date.getTime()) && formatSeoulYmd(date) === value;
}
