import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesignSystemProvider } from '../../../design-system';
import {
  CustomerRelationsPanel,
  RELATION_PICKER_BODY_HEIGHT,
  RELATION_PICKER_SEARCH_DEBOUNCE_MS,
} from '../CustomerRelationsPanel';
import { listCustomerRelationGroups } from '../customerRelationGroupsApi';
import { listCustomerRelations } from '../customerRelationsApi';
import { searchCustomers } from '../customerSearchApi';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));
jest.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' }, token: 'token' }),
}));
jest.mock('../customerRelationGroupsApi', () => ({
  ...jest.requireActual('../customerRelationGroupsApi'),
  listCustomerRelationGroups: jest.fn(),
}));
jest.mock('../customerRelationsApi', () => ({
  ...jest.requireActual('../customerRelationsApi'),
  listCustomerRelations: jest.fn(),
}));
jest.mock('../customerSearchApi', () => ({ searchCustomers: jest.fn() }));

const groups = jest.mocked(listCustomerRelationGroups);
const relations = jest.mocked(listCustomerRelations);
const search = jest.mocked(searchCustomers);

const FAMILY = {
  id: 7,
  name: '가족',
  groupType: 'FAMILY',
  memo: '',
  members: [
    { customerId: 1, name: '김진우', phone: '', gender: 'male' as const, birthDate: '1975-01-01', relationshipLabel: '본인', isCurrentCustomer: true },
    { customerId: 2, name: '조문정', phone: '', gender: 'female' as const, birthDate: '1972-01-22', relationshipLabel: '배우자', isCurrentCustomer: false },
    { customerId: 3, name: '김서연', phone: '', gender: 'female' as const, birthDate: '2007-09-21', relationshipLabel: '자녀', isCurrentCustomer: false },
  ],
};

function customerRow(id: number, name: string, phone = '010-1234-5678', address = '') {
  return { id, name, phone, address } as never;
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <QueryClientProvider client={client}>
        <DesignSystemProvider>
          <CustomerRelationsPanel customerId={1} />
        </DesignSystemProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

async function openSection(ui: ReturnType<typeof renderPanel>) {
  fireEvent.press(ui.getByLabelText('연계 고객 펼치기'));
  await waitFor(() => expect(ui.getByText('조문정', { exact: false })).toBeTruthy());
}

beforeEach(() => {
  jest.useRealTimers();
  groups.mockResolvedValue([FAMILY]);
  relations.mockResolvedValue([
    { relatedCustomerId: 2, relatedName: '조문정', relatedPhone: '', createdAt: '1' },
    { relatedCustomerId: 9, relatedName: '김지환', relatedPhone: '', createdAt: '2' },
  ]);
  search.mockReset();
});

test('PC 구조: 가족 카드 버튼, 현재 고객 포함, 관계·성별·생년월일, 관계/제거, 개별 연결 칩', async () => {
  const ui = renderPanel();
  await openSection(ui);
  for (const label of ['구성원 추가', '이름 수정', '그룹 삭제', '개별 연결']) {
    expect(ui.getAllByRole('button', { name: label }).length).toBeGreaterThan(0);
  }
  expect(ui.getByText('현재')).toBeTruthy();
  expect(ui.getByTestId('customer-relation-member-current')).toBeTruthy();
  expect(ui.getAllByTestId('customer-relation-member')).toHaveLength(2);
  for (const card of ui.getAllByTestId('customer-relation-member')) {
    expect(within(card).getAllByRole('button', { name: '관계' }).length).toBeGreaterThan(0);
    expect(within(card).getAllByRole('button', { name: '제거' }).length).toBeGreaterThan(0);
  }
  const current = ui.getByTestId('customer-relation-member-current');
  expect(within(current).queryByRole('button', { name: '제거' })).toBeNull();
  expect(ui.getByText(/1975\.01\.01/)).toBeTruthy();
  expect(ui.getByText(/배우자/)).toBeTruthy();
  // 개별 연결: 가족과 겹치지 않는 연결만 칩으로 (기존 SSOT 규칙 유지)
  expect(ui.getByTestId('customer-relation-individual-chips')).toBeTruthy();
  expect(ui.getByLabelText('김지환 연결 해제')).toBeTruthy();
});

test('구성원 추가: 입력 즉시(250ms debounce) 서버 검색, 버튼 없음, 빈 검색은 안내만', async () => {
  search.mockImplementation(async (_t, q) =>
    [customerRow(21, '김지웅'), customerRow(22, '이태수', '010-9999-0000', '충남 태안군')].filter(
      (r) => (r as { name: string }).name.includes(q) || q === '태',
    ),
  );
  const ui = renderPanel();
  await openSection(ui);
  fireEvent.press(ui.getByRole('button', { name: '구성원 추가' }));
  expect(ui.getByText('고객명 또는 휴대폰번호를 입력해 검색하세요.')).toBeTruthy();
  expect(ui.queryByRole('button', { name: '검색' })).toBeNull();
  expect(search).not.toHaveBeenCalled();

  fireEvent.changeText(ui.getByLabelText('고객 검색'), '김');
  await waitFor(() => expect(search).toHaveBeenCalledWith('token', '김', { limit: 50 }));
  await waitFor(() => expect(ui.getByText(/김지웅 · /)).toBeTruthy());
  expect(RELATION_PICKER_SEARCH_DEBOUNCE_MS).toBe(250);
});

test('주소에만 검색어가 있는 고객은 결과에서 제외', async () => {
  // 서버가 혹시 주소 매칭 고객을 돌려줘도 이름/전화번호 정책으로 걸러진다.
  search.mockResolvedValue([customerRow(30, '김철수', '010-1111-2222', '충남 태안군')]);
  const ui = renderPanel();
  await openSection(ui);
  fireEvent.press(ui.getByRole('button', { name: '구성원 추가' }));
  fireEvent.changeText(ui.getByLabelText('고객 검색'), '태');
  await waitFor(() => expect(search).toHaveBeenCalled());
  await waitFor(() => expect(ui.getByText('검색 결과가 없습니다.')).toBeTruthy());
  expect(ui.queryByText(/김철수/)).toBeNull();
});

test.each([0, 1, 5, 20])('검색 결과 %i명이어도 모달 본문 높이 고정, 결과만 스크롤', async (n) => {
  search.mockResolvedValue(Array.from({ length: n }, (_, i) => customerRow(100 + i, `김${i}`)));
  const ui = renderPanel();
  await openSection(ui);
  fireEvent.press(ui.getByRole('button', { name: '구성원 추가' }));
  fireEvent.changeText(ui.getByLabelText('고객 검색'), '김');
  await waitFor(() => expect(search).toHaveBeenCalled());
  await act(async () => {});
  const body = StyleSheet.flatten(ui.getByTestId('customer-relation-picker-body').props.style);
  expect(body.height).toBe(Math.min(RELATION_PICKER_BODY_HEIGHT, Math.round(844 * 0.55)));
  const list = StyleSheet.flatten(ui.getByTestId('customer-relation-picker-results').props.style);
  expect(list.flex).toBe(1);
  if (n === 0) {
    await waitFor(() => expect(ui.getByText('검색 결과가 없습니다.')).toBeTruthy());
  } else {
    await waitFor(() => expect(ui.getAllByText(/김\d+ · /).length).toBeGreaterThan(0));
  }
});
