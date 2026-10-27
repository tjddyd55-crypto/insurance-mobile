import { validateStorageFolderName } from '../storageApi';

jest.mock('../../../api/client', () => ({ ApiError: class extends Error {}, apiRequest: jest.fn(), resolveApiUrl: (p: string) => p }));

describe('validateStorageFolderName', () => {
  it('mirrors server rules', () => {
    expect(validateStorageFolderName('')).not.toBeNull();
    expect(validateStorageFolderName('가'.repeat(13))).not.toBeNull();
    expect(validateStorageFolderName('전체')).not.toBeNull();
    expect(validateStorageFolderName(' 계약서 ')).toBeNull();
  });
});

describe('validateStorageFolderName charset (server STORAGE_FOLDER_NAME_REGEX)', () => {
  it('rejects underscore and symbols the server rejects with 400', () => {
    expect(validateStorageFolderName('QA_safe_f2')).toMatch(/한글, 영문, 숫자, 공백/);
    expect(validateStorageFolderName('a-b')).not.toBeNull();
    expect(validateStorageFolderName('QA safe f2')).toBeNull();
    expect(validateStorageFolderName('QAsafe2')).toBeNull();
    expect(validateStorageFolderName('ㄱ계약 2026')).toBeNull();
  });
  it('normalizes inner whitespace like the server', () => {
    expect(validateStorageFolderName('ab    cd   ef  gh')).toBeNull();
  });
});
