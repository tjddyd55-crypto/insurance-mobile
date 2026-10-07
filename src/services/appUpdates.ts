import * as Updates from 'expo-updates';

export type AppUpdateEvent =
  | 'skipped_dev' | 'skipped_disabled' | 'skipped_session'
  | 'snapshot' | 'check_started' | 'check_completed' | 'no_update'
  | 'fetch_started' | 'fetch_success' | 'reload_started' | 'reload_skipped'
  | 'check_failed' | 'fetch_failed' | 'reload_failed' | 'retry_scheduled';
export type AppUpdateLogger = (event: AppUpdateEvent, detail?: string) => void;

const RETRY_DELAY_MS = 3000;
let completed = false;
let attempts = 0;
let reloadStarted = false;
let inFlight: Promise<void> | null = null;

const defaultLogger: AppUpdateLogger = (event, detail) => {
  if (!__DEV__) console.info(`[AppUpdates] ${event}${detail ? ` ${detail}` : ''}`);
};

// Only emit public OTA identifiers. Never log manifests or signed asset URLs.
function updateId(manifest: Updates.Manifest | undefined): string | null {
  return manifest && 'id' in manifest && typeof manifest.id === 'string'
    ? manifest.id : null;
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/https?:\/\/[^\s]+/gi, '[url]')
    .replace(/(?:bearer\s+)[^\s]+/gi, 'Bearer [redacted]')
    .replace(/((?:token|secret|api[_-]?key|authorization)\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]')
    .replace(/[\r\n]+/g, ' ').slice(0, 300);
}

export function resetAppUpdateSessionForTests(): void {
  completed = false;
  attempts = 0;
  reloadStarted = false;
  inFlight = null;
}

export function shouldRunAppUpdates(
  options: { isDev?: boolean; isEnabled?: boolean } = {},
): boolean {
  return !(options.isDev ?? __DEV__) && (options.isEnabled ?? Updates.isEnabled);
}

export function checkForAppUpdateOnce(
  options: {
    logger?: AppUpdateLogger;
    isDev?: boolean;
    isEnabled?: boolean;
    checkForUpdate?: typeof Updates.checkForUpdateAsync;
    fetchUpdate?: typeof Updates.fetchUpdateAsync;
    reloadAsync?: typeof Updates.reloadAsync;
  } = {},
): Promise<void> {
  const logger = options.logger ?? defaultLogger;
  const isDev = options.isDev ?? __DEV__;
  const isEnabled = options.isEnabled ?? Updates.isEnabled;
  if (!shouldRunAppUpdates({ isDev, isEnabled })) {
    logger(isDev ? 'skipped_dev' : 'skipped_disabled');
    return Promise.resolve();
  }
  if (inFlight) return inFlight;

  // Preview/QA retain their existing download-for-next-launch behavior.
  const production = Updates.channel === 'native-production';
  const maxAttempts = production ? 2 : 1;
  if (completed || reloadStarted || attempts >= maxAttempts) {
    logger('skipped_session');
    return Promise.resolve();
  }
  const check = options.checkForUpdate ?? Updates.checkForUpdateAsync;
  const fetch = options.fetchUpdate ?? Updates.fetchUpdateAsync;
  const reload = options.reloadAsync ?? Updates.reloadAsync;
  logger('snapshot', JSON.stringify({
    channel: Updates.channel, runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId, isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  }));

  const run = async () => {
    while (attempts < maxAttempts) {
      attempts += 1;
      let stage: 'check' | 'fetch' | 'reload' = 'check';
      try {
        logger('check_started', `attempt=${attempts}`);
        const available = await check();
        logger('check_completed', JSON.stringify({
          isAvailable: available.isAvailable, updateId: updateId(available.manifest),
        }));
        if (!available.isAvailable) {
          completed = true;
          logger('no_update');
          return;
        }
        stage = 'fetch';
        logger('fetch_started');
        const fetched = await fetch();
        const downloadedId = updateId(fetched.manifest);
        logger('fetch_success', JSON.stringify({ isNew: fetched.isNew, updateId: downloadedId }));
        completed = true;
        if (!production || !fetched.isNew || !downloadedId || downloadedId === Updates.updateId) {
          logger('reload_skipped', !production ? 'non_production_channel'
            : !fetched.isNew ? 'not_new' : !downloadedId ? 'missing_id' : 'same_update');
          return;
        }
        // Set before awaiting: a rejected reload must never trigger another reload loop.
        reloadStarted = true;
        stage = 'reload';
        logger('reload_started', downloadedId);
        await reload();
        return;
      } catch (error) {
        logger(`${stage}_failed`, safeError(error));
        if (stage === 'reload' || attempts >= maxAttempts) return;
        logger('retry_scheduled', `delayMs=${RETRY_DELAY_MS}`);
        await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  };
  // Defer execution until the shared promise is installed (deduplicates mounts/callers).
  inFlight = Promise.resolve().then(run).finally(() => { inFlight = null; });
  return inFlight;
}
