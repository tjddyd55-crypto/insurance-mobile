import {
  calculateStorageUsageRatio,
  formatStorageDate,
  formatStorageFileType,
  formatStorageSize,
  normalizeStorageFile,
  normalizeStorageFolder,
  normalizeStorageQuota,
  normalizeStorageUsageBreakdown,
} from '../storageModel';

describe('storageModel presentation', () => {
  test('사용량 비율을 0과 1 사이로 제한한다', () => {
    expect(calculateStorageUsageRatio(25, 100)).toBe(0.25);
    expect(calculateStorageUsageRatio(120, 100)).toBe(1);
    expect(calculateStorageUsageRatio(10, 0)).toBe(0);
  });

  test('파일 형식을 사용자 용어로 표시한다', () => {
    expect(formatStorageFileType('application/pdf')).toBe('PDF');
    expect(formatStorageFileType('image/jpeg')).toBe('이미지');
  });

  test('잘못된 날짜를 명시적으로 표시한다', () => {
    expect(formatStorageDate('not-a-date')).toBe('날짜 정보 없음');
  });

  test('전체 파일 사용처 집계를 안전하게 정규화한다', () => {
    expect(normalizeStorageUsageBreakdown({
      totalCount: 126,
      totalSize: 2048,
      summary: [{ source: 'claim-file', label: '청구 첨부', count: 34, size: 1024 }],
    })).toEqual({
      totalCount: 126,
      totalSize: 2048,
      summary: [{ source: 'claim-file', label: '청구 첨부', count: 34, size: 1024 }],
    });
  });
});
describe('storageModel', () => { test('normalizes storage API contracts', () => { expect(normalizeStorageFolder({ id: 1, name: '서류', parent_id: null })).toMatchObject({ id: 1, parentId: null }); expect(normalizeStorageFile({ id: 2, display_name: '청약.pdf', file_size: 1024 })).toMatchObject({ id: 2, displayName: '청약.pdf', fileSize: 1024 }); expect(normalizeStorageQuota({ used_bytes: 100, limit_bytes: 200 })).toEqual({ usedBytes: 100, limitBytes: 200, pendingUploadBytes: 0 }); }); test('formats sizes', () => expect(formatStorageSize(1024 ** 2)).toBe('1.0 MB')); });
