import * as Updates from 'expo-updates';

// 채널 이름은 src/features/app-update/policy.ts 와 같다.
const PRODUCTION_OTA_CHANNEL = 'native-production';
const DEVELOPMENT_OTA_CHANNEL = 'native-development';

export type AppUpdateEvent =
  | 'skipped_dev' | 'skipped_disabled' | 'skipped_dev_client'
  | 'snapshot' | 'check_started' | 'check_completed' | 'no_update'
  | 'fetch_started' | 'fetch_success' | 'reload_started' | 'reload_skipped'
  | 'check_failed' | 'fetch_failed' | 'reload_failed';
export type AppUpdateLogger = (event: AppUpdateEvent, detail?: string) => void;

export type OtaPrepareResult = {
  status: 'skipped' | 'none' | 'ready' | 'failed';
  updateId?: string | null;
};

type PrepareOptions = {
  logger?: AppUpdateLogger;
  isDev?: boolean;
  isEnabled?: boolean;
  isDevClient?: boolean;
  channel?: string | null;
  runningUpdateId?: string | null;
  checkForUpdate?: typeof Updates.checkForUpdateAsync;
  fetchUpdate?: typeof Updates.fetchUpdateAsync;
};

type ReloadOptions = {
  logger?: AppUpdateLogger;
  reloadAsync?: typeof Updates.reloadAsync;
};

let reloadStarted = false;

const defaultLogger: AppUpdateLogger = (event, detail) => {
  if (!__DEV__) console.info(`[AppUpdates] ${event}${detail ? ` ${detail}` : ''}`);
};

function updateId(manifest: Updates.Manifest | undefined): string | null {
  return manifest && 'id' in manifest && typeof manifest.id === 'string' ? manifest.id : null;
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/https?:\/\/[^\s]+/gi, '[url]')
    .replace(/(?:bearer\s+)[^\s]+/gi, 'Bearer [redacted]')
    .replace(/((?:token|secret|api[_-]?key|authorization)\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 300);
}

export function resetAppUpdateSessionForTests(): void {
  reloadStarted = false;
}

export function shouldRunAppUpdates(
  options: { isDev?: boolean; isEnabled?: boolean; isDevClient?: boolean } = {},
): boolean {
  if (options.isDev ?? __DEV__) {
    return false;
  }
  if (options.isDevClient) {
    return false;
  }
  return options.isEnabled ?? Updates.isEnabled;
}

function skipReason(options: PrepareOptions): AppUpdateEvent | null {
  if (options.isDev ?? __DEV__) {
    return 'skipped_dev';
  }
  if (options.isDevClient || (options.channel ?? Updates.channel) === DEVELOPMENT_OTA_CHANNEL) {
    return 'skipped_dev_client';
  }
  if (!(options.isEnabled ?? Updates.isEnabled)) {
    return 'skipped_disabled';
  }
  return null;
}

/** 확인하고 받기만 한다. 재시작은 코디네이터가 사용자 확인 뒤에 호출한다. */
export async function prepareAppUpdate(options: PrepareOptions = {}): Promise<OtaPrepareResult> {
  const logger = options.logger ?? defaultLogger;
  const skipped = skipReason(options);
  if (skipped) {
    logger(skipped);
    return { status: 'skipped' };
  }
  logger('snapshot', JSON.stringify({
    channel: options.channel ?? Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: options.runningUpdateId ?? Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  }));
  try {
    return await fetchIfAvailable(options, logger);
  } catch (error) {
    logger('check_failed', safeError(error));
    return { status: 'failed' };
  }
}

async function fetchIfAvailable(
  options: PrepareOptions,
  logger: AppUpdateLogger,
): Promise<OtaPrepareResult> {
  const check = options.checkForUpdate ?? Updates.checkForUpdateAsync;
  logger('check_started');
  const available = await check();
  logger('check_completed', JSON.stringify({
    isAvailable: available.isAvailable,
    updateId: updateId(available.manifest),
  }));
  if (!available.isAvailable) {
    logger('no_update');
    return { status: 'none' };
  }
  return downloadUpdate(options, logger);
}

async function downloadUpdate(
  options: PrepareOptions,
  logger: AppUpdateLogger,
): Promise<OtaPrepareResult> {
  const fetch = options.fetchUpdate ?? Updates.fetchUpdateAsync;
  try {
    logger('fetch_started');
    const fetched = await fetch();
    const downloadedId = updateId(fetched.manifest);
    logger('fetch_success', JSON.stringify({ isNew: fetched.isNew, updateId: downloadedId }));
    const block = reloadBlockReason(options, fetched.isNew, downloadedId);
    if (block) {
      logger('reload_skipped', block);
      return { status: 'none' };
    }
    return { status: 'ready', updateId: downloadedId };
  } catch (error) {
    logger('fetch_failed', safeError(error));
    return { status: 'failed' };
  }
}

function reloadBlockReason(
  options: PrepareOptions,
  isNew: boolean,
  downloadedId: string | null,
): string | null {
  const channel = options.channel ?? Updates.channel;
  if (channel !== PRODUCTION_OTA_CHANNEL) {
    return 'non_production_channel';
  }
  if (!isNew) {
    return 'not_new';
  }
  if (!downloadedId) {
    return 'missing_id';
  }
  const runningId = options.runningUpdateId ?? Updates.updateId;
  if (downloadedId === runningId) {
    return 'same_update';
  }
  return null;
}

/** 한 세션에서 reload는 한 번만 시도한다. 실패해도 다시 호출하지 않는다. */
export async function reloadPreparedAppUpdate(options: ReloadOptions = {}): Promise<void> {
  const logger = options.logger ?? defaultLogger;
  if (reloadStarted) {
    logger('reload_skipped', 'already_started');
    return;
  }
  reloadStarted = true;
  const reload = options.reloadAsync ?? Updates.reloadAsync;
  try {
    logger('reload_started');
    await reload();
  } catch (error) {
    logger('reload_failed', safeError(error));
    throw error;
  }
}
