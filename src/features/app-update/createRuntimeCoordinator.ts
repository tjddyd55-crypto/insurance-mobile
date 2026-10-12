import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { getEnvironmentConfig } from '../../config/environment';
import {
  prepareAppUpdate,
  reloadPreparedAppUpdate,
  shouldRunAppUpdates,
} from '../../services/appUpdates';
import { createAppUpdateCoordinator, type AppUpdateCoordinator } from './coordinator';
import {
  checkPlayAppUpdate,
  completePlayAppUpdate,
  listenForPlayDownload,
  startPlayAppUpdate,
} from './playClient';
import {
  FOREGROUND_UPDATE_THROTTLE_MS,
  UPDATE_CHECK_TIMEOUT_MS,
  isDevClientRuntime,
  resolvePlayUpdateFlow,
  shouldOfferPlayUpdate,
} from './policy';

export function readDevClientRuntime(): boolean {
  return isDevClientRuntime({
    executionEnvironment: Constants.executionEnvironment ?? null,
    channel: Updates.channel,
  });
}

function playUpdatesEnabled(): boolean {
  let isProductionApp = false;
  try {
    isProductionApp = !getEnvironmentConfig().isDevApp;
  } catch {
    return false;
  }
  return shouldOfferPlayUpdate({
    platform: Platform.OS,
    isDev: __DEV__,
    isDevClient: readDevClientRuntime(),
    isProductionApp,
  });
}

export function createRuntimeAppUpdateCoordinator(): AppUpdateCoordinator {
  const flow = resolvePlayUpdateFlow();
  const devClient = () => readDevClientRuntime();
  return createAppUpdateCoordinator({
    now: () => Date.now(),
    timeoutMs: UPDATE_CHECK_TIMEOUT_MS,
    foregroundThrottleMs: FOREGROUND_UPDATE_THROTTLE_MS,
    otaEnabled: () => shouldRunAppUpdates({ isDevClient: devClient() }),
    prepareOta: () => prepareAppUpdate({ isDevClient: devClient() }),
    reloadOta: () => reloadPreparedAppUpdate(),
    playEnabled: playUpdatesEnabled,
    playFlow: flow,
    checkPlay: () => checkPlayAppUpdate(flow),
    startPlay: (nextFlow) => startPlayAppUpdate(nextFlow),
    completePlay: () => completePlayAppUpdate(),
  });
}

export function watchPlayDownload(onDownloaded: () => void): () => void {
  try {
    return listenForPlayDownload(onDownloaded);
  } catch {
    return () => undefined;
  }
}
