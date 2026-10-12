import { requireNativeModule, type EventSubscription } from 'expo-modules-core';
import { Platform } from 'react-native';

export type PlayUpdateType = 'flexible' | 'immediate';

export type PlayNativeStatus =
  | 'not_from_play'
  | 'no_update'
  | 'available'
  | 'downloaded'
  | 'in_progress'
  | 'type_not_allowed'
  | 'failed';

export type PlayNativeCheck = {
  status: PlayNativeStatus;
  installedFromPlay: boolean;
  availableVersionCode: number;
  flexibleAllowed: boolean;
  immediateAllowed: boolean;
};

export type PlayNativeFlowResult = 'accepted' | 'canceled' | 'failed' | 'unavailable' | 'not_from_play';

type InstallEvent = { status?: string };

type OnefcPlayAppUpdateNative = {
  getUpdateStatus(updateType: PlayUpdateType): Promise<PlayNativeCheck>;
  startUpdate(updateType: PlayUpdateType): Promise<string>;
  completeUpdate(): Promise<boolean>;
  addListener(eventName: 'onInstallStatus', listener: (event: InstallEvent) => void): EventSubscription;
};

const NOT_FROM_PLAY: PlayNativeCheck = {
  status: 'not_from_play',
  installedFromPlay: false,
  availableVersionCode: 0,
  flexibleAllowed: false,
  immediateAllowed: false,
};

const FAILED_CHECK: PlayNativeCheck = {
  status: 'failed',
  installedFromPlay: false,
  availableVersionCode: 0,
  flexibleAllowed: false,
  immediateAllowed: false,
};

function loadNative(platform: string): OnefcPlayAppUpdateNative | null {
  if (platform !== 'android') {
    return null;
  }
  try {
    return requireNativeModule<OnefcPlayAppUpdateNative>('OnefcPlayAppUpdate');
  } catch {
    return null;
  }
}

/** iOS와 네이티브 모듈이 없는 빌드는 예외 없이 빈 결과만 돌려준다. */
export async function readPlayUpdate(
  updateType: PlayUpdateType,
  platform: string = Platform.OS,
): Promise<PlayNativeCheck> {
  const native = loadNative(platform);
  if (!native) {
    return platform === 'android' ? FAILED_CHECK : NOT_FROM_PLAY;
  }
  try {
    const result = await native.getUpdateStatus(updateType);
    return result ?? FAILED_CHECK;
  } catch {
    return FAILED_CHECK;
  }
}

export async function beginPlayUpdate(
  updateType: PlayUpdateType,
  platform: string = Platform.OS,
): Promise<PlayNativeFlowResult> {
  const native = loadNative(platform);
  if (!native) {
    return platform === 'android' ? 'failed' : 'not_from_play';
  }
  try {
    const result = await native.startUpdate(updateType);
    if (
      result === 'accepted'
      || result === 'canceled'
      || result === 'unavailable'
      || result === 'not_from_play'
    ) {
      return result;
    }
    return 'failed';
  } catch {
    return 'failed';
  }
}

export async function finishPlayUpdate(platform: string = Platform.OS): Promise<boolean> {
  const native = loadNative(platform);
  if (!native) {
    return false;
  }
  try {
    return Boolean(await native.completeUpdate());
  } catch {
    return false;
  }
}

export function subscribePlayInstallStatus(
  listener: (status: string) => void,
  platform: string = Platform.OS,
): () => void {
  const native = loadNative(platform);
  if (!native) {
    return () => undefined;
  }
  try {
    const subscription = native.addListener('onInstallStatus', (event) => {
      listener(typeof event?.status === 'string' ? event.status : 'unknown');
    });
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
}
