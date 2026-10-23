import { ApiError } from './client';

/**
 * 화면 오류 문구(401/403/404/5xx). 서버 메시지가 있으면 4xx 에서는 그대로 쓴다.
 * 401 은 apiRequest 가 이미 로그아웃 처리를 시작한다 — 화면은 문구만 보여 주고 멈추지 않는다.
 */
export function describeApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
    if (error.status >= 500) return '서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.';
    const message = error.message.trim();
    if (message) return message;
    if (error.status === 403) return '이 기능을 사용할 권한이 없습니다.';
    if (error.status === 404) return '요청한 항목을 찾을 수 없습니다.';
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}
