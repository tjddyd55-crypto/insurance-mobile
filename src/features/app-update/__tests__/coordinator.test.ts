import {
  OTA_APPLY_MESSAGE,
  PLAY_AVAILABLE_MESSAGE,
  PLAY_DOWNLOADED_MESSAGE,
} from '../policy';
import {
  createAppUpdateCoordinator,
  type AppUpdatePorts,
  type OtaPrepareResult,
  type PlayFlowResult,
} from '../coordinator';

const TIMEOUT_MS = 5_000;
const THROTTLE_MS = 60_000;

function createHarness(overrides: Partial<AppUpdatePorts> = {}) {
  let now = 1_000;
  const prepareOta = jest.fn<Promise<OtaPrepareResult>, []>(async () => ({ status: 'none' }));
  const reloadOta = jest.fn(async () => undefined);
  const checkPlay = jest.fn(async () => 'no_update' as const);
  const startPlay = jest.fn<Promise<PlayFlowResult>, [AppUpdatePorts['playFlow']]>(
    async () => 'accepted',
  );
  const completePlay = jest.fn(async () => undefined);
  const ports: AppUpdatePorts = {
    now: () => now,
    timeoutMs: TIMEOUT_MS,
    foregroundThrottleMs: THROTTLE_MS,
    otaEnabled: () => true,
    prepareOta,
    reloadOta,
    playEnabled: () => true,
    playFlow: 'flexible',
    checkPlay,
    startPlay,
    completePlay,
    ...overrides,
  };
  return {
    coordinator: createAppUpdateCoordinator(ports),
    prepareOta: ports.prepareOta,
    reloadOta: ports.reloadOta,
    checkPlay: ports.checkPlay,
    startPlay: ports.startPlay,
    completePlay: ports.completePlay,
    setNow(value: number) {
      now = value;
    },
  };
}

beforeEach(() => {
  jest.useRealTimers();
});

test('no OTA update enters normally without a prompt or reload', async () => {
  const { coordinator, prepareOta, reloadOta, checkPlay } = createHarness({
    playEnabled: () => false,
  });
  await coordinator.start('launch');
  expect(prepareOta).toHaveBeenCalledTimes(1);
  expect(reloadOta).not.toHaveBeenCalled();
  expect(checkPlay).not.toHaveBeenCalled();
  expect(coordinator.getSnapshot()).toEqual({ phase: 'settled', prompt: null });
});

test('available OTA is fetched, prompted, then reloaded without a Play prompt', async () => {
  const order: string[] = [];
  const { coordinator, checkPlay, reloadOta } = createHarness({
    prepareOta: jest.fn(async () => {
      order.push('fetch');
      return { status: 'ready' as const, updateId: 'new-id' };
    }),
    reloadOta: jest.fn(async () => {
      order.push('reload');
    }),
  });
  await coordinator.start('launch');
  expect(coordinator.getSnapshot().prompt).toMatchObject({
    id: 'ota',
    message: OTA_APPLY_MESSAGE,
    confirmLabel: '지금 적용',
  });
  expect(checkPlay).not.toHaveBeenCalled();
  await coordinator.accept();
  expect(order).toEqual(['fetch', 'reload']);
  expect(reloadOta).toHaveBeenCalledTimes(1);
  expect(checkPlay).not.toHaveBeenCalled();
  expect(coordinator.getSnapshot().prompt).toBeNull();
});

test('OTA error falls through to normal entry', async () => {
  const { coordinator, checkPlay } = createHarness({
    prepareOta: jest.fn(async () => {
      throw new Error('offline');
    }),
    playEnabled: () => false,
  });
  await expect(coordinator.start('launch')).resolves.toBeUndefined();
  expect(checkPlay).not.toHaveBeenCalled();
  expect(coordinator.getSnapshot()).toEqual({ phase: 'settled', prompt: null });
});

test('Play with no update shows nothing', async () => {
  const { coordinator, startPlay } = createHarness();
  await coordinator.start('launch');
  expect(startPlay).not.toHaveBeenCalled();
  expect(coordinator.getSnapshot().prompt).toBeNull();
});

test('Play update available prompts, and later returns to normal entry', async () => {
  const { coordinator, startPlay } = createHarness({
    checkPlay: jest.fn(async () => 'available' as const),
  });
  await coordinator.start('launch');
  expect(coordinator.getSnapshot().prompt).toMatchObject({
    id: 'play_available',
    message: PLAY_AVAILABLE_MESSAGE,
    confirmLabel: '업데이트',
    dismissLabel: '나중에',
  });
  await coordinator.dismiss();
  expect(startPlay).not.toHaveBeenCalled();
  expect(coordinator.getSnapshot()).toEqual({ phase: 'settled', prompt: null });
});

test('flexible download completion shows the install prompt', async () => {
  const { coordinator, startPlay, completePlay } = createHarness({
    checkPlay: jest.fn(async () => 'available' as const),
  });
  await coordinator.start('launch');
  await coordinator.accept();
  expect(startPlay).toHaveBeenCalledWith('flexible');
  expect(coordinator.getSnapshot()).toEqual({ phase: 'play_downloading', prompt: null });
  coordinator.notifyPlayDownloaded();
  expect(coordinator.getSnapshot().prompt).toMatchObject({
    id: 'play_install',
    message: PLAY_DOWNLOADED_MESSAGE,
    confirmLabel: '지금 설치',
  });
  await coordinator.accept();
  expect(completePlay).toHaveBeenCalledTimes(1);
});

test('an already downloaded Play update prompts to install', async () => {
  const { coordinator, startPlay } = createHarness({
    checkPlay: jest.fn(async () => 'downloaded' as const),
  });
  await coordinator.start('launch');
  expect(coordinator.getSnapshot().prompt?.id).toBe('play_install');
  expect(startPlay).not.toHaveBeenCalled();
});

test('OTA and Play prompts never overlap', async () => {
  const seen: (string | null)[] = [];
  const { coordinator, checkPlay } = createHarness({
    prepareOta: jest.fn(async () => ({ status: 'ready' as const, updateId: 'new-id' })),
    checkPlay: jest.fn(async () => {
      expect(coordinator.getSnapshot().prompt).toBeNull();
      return 'available' as const;
    }),
  });
  const stop = coordinator.subscribe((snapshot) => {
    seen.push(snapshot.prompt?.id ?? null);
  });
  await coordinator.start('launch');
  expect(checkPlay).not.toHaveBeenCalled();
  expect(coordinator.getSnapshot().prompt?.id).toBe('ota');
  await coordinator.dismiss();
  expect(coordinator.getSnapshot().prompt?.id).toBe('play_available');
  expect(seen.filter((id) => id !== null)).toEqual(['ota', 'play_available']);
  stop();
});

test('OTA timeout continues into Play and still enters', async () => {
  jest.useFakeTimers();
  const { coordinator, checkPlay } = createHarness({
    prepareOta: jest.fn(() => new Promise<OtaPrepareResult>(() => undefined)),
    playEnabled: () => true,
  });
  const pending = coordinator.start('launch');
  await jest.advanceTimersByTimeAsync(TIMEOUT_MS);
  await pending;
  expect(checkPlay).toHaveBeenCalledTimes(1);
  expect(coordinator.getSnapshot()).toEqual({ phase: 'settled', prompt: null });
});

test('Play timeout enters normally without a prompt', async () => {
  jest.useFakeTimers();
  const { coordinator, startPlay } = createHarness({
    checkPlay: jest.fn(() => new Promise<'available'>(() => undefined)),
  });
  const pending = coordinator.start('launch');
  await jest.advanceTimersByTimeAsync(TIMEOUT_MS);
  await pending;
  expect(startPlay).not.toHaveBeenCalled();
  expect(coordinator.getSnapshot()).toEqual({ phase: 'settled', prompt: null });
});

test('foreground checks are throttled and do not loop', async () => {
  const { coordinator, prepareOta, setNow } = createHarness({ playEnabled: () => false });
  await coordinator.start('launch');
  setNow(1_000 + THROTTLE_MS - 1);
  await coordinator.start('foreground');
  expect(prepareOta).toHaveBeenCalledTimes(1);
  setNow(1_000 + THROTTLE_MS);
  await coordinator.start('foreground');
  expect(prepareOta).toHaveBeenCalledTimes(2);
});

test('immediate flow does not show the flexible prompt', async () => {
  const { coordinator, startPlay } = createHarness({
    playFlow: 'immediate',
    checkPlay: jest.fn(async () => 'available' as const),
    startPlay: jest.fn(async () => 'accepted' as const),
  });
  await coordinator.start('launch');
  expect(startPlay).toHaveBeenCalledWith('immediate');
  expect(coordinator.getSnapshot().prompt).toBeNull();
  expect(coordinator.getSnapshot().phase).toBe('settled');
});
