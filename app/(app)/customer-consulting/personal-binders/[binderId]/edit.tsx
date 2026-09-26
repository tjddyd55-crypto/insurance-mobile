import { useLocalSearchParams } from 'expo-router';

import { BinderEditorScreen } from '../../../../../src/features/personal-binders/BinderEditorScreen';

export default function Screen() {
  const { binderId } = useLocalSearchParams<{ binderId: string }>();
  return <BinderEditorScreen binderId={String(binderId ?? '')} />;
}
