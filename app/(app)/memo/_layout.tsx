import { Stack } from 'expo-router';

/**
 * 메모 목록 → 새 메모/수정은 이 Stack 에서 push/pop 한다(고객 섹션과 같은 규칙, src/navigation/sectionNavigation.ts).
 * Drawer 형제일 때는 저장·삭제 후 Drawer replace('/memo') 가 폼을 history 에 남겨 목록 back 이 폼으로 돌아갔다.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function MemoLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
