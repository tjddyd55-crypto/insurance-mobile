import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { createStorageFolder, STORAGE_FOLDER_CREATE_TIMEOUT_MS } from '../storageApi';

type FetchMock = jest.Mock<Promise<unknown>, [string, RequestInit]>;
const originalFetch = global.fetch;
function setFetch(impl: (url: string, init: RequestInit) => Promise<unknown>): FetchMock {
  const mock = jest.fn(impl) as FetchMock;
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}
function response(status: number, json: () => Promise<unknown>) {
  return { status, ok: status >= 200 && status < 300, json } as unknown as Response;
}
const never = () => new Promise<never>(() => undefined);

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

async function settleWithin(promise: Promise<unknown>, ms: number) {
  const outcome = promise.then(() => 'resolved', (e: Error) => `rejected:${e.message}`);
  await jest.advanceTimersByTimeAsync(ms);
  return Promise.race([outcome, Promise.resolve('pending')]);
}

describe('createStorageFolder 전체 요청 deadline (P1-A)', () => {
  beforeEach(() => jest.useFakeTimers());

  it('POST를 1회 보내고 성공 응답이면 즉시 끝난다', async () => {
    const fetchMock = setFetch(async () => response(201, async () => ({ id: 1 })));
    await expect(settleWithin(createStorageFolder('tok', ' 계약서 ', null), 0)).resolves.toBe('resolved');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/storage\/folders$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ name: '계약서', customerId: null, parentId: null });
  });

  it('서버 오류 응답이면 오류로 끝난다', async () => {
    setFetch(async () => response(400, async () => ({ message: '이미 있는 폴더입니다.' })));
    await expect(settleWithin(createStorageFolder('tok', 'a', null), 0)).resolves.toBe('rejected:이미 있는 폴더입니다.');
  });

  it('fetch가 abort를 무시하고 영원히 응답하지 않아도 deadline에 실패로 끝난다', async () => {
    setFetch(never);
    const p = createStorageFolder('tok', 'a', null);
    await expect(settleWithin(p, STORAGE_FOLDER_CREATE_TIMEOUT_MS - 1)).resolves.toBe('pending');
    await expect(settleWithin(p, 1)).resolves.toMatch(/^rejected:요청 시간이 초과/);
  });

  it('헤더는 왔지만 본문(json) 읽기가 끝나지 않아도 deadline에 실패로 끝난다', async () => {
    setFetch(async () => response(201, never));
    await expect(settleWithin(createStorageFolder('tok', 'a', null), STORAGE_FOLDER_CREATE_TIMEOUT_MS)).resolves.toMatch(/^rejected:요청 시간이 초과/);
  });

  it('본문이 늦게(deadline 전) 오면 성공으로 끝난다', async () => {
    setFetch(async () => response(201, () => new Promise((r) => setTimeout(() => r({}), 5_000))));
    await expect(settleWithin(createStorageFolder('tok', 'a', null), 5_000)).resolves.toBe('resolved');
  });

  it('mutation isPending(처리 중)이 무응답/본문 지연 후 deadline에 false가 된다', async () => {
    for (const impl of [never, async () => response(201, never)]) {
      setFetch(impl);
      const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
      const observer = new MutationObserver(client, { mutationFn: () => createStorageFolder('tok', 'a', null) });
      const run = observer.mutate().catch(() => undefined);
      await jest.advanceTimersByTimeAsync(0);
      expect(observer.getCurrentResult().isPending).toBe(true);
      await jest.advanceTimersByTimeAsync(STORAGE_FOLDER_CREATE_TIMEOUT_MS);
      await run;
      expect(observer.getCurrentResult().isPending).toBe(false);
      expect(observer.getCurrentResult().isError).toBe(true);
      client.clear();
    }
  });
});
