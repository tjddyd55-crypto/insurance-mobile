import { MutationObserver, onlineManager, QueryClient } from '@tanstack/react-query';
import { createStorageFolder, STORAGE_FOLDER_CREATE_TIMEOUT_MS, storageFolderCreateMutationOptions } from '../storageApi';

const originalFetch = globalThis.fetch;
const never = () => new Promise<never>(() => undefined);
function response(status: number, json: () => Promise<unknown>) {
  return { status, ok: status >= 200 && status < 300, json } as unknown as Response;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  onlineManager.setOnline(true);
  jest.useRealTimers();
});

/** StorageScreen과 동일한 옵션으로 mutation을 돌려 '처리 중'(isPending)이 반드시 풀리는지 본다. */
async function runCreate(fetchImpl: () => Promise<unknown>) {
  const fetchMock = jest.fn(fetchImpl);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
  const observer = new MutationObserver(client, storageFolderCreateMutationOptions(() => createStorageFolder('tok', 'QA폴더', null)));
  const run = observer.mutate().catch(() => undefined);
  await jest.advanceTimersByTimeAsync(STORAGE_FOLDER_CREATE_TIMEOUT_MS + 1);
  await Promise.race([run, Promise.resolve()]);
  const r = observer.getCurrentResult();
  client.clear();
  return { r, fetchMock };
}

describe('폴더 생성 mutation: 어떤 경우에도 처리 중이 풀린다 (P1-1)', () => {
  beforeEach(() => jest.useFakeTimers());

  it('onlineManager가 offline이어도 paused로 멈추지 않고 요청을 보낸다', async () => {
    onlineManager.setOnline(false);
    const { r, fetchMock } = await runCreate(async () => response(201, async () => ({ id: 1 })));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.isPaused).toBe(false);
    expect(r.isPending).toBe(false);
    expect(r.isSuccess).toBe(true);
  });

  it('offline + 응답 없음이어도 deadline 오류로 끝난다', async () => {
    onlineManager.setOnline(false);
    const { r } = await runCreate(never);
    expect(r.isPending).toBe(false);
    expect(r.error?.message).toMatch(/요청 시간이 초과/);
  });

  it.each([
    ['헤더 전 hang', never],
    ['헤더 후 본문 미도착', async () => response(201, never)],
    ['abort 무시(fetch가 signal 무시)', () => new Promise<never>(() => undefined)],
  ])('%s → deadline 후 오류 표시 가능 상태', async (_n, impl) => {
    const { r } = await runCreate(impl as () => Promise<unknown>);
    expect(r.isPending).toBe(false);
    expect(r.isError).toBe(true);
  });
});
