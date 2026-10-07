import { ApiError } from '../../api/client';
import { formatDeviceLocalDateDots } from '../../utils/deviceLocalDate';
import { normalizeConsultation } from './scenarioEdits';
import type { CoverageScenario } from './types';

/** PC `domain/coverageShareCopy.ts` 와 같은 문구. */
export const COVERAGE_SHARE_WEB_TEXT =
  '보장 상담자료를 보내드립니다. 아래 링크에서 기존 보장과 제안 보장을 확인하실 수 있습니다.';

/** PC 공유 버튼·다이얼로그·토스트 문구. */
export const COVERAGE_SHARE_COPY = {
  dialogTitle: '고객에게 공유',
  dialogBody: '링크 복사 또는 공유하기를 누르면 현재 상담 내용이 공유용으로 저장됩니다.',
  urlLabel: '공유 링크',
  copyLink: '링크 복사',
  copyLinkBusy: '준비 중…',
  nativeShare: '공유하기',
  close: '닫기',
  historyTitle: '공유 이력',
  historyLoading: '불러오는 중…',
  historyEmpty: '아직 공유한 이력이 없습니다.',
  historyRetry: '다시 시도',
  revoked: '중지됨',
  revoke: '공유 중지',
  shareButton: '링크 복사',
  shareButtonBusy: '준비 중…',
  loginRequired: 'CRM에 로그인한 후 공유할 수 있습니다.',
  copied: '복사되었습니다.',
  copyFailed: '링크를 복사하지 못했습니다.',
  nativeShareFailed: '공유하기를 실행하지 못했습니다.',
  revokeFailed: '공유 중지에 실패했습니다. 다시 시도해 주세요.',
  saveBeforeShareTitle: '변경사항을 저장한 후 공유합니다.',
  saveBeforeShareMessage: '공유 링크에는 저장된 상담 내용이 반영됩니다.',
  saveBeforeShareConfirm: '저장 후 공유',
  saveBeforeShareCancel: '취소',
  saveFailed: '보장 분석을 저장하지 못했습니다.',
} as const;

/** 서버 `JSON.stringify(scenario).length` 한도와 같다. */
export const COVERAGE_SHARE_MAX_SNAPSHOT_CHARS = 512_000;

export function coverageScenarioCanBeShared(scenario: CoverageScenario): boolean {
  return scenario.items.some((item) => item.type === 'coverage');
}

export function coverageShareButtonLabel(sharing: boolean): string {
  return sharing ? COVERAGE_SHARE_COPY.shareButtonBusy : COVERAGE_SHARE_COPY.shareButton;
}

export function coverageShareSnapshotChars(scenario: CoverageScenario): number {
  return JSON.stringify(normalizeConsultation(scenario)).length;
}

/** 동일 스냅샷이면 기존 share URL 재사용 */
export function coverageShareSnapshotFingerprint(scenario: CoverageScenario): string {
  return JSON.stringify(normalizeConsultation(scenario));
}

export function buildCoverageShareWebSharePayload(input: {
  shareUrl: string;
  customerName?: string | null;
  title?: string;
}): { title: string; text: string; url: string } {
  const title = input.title?.trim() || '보장 시뮬레이션';
  const nameLine = input.customerName?.trim() ? `${input.customerName.trim()} 고객님께 보내는 ` : '';
  return {
    title,
    text: `${nameLine}${COVERAGE_SHARE_WEB_TEXT}`,
    url: input.shareUrl,
  };
}

/**
 * PC `navigator.share({ title, text, url })` 를 RN Share 시트로 옮긴다.
 * Android 는 message 만 전달되므로 본문 뒤에 서버 URL 을 붙인다.
 */
export function buildReactNativeShareContent(
  payload: { title: string; text: string; url: string },
  platform: string,
): { title: string; message: string; url: string } {
  const message = platform === 'ios' ? payload.text : `${payload.text}\n${payload.url}`;
  return { title: payload.title, message, url: payload.url };
}

export function mapCoverageShareCreateError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return error.message.trim() || '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (error.status === 401) {
      return '로그인이 만료되었습니다. 다시 로그인한 후 공유해 주세요.';
    }
    if (error.status === 403) {
      return '공유 권한이 없습니다. 계정 권한을 확인해 주세요.';
    }
    if (error.status === 400) {
      return '저장된 상담 내용을 확인한 후 다시 시도해 주세요.';
    }
    if (error.status === 503) {
      return 'Preview 공유 서버 설정이 필요합니다. DEV 환경 변수를 확인해 주세요.';
    }
  }
  return '공유 링크를 생성하지 못했습니다. 다시 시도해 주세요.';
}

export function mapCoverageShareHistoryError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
    }
    if (error.status === 403) {
      return '공유 이력을 조회할 권한이 없습니다.';
    }
    if (error.status === 0) {
      return error.message.trim() || '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }
  return '공유 이력을 불러오지 못했습니다.';
}

export function formatCoverageShareDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = formatDeviceLocalDateDots(iso, iso);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${hh}:${mm}`;
}

export type SharePrepareResult =
  | { ok: true; scenario: CoverageScenario }
  | { ok: false; reason: 'cancelled' | 'save-failed' };

/**
 * PC `ensureSaved`: 미저장·변경이 있으면 확인 후 저장하고, 그 스냅샷을 올린다.
 * 이미 저장된 화면은 현재 시나리오를 그대로 정규화한다.
 */
export async function prepareScenarioSnapshotForShare(input: {
  scenario: CoverageScenario;
  dirty: boolean;
  persisted: boolean;
  confirmSave: () => Promise<boolean>;
  save: (scenario: CoverageScenario) => Promise<CoverageScenario>;
}): Promise<SharePrepareResult> {
  const needsSave = !input.persisted || input.dirty;
  if (!needsSave) {
    return { ok: true, scenario: normalizeConsultation(input.scenario) };
  }
  const confirmed = await input.confirmSave();
  if (!confirmed) return { ok: false, reason: 'cancelled' };
  try {
    const saved = await input.save(input.scenario);
    return { ok: true, scenario: normalizeConsultation(saved) };
  } catch {
    return { ok: false, reason: 'save-failed' };
  }
}
