import { ApiError } from '../../../api/client';
import {
  newImportIdempotencyKey,
  normalizeSharedBinderDetail,
  normalizeSharedBinderList,
  sharedBinderPageTotal,
  sharedItemPageLabel,
} from '../sharedBinderModel';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return { ...actual, apiRequest: jest.fn(), resolveApiUrl: (p: string) => `https://api.test${p}` };
});
jest.mock('../../files/remoteFileSharing', () => ({ shareRemoteFile: jest.fn() }));

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const summary = {
  id: 12,
  title: '실손 상담 책자',
  description: '',
  ownerUserId: 'u9',
  ownerName: '김설계',
  gaId: 3,
  sectionCount: 2,
  fileCount: 2,
  totalBytes: 2_097_152,
  shareVersion: 1,
  sourceBinderId: '4',
  createdAt: '2026-10-18T01:00:00.000Z',
  status: 'active',
};
const detail = {
  ...summary,
  sections: [
    {
      id: 's2',
      title: '보장 분석',
      sortOrder: 2,
      items: [{ id: 'i3', shareFileId: 31, sortOrder: 1, pageSelection: null, material: { title: '분석표', originalFileName: 'a.pdf', mimeType: 'application/pdf', fileSize: 1000, pageCount: 4 } }],
    },
    {
      id: 's1',
      title: '소개',
      sortOrder: 1,
      items: [
        { id: 'i2', shareFileId: 22, sortOrder: 2, pageSelection: [5, 1, 2, 3], material: { title: '안내', originalFileName: 'b.pdf', mimeType: 'application/pdf', fileSize: 10, pageCount: 6 } },
        { id: 'i1', shareFileId: 21, sortOrder: 1, pageSelection: [9], material: { title: '표지', originalFileName: 'c.pdf', mimeType: 'application/pdf', fileSize: 10, pageCount: 2 } },
      ],
    },
  ],
};

describe('shared binder model', () => {
  it('normalizes list and skips rows without id', () => {
    const rows = normalizeSharedBinderList([summary, { title: 'x' }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: '12', ownerName: '김설계', sectionCount: 2, fileCount: 2 });
    expect(normalizeSharedBinderList([])).toEqual([]);
    expect(() => normalizeSharedBinderList({})).toThrow(ApiError);
  });

  it('normalizes detail with sections/items sorted and pageSelection kept', () => {
    const binder = normalizeSharedBinderDetail(detail);
    expect(binder.sections.map((section) => section.title)).toEqual(['소개', '보장 분석']);
    expect(binder.sections[0]!.items.map((item) => item.id)).toEqual(['i1', 'i2']);
    expect(binder.sections[0]!.items[1]!.pageSelection).toEqual([5, 1, 2, 3]);
    expect(binder.sections[0]!.items[1]!.shareFileId).toBe('22');
  });

  it('shows page selection with the 내 바인더 rules (displayPageSelection + formatSelectedPages)', () => {
    const binder = normalizeSharedBinderDetail(detail);
    const [cover, guide] = binder.sections[0]!.items;
    expect(sharedItemPageLabel(guide!)).toBe('1-3, 5쪽 (4쪽)');
    expect(sharedItemPageLabel(cover!)).toBe('선택한 페이지 없음');
    expect(sharedItemPageLabel(binder.sections[1]!.items[0]!)).toBe('전체 4쪽');
    expect(sharedBinderPageTotal(binder)).toBe(0 + 4 + 4);
  });

  it('builds a stable idempotency key per import attempt', () => {
    expect(newImportIdempotencyKey('12', 1000)).toBe('import:12:1000');
  });
});

describe('shared binder API', () => {
  const client = jest.requireMock('../../../api/client') as { apiRequest: jest.Mock };
  const files = jest.requireMock('../../files/remoteFileSharing') as { shareRemoteFile: jest.Mock };
  const api = jest.requireActual('../sharedBindersApi') as typeof import('../sharedBindersApi');

  beforeEach(() => {
    client.apiRequest.mockReset();
    files.shareRemoteFile.mockReset();
  });

  it('uses the existing shared binder endpoints', async () => {
    client.apiRequest.mockResolvedValueOnce([summary]);
    await api.listSharedBinders('tok');
    expect(client.apiRequest).toHaveBeenLastCalledWith('/api/personal-binders/shared', { token: 'tok' });
    client.apiRequest.mockResolvedValueOnce(detail);
    await api.getSharedBinder('tok', '12');
    expect(client.apiRequest).toHaveBeenLastCalledWith('/api/personal-binders/shared/12', { token: 'tok' });
  });

  it('imports with Idempotency-Key and returns the new binder id', async () => {
    client.apiRequest.mockResolvedValueOnce({ binder: { id: 88 }, reused: false });
    await expect(api.importSharedBinder('tok', '12', 'import:12:1')).resolves.toEqual({ binderId: '88', reused: false });
    expect(client.apiRequest).toHaveBeenLastCalledWith('/api/personal-binders/shared/12/import', {
      method: 'POST',
      token: 'tok',
      headers: { 'Idempotency-Key': 'import:12:1' },
      body: JSON.stringify({ idempotencyKey: 'import:12:1' }),
    });
    client.apiRequest.mockResolvedValueOnce({});
    await expect(api.importSharedBinder('tok', '12', 'k')).rejects.toBeInstanceOf(ApiError);
  });

  it('opens a shared file with a Bearer header (no URL token) and reports missing files', async () => {
    const binder = normalizeSharedBinderDetail(detail);
    await api.openSharedBinderFile('tok', '12', binder.sections[1]!.items[0]!);
    const request = files.shareRemoteFile.mock.calls[0]![0];
    expect(request.url).toBe('https://api.test/api/personal-binders/shared/12/files/31/download');
    expect(request.url).not.toMatch(/token/i);
    expect(request.headers).toEqual({ Authorization: 'Bearer tok' });
    await expect(api.openSharedBinderFile('tok', '12', { ...binder.sections[1]!.items[0]!, shareFileId: '' })).rejects.toMatchObject({ status: 404 });
  });

  it('file download errors surface (file error state)', async () => {
    files.shareRemoteFile.mockRejectedValueOnce(new ApiError('파일을 찾을 수 없습니다.', 404));
    const binder = normalizeSharedBinderDetail(detail);
    await expect(api.openSharedBinderFile('tok', '12', binder.sections[1]!.items[0]!)).rejects.toMatchObject({ status: 404 });
  });
});

describe('shared binder screens reuse 내 바인더', () => {
  it('opens imported binders in the existing native BinderViewerScreen route', () => {
    const hook = read('useImportSharedBinder.ts');
    expect(hook).toContain('/customer-consulting/personal-binders/${encodeURIComponent(result.binderId)}/view');
    expect(hook).toContain('personalBinderQueryKeys.all');
  });

  it('does not reimplement a page viewer / PDF renderer / page selection', () => {
    for (const file of ['SharedBinderListScreen.tsx', 'SharedBinderDetailScreen.tsx', 'sharedBindersApi.ts', 'sharedBinderModel.ts']) {
      const source = read(file);
      expect(source).not.toMatch(/BinderZoomSurface|pdfjs|react-native-pdf|WebView|PageSelectionModal/);
    }
    expect(read('sharedBinderModel.ts')).toContain("from '../personal-binders/personalBinderModel'");
  });
});
