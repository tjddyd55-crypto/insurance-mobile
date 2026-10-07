import { PDF_SAVE_REQUIRES_APP_UPDATE } from '../nativePdfModules';
import { shareNativeCoveragePdf } from '../nativeCoveragePdf';
import type { CoverageScenario } from '../types';

const mockLookupNativeModule = jest.fn();

jest.mock('../nativeModuleLookup', () => ({
  lookupNativeModule: (name: string) => mockLookupNativeModule(name),
}));

jest.mock('expo-print', () => {
  throw new Error('evaluated expo-print');
});

jest.mock('expo-sharing', () => {
  throw new Error('evaluated expo-sharing');
});

const scenario = {
  id: 's1',
  title: '암 치료',
  diseaseType: 'cancer',
  description: '',
  consultationDate: '2026-03-30T00:00:00.000Z',
  items: [],
  createdAt: '',
  updatedAt: '',
} as CoverageScenario;

function installed(name: string): object | null {
  const present = new Set(
    ((globalThis as { __coveragePdfInstalled?: string[] }).__coveragePdfInstalled) ?? [],
  );
  return present.has(name) ? { installed: true } : null;
}

describe('coverage pdf export without native modules', () => {
  beforeEach(() => {
    (globalThis as { __coveragePdfInstalled?: string[] }).__coveragePdfInstalled = [];
    mockLookupNativeModule.mockImplementation(installed);
  });

  it('asks for an app update and does not evaluate expo-print or expo-sharing', async () => {
    await expect(shareNativeCoveragePdf(scenario)).rejects.toThrow(PDF_SAVE_REQUIRES_APP_UPDATE);
  });

  it('does not evaluate expo-print when only ExpoSharing is installed', async () => {
    (globalThis as { __coveragePdfInstalled?: string[] }).__coveragePdfInstalled = ['ExpoSharing'];
    await expect(shareNativeCoveragePdf(scenario)).rejects.toThrow(PDF_SAVE_REQUIRES_APP_UPDATE);
  });

  it('does not evaluate expo-sharing when only ExpoPrint is installed', async () => {
    (globalThis as { __coveragePdfInstalled?: string[] }).__coveragePdfInstalled = ['ExpoPrint'];
    await expect(shareNativeCoveragePdf(scenario)).rejects.toThrow(PDF_SAVE_REQUIRES_APP_UPDATE);
  });
});
