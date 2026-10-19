import { Stack, useLocalSearchParams } from 'expo-router';

import { BinderViewerScreen } from '../../../../../src/features/personal-binders/BinderViewerScreen';

/** 공유 바인더 직접 보기: 내 바인더와 같은 뷰어, 출처만 공유 페이지 API. */
export default function Screen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>();
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <BinderViewerScreen shareId={String(shareId ?? '')} />
    </>
  );
}
