import { Platform } from 'react-native';

import type { WidgetSnapshotEnvelope } from './engine/widgetEnvelope';
import { parseWidgetEnvelope } from './engine/widgetEnvelope';
import type { WidgetClearReason, WidgetType } from './engine/widgetTypes';
import { isWidgetType } from './engine/widgetTypes';

/** native OnefcHomeWidgets 모듈. 봉투(JSON)만 주고받고 토큰은 받지 않는다. */
type OnefcHomeWidgetsNative = {
  configure(scheme: string): Promise<void>;
  writeEnvelope(widgetType: string, json: string): Promise<boolean>;
  readEnvelope(widgetType: string): Promise<string | null>;
  clearAll(reason: string): Promise<void>;
  installedWidgetTypes(): Promise<string[]>;
};

let cached: OnefcHomeWidgetsNative | null | undefined;

/** 위젯 모듈이 없는 바이너리(1.0.4 이하)·iOS·web → null. 호출부는 예외 없이 no-op. */
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

export function setWidgetNativeForTests(native: OnefcHomeWidgetsNative | null | undefined): void {
  cached = native;
}

async function safe<T>(fallback: T, run: (native: OnefcHomeWidgetsNative) => Promise<T>): Promise<T> {
  const native = loadWidgetNative();
  if (!native) return fallback;
  try {
    return await run(native);
  } catch {
    return fallback;
  }
}

export const widgetBridge = {
  configure: (scheme: string) => safe(undefined, (native) => native.configure(scheme)),
  writeEnvelope: (envelope: WidgetSnapshotEnvelope) =>
    safe(false, async (native) => Boolean(await native.writeEnvelope(envelope.widgetType, JSON.stringify(envelope)))),
  /** 깨진 값·다른 버전은 null(native 도 같은 규칙으로 지운다). */
  readEnvelope: (type: WidgetType) => safe(null, async (native) => parseWidgetEnvelope(await native.readEnvelope(type), type)),
  clearAll: (reason: WidgetClearReason) => safe(undefined, (native) => native.clearAll(reason)),
  installedWidgetTypes: () =>
    safe<WidgetType[]>([], async (native) => (await native.installedWidgetTypes()).filter(isWidgetType)),
};
