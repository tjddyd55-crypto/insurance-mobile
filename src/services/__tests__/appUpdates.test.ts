import * as Updates from 'expo-updates';

import {
  checkForAppUpdateOnce,
  resetAppUpdateSessionForTests,
  shouldRunAppUpdates,
} from '../appUpdates';

jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

describe('appUpdates', () => {
  const events: string[] = [];
  const logger = (event: string) => {
    events.push(event);
  };

  beforeEach(() => {
    events.length = 0;
    resetAppUpdateSessionForTests();
    jest.clearAllMocks();
    Object.defineProperty(Updates, 'isEnabled', { value: true, configurable: true });
  });

  describe('shouldRunAppUpdates', () => {
    it('skips in development mode', () => {
      expect(shouldRunAppUpdates({ isDev: true, isEnabled: true })).toBe(false);
    });

    it('skips when updates are disabled', () => {
      expect(shouldRunAppUpdates({ isDev: false, isEnabled: false })).toBe(false);
    });

    it('runs in release builds with updates enabled', () => {
      expect(shouldRunAppUpdates({ isDev: false, isEnabled: true })).toBe(true);
    });
  });

  describe('checkForAppUpdateOnce', () => {
    it('skips in development mode without calling Updates APIs', async () => {
      const checkForUpdate = jest.fn();
      const fetchUpdate = jest.fn();

      await checkForAppUpdateOnce({
        isDev: true,
        logger,
        checkForUpdate,
        fetchUpdate,
      });

      expect(events).toEqual(['skipped_dev']);
      expect(checkForUpdate).not.toHaveBeenCalled();
      expect(fetchUpdate).not.toHaveBeenCalled();
    });

    it('skips when updates are disabled', async () => {
      const checkForUpdate = jest.fn();
      const fetchUpdate = jest.fn();

      await checkForAppUpdateOnce({
        isDev: false,
        isEnabled: false,
        logger,
        checkForUpdate,
        fetchUpdate,
      });

      expect(events).toEqual(['skipped_disabled']);
      expect(checkForUpdate).not.toHaveBeenCalled();
    });

    it('checks once per session when no update is available', async () => {
      const checkForUpdate = jest.fn().mockResolvedValue({ isAvailable: false });
      const fetchUpdate = jest.fn();

      await checkForAppUpdateOnce({
        isDev: false,
        isEnabled: true,
        logger,
        checkForUpdate,
        fetchUpdate,
      });
      await checkForAppUpdateOnce({
        isDev: false,
        isEnabled: true,
        logger,
        checkForUpdate,
        fetchUpdate,
      });

      expect(events).toEqual(['check_started', 'no_update', 'skipped_session']);
      expect(checkForUpdate).toHaveBeenCalledTimes(1);
      expect(fetchUpdate).not.toHaveBeenCalled();
    });

    it('fetches updates in the background without reloading', async () => {
      const checkForUpdate = jest.fn().mockResolvedValue({ isAvailable: true });
      const fetchUpdate = jest.fn().mockResolvedValue({
        isNew: true,
        manifest: { id: 'update-123' },
      });
      await checkForAppUpdateOnce({
        isDev: false,
        isEnabled: true,
        logger,
        checkForUpdate,
        fetchUpdate,
      });

      expect(events).toEqual(['check_started', 'fetch_started', 'fetch_success']);
      expect(fetchUpdate).toHaveBeenCalledTimes(1);
      expect(Updates.reloadAsync).not.toHaveBeenCalled();
    });

    it('logs check failures without throwing', async () => {
      const checkForUpdate = jest
        .fn()
        .mockRejectedValue(new Error('checkForUpdateAsync failed: offline'));

      await expect(
        checkForAppUpdateOnce({
          isDev: false,
          isEnabled: true,
          logger,
          checkForUpdate,
          fetchUpdate: jest.fn(),
        }),
      ).resolves.toBeUndefined();

      expect(events).toEqual(['check_started', 'check_failed']);
    });

    it('logs fetch failures without throwing', async () => {
      const checkForUpdate = jest.fn().mockResolvedValue({ isAvailable: true });
      const fetchUpdate = jest.fn().mockRejectedValue(new Error('download failed'));

      await expect(
        checkForAppUpdateOnce({
          isDev: false,
          isEnabled: true,
          logger,
          checkForUpdate,
          fetchUpdate,
        }),
      ).resolves.toBeUndefined();

      expect(events).toEqual(['check_started', 'fetch_started', 'fetch_failed']);
    });
  });
});
