import { Stack } from 'expo-router';

/** 상담 신청 목록 → 상세는 이 Stack 에서 push/pop 한다(푸시 딥링크로 상세가 먼저 열려도 뒤로 가면 목록). */
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function ConsultationLeadsLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />;
}
