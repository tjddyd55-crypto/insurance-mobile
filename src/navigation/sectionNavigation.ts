import type { Href, useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/**
 * 앱 화면 이동 규칙 (한 곳):
 * - 목록 → 상세/폼은 그 섹션 Stack(_layout, initialRouteName 'index') 안에서 push 한다.
 * - 상세/폼에서 "부모(목록·상세)로 돌아가기"(저장·삭제·취소 후 포함)는 이 함수로 한다.
 *   dismissTo: 부모가 Stack 아래에 있으면 거기까지 pop, 없으면(딥링크) 현재 화면만 부모로 바꾼다.
 * - 상세/폼에서 부모로 돌아갈 때는 router.replace 대신 dismissTo 를 쓴다.
 *   replace 는 이전 화면을 스택에 남겨 "목록 back → 상세" 루프를 만들 수 있다.
 */
export function returnToSectionParent(router: Pick<AppRouter, 'dismissTo'>, parent: Href | string): void {
  router.dismissTo(parent as Href);
}
