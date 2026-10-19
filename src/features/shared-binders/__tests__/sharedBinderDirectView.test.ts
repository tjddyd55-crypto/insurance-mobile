import { Image } from 'react-native';

import { ApiError, apiRequest } from '../../../api/client';
import {
  SHARED_VIEWER_COPY,
  sharedViewerErrorMessage,
} from '../../personal-binders/binderMessages';
import {
  fetchPageImageLink,
  fetchViewerPages,
  forgetPageImageLink,
  pageImageRequestKey,
  prefetchViewerPageLinks,
  viewerPageRequest,
  viewerThumbRequest,
} from '../../personal-binders/binderPageImage';
import { personalBinderQueryKeys } from '../../personal-binders/queryKeys';

jest.mock('../../../api/client', () => {
  const actual = jest.requireActual('../../../api/client');
  return { ...actual, apiRequest: jest.fn() };
});

declare const __dirname: string;
const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
const readRepo = (...parts: string[]) => fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', ...parts), 'utf8');
const mockedRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

const shared = { kind: 'shared' as const, shareId: '21' };
const own = { kind: 'binder' as const, binderId: '5' };

describe('shared binder direct view (no import) on the existing viewer', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
  });

  it('loads pages from the shared page API and keeps own binders on their API', async () => {
    mockedRequest.mockResolvedValue({
      shareId: '21',
      binderId: null,
      title: '공유 상담책',
      pageCount: 2,
      pages: [
        { index: 2, sectionId: '41', sectionTitle: '보장', itemId: '51', materialId: '31', shareFileId: '31', fileId: 31, mimeType: 'application/pdf', kind: 'pdf', pdfPageNumber: 1 },
        { index: 1, sectionId: '41', sectionTitle: '보장', itemId: '51', materialId: '31', shareFileId: '31', fileId: 31, mimeType: 'application/pdf', kind: 'pdf', pdfPageNumber: 2 },
      ],
    });
    const list = await fetchViewerPages('tok', shared);
    expect(mockedRequest.mock.calls[0]).toEqual(['/api/personal-binders/shared/21/pages', { token: 'tok' }]);
    expect(list).toMatchObject({ shareId: '21', binderId: '', title: '공유 상담책', pageCount: 2 });
    expect(list.pages.map((page) => [page.index, page.pdfPageNumber])).toEqual([[1, 2], [2, 1]]);

    mockedRequest.mockResolvedValue({ binderId: '5', title: '내 책', pageCount: 0, pages: [] });
    await fetchViewerPages('tok', own);
    expect(mockedRequest.mock.calls[1]![0]).toBe('/api/personal-binders/5/pages');
  });

  it('requests page links on the shared endpoints with separate cache keys', async () => {
    const full = viewerPageRequest(shared, 3, 1080);
    const thumb = viewerThumbRequest(shared, 3);
    expect(pageImageRequestKey(full)).toBe('shared:21:3:w1080');
    expect(pageImageRequestKey(thumb)).toBe('shared:21:3:thumb');
    expect(pageImageRequestKey(viewerPageRequest(own, 3, 1080))).toBe('binder:5:3:w1080');
    forgetPageImageLink(pageImageRequestKey(full));
    forgetPageImageLink(pageImageRequestKey(thumb));
    mockedRequest.mockResolvedValue({ openUrl: 'https://api.test/api/personal-binders/shared/page-images/open/x', expiresAt: new Date(Date.now() + 600_000).toISOString(), width: 1080 });
    await fetchPageImageLink('tok', full);
    await fetchPageImageLink('tok', thumb);
    expect(mockedRequest.mock.calls.map(([url]) => url)).toEqual([
      '/api/personal-binders/shared/21/pages/3?width=1080',
      '/api/personal-binders/shared/21/pages/3?preset=thumb',
    ]);
    // 캐시된 링크는 다시 요청하지 않는다.
    await fetchPageImageLink('tok', full);
    expect(mockedRequest).toHaveBeenCalledTimes(2);
    await prefetchViewerPageLinks('tok', shared, [4], 1080);
    expect(mockedRequest.mock.calls[2]![0]).toBe('/api/personal-binders/shared/21/pages/4?width=1080');
    expect(personalBinderQueryKeys.sharedPages('21')).not.toEqual(personalBinderQueryKeys.pages('21'));
  });

  it('maps 401/403/404/5xx to messages without throwing', async () => {
    expect(sharedViewerErrorMessage(new ApiError('공유 바인더를 찾을 수 없습니다.', 404))).toBe(SHARED_VIEWER_COPY.notFound);
    for (const status of [401, 403, 500, 503]) {
      const message = sharedViewerErrorMessage(new ApiError('x', status));
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    }
    expect(sharedViewerErrorMessage(new Error('network'))).toBeTruthy();
    // 링크 실패는 예외를 밖으로 던지지 않는다(prefetch 는 조용히 무시).
    mockedRequest.mockRejectedValue(new ApiError('forbidden', 403));
    await expect(prefetchViewerPageLinks('tok', shared, [9], 1080)).resolves.toBeUndefined();
  });

  it('reuses BinderViewerScreen for direct view and keeps 가져와서 보기', () => {
    const route = readRepo('app', '(app)', 'customer-consulting', 'shared-binders', '[shareId]', 'view.tsx');
    expect(route).toContain("from '../../../../../src/features/personal-binders/BinderViewerScreen'");
    expect(route).toContain('<BinderViewerScreen shareId=');
    const detail = readRepo('src', 'features', 'shared-binders', 'SharedBinderDetailScreen.tsx');
    expect(detail).toContain("pathname: '/customer-consulting/shared-binders/[shareId]/view'");
    expect(detail).toContain('label="가져와서 보기"');
    expect(detail).toContain('label="바로 보기"');
    const viewer = readRepo('src', 'features', 'personal-binders', 'BinderViewerScreen.tsx');
    // 공유 출처는 읽기 전용: 편집·내보내기 숨김.
    expect(viewer).toMatch(/isShared \? \(\s*<EmptyState title=\{SHARED_VIEWER_COPY\.emptyTitle\}/);
    expect(viewer).toMatch(/\{isShared \? null : <Button\s+label="전체 PDF"/);
    const sharedFeature = ['SharedBinderDetailScreen.tsx', 'SharedBinderListScreen.tsx'].map((file) => readRepo('src', 'features', 'shared-binders', file)).join('\n');
    expect(sharedFeature).not.toMatch(/BinderZoomSurface|pdfjs|react-native-pdf|WebView/);
  });
});
