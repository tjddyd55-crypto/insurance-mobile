import { ApiError } from '../../api/client';

export const BINDER_API_UNAVAILABLE_TITLE = '내 바인더를 사용할 수 없습니다';

export const BINDER_API_UNAVAILABLE_MESSAGE =
  '이 서버에는 바인더 API가 아직 없습니다. 프로덕션에는 연결되지 않았을 수 있습니다.';

export function isBinderApiUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function binderActionMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message.trim()) {
    return error.message.trim();
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

/** 자료가 바인더에서 참조 중이면 서버가 409를 돌려준다. */
export function isBinderConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
