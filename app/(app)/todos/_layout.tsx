import { Stack } from 'expo-router';

/**
 * 할 일 목록과 수정은 Drawer 형제가 아니라 이 Stack에서 push/pop 한다.
 * Drawer의 router.back()은 첫 화면(홈)으로 가고, 수정 화면은 마운트된 채 남는다.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TodosLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // 스와이프 pop은 변경사항 확인을 건너뛴다. 헤더·취소·Android back이 목록으로 보낸다.
        gestureEnabled: false,
      }}
    />
  );
}
