import * as Updates from 'expo-updates';

export type AppUpdateEvent =
  | 'skipped_dev'
  | 'skipped_disabled'
  | 'skipped_session'
  | 'check_started'
  | 'no_update'
  | 'fetch_started'
  | 'fetch_success'
  | 'check_failed'
  | 'fetch_failed';

export type AppUpdateLogger = (event: AppUpdateEvent, detail?: string) => void;

let hasCheckedThisSession = false;

const defaultLogger: AppUpdateLogger = (event, detail) => {
  if (__DEV__) {
    return;
  }
  const suffix = detail ? ` ${detail}` : '';
  console.info(`[AppUpdates] ${event}${suffix}`);
};

export function resetAppUpdateSessionForTests(): void {
  hasCheckedThisSession = false;
}

export function shouldRunAppUpdates(
  options: {
    isDev?: boolean;
    isEnabled?: boolean;
  } = {},
): boolean {
  const isDev = options.isDev ?? __DEV__;
  if (isDev) {
    return false;
  }

  const isEnabled = options.isEnabled ?? Updates.isEnabled;
  return isEnabled;
}

export async function checkForAppUpdateOnce(
  options: {
    logger?: AppUpdateLogger;
    isDev?: boolean;
    isEnabled?: boolean;
    checkForUpdate?: typeof Updates.checkForUpdateAsync;
    fetchUpdate?: typeof Updates.fetchUpdateAsync;
  } = {},
): Promise<void> {
  const logger = options.logger ?? defaultLogger;
  const isDev = options.isDev ?? __DEV__;
  const isEnabled = options.isEnabled ?? Updates.isEnabled;
  const checkForUpdate = options.checkForUpdate ?? Updates.checkForUpdateAsync;
  const fetchUpdate = options.fetchUpdate ?? Updates.fetchUpdateAsync;

  if (!shouldRunAppUpdates({ isDev, isEnabled })) {
    logger(isDev ? 'skipped_dev' : 'skipped_disabled');
    return;
  }

  if (hasCheckedThisSession) {
    logger('skipped_session');
    return;
  }

  hasCheckedThisSession = true;
  logger('check_started');

  try {
    const update = await checkForUpdate();
    if (!update.isAvailable) {
      logger('no_update');
      return;
    }

    logger('fetch_started');
    const fetchResult = await fetchUpdate();
    if (fetchResult.isNew) {
      logger('fetch_success', fetchResult.manifest?.id ?? 'unknown');
      return;
    }

    logger('no_update', 'fetch returned existing bundle');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('checkForUpdateAsync')) {
      logger('check_failed', message);
      return;
    }
    logger('fetch_failed', message);
  }
}
