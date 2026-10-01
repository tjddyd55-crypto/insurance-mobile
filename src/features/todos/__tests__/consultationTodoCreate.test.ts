// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

import { formatDeviceLocalYmd } from '../../../utils/deviceLocalDate';
import { firstLineTodoTitle, suggestTodoDueDate } from '../todoModel';
import { buildTodoCreatePayload } from '../todoFormSession';
import {
  buildConsultationTodoCreatePrefill,
  CONSULTATION_ADD_TODO_LABEL,
  consultationTodoCreateRoute,
  peekConsultationTodoCreate,
  seedTodoCreateForm,
} from '../consultationTodoCreate';

const NOW = new Date('2026-09-30T16:30:00Z');

describe('consultation todo create', () => {
  it('shows 할 일로 추가 beside edit and delete, and still confirms delete', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../customer-workspace/CustomerConsultationsScreen.tsx'),
      'utf8',
    );
    expect(CONSULTATION_ADD_TODO_LABEL).toBe('할 일로 추가');
    expect(source).toContain('label="수정"');
    expect(source).toContain('label="삭제"');
    expect(source).toContain('CONSULTATION_ADD_TODO_LABEL');
    expect(source).toContain('<Inline wrap>');
    expect(source).toContain('consultationTodoCreateRoute');
    expect(source).toContain('<ConfirmDialog');
    expect(source).toContain('title="상담 기록 삭제"');
    expect(source).not.toContain('toISOString');
  });

  it('opens the existing todo create route with customer, content, and consultation id', () => {
    const prefill = buildConsultationTodoCreatePrefill({
      customerId: 42,
      customerName: '홍길동',
      consultationId: 9,
      body: '  고객에게 연락하기\n추가 메모  ',
      now: NOW,
    });
    const route = consultationTodoCreateRoute(prefill);
    const seeded = seedTodoCreateForm(route.params.consultationId);
    const payload = buildTodoCreatePayload(seeded.draft, seeded.source);

    expect(route).toEqual({ pathname: '/todos/new', params: { consultationId: '9' } });
    expect(peekConsultationTodoCreate('9')).toEqual(prefill);
    expect(seeded.draft.relatedCustomerId).toBe('42');
    expect(seeded.draft.relatedCustomerName).toBe('홍길동');
    expect(seeded.draft.description).toBe('고객에게 연락하기\n추가 메모');
    expect(payload.title).toBe(firstLineTodoTitle(prefill.description));
    expect(payload.description).toBe(prefill.description);
    expect(payload.sourceType).toBe('consultation_note');
    expect(payload.sourceId).toBe('9');
    expect(payload.relatedEntityType).toBe('customer');
    expect(payload.relatedEntityId).toBe('42');
  });

  it('keeps an empty due date unless the existing suggestion returns a calendar day', () => {
    const plain = buildConsultationTodoCreatePrefill({
      customerId: 1,
      customerName: '김고객',
      consultationId: 2,
      body: '상담 내용',
      now: NOW,
    });
    expect(plain.dueDate).toBe('');
    expect(plain.dueDate).not.toContain('T');

    const tomorrow = buildConsultationTodoCreatePrefill({
      customerId: 1,
      customerName: '김고객',
      consultationId: 3,
      body: '내일 연락',
      now: NOW,
    });
    const suggested = suggestTodoDueDate('내일 연락', NOW);
    expect(tomorrow.dueDate).toBe(formatDeviceLocalYmd(suggested));
    expect(tomorrow.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tomorrow.dueDate).not.toContain('T');
  });

  it('does not turn a consultation instant into a due date with toISOString', () => {
    const prefill = buildConsultationTodoCreatePrefill({
      customerId: 7,
      customerName: '이고객',
      consultationId: 8,
      body: '2026-09-30T16:30:00Z 시각은 본문일 뿐',
      now: NOW,
    });
    expect(prefill.dueDate).toBe('');
    expect(JSON.stringify(prefill)).not.toContain('toISOString');
    expect(prefill.sourceId).toBe('8');
  });

  it('uses the todo create payload for manual creates and leaves edit on updateTodo', () => {
    const manual = buildTodoCreatePayload({
      description: '직접 작성',
      dueDate: '',
      relatedCustomerId: '',
      relatedCustomerName: '',
    });
    expect(manual.sourceType).toBe('manual');
    expect(manual.sourceId).toBeUndefined();
    expect(manual.dueDate).toBeNull();

    const form = fs.readFileSync(path.join(__dirname, '../TodoFormScreen.tsx'), 'utf8');
    expect(form).toContain('buildTodoCreatePayload');
    expect(form).toContain('seedTodoCreateForm');
    expect(form).toContain('updateTodo');
    expect(form).not.toContain('suggestTodoDueDate');
    expect(form).not.toContain('toISOString');

    const route = fs.readFileSync(
      path.join(__dirname, '../../../../app/(app)/todos/new.tsx'),
      'utf8',
    );
    expect(route).toContain("mode=\"create\"");
    expect(route).toContain('consultationId');
  });
});
