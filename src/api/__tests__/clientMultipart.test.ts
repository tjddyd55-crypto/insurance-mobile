import { apiRequest, setUnauthorizedHandler } from '../client';
import { getClientContextHeaders } from '../clientContext';

function mockResponse(status: number, payload: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => payload } as Response;
}

describe('apiRequest multipart', () => {
  afterEach(() => {
    setUnauthorizedHandler(null);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('passes FormData through so fetch can set its boundary and keeps shared headers', async () => {
    const body = new FormData();
    body.append('file', 'test-image');
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(200, { success: true, data: { rows: [] } }));
    await expect(apiRequest('https://example.test/upload', { token: 'test-token', method: 'POST', body })).resolves.toEqual({ rows: [] });

    const request = fetchMock.mock.calls[0][1];
    expect(request?.body).toBe(body);
    expect(request?.headers).toMatchObject({ ...getClientContextHeaders(), Authorization: 'Bearer test-token' });
    expect(request?.headers).not.toHaveProperty('Content-Type');
  });

  it('keeps the default JSON header for other callers', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(204, {}));
    await expect(apiRequest('https://example.test/json', { method: 'POST', body: '{}' })).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('preserves multipart API errors and invokes the shared unauthorized handler once', async () => {
    const unauthorized = jest.fn();
    setUnauthorizedHandler(unauthorized);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse(401, { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }));

    const upload = () => apiRequest('https://example.test/upload', { method: 'POST', body: new FormData() });
    await expect(upload()).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
    await expect(upload()).rejects.toHaveProperty('status', 401);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('uses the extended timeout and maps an aborted upload to ApiError', async () => {
    jest.useFakeTimers();
    jest.spyOn(globalThis, 'fetch').mockImplementation((_url, request) => new Promise((_resolve, reject) => {
      request?.signal?.addEventListener('abort', () => reject(Object.assign(new Error(), { name: 'FetchError' })));
    }));
    const upload = apiRequest('https://example.test/upload', { method: 'POST', body: new FormData(), timeoutMs: 90_000 });
    const rejection = expect(upload).rejects.toMatchObject({ status: 0, message: expect.stringContaining('요청 시간') });
    jest.advanceTimersByTime(30_000);
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(60_000);
    await rejection;
  });
});
