import * as Updates from 'expo-updates';
import { checkForAppUpdateOnce, resetAppUpdateSessionForTests, shouldRunAppUpdates } from '../appUpdates';

jest.mock('expo-updates', () => ({
  isEnabled: true, channel: 'native-production', runtimeVersion: '1.0.4',
  updateId: 'running-id', isEmbeddedLaunch: false,
  checkForUpdateAsync: jest.fn(), fetchUpdateAsync: jest.fn(), reloadAsync: jest.fn(),
}));

const check = Updates.checkForUpdateAsync as jest.Mock;
const fetch = Updates.fetchUpdateAsync as jest.Mock;
const reload = Updates.reloadAsync as jest.Mock;
const logger = jest.fn();
const run = () => checkForAppUpdateOnce({ isDev: false, logger });
const noUpdate = { isAvailable: false };
const available = { isAvailable: true, manifest: { id: 'new-id' } };
const downloaded = { isNew: true, manifest: { id: 'new-id' } };

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  resetAppUpdateSessionForTests();
  Object.defineProperty(Updates, 'channel', { value: 'native-production', configurable: true });
  Object.defineProperty(Updates, 'updateId', { value: 'running-id', configurable: true });
  check.mockResolvedValue(noUpdate);
  fetch.mockResolvedValue(downloaded);
  reload.mockResolvedValue(undefined);
});
afterEach(() => jest.useRealTimers());

test('no update completes session without fetch/reload', async () => {
  await run(); await run();
  expect(check).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled(); expect(reload).not.toHaveBeenCalled();
});
test('new production update is fetched before exactly one reload', async () => {
  check.mockResolvedValue(available);
  await Promise.all([run(), run()]); await run();
  expect(check).toHaveBeenCalledTimes(1); expect(fetch).toHaveBeenCalledTimes(1);
  expect(reload).toHaveBeenCalledTimes(1);
  expect(fetch.mock.invocationCallOrder[0]).toBeLessThan(reload.mock.invocationCallOrder[0]);
});
test('same ID after JS restart cannot reload again even if server says new', async () => {
  check.mockResolvedValue(available);
  await run();
  resetAppUpdateSessionForTests();
  Object.defineProperty(Updates, 'updateId', { value: 'new-id', configurable: true });
  await run(); expect(reload).toHaveBeenCalledTimes(1);
});
test.each([
  { isNew: false }, { isNew: true, manifest: {} },
  { isNew: true, manifest: { id: 'running-id' } },
  { isNew: false, isRollBackToEmbedded: true },
])('does not reload unsafe or unchanged fetch result %j', async (result) => {
  check.mockResolvedValue(available); fetch.mockResolvedValue(result);
  await run(); expect(reload).not.toHaveBeenCalled();
});
test('first check failure retries after delay and can succeed', async () => {
  check.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(available);
  const first = run(); const second = run();
  await jest.advanceTimersByTimeAsync(2999);
  expect(check).toHaveBeenCalledTimes(1); expect(reload).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  await Promise.all([first, second]);
  expect(check).toHaveBeenCalledTimes(2); expect(reload).toHaveBeenCalledTimes(1);
});
test('persistent check failure stops at two without crashing', async () => {
  check.mockRejectedValue(new Error('offline'));
  const pending = run(); await jest.runAllTimersAsync();
  await expect(pending).resolves.toBeUndefined(); await run();
  expect(check).toHaveBeenCalledTimes(2); expect(fetch).not.toHaveBeenCalled();
  expect(logger).toHaveBeenCalledWith('check_failed', 'offline');
});
test('persistent fetch failure retries once without reload', async () => {
  check.mockResolvedValue(available); fetch.mockRejectedValue(new Error('download failed'));
  const pending = run(); await jest.runAllTimersAsync(); await pending; await run();
  expect(fetch).toHaveBeenCalledTimes(2); expect(reload).not.toHaveBeenCalled();
  expect(logger).toHaveBeenCalledWith('fetch_failed', 'download failed');
});
test('transient fetch failure recovers and reloads once', async () => {
  check.mockResolvedValue(available);
  fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(downloaded);
  const pending = run(); await jest.runAllTimersAsync(); await pending;
  expect(fetch).toHaveBeenCalledTimes(2); expect(reload).toHaveBeenCalledTimes(1);
});
test('reload rejection is contained and never retried', async () => {
  check.mockResolvedValue(available); reload.mockRejectedValue(new Error('reload failed'));
  await expect(run()).resolves.toBeUndefined(); await run();
  expect(reload).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(0);
  expect(logger).toHaveBeenCalledWith('reload_failed', 'reload failed');
});
test.each(['native-preview', 'native-qa', 'native-development', null])('channel %s never auto reloads', async (channel) => {
  Object.defineProperty(Updates, 'channel', { value: channel, configurable: true });
  check.mockResolvedValue(available); await run();
  expect(fetch).toHaveBeenCalledTimes(1); expect(reload).not.toHaveBeenCalled();
});
test.each([{ isDev: true, isEnabled: true }, { isDev: false, isEnabled: false }])('bypasses %j', async (options) => {
  expect(shouldRunAppUpdates(options)).toBe(false);
  await checkForAppUpdateOnce({ ...options, logger });
  expect(check).not.toHaveBeenCalled(); expect(reload).not.toHaveBeenCalled();
});
test('logs identifiers, not full manifests or signed URLs', async () => {
  check.mockRejectedValue(new Error('offline https://example.com?secret=value token=abc'));
  const pending = run(); await jest.runAllTimersAsync(); await pending;
  expect(logger).toHaveBeenCalledWith('snapshot', expect.stringContaining('1.0.4'));
  expect(JSON.stringify(logger.mock.calls)).not.toContain('secret=value');
  expect(JSON.stringify(logger.mock.calls)).not.toContain('token=abc');
});
