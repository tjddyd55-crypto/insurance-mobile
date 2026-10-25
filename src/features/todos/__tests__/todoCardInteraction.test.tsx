import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { DesignSystemProvider, typeScale } from '../../../design-system';
import { TodoCard } from '../TodoCard';
import { linkedCustomerLabel } from '../customerTodos';
import type { TodoRecord } from '../types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

const todo: TodoRecord = {
  id: 't1', tenantId: null, gaId: 1, ownerUserId: 'u', assigneeUserId: null, title: '전화하기', description: '전화하기',
  dueDate: '2026-10-30', dueTime: null, status: 'pending', priority: 'normal', sourceType: 'manual', sourceId: null,
  relatedEntityType: 'customer', relatedEntityId: '12', metadata: null, createdAt: null, updatedAt: null,
  completedAt: null, canceledAt: null, customerName: 'A고객',
};
const card = (props: Partial<Parameters<typeof TodoCard>[0]> = {}) =>
  render(<DesignSystemProvider><TodoCard todo={todo} stateBusy={false} onToggleDone={jest.fn()} {...props} /></DesignSystemProvider>);

beforeEach(() => mockPush.mockReset());

describe('TodoCard 터치', () => {
  it('카드 본문을 누르면 그 할 일 상세로 간다', () => {
    const ui = card();
    fireEvent.press(ui.getByText('전화하기'));
    expect(mockPush).toHaveBeenCalledWith('/todos/t1/edit');
  });

  it('고객 이름 근처를 눌러도 고객 상세가 아니라 할 일 상세(목록에 별도 고객 이동 없음)', () => {
    const ui = card();
    fireEvent.press(ui.getByText('연결: A고객'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/todos/t1/edit');
    expect(mockPush).not.toHaveBeenCalledWith(expect.objectContaining({ pathname: '/customers/[customerId]' }));
    expect(ui.queryAllByRole('link')).toHaveLength(0);
  });

  it('고객 할 일 카드는 고객 복귀 정보가 있는 상세로 간다', () => {
    const href = { pathname: '/todos/[todoId]/edit', params: { todoId: 't1', customerId: '12', from: 'customer' } };
    const ui = card({ editHref: href as never, dateOnly: true });
    fireEvent.press(ui.getByText('전화하기'));
    expect(mockPush).toHaveBeenCalledWith(href);
  });


  it('메타 정보는 14px / lineHeight 20 / 보통 굵기', () => {
    const ui = card();
    for (const text of ['연결: A고객']) {
      const style = StyleSheet.flatten(ui.getByText(text).props.style);
      expect(style.fontSize).toBe(typeScale.label);
      expect(style.fontSize).toBe(14);
      expect(style.lineHeight).toBe(20);
      expect(style.fontWeight).toBe('400');
    }
  });
});

describe('할 일 폼 연결 고객', () => {
  const form = fs.readFileSync(path.join(__dirname, '..', 'TodoFormScreen.tsx'), 'utf8');
  it('제목·중복 보조 문구 없이 선택됨 · 이름만', () => {
    expect(linkedCustomerLabel('A고객')).toBe('선택됨 · A고객');
    expect(form).not.toContain('>연결 고객<');
    expect(form).not.toContain("'이 고객의 할 일'");
    expect(form).not.toContain("'선택된 고객'");
  });
  it('상세(수정)의 연결 고객 이름만 고객 상세로 이동', () => {
    expect(form).toMatch(/linkedCustomerId = mode === 'edit'/);
    expect(form).toMatch(/pathname: '\/customers\/\[customerId\]'/);
  });
  it('저장 계약(related_entity)은 그대로', () => {
    expect(form).toContain('buildTodoCreatePayload');
  });
});
