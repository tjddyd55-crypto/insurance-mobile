import { Stack } from 'expo-router';

/**
 * 이 섹션의 목록 → 상세 → 뷰어는 섹션 전용 Stack 에서 push/pop 한다.
 * 섹션끼리 Stack 을 같이 쓰면 먼저 연 섹션이 다른 섹션의 뒤로가기 목적지가 된다(공유 바인더가 전역 fallback 이 되던 원인).
 * 상세·뷰어가 기록 없이 먼저 열려도 뒤로 가면 이 섹션 목록으로 간다.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function SectionLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />;
}
