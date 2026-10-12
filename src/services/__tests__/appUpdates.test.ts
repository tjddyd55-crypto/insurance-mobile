import * as Updates from 'expo-updates';

import {
  prepareAppUpdate,
  reloadPreparedAppUpdate,
  resetAppUpdateSessionForTests,
  shouldRunAppUpdates,
} from '../appUpdates';

jest.mock('expo-updates', () => ({
  isEnabled: true,
  channel: 'native-production',
  runtimeVersion: '1.0.4',
  updateId: 'running-id',
  isEmbeddedLaunch: false,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

const check = Updates.checkForUpdateAsync as jest.Mock;
const fetch = Updates.fetchUpdateAsync as jest.Mock;
const reload = Updates.reloadAsync as jest.Mock;
const logger = jest.fn();
const noUpdate = { isAvailable: false };
const available = { isAvailable: true, manifest: { id: 'new-id' } };
const downloaded = { isNew: true, manifest: { id: 'new-id' } };

beforeEach(() => {
  jest.resetAllMocks();
  resetAppUpdateSessionForTests();
  Object.defineProperty(Updates, 'channel', { value: 'native-production', configurable: true });
  Object.defineProperty(Updates, 'updateId', { value: 'running-id', configurable: true });
  Object.defineProperty(Updates, 'isEnabled', { value: true, configurable: true });
  check.mockResolvedValue(noUpdate);
  fetch.mockResolvedValue(downloaded);
  reload.mockResolvedValue(undefined);
});

test('no update completes without fetch or reload', async () => {
  await expect(prepareAppUpdate({ isDev: false, logger })).resolves.toEqual({ status: 'none' });
  expect(check).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
});

test('production update is fetched and reported ready without reloading', async () => {
  check.mockResolvedValue(available);
  await expect(prepareAppUpdate({ isDev: false, logger })).resolves.toEqual({
    status: 'ready',
    updateId: 'new-id',
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(reload).not.toHaveBeenCalled();
  expect(fetch.mock.invocationCallOrder[0]).toBeGreaterThan(check.mock.invocationCallOrder[0]);
});

test('same running update id is not ready to reload', async () => {
  check.mockResolvedValue(available);
  fetch.mockResolvedValue({ isNew: true, manifest: { id: 'running-id' } });
  await expect(prepareAppUpdate({ isDev: false, logger })).resolves.toEqual({ status: 'none' });
  expect(reload).not.toHaveBeenCalled();
});

test.each([
  { isNew: false },
  { isNew: true, manifest: {} },
  { isNew: false, isRollBackToEmbedded: true },
])('does not treat unsafe fetch result as ready %j', async (result) => {
  check.mockResolvedValue(available);
  fetch.mockResolvedValue(result);
  await expect(prepareAppUpdate({ isDev: false, logger })).resolves.toEqual({ status: 'none' });
});

test('check failure returns failed and does not throw', async () => {
  check.mockRejectedValue(new Error('offline'));
  await expect(prepareAppUpdate({ isDev: false, logger })).resolves.toEqual({ status: 'failed' });
  expect(fetch).not.toHaveBeenCalled();
  expect(logger).toHaveBeenCalledWith('check_failed', 'offline');
});

test('fetch failure returns failed without reload', async () => {
  check.mockResolvedValue(available);
  fetch.mockRejectedValue(new Error('download failed'));
  await expect(prepareAppUpdate({ isDev: false, logger })).resolves.toEqual({ status: 'failed' });
  expect(reload).not.toHaveBeenCalled();
  expect(logger).toHaveBeenCalledWith('fetch_failed', 'download failed');
});

test.each(['native-preview', 'native-qa', 'native-production-staging', null])(
  'channel %s downloads but does not become an apply prompt',
  async (channel) => {
    Object.defineProperty(Updates, 'channel', { value: channel, configurable: true });
    check.mockResolvedValue(available);
    await expect(prepareAppUpdate({ isDev: false, logger })).resolves.toEqual({ status: 'none' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  },
);

test('development channel skips before any network call', async () => {
  Object.defineProperty(Updates, 'channel', { value: 'native-development', configurable: true });
  await expect(prepareAppUpdate({ isDev: false, logger })).resolves.toEqual({ status: 'skipped' });
  expect(check).not.toHaveBeenCalled();
});

test.each([
  { isDev: true, isEnabled: true, isDevClient: false },
  { isDev: false, isEnabled: false, isDevClient: false },
  { isDev: false, isEnabled: true, isDevClient: true },
])('bypasses %j', async (options) => {
  expect(shouldRunAppUpdates(options)).toBe(false);
  await prepareAppUpdate({ ...options, logger });
  expect(check).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
});

test('logs identifiers, not full manifests or signed URLs', async () => {
  check.mockRejectedValue(new Error('offline https://example.com?secret=value token=abc'));
  await prepareAppUpdate({ isDev: false, logger });
  expect(logger).toHaveBeenCalledWith('snapshot', expect.stringContaining('1.0.4'));
  expect(JSON.stringify(logger.mock.calls)).not.toContain('secret=value');
  expect(JSON.stringify(logger.mock.calls)).not.toContain('token=abc');
});

test('reload runs once and a rejection is not retried', async () => {
  reload.mockRejectedValueOnce(new Error('reload failed'));
  await expect(reloadPreparedAppUpdate({ logger })).rejects.toThrow('reload failed');
  await expect(reloadPreparedAppUpdate({ logger })).resolves.toBeUndefined();
  expect(reload).toHaveBeenCalledTimes(1);
  expect(logger).toHaveBeenCalledWith('reload_failed', 'reload failed');
});
