import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesignSystemProvider } from '../../../design-system';
import { formatCoverageAmountLabel, formatManWonInputDisplay } from '../coverageAnalysis';
import { CoverageSimulationScreen } from '../CoverageSimulationScreen';
import { getConsultation, saveConsultation } from '../consultationRepository';
import type { CoverageScenario } from '../types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

jest.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, token: 'token' }),
}));

jest.mock('../consultationRepository', () => {
  const actual = jest.requireActual('../consultationRepository');
  return {
    ...actual,
    getConsultation: jest.fn(),
    saveConsultation: jest.fn(),
  };
});

const TYPED_MAN = 5600;
const TYPED_AMOUNT = TYPED_MAN * 10_000;
const typedLabel = formatCoverageAmountLabel(TYPED_AMOUNT);
const typedInput = formatManWonInputDisplay(TYPED_AMOUNT);

function scenarioFixture(): CoverageScenario {
  return {
    id: 'sim-1',
    title: '암 치료',
    diseaseType: 'cancer',
    description: '',
    customerId: null,
    customerNameSnapshot: null,
    consultationDate: '2026-10-01',
    recordType: 'simulation',
    items: [
      {
        id: 'item-a',
        type: 'coverage',
        category: 'diagnosis',
        label: '진단금',
        currentAmount: 10_000_000,
        proposedAmount: 54_000_000,
        order: 0,
      },
      {
        id: 'item-b',
        type: 'coverage',
        category: 'treatment',
        label: '수술비',
        currentAmount: 20_000_000,
        proposedAmount: 30_000_000,
        order: 1,
      },
    ],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

function Harness({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <DesignSystemProvider>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </DesignSystemProvider>
    </SafeAreaProvider>
  );
}

function renderScreen() {
  return render(
    <Harness>
      <CoverageSimulationScreen scenarioId="sim-1" />
    </Harness>,
  );
}

function lastSaved(): CoverageScenario {
  const calls = (saveConsultation as jest.Mock).mock.calls;
  return calls[calls.length - 1][2] as CoverageScenario;
}

describe('coverage inline commit then act', () => {
  let stored: CoverageScenario;

  beforeEach(() => {
    stored = scenarioFixture();
    (getConsultation as jest.Mock).mockImplementation(async () => stored);
    (saveConsultation as jest.Mock).mockImplementation(async (_storage, _userId, next: CoverageScenario) => {
      stored = next;
      return next;
    });
  });

  async function typeProposedAmount() {
    const screen = renderScreen();
    await screen.findByText('진단금');
    fireEvent.press(screen.getAllByLabelText('금액 수정')[1]);
    fireEvent.changeText(screen.getByLabelText('금액 입력'), String(TYPED_MAN));
    return screen;
  }

  async function typeTitle() {
    const screen = renderScreen();
    await screen.findByText('진단금');
    fireEvent.press(screen.getAllByLabelText('항목명 수정')[0]);
    fireEvent.changeText(screen.getByLabelText('항목명 입력'), '진단금수정');
    return screen;
  }

  it('keeps a typed amount when the row moves', async () => {
    const screen = await typeProposedAmount();
    fireEvent.press(screen.getAllByLabelText('아래로 이동')[0]);
    await waitFor(() => {
      const saved = lastSaved();
      const moved = saved.items.find((item) => item.id === 'item-a');
      const other = saved.items.find((item) => item.id === 'item-b');
      expect(moved?.type === 'coverage' && moved.proposedAmount).toBe(TYPED_AMOUNT);
      expect(moved?.order).toBeGreaterThan(other?.order ?? 0);
    });
    expect(screen.getByText(typedLabel)).toBeTruthy();
    expect(screen.queryByText('저장되었습니다.')).toBeNull();
  });

  it('persists a typed amount from the header save', async () => {
    const screen = await typeProposedAmount();
    fireEvent.press(screen.getByText('저장'));
    await screen.findByText('저장되었습니다.');
    const moved = lastSaved().items.find((item) => item.id === 'item-a');
    expect(moved?.type === 'coverage' && moved.proposedAmount).toBe(TYPED_AMOUNT);
  });

  it('opens the item dialog with the typed amount and keeps it on save', async () => {
    const screen = await typeProposedAmount();
    fireEvent.press(screen.getAllByLabelText('항목 수정')[0]);
    expect(screen.getByText('항목 수정')).toBeTruthy();
    expect(screen.getByLabelText('제안 보장').props.value).toBe(typedInput);
    fireEvent.press(screen.getByText('저장'));
    await screen.findByText('저장되었습니다.');
    const moved = lastSaved().items.find((item) => item.id === 'item-a');
    expect(moved?.type === 'coverage' && moved.proposedAmount).toBe(TYPED_AMOUNT);
  });

  it('keeps a typed title when the row moves', async () => {
    const screen = await typeTitle();
    fireEvent.press(screen.getAllByLabelText('아래로 이동')[0]);
    await waitFor(() => {
      const saved = lastSaved();
      const moved = saved.items.find((item) => item.id === 'item-a');
      const other = saved.items.find((item) => item.id === 'item-b');
      expect(moved?.label).toBe('진단금수정');
      expect(moved?.order).toBeGreaterThan(other?.order ?? 0);
    });
    expect(screen.getByText('진단금수정')).toBeTruthy();
  });

  it('persists a typed title from the header save', async () => {
    const screen = await typeTitle();
    fireEvent.press(screen.getByText('저장'));
    await screen.findByText('저장되었습니다.');
    expect(lastSaved().items.find((item) => item.id === 'item-a')?.label).toBe('진단금수정');
  });

  it('opens the item dialog with the typed title and keeps it on save', async () => {
    const screen = await typeTitle();
    fireEvent.press(screen.getAllByLabelText('항목 수정')[0]);
    expect(screen.getByLabelText('항목명').props.value).toBe('진단금수정');
    fireEvent.press(screen.getByText('저장'));
    await screen.findByText('저장되었습니다.');
    expect(lastSaved().items.find((item) => item.id === 'item-a')?.label).toBe('진단금수정');
  });
});
