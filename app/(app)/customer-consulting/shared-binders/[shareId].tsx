import { useLocalSearchParams } from 'expo-router';

import { SharedBinderDetailScreen } from '../../../../src/features/shared-binders/SharedBinderDetailScreen';

export default function Screen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>();
  return <SharedBinderDetailScreen shareId={String(shareId ?? '')} />;
}
