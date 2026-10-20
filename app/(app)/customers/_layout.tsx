import { Stack } from 'expo-router';

/**
 * 고객 리스트 → 상세 → 하위 화면(파일·청구·지도·수정…)은 이 Stack 에서 push/pop 한다.
 * 예전에는 고객 화면이 Drawer 형제라 "상세 → 리스트" 를 Drawer 에서 replace 했고,
 * Drawer backBehavior=history 에서 그 replace 가 상세를 history 에 남겨 리스트 back 이 상세로 돌아갔다(t380u 루프).
 * 상세가 기록 없이 먼저 열려도(딥링크·다른 메뉴) 뒤로 가면 리스트로 간다.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function CustomersLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />;
}
