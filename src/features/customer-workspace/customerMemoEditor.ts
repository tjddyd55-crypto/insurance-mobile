/**
 * 메모 편집 모달 닫기 정책.
 * - 'user'  : 사용자 닫기(취소/닫기/Back) — 저장 진행 중엔 막는다(중복 저장/유실 방지).
 * - 'saved' : 저장 성공 콜백 — mutation 이 아직 isPending 이어도 반드시 닫는다.
 *   (react-query onSuccess 는 isPending=true 상태에서 실행되므로 가드를 걸면 모달이 남는다.)
 */
export type MemoEditorCloseReason = 'user' | 'saved';

export function shouldCloseMemoEditor(reason: MemoEditorCloseReason, savePending: boolean): boolean {
  if (reason === 'saved') return true;
  return !savePending;
}
