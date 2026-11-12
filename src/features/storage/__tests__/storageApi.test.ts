import {
  deleteStorageFilesBatch,
  deleteStorageFile,
  fetchStorageFileBinderDeleteImpact,
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

describe('storage deletion contracts', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });
  beforeEach(() => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ deleted: [1], failed: [{ id: 2, reason: 'USED_IN_BINDER' }] }),
    } as Response)) as typeof fetch;
  });
  it.each([false, true])('sends batch IDs with explicit cleanup=%s and preserves partial results', async (cleanup) => {
    const result = await deleteStorageFilesBatch('token', [1, 2], cleanup);
    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/api\/storage\/files\/batch$/);
    expect(init?.method).toBe('DELETE');
    expect(JSON.parse(String(init?.body))).toEqual({ fileIds: [1, 2], removeBinderReferences: cleanup });
    expect(result).toEqual({ deleted: [1], failed: [{ id: 2, reason: 'USED_IN_BINDER' }] });
  });
  it('defaults batch cleanup to false', async () => {
    await deleteStorageFilesBatch('token', [1]);
    expect(JSON.parse(String(jest.mocked(fetch).mock.calls[0][1]?.body))).toEqual({ fileIds: [1], removeBinderReferences: false });
  });
  it('previews binder impact with the web route', async () => {
    await fetchStorageFileBinderDeleteImpact('token', 7);
    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/api\/storage\/files\/7\/binder-delete-impact$/);
    expect(init?.method).toBe('GET');
  });
  it('sends the single-delete cleanup alias only when confirmed', async () => {
    await deleteStorageFile('token', 7, true);
    const [url, init] = jest.mocked(fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/api\/storage\/files\/7$/);
    expect(init?.method).toBe('DELETE');
    expect(JSON.parse(String(init?.body))).toEqual({ removeBinderReferences: true });
    await deleteStorageFile('token', 8);
    expect(jest.mocked(fetch).mock.calls[1][1]?.body).toBeUndefined();
  });
});
