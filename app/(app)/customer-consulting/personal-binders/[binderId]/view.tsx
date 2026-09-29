import { Stack, useLocalSearchParams } from 'expo-router';

import { BinderViewerScreen } from '../../../../../src/features/personal-binders/BinderViewerScreen';

export default function Screen() {
  const { binderId } = useLocalSearchParams<{ binderId: string }>();
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <BinderViewerScreen binderId={String(binderId ?? '')} />
    </>
  );
}
