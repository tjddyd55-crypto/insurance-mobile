/** 수정 화면의 '불러오지 못함/찾을 수 없음' 표시 여부. 삭제 중·삭제 직후에는 사라진 것이 정상이라 띄우지 않는다. */
export function showTodoLoadError(state: { isError: boolean; isSuccess: boolean; found: boolean; deleting: boolean }): boolean {
  if (state.deleting) return false;
  return state.isError || (!state.found && state.isSuccess);
}
