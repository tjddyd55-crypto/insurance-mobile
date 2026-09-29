import {
  createStorageFileDownloadUrl,
  createStorageOpenUrl,
} from '../storageApi';

describe('storageApi open-token contract', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockOpenToken() {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.includes('/open-token')) {
        throw new Error(`unexpected fetch: ${url}`);
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          openUrl: '/api/storage/files/open/test-token/file.pdf',
        }),
      } as Response;
    }) as typeof fetch;
  }

  it('creates inline preview URLs', async () => {
    mockOpenToken();
    const url = await createStorageOpenUrl('token', 5);
    expect(url).toContain('/api/storage/files/open/test-token/file.pdf');
    const [, init] = jest.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({});
  });

  it('creates attachment download URLs', async () => {
    mockOpenToken();
    const url = await createStorageFileDownloadUrl('token', 5);
    expect(url).toContain('/api/storage/files/open/test-token/file.pdf');
    const [, init] = jest.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ disposition: 'attachment' });
  });
});
