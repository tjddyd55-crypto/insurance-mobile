import { shareNativeCoveragePdf } from '../nativeCoveragePdf';
import type { CoverageScenario } from '../types';

const mockLookupNativeModule = jest.fn();
const mockPrintToFileAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();

jest.mock('../nativeModuleLookup', () => ({
  lookupNativeModule: (name: string) => mockLookupNativeModule(name),
}));

jest.mock('expo-print', () => ({
  printToFileAsync: (options: { html: string }) => mockPrintToFileAsync(options),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  shareAsync: (uri: string, options: object) => mockShareAsync(uri, options),
}));

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    exists = true;
    constructor(parent: string | { uri?: string }, name?: string) {
      this.uri = typeof parent === 'string' ? parent : `file:///cache/${name}`;
    }
    bytes(): Promise<Uint8Array> {
      return Promise.resolve(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]));
    }
    create(): void {}
    write(): void {}
  }
  return { File, Paths: { cache: { uri: 'file:///cache' } } };
});

const scenario = {
  id: 's1',
  title: '암 치료',
  diseaseType: 'cancer',
  description: '',
  customerNameSnapshot: '홍길동',
  consultationDate: '2026-03-30T00:00:00.000Z',
  items: [
    {
      id: 'i1',
      type: 'coverage',
      category: 'diagnosis',
      label: '암 진단금',
      currentAmount: 10_000_000,
      proposedAmount: 30_000_000,
      order: 0,
    },
  ],
  createdAt: '',
  updatedAt: '',
} as CoverageScenario;

describe('coverage pdf export with native modules', () => {
  beforeEach(() => {
    mockLookupNativeModule.mockImplementation((name: string) =>
      name === 'ExpoPrint' || name === 'ExpoSharing' ? { installed: true } : null,
    );
    mockPrintToFileAsync.mockReset();
    mockPrintToFileAsync.mockResolvedValue({ uri: 'file:///tmp/printed.pdf' });
    mockIsAvailableAsync.mockReset();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockReset();
    mockShareAsync.mockResolvedValue(undefined);
  });

  it('prints and shares a real pdf without the update or placeholder message', async () => {
    await shareNativeCoveragePdf(scenario);

    expect(mockPrintToFileAsync).toHaveBeenCalledWith(
      expect.objectContaining({ html: expect.stringContaining('암 진단금') }),
    );
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///cache/홍길동_암 치료.pdf',
      expect.objectContaining({
        mimeType: 'application/pdf',
        dialogTitle: '홍길동_암 치료.pdf',
        UTI: 'com.adobe.pdf',
      }),
    );
  });

  it('keeps the device share message when the share sheet is unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(shareNativeCoveragePdf(scenario)).rejects.toThrow(
      '이 기기에서는 PDF 공유를 사용할 수 없습니다.',
    );
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('reports a render failure from an installed print module', async () => {
    mockPrintToFileAsync.mockRejectedValue(new Error('print failed'));

    await expect(shareNativeCoveragePdf(scenario)).rejects.toThrow(
      'PDF 생성 모듈을 사용할 수 없습니다. 앱을 스토어에서 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.',
    );
  });
});
