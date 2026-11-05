export type TodoStatus = 'pending' | 'completed' | 'canceled';

export type TodoPriority = 'low' | 'normal' | 'high';

export type TodoSourceType =
  | 'manual'
  | 'customer_memo'
  | 'consultation_note'
  | 'pdf_document'
  | 'e_document'
  | 'system';

export type TodoRelatedEntityType = 'customer' | 'document' | 'e_document' | 'case' | 'tenant';

export type TodoRecord = {
  id: string;
  tenantId: string | null;
  gaId: number | null;
  ownerUserId: string;
  assigneeUserId: string | null;
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  sourceType: TodoSourceType;
  sourceId: string | null;
  relatedEntityType: TodoRelatedEntityType | null;
  relatedEntityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  customerName: string | null;
  /** Asia/Seoul 월요일 YYYY-MM-DD. 없으면 null(주간 집중 아님). */
  weeklyFocusWeekStart: string | null;
};

export type TodoQuickFilter =
  | 'all'
  | 'today'
  | 'tomorrow'
  | 'week'
  | 'open'
  | 'completed'
  | 'overdue';

export type TodoRelatedFilter = 'any' | 'yes' | 'no';

export type ListTodosParams = {
  status?: string;
  bucket?: string;
  due?: string;
  overdue?: string;
  hasRelated?: string;
  sourceType?: string;
  /** 서버 PR #225(`related_entity_type='customer'` + id) 필터. 숫자 문자열만. */
  customerId?: string;
  /** 주간 할 일 조회: 해당 주 월요일(Asia/Seoul). due in Mon–Sun OR focus == weekStart. */
  weekStart?: string;
  /** 주간 조회 시 완료 포함. '1' 이면 포함(기본 미완료만). */
  includeCompleted?: string;
};

export type SaveTodoPayload = {
  sourceType?: TodoSourceType;
  sourceId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TodoPriority;
  relatedEntityType?: TodoRelatedEntityType | null;
  relatedEntityId?: string | null;
  /** 주간 집중 시작일(월요일) 지정/해제. null 이면 해제. */
  weeklyFocusWeekStart?: string | null;
};
