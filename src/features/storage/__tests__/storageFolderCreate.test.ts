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
