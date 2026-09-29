import { ApiError } from '../../../api/client';
import {
  BINDER_API_UNAVAILABLE_MESSAGE,
  binderActionMessage,
  isBinderApiUnavailable,
  isBinderConflict,
} from '../binderMessages';
import {
  binderExportFileName,
  buildBinderViewerPages,
  formatSelectedPages,
  pageSelectionForSave,
  parsePageRangeInput,
} from '../personalBinderModel';
import { edgeToEdgePageSize } from '../binderPageLayout';
import { personalBinderPaths } from '../personalBinderPaths';
import { sha256HexSync } from '../sha256Hex';
import type { PersonalBinder } from '../types';

describe('binder page layout', () => {
  it('fills the device width and keeps the page aspect ratio', () => {
    expect(edgeToEdgePageSize(390).width).toBe(390);
    expect(edgeToEdgePageSize(390, 0.5)).toEqual({ width: 390, height: 780 });
    expect(edgeToEdgePageSize(412, 1)).toEqual({ width: 412, height: 412 });
    expect(edgeToEdgePageSize(360, 0).width).toBe(360);
  });
});

describe('personal binder API mapping', () => {
  it('uses the same paths as the PC binder client', () => {
    expect(personalBinderPaths.binders).toBe('/api/personal-binders');
    expect(personalBinderPaths.binder('binder 1')).toBe('/api/personal-binders/binder%201');
    expect(personalBinderPaths.exportPdf('b1')).toBe('/api/personal-binders/b1/export');
    expect(personalBinderPaths.materials).toBe('/api/personal-binders/materials');
    expect(personalBinderPaths.materialDuplicateCheck).toBe('/api/personal-binders/materials/check-duplicate');
    expect(personalBinderPaths.sectionItems('s1')).toBe('/api/personal-binders/sections/s1/items');
    expect(personalBinderPaths.reorderItems('s1')).toBe('/api/personal-binders/sections/s1/items/reorder');
    expect(personalBinderPaths.item('i1')).toBe('/api/personal-binders/items/i1');
    expect(personalBinderPaths.binderPages('b1')).toBe('/api/personal-binders/b1/pages');
    expect(personalBinderPaths.binderPage('b1', 2)).toBe('/api/personal-binders/b1/pages/2');
    expect(personalBinderPaths.materialPage('m1', 1)).toBe('/api/personal-binders/materials/m1/pages/1');
  });

  it('treats a missing route as unavailable and keeps 409 copy', () => {
    expect(isBinderApiUnavailable(new ApiError('요청한 API를 찾을 수 없습니다.', 404))).toBe(true);
    expect(isBinderApiUnavailable(new ApiError('로그인이 필요합니다.', 401))).toBe(false);
    expect(isBinderApiUnavailable(new ApiError('만료되었거나 유효하지 않은 링크입니다.', 410))).toBe(false);
    expect(isBinderConflict(new ApiError('이 자료는 2개의 바인더에서 사용 중입니다.', 409))).toBe(true);
    expect(binderActionMessage(new ApiError('이 자료는 2개의 바인더에서 사용 중입니다.', 409), '실패')).toBe(
      '이 자료는 2개의 바인더에서 사용 중입니다.',
    );
    expect(BINDER_API_UNAVAILABLE_MESSAGE).toContain('프로덕션');
  });
});

describe('personal binder pages', () => {
  const binder: PersonalBinder = {
    id: 'b1',
    title: '상담/책자',
    description: '',
    createdAt: '',
    updatedAt: '',
    sections: [
      {
        id: 's2',
        binderId: 'b1',
        title: '나중',
        sortOrder: 1,
        items: [
          {
            id: 'i2',
            sectionId: 's2',
            materialId: 'm1',
            sortOrder: 0,
            pageSelection: [2],
            material: {
              id: 'm1',
              fileId: 9,
              title: '약관',
              originalFileName: 'a.pdf',
              mimeType: 'application/pdf',
              fileSize: 10,
              pageCount: 3,
            },
          },
        ],
      },
      {
        id: 's1',
        binderId: 'b1',
        title: '처음',
        sortOrder: 0,
        items: [
          {
            id: 'i1',
            sectionId: 's1',
            materialId: 'm1',
            sortOrder: 0,
            pageSelection: null,
            material: {
              id: 'm1',
              fileId: 9,
              title: '약관',
              originalFileName: 'a.pdf',
              mimeType: 'application/pdf',
              fileSize: 10,
              pageCount: 2,
            },
          },
        ],
      },
    ],
  };

  it('expands selected pages in section order', () => {
    expect(buildBinderViewerPages(binder).map((page) => page.key)).toEqual(['i1:1', 'i1:2', 'i2:2']);
    expect(buildBinderViewerPages(binder)[0]?.sectionTitle).toBe('처음');
  });

  it('parses page ranges and treats a full selection as all pages', () => {
    expect(parsePageRangeInput('1-2, 4', 4)).toEqual({ ok: true, pages: [1, 2, 4] });
    expect(parsePageRangeInput('5', 4).ok).toBe(false);
    expect(formatSelectedPages([1, 2, 3, 5])).toBe('1-3, 5');
    expect(pageSelectionForSave([1, 2, 3], 3)).toBeNull();
    expect(pageSelectionForSave([2], 3)).toEqual([2]);
    expect(binderExportFileName('상담/책자')).toBe('상담 책자.pdf');
  });

  it('hashes pdf bytes with sha256', () => {
    expect(sha256HexSync(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
