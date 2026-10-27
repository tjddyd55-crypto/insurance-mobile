import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DesignSystemProvider } from '../../../design-system';
import { formatCoverageAmountLabel, formatManWonInputDisplay } from '../coverageAnalysis';
import { CoverageSimulationScreen } from '../CoverageSimulationScreen';
import { getConsultation, saveConsultation } from '../consultationRepository';
import type { CoverageScenario } from '../types';
import { discardCoverageDraft, getCoverageDraft, putCoverageDraft } from '../coverageDraftStore';

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useNavigation: () => ({ setOptions: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => undefined,
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


/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs') as { readFileSync(p: string, e: string): string };
const path = require('path') as { join(...p: string[]): string };
declare const __dirname: string;

describe('P2-4 create-on-save draft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const rows = new Map<string, CoverageScenario>();
    (getConsultation as jest.Mock).mockImplementation(async (_s, _u, id: string) => rows.get(id) ?? null);
    (saveConsultation as jest.Mock).mockImplementation(async (_s, _u, next: CoverageScenario) => {
      rows.set(next.id, next);
      return next;
    });
    discardCoverageDraft('sim-1');
    putCoverageDraft(scenarioFixture());
  });

  it('opening a draft writes nothing; edits before save write nothing', async () => {
    const screen = renderScreen();
    await screen.findByText('진단금');
    fireEvent.press(screen.getAllByLabelText('아래로 이동')[0]);
    await waitFor(() => expect(getCoverageDraft('sim-1')?.items.find((i) => i.id === 'item-a')?.order).toBe(1));
    expect(saveConsultation).not.toHaveBeenCalled();
  });

  it('unmount (cancel/back) without saving creates nothing and discards the draft', async () => {
    const screen = renderScreen();
    await screen.findByText('진단금');
    screen.unmount();
    expect(saveConsultation).not.toHaveBeenCalled();
    expect(getCoverageDraft('sim-1')).toBeNull();
  });

  it('header back without saving creates nothing', async () => {
    const screen = renderScreen();
    await screen.findByText('진단금');
    fireEvent.press(screen.getByLabelText('뒤로 가기'));
    expect(mockRouter.replace).toHaveBeenCalled();
    expect(saveConsultation).not.toHaveBeenCalled();
    expect(getCoverageDraft('sim-1')).toBeNull();
  });

  it('double-tap 저장 creates exactly one record; later edits update same id', async () => {
    const screen = renderScreen();
    await screen.findByText('진단금');
    const saveBtn = screen.getByText('저장');
    fireEvent.press(saveBtn);
    fireEvent.press(saveBtn);
    await waitFor(() => expect(saveConsultation).toHaveBeenCalledTimes(1));
    expect((saveConsultation as jest.Mock).mock.calls[0][2].id).toBe('sim-1');
    await waitFor(() => expect(getCoverageDraft('sim-1')).toBeNull());
    fireEvent.press(screen.getAllByLabelText('아래로 이동')[0]);
    await waitFor(() => expect(saveConsultation).toHaveBeenCalledTimes(2));
    const ids = (saveConsultation as jest.Mock).mock.calls.map((c) => c[2].id);
    expect(new Set(ids)).toEqual(new Set(['sim-1']));
  });

  it('PDF is blocked before first save', async () => {
    const screen = renderScreen();
    await screen.findByText('진단금');
    fireEvent.press(screen.getByText('PDF 미리보기'));
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(screen.getByText('먼저 저장해 주세요.')).toBeTruthy();
  });

  it('share is guarded before first save (source)', () => {
    const ed = fs.readFileSync(path.join(__dirname, '../CoverageSimulationScreen.tsx'), 'utf8');
    expect(ed).toMatch(/if \(draftUnsaved\) \{ showToast\(DRAFT_SAVE_FIRST\); return; \}\s*void share\.copyShareLink\(\)/);
    expect(ed).toContain('persisted: Boolean(query.data) && !draftUnsaved');
  });

  it('all 3 create sites put an in-memory draft and never call saveConsultation', () => {
    for (const f of [
      '../CoverageSimulationListScreen.tsx',
      '../CoverageTemplateSimulationListScreen.tsx',
      '../../customer-workspace/CustomerCoverageSimulationsScreen.tsx',
    ]) {
      const s = fs.readFileSync(path.join(__dirname, f), 'utf8');
      expect(s).toContain('putCoverageDraft(');
      expect(s).not.toContain('saveConsultation(');
    }
  });
});
