import { formatDeviceLocalYmd } from '../../utils/deviceLocalDate';
import { isValidOptionalYmd, suggestTodoDueDate } from './todoModel';
import { cloneTodoFormDraft, type TodoFormDraft } from './todoFormSession';

/** 상담 카드에 보이는 동작. 웹 모바일 카드의 접근 이름과 같다. */
export const CONSULTATION_ADD_TODO_LABEL = '할 일로 추가';

export type ConsultationTodoCreatePrefill = {
  description: string;
  dueDate: string;
  relatedCustomerId: string;
  relatedCustomerName: string;
  sourceType: 'consultation_note';
  sourceId: string;
};

export type TodoCreateSource = {
  sourceType: 'manual' | 'consultation_note';
  sourceId: string | null;
};

const MANUAL_SOURCE: TodoCreateSource = { sourceType: 'manual', sourceId: null };

const staged = new Map<string, ConsultationTodoCreatePrefill>();

/**
 * 웹 `openTodoFromConsultation`과 같은 초안.
 * 제목은 저장 때 `firstLineTodoTitle`이 본문에서 만든다.
 * 마감일은 기존 `suggestTodoDueDate`만 쓰고, 달력 날짜는 `formatDeviceLocalYmd`로 유지한다.
 */
export function buildConsultationTodoCreatePrefill(input: {
  customerId: number;
  customerName?: string | null;
  consultationId: number;
  body: string;
  now?: Date;
}): ConsultationTodoCreatePrefill {
  const description = input.body.trim() || '(상담 내용 없음)';
  const suggested = suggestTodoDueDate(description, input.now ?? new Date());
  const dueDate = calendarDueDate(suggested);
  return {
    description,
    dueDate,
    relatedCustomerId: String(input.customerId),
    relatedCustomerName: input.customerName?.trim() ?? '',
    sourceType: 'consultation_note',
    sourceId: String(input.consultationId),
  };
}

export function stageConsultationTodoCreate(prefill: ConsultationTodoCreatePrefill): void {
  staged.set(prefill.sourceId, prefill);
}

export function peekConsultationTodoCreate(
  consultationId: string | undefined,
): ConsultationTodoCreatePrefill | null {
  const id = consultationId?.trim();
  if (!id) return null;
  return staged.get(id) ?? null;
}

export function consultationTodoCreateRoute(prefill: ConsultationTodoCreatePrefill): {
  pathname: '/todos/new';
  params: { consultationId: string };
} {
  stageConsultationTodoCreate(prefill);
  return {
    pathname: '/todos/new',
    params: { consultationId: prefill.sourceId },
  };
}

export function seedTodoCreateForm(consultationId?: string): {
  draft: TodoFormDraft;
  source: TodoCreateSource;
} {
  const prefill = peekConsultationTodoCreate(consultationId);
  if (!prefill) {
    return { draft: cloneTodoFormDraft(), source: MANUAL_SOURCE };
  }
  return {
    draft: {
      description: prefill.description,
      dueDate: prefill.dueDate,
      relatedCustomerId: prefill.relatedCustomerId,
      relatedCustomerName: prefill.relatedCustomerName,
    },
    source: { sourceType: prefill.sourceType, sourceId: prefill.sourceId },
  };
}

function calendarDueDate(value: string | null): string {
  if (!value || value.includes('T')) return '';
  const ymd = formatDeviceLocalYmd(value);
  if (!ymd || !isValidOptionalYmd(ymd)) return '';
  return ymd;
}
