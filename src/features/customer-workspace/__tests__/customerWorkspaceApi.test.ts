import { uploadCustomerFile } from '../customerWorkspaceApi';

describe('uploadCustomerFile folder contract', () => {
  const originalFetch = globalThis.fetch;
  const savedBodies: unknown[] = [];

  afterEach(() => {
    globalThis.fetch = originalFetch;
    savedBodies.length = 0;
  });

  function mockUploadFlow() {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.startsWith('file://')) {
        return {
          ok: true,
          blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
        } as Response;
      }

      if (url.includes('/api/storage/files/presign')) {
        savedBodies.push(JSON.parse(String(init?.body)));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              fileId: 99,
              uploadUrl: 'https://upload.example/put',
              fileUrl: 'https://cdn.example/file.pdf',
              objectKey: 'obj/key.pdf',
            },
          }),
        } as Response;
      }

      if (url === 'https://upload.example/put') {
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      }

      if (url.includes('/api/storage/files') && init?.method === 'POST') {
        savedBodies.push(JSON.parse(String(init?.body)));
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { id: 99 } }),
        } as Response;
      }

      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;
  }

  it('uploads to root when folderId is null', async () => {
    mockUploadFlow();
    await uploadCustomerFile(
      'token',
      711,
      { uri: 'file:///tmp/root.pdf', name: 'root.pdf', mimeType: 'application/pdf', size: 3 },
      null,
    );

    const saveBody = savedBodies[1] as { folderId: number | null; customerId: number };
    expect(saveBody.folderId).toBeNull();
    expect(saveBody.customerId).toBe(711);
  });

  it('uploads into the current folder when folderId is provided', async () => {
    mockUploadFlow();
    await uploadCustomerFile(
      'token',
      711,
      { uri: 'file:///tmp/child.pdf', name: 'child.pdf', mimeType: 'application/pdf', size: 3 },
      42,
    );

    const saveBody = savedBodies[1] as { folderId: number | null };
    expect(saveBody.folderId).toBe(42);
  });

  it('preserves special-character filenames end-to-end', async () => {
    mockUploadFlow();
    const fileName = '보험금청구서,진단서.pdf';
    await uploadCustomerFile(
      'token',
      711,
      { uri: 'file:///tmp/special.pdf', name: fileName, mimeType: 'application/pdf', size: 3 },
      7,
    );

    const presignBody = savedBodies[0] as { fileName: string };
    const saveBody = savedBodies[1] as { fileName: string; displayName: string; folderId: number };
    expect(presignBody.fileName).toBe(fileName);
    expect(saveBody.fileName).toBe(fileName);
    expect(saveBody.displayName).toBe(fileName);
    expect(saveBody.folderId).toBe(7);
  });
});
