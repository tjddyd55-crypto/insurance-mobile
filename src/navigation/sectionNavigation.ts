import type { Href, useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/**
 * 앱 화면 이동 규칙 (한 곳):
 * - 목록 → 상세/폼은 그 섹션 Stack(_layout, initialRouteName 'index') 안에서 push 한다.
 * - 상세/폼에서 "부모(목록·상세)로 돌아가기"(저장·삭제·취소 후 포함)는 이 함수로 한다.
 *   dismissTo: 부모가 Stack 아래에 있으면 거기까지 pop, 없으면(딥링크) 현재 화면만 부모로 바꾼다.
 * - Drawer 레벨에서 router.replace 로 부모에 돌아가지 않는다.
 *   Drawer backBehavior='history' 에서 replace 는 이전 화면을 history 에 남겨 "목록 back → 상세" 루프를 만든다(t380u).
 */
export function returnToSectionParent(router: Pick<AppRouter, 'dismissTo'>, parent: Href | string): void {
  router.dismissTo(parent as Href);
}
