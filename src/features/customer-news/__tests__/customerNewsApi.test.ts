import { uploadNewsAttachment } from '../customerNewsApi';

jest.mock('../customerNewsAllAttachmentUpload', () => ({
  uploadAllNewsAttachment: jest.fn(async () => ({
    kind: 'image',
    url: 'https://cdn.example/all.png',
    fileName: 'all.png',
    sortOrder: 0,
  })),
}));

jest.mock('../../../api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  apiRequest: jest.fn(),
  resolveApiUrl: (path: string) => `https://api.example${path}`,
}));

const { uploadAllNewsAttachment } = jest.requireMock('../customerNewsAllAttachmentUpload');

describe('uploadNewsAttachment', () => {
  it('routes broadcast attachments to storage upload helper', async () => {
    const asset = {
      uri: 'file:///tmp/a.png',
      name: 'a.png',
      mimeType: 'image/png',
      size: 4,
      kind: 'image' as const,
    };
    const result = await uploadNewsAttachment('token', asset, 'all', null);
    expect(uploadAllNewsAttachment).toHaveBeenCalledWith('token', asset);
    expect(result.url).toBe('https://cdn.example/all.png');
  });

  it('requires customerId for personal attachments', async () => {
    const asset = {
      uri: 'file:///tmp/a.png',
      name: 'a.png',
      mimeType: 'image/png',
      size: 4,
      kind: 'image' as const,
    };
    await expect(uploadNewsAttachment('token', asset, 'personal', null)).rejects.toThrow(
      '받을 고객을 선택해 주세요.',
    );
  });
});
