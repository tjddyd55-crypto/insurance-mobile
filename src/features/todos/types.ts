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
};
