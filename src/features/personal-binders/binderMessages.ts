import { describeApiError } from '../../api/apiErrorCopy';
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

export const SHARED_VIEWER_COPY = {
  emptyTitle: '공유된 페이지가 없습니다.',
  emptyMessage: '공유한 사람이 바인더에 자료를 추가하면 볼 수 있습니다.',
  errorTitle: '공유 바인더를 열 수 없습니다',
  notFound: '공유가 해제되었거나 찾을 수 없습니다. 목록에서 다시 확인해 주세요.',
} as const;

/** 공유 뷰어 오류 문구: 404 는 해제/없음, 그 외(401·403·5xx)는 공통 API 오류 문구. 화면이 죽지 않는다. */
export function sharedViewerErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return SHARED_VIEWER_COPY.notFound;
  return describeApiError(error, '잠시 후 다시 시도해 주세요.');
}
