import { uploadAllNewsAttachment } from '../customerNewsAllAttachmentUpload';

jest.mock('../../../api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  apiRequest: jest.fn(async (path: string) => {
    if (path === '/api/storage/files/presign') {
      return {
        fileId: 1,
        uploadUrl: 'https://upload.example/put',
        fileUrl: 'https://cdn.example/file.png',
        objectKey: 'crm-platform/dev/file.png',
      };
    }
    return { ok: true };
  }),
}));

describe('uploadAllNewsAttachment', () => {
  it('uses storage presign without customerId for broadcast scope', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ blob: async () => new Blob(['x']) } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);

    const result = await uploadAllNewsAttachment('token', {
      uri: 'file:///tmp/a.png',
      name: 'a.png',
      mimeType: 'image/png',
      size: 4,
      kind: 'image',
    });

    expect(result.url).toBe('https://cdn.example/file.png');
    expect(result.objectKey).toBe('crm-platform/dev/file.png');
    fetchMock.mockRestore();
  });
});
