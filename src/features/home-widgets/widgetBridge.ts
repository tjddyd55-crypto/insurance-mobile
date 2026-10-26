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
  /** 1.0.4 이하 바이너리에는 없다. 없으면 호출부는 앱 안 이동으로 돌아간다. */
  moveTaskToBack?: () => Promise<boolean> | boolean;
  /** 빠른 추가 결과(JSON)를 열려 있는 날짜 모달에 전달. 구 바이너리에는 없다. */
  reportQuickAddResult?: (requestId: string, json: string) => Promise<boolean> | boolean;
  /** 로그인 후 위젯 Native 날짜 모달 다시 열기. 구 바이너리에는 없다. */
  openQuickEntry?: (date: string, mode: string) => Promise<boolean> | boolean;
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

/**
 * 작업을 홈 뒤로 보낸다. 모듈이 없거나(iOS·구 바이너리) 함수가 없거나 실패하면 false.
 * false 이면 호출부가 오늘의 앱 안 이동을 그대로 한다.
 */
export function moveTaskToBack(): Promise<boolean> {
  return safe(false, async (native) => {
    if (typeof native.moveTaskToBack !== 'function') return false;
    return Boolean(await native.moveTaskToBack());
  });
}

/** 위젯 Native 날짜 모달(day/createEvent/createTodo)을 연다. 없거나 실패하면 false → 호출부가 앱 안 이동. */
export function openQuickEntry(date: string, mode: string): Promise<boolean> {
  return safe(false, async (native) => {
    if (typeof native.openQuickEntry !== 'function') return false;
    return Boolean(await native.openQuickEntry(date, mode));
  });
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
  moveTaskToBack,
  openQuickEntry,
  reportQuickAddResult: (requestId: string, json: string) =>
    safe(false, async (native) => {
      if (typeof native.reportQuickAddResult !== 'function') return false;
      return Boolean(await native.reportQuickAddResult(requestId, json));
    }),
};
