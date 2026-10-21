import { Platform } from 'react-native';

import type { WidgetClearReason, WidgetSnapshot } from './widgetContract';
import { WIDGET_SNAPSHOT_VERSION } from './widgetContract';

type OnefcHomeWidgetsNative = {
  configure(scheme: string): Promise<void>;
  writeSnapshot(json: string): Promise<boolean>;
  readSnapshot(): Promise<string | null>;
  clearSnapshot(reason: string): Promise<void>;
  installedWidgetCount(): Promise<number>;
};

let cached: OnefcHomeWidgetsNative | null | undefined;

/** 위젯 모듈이 없는 바이너리(1.0.4 이하)·iOS·web 에서는 null. 호출부는 예외 없이 아무 일도 하지 않는다. */
export function loadWidgetNative(platform: string = Platform.OS): OnefcHomeWidgetsNative | null {
  if (platform !== 'android') return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const core = require('expo-modules-core') as { requireOptionalNativeModule?: <T>(name: string) => T | null };
    cached = core.requireOptionalNativeModule?.<OnefcHomeWidgetsNative>('OnefcHomeWidgets') ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

/** 테스트용. */
export function setWidgetNativeForTests(native: OnefcHomeWidgetsNative | null | undefined): void {
  cached = native;
}

export async function configureWidgets(scheme: string): Promise<void> {
  const native = loadWidgetNative();
  if (!native) return;
  try {
    await native.configure(scheme);
  } catch {
    // 위젯 실패가 앱 동작을 막지 않는다.
  }
}

export async function writeWidgetSnapshot(snapshot: WidgetSnapshot): Promise<boolean> {
  const native = loadWidgetNative();
  if (!native) return false;
  try {
    return Boolean(await native.writeSnapshot(JSON.stringify(snapshot)));
  } catch {
    return false;
  }
}

export async function readWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  const native = loadWidgetNative();
  if (!native) return null;
  try {
    const raw = await native.readSnapshot();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WidgetSnapshot;
    return parsed?.version === WIDGET_SNAPSHOT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearWidgetSnapshot(reason: WidgetClearReason): Promise<void> {
  const native = loadWidgetNative();
  if (!native) return;
  try {
    await native.clearSnapshot(reason);
  } catch {
    // ignore
  }
}

export async function installedWidgetCount(): Promise<number> {
  const native = loadWidgetNative();
  if (!native) return 0;
  try {
    return Number(await native.installedWidgetCount()) || 0;
  } catch {
    return 0;
  }
}
